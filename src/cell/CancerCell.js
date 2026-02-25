import { Cell } from "./Cell.js";
import { CellType } from "../Utilities/CellType.js";
import {
  CANCER_PROLIFERATION_RADIUS,
  CANCER_PROLIFERATION_TIME,
  MAX_CANCER_CELLS,
  CANCER_PROLIFERATION_CHANCE,
  CANCER_PROLIFERATION_TIME_VARIANCE,
} from "../constants.js";

export class CancerCell extends Cell {
  constructor(x, y, size, marker, images) {
    super(
      x,
      y,
      size,
      CellType.CANCER,
      marker,
      images
    );
    
    this.baseSpeed = 0.5;
    
    // optional jiggle
    this.jigglePhase = Math.random() * Math.PI * 2;
    this.jiggleAmount = 5;

    //this.spawnTime = 0;
    //this.isSpawning = true;

    // visual spawn state
    this.opacity = 0;
    //this.scale = CANCER_SPAWN_START_SCALE;

    this.resetProliferationTimer();
  }

  update(width, height, deltaTime, cancerCells) {
    this.jigglePhase += 0.05;
    this.x += Math.sin(this.jigglePhase) * deltaTime * this.jiggleAmount;
    this.y += Math.cos(this.jigglePhase) * deltaTime * this.jiggleAmount;

    this.spawning(deltaTime);
    if(this.isSpawning) return;

    super.update(width, height, deltaTime);

    if (this.isIsolated(cancerCells)) {
      this.timeSinceLastDivision += deltaTime;
    } else {
      this.resetProliferationTimer();
    }

    if (
      this.timeSinceLastDivision >= this.proliferationThreshold &&
      cancerCells.length < MAX_CANCER_CELLS
    ) {
      if (Math.random() < CANCER_PROLIFERATION_CHANCE) {

        const spawnPos = this.findFreeSpawnPosition(cancerCells);

        if (spawnPos) {
          cancerCells.push(
            new CancerCell(
              spawnPos.x,
              spawnPos.y,
              this.size,
              this.marker,
              this.images
            )
          );
        }

      }

      // always reset after an attempt (success OR failure)
      this.resetProliferationTimer();
    }
  }
  
/*
  draw(ctx) {
    ctx.save();

    ctx.globalAlpha = this.opacity;

    ctx.translate(this.x, this.y);
    ctx.scale(this.scale, this.scale);

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
  }*/

  resetProliferationTimer() {
    const variance =
      (Math.random() * 2 - 1) * CANCER_PROLIFERATION_TIME_VARIANCE;

    this.proliferationThreshold =
      CANCER_PROLIFERATION_TIME * (1 + variance);

    this.timeSinceLastDivision = 0;
  }
  
  findFreeSpawnPosition(cancerCells) {
    const offset = this.size;
    const attempts = 16; // try 16 directions around the circle

    for (let i = 0; i < attempts; i++) {
      const angle = (i / attempts) * Math.PI * 2;

      const newX = this.x + Math.cos(angle) * offset;
      const newY = this.y + Math.sin(angle) * offset;

      let overlapping = false;

      for (let other of cancerCells) {
        const dx = other.x - newX;
        const dy = other.y - newY;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < this.size * 0.75) {
          overlapping = true;
          break;
        }
      }

      if (!overlapping) {
        return { x: newX, y: newY };
      }
    }

    return null; // no free position found
  }

  isIsolated(cancerCells) {
    for (let other of cancerCells) {
      if (other === this) continue;

      const dx = other.x - this.x;
      const dy = other.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < CANCER_PROLIFERATION_RADIUS) {
        return false;
      }
    }
    return true;
  }
}