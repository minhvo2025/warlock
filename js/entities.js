export class Entity {
    constructor(x, y, radius, color) {
        this.x = x; this.y = y;
        this.radius = radius; this.color = color;
        this.vx = 0; this.vy = 0;
        this.friction = 0.93;
    }
    update(dt) {
        this.x += this.vx * dt; this.y += this.vy * dt;
        const decay = Math.pow(this.friction, dt * 60);
        this.vx *= decay; this.vy *= decay;
    }
}

export class Warlock extends Entity {
    constructor(x, y, name, color) {
        super(x, y, 18, color);
        this.name = name; this.hp = 100; this.maxHp = 100;
        this.speed = 300; this.isAlive = true;
    }
}

export class Projectile extends Entity {
    constructor(x, y, vx, vy, owner) {
        super(x, y, 7, owner === 'player' ? '#ff8a2b' : '#6fd8ff');
        this.vx = vx; this.vy = vy; this.owner = owner;
        this.life = 1.2; this.damage = 15; this.knockback = 450;
    }
    update(dt) {
        this.x += this.vx * dt; this.y += this.vy * dt;
        this.life -= dt;
    }
}