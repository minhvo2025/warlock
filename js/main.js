import { Warlock, Projectile } from './entities.js';
import { GameSystems } from './systems.js';
import { InputManager } from './input.js';
import { AudioManager } from './audio.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const input = new InputManager();
const audio = new AudioManager();

let lastTime = 0, shake = 0, state = 'lobby';
const arena = { cx: 0, cy: 0, radius: 300, minRadius: 100, shrinkTimer: 20, shrinkInterval: 20, shrinkStep: 30 };
const player = new Warlock(0, 0, 'Player', '#2e6cff'); player.id = 'player';
const dummy = new Warlock(0, 0, 'Enemy', '#f7971e'); dummy.id = 'dummy';
const projectiles = [];

function init() {
    window.addEventListener('resize', () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; arena.cx = canvas.width/2; arena.cy = canvas.height/2; });
    window.dispatchEvent(new Event('resize'));
    canvas.addEventListener('mousedown', () => { if(state === 'playing') shoot(player); });
    document.getElementById('startBtn').onclick = () => { audio.init(); state = 'playing'; document.getElementById('overlay').style.display='none'; reset(); };
    requestAnimationFrame(loop);
}

function reset() { player.x = arena.cx-100; player.y = arena.cy; dummy.x = arena.cx+100; dummy.y = arena.cy; player.hp=100; dummy.hp=100; }

function shoot(w) {
    const angle = Math.atan2(innerHeight/2 - w.y, innerWidth/2 - w.x); // Simple center-aim for demo
    const vx = Math.cos(angle) * 500; const vy = Math.sin(angle) * 500;
    projectiles.push(new Projectile(w.x, w.y, vx, vy, w.id));
    audio.play(400);
}

function loop(t) {
    const dt = Math.min((t - lastTime) / 1000, 0.1); lastTime = t;
    if (state === 'playing') {
        const axis = input.getAxis();
        player.vx += axis.x * player.speed * 4 * dt; player.vy += axis.y * player.speed * 4 * dt;
        player.update(dt); dummy.update(dt);
        GameSystems.handleCombat(projectiles, player, () => { audio.play(150, 'square'); shake = 10; });
        GameSystems.handleCombat(projectiles, dummy, () => { audio.play(150, 'square'); shake = 10; });
        projectiles.forEach((p, i) => { p.update(dt); if(p.life <= 0) projectiles.splice(i, 1); });
        GameSystems.updateArena(arena, dt);
        document.getElementById('hp-bar').style.width = player.hp + '%';
        document.getElementById('dummy-hp-bar').style.width = dummy.hp + '%';
    }
    render();
    requestAnimationFrame(loop);
}

function render() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save(); if(shake > 0) { ctx.translate(Math.random()*shake, Math.random()*shake); shake *= 0.9; }
    ctx.strokeStyle = '#333'; ctx.lineWidth = 5; ctx.beginPath(); ctx.arc(arena.cx, arena.cy, arena.radius, 0, Math.PI*2); ctx.stroke();
    [player, dummy].forEach(w => { ctx.fillStyle = w.color; ctx.beginPath(); ctx.arc(w.x, w.y, w.radius, 0, Math.PI*2); ctx.fill(); });
    projectiles.forEach(p => { ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI*2); ctx.fill(); });
    ctx.restore();
}
init();