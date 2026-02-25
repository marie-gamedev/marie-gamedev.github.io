import { CellType } from "../Utilities/CellType.js";
import { CellMarker } from "../Utilities/CellMarker.js";
import { TCellConfig } from "../configs/TCellConfig.js";
import {
  CELL_SPAWN_DURATION,
  CELL_SPAWN_START_SCALE
} from "../constants.js";


export class Cell {
  constructor(x, y, size, type, marker, images) {
    this.x = x;
    this.y = y;
    this.size = size;

    this.type = type;
    this.marker = marker;
    this.images = images;

    this.baseSpeed = type === CellType.T_CELL ? TCellConfig.baseSpeed : 0.5; // T-Cell : Cancer-cell
    //this.speed = this.baseSpeed;

    this.vx = Math.random() * 2 - 1;
    this.vy = Math.random() * 2 - 1;

    this.scale = CELL_SPAWN_START_SCALE;
    this.opacity = 1;

    this.spawnTime = 0;
    this.isSpawning = true;

    this.alive = true;
    
    this.dying = false;
    this.deathTimer = 0;
    this.deathDuration = type === CellType.T_CELL ? TCellConfig.deathDuration : 0.5; // ms

    this.rotation = Math.random() * Math.PI * 2;        // starting angle
    //this.rotationSpeed = (Math.random() - 0.5) * 0.4;   // radians per second
    //let indRotationSpeed = type === CellType.T_CELL ? 0.6 : 0.2;
    //this.rotationSpeed = (Math.random() - 0.5) * indRotationSpeed;
    this.targetRotation = this.rotation;
    this.rotationDrift = 0.12;   // how much the target changes
    this.rotationFollow = 0.04;  // how fast it follows
  }

  update(width, height, deltaTime) {
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

    /*
    //linear rotation around itself
    this.rotation += this.rotationSpeed * deltaTime;
    this.rotation += (Math.random() - 0.5) * 0.002;
    */

    //more realistic rotation
    this.targetRotation += (Math.random() - 0.5) * 0.1;
    this.rotation += (this.targetRotation - this.rotation) * 0.01;
  }
/*
  draw(ctx) {
    if (!this.images || !this.images[this.type]) {
    console.warn("Missing images for", this.type);
    return;
    }

    const img = this.images[this.type]?.[this.marker];
    if (!img) return;

    ctx.drawImage(
      img,
      this.x - this.size / 2,
      this.y - this.size / 2,
      this.size,
      this.size
    );
  }*/

  draw(ctx) {
    ctx.save();

    //console.log("opacity = " + this.opacity);
    ctx.globalAlpha = this.opacity;

    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);
    ctx.rotate(this.rotation);

    const img = this.images[this.type]?.[this.marker];
    if (!img) return;

    ctx.drawImage(
      img,
      -this.size / 2,
      -this.size / 2,
      this.size,
      this.size
    );

    ctx.restore();
  }

  spawning(deltaTime){
    if (this.isSpawning) {
    this.spawnTime += deltaTime;

    const t = Math.min(this.spawnTime / CELL_SPAWN_DURATION, 1);

    // smoothstep easing (feels organic)
    const eased = t * t * (3 - 2 * t);

    this.opacity = eased;
    this.scale =
      CELL_SPAWN_START_SCALE +
      (1 - CELL_SPAWN_START_SCALE) * eased;

    if (t >= 1) {
      this.isSpawning = false;
      this.opacity = 1;
      this.scale = 1;
      }
    }
  }
}
