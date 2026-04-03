export const GameSystems = {
    checkCollision(a, b) {
        return Math.hypot(b.x - a.x, b.y - a.y) < (a.radius + b.radius);
    },
    updateArena(arena, dt) {
        arena.shrinkTimer -= dt;
        if (arena.shrinkTimer <= 0) {
            arena.radius = Math.max(arena.minRadius, arena.radius - arena.shrinkStep);
            arena.shrinkTimer = arena.shrinkInterval;
            return true;
        }
        return false;
    },
    handleCombat(projectiles, target, onHit) {
        for (let i = projectiles.length - 1; i >= 0; i--) {
            const p = projectiles[i];
            if (p.owner !== target.id && this.checkCollision(p, target)) {
                const dx = target.x - p.x; const dy = target.y - p.y;
                const len = Math.hypot(dx, dy) || 1;
                target.hp -= p.damage;
                target.vx += (dx / len) * p.knockback;
                target.vy += (dy / len) * p.knockback;
                projectiles.splice(i, 1);
                onHit(p.x, p.y);
            }
        }
    }
};