import { CellMarker } from "./CellMarker.js";

export class Car {
  constructor(marker, x, y, size = 60) {
    this.marker = marker;
    this.x = x;
    this.y = y;
    this.size = size;

    this.dragging = false;
    this.startX = x;
    this.startY = y;
  }

  contains(px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.hypot(dx, dy) < this.size * 0.5;
  }

  reset() {
    this.x = this.startX;
    this.y = this.startY;
    this.dragging = false;
  }

  draw(ctx, images) {
    const img = images.CAR?.[this.marker];
    if (!img) return;

    ctx.save();
    ctx.globalAlpha = 0.9;
    ctx.drawImage(
      img,
      this.x - this.size / 2,
      this.y - this.size / 2,
      this.size,
      this.size
    );
    ctx.restore();
  }
}