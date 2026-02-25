// systems/InputController.js

import {
  UPGRADE_APPLY_MODE,
  TCELL_SWIPE_RADIUS,
  TCELL_SWIPE_IMPULSE
} from "../constants.js";

export class InputController {

  constructor(canvas, game) {
    this.canvas = canvas;
    this.game = game;

    this.activeCar = null;
    this.activeUpgrade = null;

    this.swipeStart = null;
    this.swipeStartTime = 0;

    this.init();
  }

  init() {
    this.canvas.addEventListener("pointerdown", this.onPointerDown.bind(this));
    this.canvas.addEventListener("pointermove", this.onPointerMove.bind(this));
    this.canvas.addEventListener("pointerup", this.onPointerUp.bind(this));
  }

  // ================================
  // POINTER EVENTS
  // ================================

  onPointerDown(e) {
    const { x, y } = this.getPointerPos(e);

    this.swipeStart = { x, y };
    this.swipeStartTime = performance.now();

    const {
      T_CELLS,
      UPGRADES,
      CAR_PALETTE,
      ACTIVE_CARS,
      Car
    } = this.game;

    // ---- Upgrade click ----
    for (const upgrade of UPGRADES) {
      if (upgrade.contains(x, y)) {

        if (upgrade.applyMode === UPGRADE_APPLY_MODE.GLOBAL) {
          for (const tcell of T_CELLS) {
            tcell.applyUpgrade(upgrade.type);
          }

          upgrade.collected = true;
          upgrade.dying = true;
          return;
        }

        this.activeUpgrade = upgrade;
        upgrade.dragging = true;

        for (const tcell of T_CELLS) {
          tcell.isHovered = true;
        }

        return;
      }
    }

    // ---- Car click ----
    for (const item of CAR_PALETTE) {
      if (this.paletteHit(item, x, y)) {

        const car = new Car(item.marker, x, y);
        car.playerId = item.playerId;
        car.dragging = true;

        ACTIVE_CARS.push(car);
        this.activeCar = car;

        for (const tcell of T_CELLS) {
          tcell.isHovered = true;
        }

        return;
      }
    }
  }

  onPointerMove(e) {
    const { x, y } = this.getPointerPos(e);

    if (this.activeUpgrade) {
      this.activeUpgrade.x = x;
      this.activeUpgrade.y = y;
    }

    if (this.activeCar) {
      this.activeCar.x = x;
      this.activeCar.y = y;
    }
  }

  onPointerUp(e) {

    const {
      T_CELLS,
      ACTIVE_CARS
    } = this.game;

    // clear hover
    for (const tcell of T_CELLS) {
      tcell.isHovered = false;
    }

    // ---- Upgrade drop ----
    if (this.activeUpgrade) {
      let applied = false;

      for (const tcell of T_CELLS) {
        const dx = tcell.x - this.activeUpgrade.x;
        const dy = tcell.y - this.activeUpgrade.y;

        if (Math.hypot(dx, dy) < tcell.size * 0.6) {
          tcell.applyUpgrade(this.activeUpgrade.type);
          applied = true;
          break;
        }
      }

      if (applied) {
        this.activeUpgrade.collected = true;
      }

      this.activeUpgrade = null;
      return;
    }

    // ---- Car drop ----
    if (this.activeCar) {
      let applied = false;

      for (const tcell of T_CELLS) {
        const dx = tcell.x - this.activeCar.x;
        const dy = tcell.y - this.activeCar.y;

        if (Math.hypot(dx, dy) < tcell.size * 0.6) {
          applied = tcell.applyCar(this.activeCar);
          if (applied) break;
        }
      }

      if (applied) {
        ACTIVE_CARS.length = 0;
        this.activeCar = null;
        return;
      }

      const i = ACTIVE_CARS.indexOf(this.activeCar);
      if (i !== -1) ACTIVE_CARS.splice(i, 1);

      this.activeCar = null;
      return;
    }

    // ---- Swipe ----
    if (this.swipeStart) {
      const { x, y } = this.getPointerPos(e);

      const swipeEnd = { x, y };
      const duration =
        (performance.now() - this.swipeStartTime) / 1000;

      this.applySwipeImpulse(this.swipeStart, swipeEnd, duration);

      this.swipeStart = null;
    }
  }

  // ================================
  // SWIPE LOGIC
  // ================================

  applySwipeImpulse(start, end, duration) {

    const { T_CELLS } = this.game;

    const dx = end.x - start.x;
    const dy = end.y - start.y;

    const distance = Math.hypot(dx, dy);
    if (distance < 20) return;

    const dirX = dx / distance;
    const dirY = dy / distance;

    const swipeSpeed = distance / Math.max(duration, 0.05);
    const strength = swipeSpeed * TCELL_SWIPE_IMPULSE;

    for (const tcell of T_CELLS) {

      const distToLine = this.distancePointToSegment(
        tcell.x,
        tcell.y,
        start.x,
        start.y,
        end.x,
        end.y
      );

      if (distToLine < TCELL_SWIPE_RADIUS) {

        tcell.impulseX += dirX * strength;
        tcell.impulseY += dirY * strength;

        tcell.clearTarget();
        tcell.bindingTarget = null;
        tcell.retargetCooldown = 0.4;
      }
    }
  }

  distancePointToSegment(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;

    const lengthSq = dx * dx + dy * dy;
    if (lengthSq === 0) return Math.hypot(px - x1, py - y1);

    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSq;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;

    return Math.hypot(px - projX, py - projY);
  }

  paletteHit(paletteItem, x, y) {
    const dx = x - (paletteItem.x + paletteItem.size / 2);
    const dy = y - (paletteItem.y + paletteItem.size / 2);
    return Math.hypot(dx, dy) < paletteItem.size * 0.5;
  }

  getPointerPos(e) {
    if (e.touches && e.touches.length > 0) {
      return {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY
      };
    }
    return { x: e.clientX, y: e.clientY };
  }
}