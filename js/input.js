export class InputManager {
    constructor() {
        this.keys = {}; this.joy = { active: false, dx: 0, dy: 0 };
        this.isTouch = 'ontouchstart' in window;
        this.init();
    }
    init() {
        window.addEventListener('keydown', e => this.keys[e.key.toLowerCase()] = true);
        window.addEventListener('keyup', e => this.keys[e.key.toLowerCase()] = false);
        if (this.isTouch) this.setupMobile();
    }
    setupMobile() {
        const b = document.createElement('div');
        b.style = "position:fixed; bottom:40px; left:40px; width:100px; height:100px; background:rgba(255,255,255,0.1); border-radius:50%; z-index:1000;";
        const t = document.createElement('div');
        t.style = "position:absolute; top:30px; left:30px; width:40px; height:40px; background:#2e6cff; border-radius:50%;";
        b.appendChild(t); document.body.appendChild(b);
        const move = (e) => {
            const r = b.getBoundingClientRect();
            const touch = e.touches[0];
            const dx = touch.clientX - (r.left + 50); const dy = touch.clientY - (r.top + 50);
            const dist = Math.min(Math.hypot(dx, dy), 40);
            const ang = Math.atan2(dy, dx);
            this.joy = { active: true, dx: Math.cos(ang) * (dist/40), dy: Math.sin(ang) * (dist/40) };
            t.style.transform = `translate(${Math.cos(ang)*dist}px, ${Math.sin(ang)*dist}px)`;
        };
        b.addEventListener('touchstart', move); b.addEventListener('touchmove', move);
        b.addEventListener('touchend', () => { this.joy.active = false; t.style.transform = 'none'; });
    }
    getAxis() {
        if (this.joy.active) return { x: this.joy.dx, y: this.joy.dy };
        return {
            x: (this.keys.d || this.keys.arrowright ? 1 : 0) - (this.keys.a || this.keys.arrowleft ? 1 : 0),
            y: (this.keys.s || this.keys.arrowdown ? 1 : 0) - (this.keys.w || this.keys.arrowup ? 1 : 0)
        };
    }
}