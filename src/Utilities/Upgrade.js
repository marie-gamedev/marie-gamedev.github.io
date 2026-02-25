import { UPGRADE_APPLY_MODE, UPGRADE_LIFETIME } from "../constants.js";

export class Upgrade {
  constructor(type, x, y, size, applyMode = UPGRADE_APPLY_MODE.SINGLE) {
    this.type = type;
    this.x = x;
    this.y = y;
    this.size = size;

    this.collected = false;
    this.pulseTime = 0;

    this.age = 0;
    this.lifetime = UPGRADE_LIFETIME;

    this.dying= false;
    this.deathTimer = 0;
    this.deathDuration = 0.5;
    this.alive = true;

    this.spawnTime = 0;
    this.spawnDuration = 0.4;
    this.isSpawning = true;

    this.scale = 0.2;
    this.opacity = 0;

    this.applyMode = applyMode; // "single" | "global"
  }

  contains(px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.hypot(dx, dy) < this.size * 0.5;
  }

  update(deltaTime) {
    this.pulseTime += deltaTime;
    this.age += deltaTime;

    if (this.isSpawning) {
    this.spawnTime += deltaTime;
    
    const t = Math.min(this.spawnTime / this.spawnDuration, 1);

    const eased = t * t * (3 - 2 * t);
    
    this.y -= (1 - eased) * 5;
    this.scale = 0.2 + (1 - 0.2) * eased;
    this.opacity = eased;

    if (t >= 1) {
      this.isSpawning = false;
      this.scale = 1;
      this.opacity = 1;
    }

    return;
  }

    if(this.age >= this.lifetime) this.dying = true;
    if (this.dying) {
      //console.log("is my + " + this.type + " dying?");
      this.deathTimer += deltaTime;
      
      const t = Math.min(this.deathTimer / this.deathDuration, 1);
      
      const fade = 1 - t;

      this.scale = fade;       // 1 → 0
      this.opacity = fade;    // 1 → 0

      if (t >= 1) {
        this.alive = false;
      }

      return;
    }
  }

  draw(ctx, images) {
    if (this.collected) return;

    const img = images.UPGRADE?.[this.type];
    if (!img) return;

    const pulse =
      1 + Math.sin(this.pulseTime * 6) * 0.08;

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);

    if (!this.dying && !this.isSpawning) {
      const pulse = 1 + Math.sin(this.pulseTime * 6) * 0.08;
      ctx.scale(pulse, pulse);
    }

    ctx.globalAlpha = this.opacity;

    if (this.applyMode === UPGRADE_APPLY_MODE.GLOBAL) {
      ctx.shadowColor = "rgba(255, 215, 0, 1)";
      ctx.shadowBlur = 30;
    } else {
      ctx.shadowColor = "rgba(104, 247, 113, 1)";
      ctx.shadowBlur = 20;
    }

    ctx.drawImage(
      img,
      -this.size / 2,
      -this.size / 2,
      this.size,
      this.size
    );

    ctx.restore();
  }
}