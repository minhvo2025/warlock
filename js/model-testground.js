(function () {
  const LOG_PREFIX = '[ModelTestGround]';
  const DEG_TO_RAD = Math.PI / 180;

  const state = {
    scene: null,
    camera: null,
    renderer: null,
    loader: null,
    viewport: null,
    modelSlot: null,
    currentRoot: null,
    currentMount: null,
    currentSummary: null,
    viewMode: 'top_down',
  };

  function $(id) {
    return document.getElementById(id);
  }

  function log(...args) {
    console.log(LOG_PREFIX, ...args);
    const logEl = $('log');
    if (!logEl) return;

    const parts = args.map((entry) => {
      if (typeof entry === 'string') return entry;
      try {
        return JSON.stringify(entry, null, 2);
      } catch {
        return String(entry);
      }
    });
    logEl.textContent = `${new Date().toLocaleTimeString()} ${parts.join(' ')}\n${logEl.textContent}`.slice(0, 9000);
  }

  function toFixedNumber(value, digits = 3) {
    const num = Number(value);
    if (!Number.isFinite(num)) return null;
    return Number(num.toFixed(digits));
  }

  function formatVec3(vec, digits = 3) {
    if (!vec) return { x: null, y: null, z: null };
    return {
      x: toFixedNumber(vec.x, digits),
      y: toFixedNumber(vec.y, digits),
      z: toFixedNumber(vec.z, digits),
    };
  }

  function computeBox(root) {
    return new THREE.Box3().setFromObject(root);
  }

  function snapshotBox(box, digits = 3) {
    if (!box || !box.isBox3) return null;
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    return {
      min: formatVec3(box.min, digits),
      max: formatVec3(box.max, digits),
      size: formatVec3(size, digits),
      center: formatVec3(center, digits),
    };
  }

  function getLoaderClass() {
    if (typeof THREE !== 'undefined' && typeof THREE.GLTFLoader !== 'undefined') return THREE.GLTFLoader;
    if (typeof GLTFLoader !== 'undefined') return GLTFLoader;
    return null;
  }

  function parseFieldNumber(id, fallback) {
    const el = $(id);
    const parsed = Number(el?.value);
    return Number.isFinite(parsed) ? parsed : fallback;
  }

  function getOptionsFromUI() {
    return {
      glbPath: String($('glbPath')?.value || '').trim(),
      targetHeight: Math.max(0.1, parseFieldNumber('targetHeight', 45)),
      actorScale: Math.max(0, parseFieldNumber('actorScale', 1)),
      scaleMode: String($('scaleMode')?.value || 'absolute').toLowerCase(),
      autoNormalize: !!$('autoNormalize')?.checked,
      importRotation: {
        x: parseFieldNumber('rotX', 0) * DEG_TO_RAD,
        y: parseFieldNumber('rotY', 0) * DEG_TO_RAD,
        z: parseFieldNumber('rotZ', 0) * DEG_TO_RAD,
      },
    };
  }

  function normalizeRootUpAxis(root, allowAutoRotate) {
    if (!allowAutoRotate) {
      return { rotated: false, sourceAxis: 'y', before: snapshotBox(computeBox(root), 2), after: snapshotBox(computeBox(root), 2) };
    }

    root.rotation.set(0, 0, 0);
    root.updateMatrixWorld(true);

    const before = computeBox(root);
    const size = new THREE.Vector3();
    before.getSize(size);
    const dims = {
      x: Math.abs(size.x || 0),
      y: Math.abs(size.y || 0),
      z: Math.abs(size.z || 0),
    };

    let rotated = false;
    let sourceAxis = 'y';
    const appliedRotation = { x: 0, y: 0, z: 0 };

    if (dims.z > dims.y * 1.12 && dims.z >= dims.x) {
      root.rotation.x = -Math.PI / 2;
      rotated = true;
      sourceAxis = 'z';
      appliedRotation.x = toFixedNumber(root.rotation.x, 6);
    } else if (dims.x > dims.y * 1.12 && dims.x >= dims.z) {
      root.rotation.z = Math.PI / 2;
      rotated = true;
      sourceAxis = 'x';
      appliedRotation.z = toFixedNumber(root.rotation.z, 6);
    }

    if (rotated) {
      root.updateMatrixWorld(true);
    }

    const after = computeBox(root);
    return {
      rotated,
      sourceAxis,
      appliedRotation,
      before: snapshotBox(before, 2),
      after: snapshotBox(after, 2),
    };
  }

  function prepareModelTransform(root, mountGroup, options) {
    root.position.set(0, 0, 0);
    root.rotation.set(0, 0, 0);
    root.scale.set(1, 1, 1);
    root.updateMatrixWorld(true);

    const normalizeInfo = normalizeRootUpAxis(root, options.autoNormalize);

    const pivotGroup = new THREE.Group();
    const orientGroup = new THREE.Group();

    orientGroup.rotation.set(
      options.importRotation.x,
      options.importRotation.y,
      options.importRotation.z
    );

    orientGroup.add(root);
    pivotGroup.add(orientGroup);
    mountGroup.add(pivotGroup);

    orientGroup.updateMatrixWorld(true);
    const boxBeforeScale = computeBox(pivotGroup);
    const size = new THREE.Vector3();
    boxBeforeScale.getSize(size);

    const sourceHeight = Math.max(size.y || 1, 1);
    const autoScale = options.targetHeight / sourceHeight;

    let scale = autoScale;
    let scaleModeUsed = 'auto_height';
    if (options.scaleMode === 'multiplier') {
      scale = autoScale * Math.max(0, options.actorScale);
      scaleModeUsed = 'multiplier';
    } else if (options.scaleMode === 'absolute') {
      scale = Math.max(0.0001, options.actorScale || autoScale);
      scaleModeUsed = 'absolute';
    }

    orientGroup.scale.setScalar(scale);
    orientGroup.updateMatrixWorld(true);

    const boxAfterScale = computeBox(pivotGroup);
    const center = new THREE.Vector3();
    const min = new THREE.Vector3();
    boxAfterScale.getCenter(center);
    min.copy(boxAfterScale.min);

    orientGroup.position.x -= center.x;
    orientGroup.position.z -= center.z;
    orientGroup.position.y -= min.y;
    orientGroup.updateMatrixWorld(true);

    const finalBox = computeBox(pivotGroup);
    const finalHeight = finalBox.max.y - finalBox.min.y;

    return {
      normalizeInfo,
      scaleModeUsed,
      sourceHeight: toFixedNumber(sourceHeight, 4),
      targetHeight: toFixedNumber(options.targetHeight, 4),
      autoScale: toFixedNumber(autoScale, 6),
      actorScale: toFixedNumber(options.actorScale, 4),
      finalScale: toFixedNumber(scale, 6),
      beforeScaleBounds: snapshotBox(boxBeforeScale, 2),
      finalBounds: snapshotBox(finalBox, 2),
      finalHeight: toFixedNumber(finalHeight, 2),
      importRotation: {
        x: toFixedNumber(options.importRotation.x, 6),
        y: toFixedNumber(options.importRotation.y, 6),
        z: toFixedNumber(options.importRotation.z, 6),
      },
      pivotGroup,
      orientGroup,
    };
  }

  function updateHud(snapshot) {
    const hud = $('hud');
    if (!hud) return;
    hud.textContent = JSON.stringify(snapshot, null, 2);
  }

  function getCameraSnapshot() {
    if (!state.camera) return null;
    return {
      mode: state.viewMode,
      position: formatVec3(state.camera.position, 3),
      up: formatVec3(state.camera.up, 3),
      zoom: toFixedNumber(state.camera.zoom, 3),
      frustum: {
        left: toFixedNumber(state.camera.left, 2),
        right: toFixedNumber(state.camera.right, 2),
        top: toFixedNumber(state.camera.top, 2),
        bottom: toFixedNumber(state.camera.bottom, 2),
      },
    };
  }

  function buildSnapshot() {
    if (!state.currentMount || !state.currentSummary) {
      return {
        camera: getCameraSnapshot(),
        model: null,
      };
    }
    return {
      camera: getCameraSnapshot(),
      summary: {
        normalizeInfo: state.currentSummary.normalizeInfo,
        scaleModeUsed: state.currentSummary.scaleModeUsed,
        sourceHeight: state.currentSummary.sourceHeight,
        targetHeight: state.currentSummary.targetHeight,
        autoScale: state.currentSummary.autoScale,
        actorScale: state.currentSummary.actorScale,
        finalScale: state.currentSummary.finalScale,
        finalHeight: state.currentSummary.finalHeight,
        importRotation: state.currentSummary.importRotation,
      },
      bounds: {
        mount: snapshotBox(computeBox(state.currentMount), 2),
        root: state.currentRoot ? snapshotBox(computeBox(state.currentRoot), 2) : null,
      },
    };
  }

  function setTopDownCamera() {
    if (!state.camera) return;
    state.viewMode = 'top_down';
    state.camera.position.set(0, 1200, 0);
    state.camera.up.set(0, 0, -1);
    state.camera.lookAt(0, 0, 0);
    state.camera.zoom = 1;
    state.camera.updateProjectionMatrix();
    const btn = $('viewBtn');
    if (btn) btn.textContent = 'Switch to Angled View';
    updateHud(buildSnapshot());
  }

  function setAngledCamera() {
    if (!state.camera) return;
    state.viewMode = 'angled';
    state.camera.position.set(950, 840, 720);
    state.camera.up.set(0, 1, 0);
    state.camera.lookAt(0, 140, 0);
    state.camera.zoom = 1;
    state.camera.updateProjectionMatrix();
    const btn = $('viewBtn');
    if (btn) btn.textContent = 'Switch to Top-Down View';
    updateHud(buildSnapshot());
  }

  function toggleViewMode() {
    if (state.viewMode === 'top_down') {
      setAngledCamera();
    } else {
      setTopDownCamera();
    }
  }

  function resetCamera() {
    if (state.viewMode === 'top_down') {
      setTopDownCamera();
    } else {
      setAngledCamera();
    }
  }

  function clearCurrentModel() {
    if (!state.modelSlot) return;
    while (state.modelSlot.children.length) {
      state.modelSlot.remove(state.modelSlot.children[0]);
    }
    state.currentMount = null;
    state.currentRoot = null;
    state.currentSummary = null;
  }

  function loadModelFromUI() {
    const options = getOptionsFromUI();
    if (!options.glbPath) {
      log('Missing GLB path.');
      return;
    }
    if (!state.loader) {
      log('GLTFLoader is not available.');
      return;
    }

    clearCurrentModel();
    updateHud({ loading: true, path: options.glbPath });
    log('Loading model', options.glbPath);

    state.loader.load(
      options.glbPath,
      (gltf) => {
        const root = gltf?.scene ? gltf.scene.clone(true) : null;
        if (!root) {
          log('Loaded GLTF but no scene root was found.');
          updateHud({ error: 'No GLTF scene root.' });
          return;
        }

        const mount = new THREE.Group();
        mount.position.set(0, 0, 0);
        state.modelSlot.add(mount);

        root.traverse((obj) => {
          if (obj.isMesh || obj.isSkinnedMesh) {
            obj.frustumCulled = false;
            obj.castShadow = false;
            obj.receiveShadow = false;
          }
        });

        const summary = prepareModelTransform(root, mount, options);
        const pivotAxes = new THREE.AxesHelper(90);
        summary.pivotGroup.add(pivotAxes);

        state.currentRoot = root;
        state.currentMount = mount;
        state.currentSummary = summary;

        const snapshot = buildSnapshot();
        updateHud(snapshot);
        log('Model loaded and transformed', snapshot.summary);
      },
      undefined,
      (error) => {
        log('Failed to load model', String(error?.message || error));
        updateHud({ error: String(error?.message || error) });
      }
    );
  }

  function onResize() {
    if (!state.renderer || !state.camera || !state.viewport) return;
    const width = Math.max(320, state.viewport.clientWidth || window.innerWidth);
    const height = Math.max(240, state.viewport.clientHeight || window.innerHeight);
    const aspect = width / height;
    const frustumSize = height;

    state.camera.left = (-frustumSize * aspect) / 2;
    state.camera.right = (frustumSize * aspect) / 2;
    state.camera.top = frustumSize / 2;
    state.camera.bottom = -frustumSize / 2;
    state.camera.updateProjectionMatrix();

    state.renderer.setSize(width, height);
    updateHud(buildSnapshot());
  }

  function initScene() {
    if (typeof THREE === 'undefined') {
      throw new Error('THREE is missing.');
    }

    const LoaderClass = getLoaderClass();
    if (!LoaderClass) {
      throw new Error('GLTFLoader is missing.');
    }

    state.viewport = $('viewport');
    if (!state.viewport) {
      throw new Error('Missing #viewport.');
    }

    state.scene = new THREE.Scene();
    state.scene.background = new THREE.Color(0x0b1018);

    state.camera = new THREE.OrthographicCamera(-600, 600, 400, -400, 0.1, 6000);

    state.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    state.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    state.viewport.appendChild(state.renderer.domElement);

    state.loader = new LoaderClass();

    const hemi = new THREE.HemisphereLight(0xffffff, 0x223048, 1.9);
    hemi.position.set(0, 500, 0);
    state.scene.add(hemi);

    const key = new THREE.DirectionalLight(0xffffff, 1.05);
    key.position.set(220, 320, 140);
    state.scene.add(key);

    const fill = new THREE.DirectionalLight(0x9ab7ff, 0.42);
    fill.position.set(-180, 200, -110);
    state.scene.add(fill);

    const grid = new THREE.GridHelper(1400, 28, 0x4977be, 0x2a3652);
    grid.position.y = 0;
    state.scene.add(grid);

    const worldAxes = new THREE.AxesHelper(140);
    state.scene.add(worldAxes);

    const floorGeo = new THREE.CircleGeometry(640, 80);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x0e223b,
      transparent: true,
      opacity: 0.35,
      side: THREE.DoubleSide,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.03;
    state.scene.add(floor);

    state.modelSlot = new THREE.Group();
    state.scene.add(state.modelSlot);

    setTopDownCamera();
    onResize();

    window.addEventListener('resize', onResize);
    state.renderer.domElement.addEventListener('wheel', (event) => {
      event.preventDefault();
      const dir = Math.sign(event.deltaY);
      if (dir > 0) {
        state.camera.zoom = Math.max(0.2, state.camera.zoom * 0.92);
      } else if (dir < 0) {
        state.camera.zoom = Math.min(8, state.camera.zoom * 1.08);
      }
      state.camera.updateProjectionMatrix();
      updateHud(buildSnapshot());
    }, { passive: false });

    (function loop() {
      requestAnimationFrame(loop);
      if (!state.renderer || !state.scene || !state.camera) return;
      state.renderer.render(state.scene, state.camera);
    })();

    log('Test ground ready');
  }

  function bindUi() {
    $('loadBtn')?.addEventListener('click', loadModelFromUI);
    $('dumpBtn')?.addEventListener('click', () => {
      const snapshot = buildSnapshot();
      updateHud(snapshot);
      log('Snapshot', snapshot);
    });
    $('viewBtn')?.addEventListener('click', toggleViewMode);
    $('resetCameraBtn')?.addEventListener('click', resetCamera);
  }

  try {
    initScene();
    bindUi();
    loadModelFromUI();
  } catch (error) {
    log('Initialization error', String(error?.message || error));
    updateHud({ error: String(error?.message || error) });
  }
})();
