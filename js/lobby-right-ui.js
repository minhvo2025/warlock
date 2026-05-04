(function initLobbyRightUiModule() {
  const DEFAULT_RIGHT_LOBBY_CONFIG = Object.freeze({
    season: {
      seasonName: 'SEASON 1',
      seasonEndDate: '2026-07-30T23:59:59',
      rankTitle: 'Inferno Commander',
      starsCurrent: 235,
      starsMax: 250,
      // TODO: swap to dedicated lobby season badge asset when final icon is exported.
      rankIconTexture: '/docs/art/ranks/5.png',
    },
    daily: {
      questCount: 3,
      questPool: [
        { id: 'win_2_matches', title: 'Win 2 matches', target: 2, rewardOut: 10 },
        { id: 'deal_500_damage', title: 'Deal 500 damage', target: 500, rewardOut: 15 },
        { id: 'use_3_abilities', title: 'Use 3 abilities', target: 3, rewardOut: 10 },
        { id: 'land_10_fireballs', title: 'Land 10 fireballs', target: 10, rewardOut: 20 },
        { id: 'survive_60_seconds', title: 'Survive 60 seconds in arena', target: 60, rewardOut: 15 },
        { id: 'play_3_matches', title: 'Play 3 matches', target: 3, rewardOut: 10 },
        { id: 'lava_knock_1', title: 'Knock an enemy into lava 1 time', target: 1, rewardOut: 25 },
        { id: 'blink_5_times', title: 'Blink 5 times', target: 5, rewardOut: 10 },
        { id: 'block_150_damage', title: 'Block 150 damage', target: 150, rewardOut: 15 },
        { id: 'hit_2_shock_blasts', title: 'Hit 2 Shock Blasts', target: 2, rewardOut: 20 },
      ],
    },
  });

  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function safeNumber(value, fallback) {
    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  }

  function shuffleArray(input) {
    const items = Array.isArray(input) ? input.slice() : [];
    for (let i = items.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      const temp = items[i];
      items[i] = items[j];
      items[j] = temp;
    }
    return items;
  }

  function pickUniqueQuests(questPool, questCount) {
    const unique = [];
    const seen = new Set();
    const shuffled = shuffleArray(questPool || []);
    for (let i = 0; i < shuffled.length; i += 1) {
      const quest = shuffled[i];
      if (!quest || !quest.id || seen.has(quest.id)) continue;
      seen.add(quest.id);
      const target = Math.max(1, Math.floor(safeNumber(quest.target, 1)));
      const progress = Math.floor(Math.random() * (target + 1));
      unique.push({
        id: String(quest.id),
        title: String(quest.title || 'Quest'),
        progressCurrent: clamp(progress, 0, target),
        progressTarget: target,
        rewardOut: Math.max(0, Math.floor(safeNumber(quest.rewardOut, 0))),
      });
      if (unique.length >= questCount) break;
    }
    return unique;
  }

  const preloadedImageSources = new Set();

  function preloadImage(source) {
    const safeSource = String(source || '').trim();
    if (!safeSource || preloadedImageSources.has(safeSource)) return;
    preloadedImageSources.add(safeSource);
    const preloadImg = new Image();
    preloadImg.decoding = 'async';
    preloadImg.src = safeSource;
    if (typeof preloadImg.decode === 'function') {
      preloadImg.decode().catch(() => {});
    }
  }

  function formatSeasonCountdown(nowMs, endMs) {
    if (!Number.isFinite(endMs) || nowMs >= endMs) return 'Season ended';
    const remainingMs = Math.max(0, endMs - nowMs);
    const totalMinutes = Math.floor(remainingMs / 60000);
    const totalHours = Math.floor(totalMinutes / 60);
    const days = Math.floor(totalHours / 24);
    const hours = totalHours % 24;
    const minutes = totalMinutes % 60;

    if (days > 0) return `${days}d ${hours}h left`;
    if (totalHours > 0) return `${totalHours}h ${minutes}m left`;
    return `${Math.max(1, minutes)}m left`;
  }

  function getNextLocalMidnightMs(nowMs) {
    const now = new Date(nowMs);
    const next = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate() + 1,
      0,
      0,
      0,
      0
    );
    return next.getTime();
  }

  function formatResetCountdown(nowMs, targetMs) {
    const remainingMs = Math.max(0, targetMs - nowMs);
    const totalMinutes = Math.floor(remainingMs / 60000);
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return `Resets in ${hours}h ${minutes}m`;
  }

  function createProgressBarMount(containerEl, options = {}) {
    if (!containerEl) return null;
    containerEl.innerHTML = '';

    const root = document.createElement('div');
    root.className = `lobbyProgressBar${options.compact ? ' lobbyProgressBar--compact' : ''}`;

    const track = document.createElement('div');
    track.className = 'lobbyProgressBarTrack';

    const fill = document.createElement('div');
    fill.className = 'lobbyProgressBarFill';
    track.appendChild(fill);

    const value = document.createElement('div');
    value.className = 'lobbyProgressBarValue';
    const hideValue = !!options.hideValue;
    value.hidden = hideValue;

    root.append(track, value);
    containerEl.appendChild(root);

    return {
      set(current, max, labelText = '') {
        const safeMax = Math.max(1, Math.floor(safeNumber(max, 1)));
        const safeCurrent = clamp(Math.floor(safeNumber(current, 0)), 0, safeMax);
        const ratio = safeCurrent / safeMax;
        fill.style.width = `${(ratio * 100).toFixed(2)}%`;
        if (!hideValue) {
          value.textContent = labelText || `${safeCurrent} / ${safeMax}`;
        }
      },
    };
  }

  class RightLobbyUI {
    constructor(baseConfig) {
      this.config = JSON.parse(JSON.stringify(baseConfig));
      this.isActive = false;
      this.timerId = 0;
      this.selectedQuests = [];
      this.dom = {};
      this.seasonProgressBar = null;
      this.dailyQuestBars = new Map();
    }

    ensureQuestSelection() {
      if (Array.isArray(this.selectedQuests) && this.selectedQuests.length > 0) return;
      const questCount = Math.max(1, Math.floor(safeNumber(this.config.daily.questCount, 3)));
      this.selectedQuests = pickUniqueQuests(this.config.daily.questPool, questCount);
    }

    setConfig(partialConfig = {}) {
      if (!partialConfig || typeof partialConfig !== 'object') return;
      this.config = {
        ...this.config,
        ...partialConfig,
        season: {
          ...this.config.season,
          ...(partialConfig.season || {}),
        },
        daily: {
          ...this.config.daily,
          ...(partialConfig.daily || {}),
        },
      };
      preloadImage(this.config.season?.rankIconTexture);
      if (this.isActive) {
        this.renderAll();
      }
    }

    cacheDom() {
      this.dom.root = document.querySelector('.lobby-right-v2');
      this.dom.seasonName = document.getElementById('lobbySeasonName');
      this.dom.seasonCountdown = document.getElementById('lobbySeasonCountdown');
      this.dom.seasonRankTitle = document.getElementById('lobbySeasonRankTitle');
      this.dom.seasonStars = document.getElementById('lobbySeasonStars');
      this.dom.seasonStarsValue = document.getElementById('lobbySeasonStarsValue');
      this.dom.seasonRankIcon = document.getElementById('lobbySeasonRankIcon');
      this.dom.seasonRankIconFallback = document.getElementById('lobbySeasonRankIconFallback');
      this.dom.seasonProgressMount = document.getElementById('lobbySeasonProgressBar');
      this.dom.dailyQuestList = document.getElementById('lobbyDailyQuestList');
      this.dom.dailyResetTimer = document.getElementById('lobbyDailyResetTimer');
    }

    buildSeasonPanel() {
      if (!this.dom.seasonProgressMount) return;
      this.seasonProgressBar = createProgressBarMount(this.dom.seasonProgressMount, { compact: false });
    }

    buildDailyQuestRows() {
      if (!this.dom.dailyQuestList) return;
      this.dom.dailyQuestList.innerHTML = '';
      this.dailyQuestBars.clear();

      this.selectedQuests.forEach((quest) => {
        const row = document.createElement('article');
        row.className = 'lobbyDailyQuestRow';
        row.setAttribute('data-quest-id', quest.id);

        const top = document.createElement('div');
        top.className = 'lobbyDailyQuestTop';

        const title = document.createElement('div');
        title.className = 'lobbyDailyQuestTitle';
        title.textContent = quest.title;

        const counter = document.createElement('div');
        counter.className = 'lobbyDailyQuestCounter';
        counter.textContent = `${quest.progressCurrent}/${quest.progressTarget}`;

        const reward = document.createElement('div');
        reward.className = 'lobbyDailyQuestReward';
        const rewardIcon = document.createElement('span');
        rewardIcon.className = 'lobbyDailyQuestRewardIcon';
        rewardIcon.setAttribute('aria-hidden', 'true');
        const rewardValue = document.createElement('span');
        rewardValue.className = 'lobbyDailyQuestRewardValue';
        rewardValue.textContent = String(quest.rewardOut);
        reward.append(rewardIcon, rewardValue);

        top.append(title, counter, reward);

        const progressMount = document.createElement('div');
        progressMount.className = 'lobbyDailyQuestProgressMount';
        const progressBar = createProgressBarMount(progressMount, { compact: true, hideValue: true });
        this.dailyQuestBars.set(quest.id, progressBar);

        row.append(top, progressMount);
        this.dom.dailyQuestList.appendChild(row);

        if (progressBar) {
          progressBar.set(
            quest.progressCurrent,
            quest.progressTarget,
            `${quest.progressCurrent}/${quest.progressTarget}`
          );
        }
      });
    }

    renderSeasonIcon() {
      if (!this.dom.seasonRankIcon || !this.dom.seasonRankIconFallback) return;
      const rankIconTexture = String(this.config.season.rankIconTexture || '').trim();

      if (!rankIconTexture) {
        this.dom.seasonRankIcon.hidden = true;
        this.dom.seasonRankIcon.removeAttribute('src');
        this.dom.seasonRankIconFallback.hidden = false;
        return;
      }

      this.dom.seasonRankIcon.hidden = false;
      if (this.dom.seasonRankIcon.getAttribute('src') !== rankIconTexture) {
        this.dom.seasonRankIcon.src = rankIconTexture;
      }
      this.dom.seasonRankIconFallback.hidden = true;

      this.dom.seasonRankIcon.onerror = () => {
        this.dom.seasonRankIcon.hidden = true;
        this.dom.seasonRankIconFallback.hidden = false;
      };
    }

    renderSeasonValues() {
      const season = this.config.season || {};
      if (this.dom.seasonName) this.dom.seasonName.textContent = String(season.seasonName || 'SEASON');
      if (this.dom.seasonRankTitle) this.dom.seasonRankTitle.textContent = String(season.rankTitle || 'Rank Title');

      const starsCurrent = Math.max(0, Math.floor(safeNumber(season.starsCurrent, 0)));
      const starsMax = Math.max(1, Math.floor(safeNumber(season.starsMax, 1)));
      if (this.dom.seasonStarsValue) {
        this.dom.seasonStarsValue.textContent = `${starsCurrent} STARS`;
      } else if (this.dom.seasonStars) {
        this.dom.seasonStars.textContent = `${starsCurrent} STARS`;
      }
      if (this.seasonProgressBar) {
        this.seasonProgressBar.set(starsCurrent, starsMax, `${starsCurrent} / ${starsMax}`);
      }
    }

    renderTimerValues() {
      const nowMs = Date.now();
      const seasonEndMs = new Date(String(this.config.season.seasonEndDate || '')).getTime();
      if (this.dom.seasonCountdown) {
        this.dom.seasonCountdown.textContent = formatSeasonCountdown(nowMs, seasonEndMs);
      }

      if (this.dom.dailyResetTimer) {
        const nextMidnight = getNextLocalMidnightMs(nowMs);
        this.dom.dailyResetTimer.textContent = formatResetCountdown(nowMs, nextMidnight);
      }
    }

    renderAll() {
      this.renderSeasonIcon();
      this.renderSeasonValues();
      this.renderTimerValues();
    }

    startTimer() {
      this.stopTimer();
      this.timerId = window.setInterval(() => {
        if (!this.isActive) return;
        this.renderTimerValues();
      }, 30000);
    }

    stopTimer() {
      if (this.timerId) {
        window.clearInterval(this.timerId);
        this.timerId = 0;
      }
    }

    activate() {
      this.cacheDom();
      if (!this.dom.root) return;
      this.ensureQuestSelection();
      if (!this.seasonProgressBar) {
        this.buildSeasonPanel();
      }
      if (this.dom.dailyQuestList && this.dailyQuestBars.size === 0) {
        this.buildDailyQuestRows();
      }
      this.isActive = true;
      this.renderAll();
      this.startTimer();
    }

    deactivate() {
      this.isActive = false;
      this.stopTimer();
    }

    destroy() {
      this.deactivate();
    }
  }

  const rightLobbyUi = new RightLobbyUI(DEFAULT_RIGHT_LOBBY_CONFIG);
  preloadImage(DEFAULT_RIGHT_LOBBY_CONFIG.season?.rankIconTexture);
  rightLobbyUi.activate();
  rightLobbyUi.deactivate();

  window.outraRightLobbyUI = {
    activate(configOverrides = null) {
      if (configOverrides) rightLobbyUi.setConfig(configOverrides);
      rightLobbyUi.activate();
    },
    deactivate() {
      rightLobbyUi.deactivate();
    },
    destroy() {
      rightLobbyUi.destroy();
    },
    setConfig(configOverrides) {
      rightLobbyUi.setConfig(configOverrides);
    },
    prime() {
      rightLobbyUi.activate();
      rightLobbyUi.deactivate();
    },
  };

  window.addEventListener('beforeunload', () => {
    rightLobbyUi.destroy();
  });
})();
