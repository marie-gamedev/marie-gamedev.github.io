// systems/SpawnSystem.js

import {
  TCELL_SPAWN_BORDER,
  UPGRADE_TYPE,
  UPGRADE_SPAWN_CHANCE,
  UPGRADE_SPAWN_INTERVAL,
  UPGRADE_SIZE,
  UPGRADE_APPLY_MODE
} from "../constants.js";

import { CellMarker } from "../Utilities/CellMarker.js";
import { CancerCellConfig } from "../configs/CancerCellConfig.js";

export class SpawnSystem {

  constructor(game, canvas) {
    this.game = game;
    this.canvas = canvas;

    this.tCellSpawnTimer = 0;
    this.tCellSpawnInterval = 1;

    this.upgradeSpawnTimer = 0;
  }

  // =====================================
  // PUBLIC UPDATE
  // =====================================

  update(deltaTime) {
    this.spawnTCells(deltaTime);
    this.spawnUpgrades(deltaTime);
  }

  // =====================================
  // TCELL SPAWNING
  // =====================================

  spawnTCells(deltaTime) {
    this.tCellSpawnTimer += deltaTime;

    if (this.tCellSpawnTimer >= this.tCellSpawnInterval) {
      this.spawnTCell();
      this.tCellSpawnTimer -= this.tCellSpawnInterval;
    }
  }

  spawnTCell() {
    const { T_CELLS, TCell, TCellConfig } = this.game;

    const pos = this.randomPointOnScreenBorder();

    T_CELLS.push(
      new TCell(
        pos.x,
        pos.y,
        TCellConfig.size,
        TCellConfig.spawnMarker,
        this.game.images
      )
    );
  }

  randomPointOnScreenBorder() {
    const { padding, thickness } = TCELL_SPAWN_BORDER;

    const w = this.canvas.width;
    const h = this.canvas.height;

    const side = Math.floor(Math.random() * 4);

    switch (side) {
      case 0: // top
        return {
          x: this.rand(padding, w - padding),
          y: this.rand(padding, padding + thickness)
        };
      case 1: // right
        return {
          x: this.rand(w - padding - thickness, w - padding),
          y: this.rand(padding, h - padding)
        };
      case 2: // bottom
        return {
          x: this.rand(padding, w - padding),
          y: this.rand(h - padding - thickness, h - padding)
        };
      case 3: // left
        return {
          x: this.rand(padding, padding + thickness),
          y: this.rand(padding, h - padding)
        };
    }
  }

  // =====================================
  // UPGRADE SPAWNING
  // =====================================

  spawnUpgrades(deltaTime) {
    this.upgradeSpawnTimer += deltaTime;

    if (this.upgradeSpawnTimer >= UPGRADE_SPAWN_INTERVAL) {
      this.upgradeSpawnTimer = 0;

      if (Math.random() < UPGRADE_SPAWN_CHANCE) {
        this.spawnUpgradeRandom();
      }
    }
  }

  spawnUpgradeRandom() {
    const { UPGRADES, Upgrade } = this.game;

    if (UPGRADES.length >= 10) return;

    const types = Object.values(UPGRADE_TYPE);
    const type = types[Math.floor(Math.random() * types.length)];

    const margin = 150;
    const x = this.rand(margin, this.canvas.width - margin);
    const y = this.rand(margin, this.canvas.height - margin);

    let applyMode;
    let size = UPGRADE_SIZE;

    switch (type) {
      case UPGRADE_TYPE.SPEED:
        applyMode = UPGRADE_APPLY_MODE.GLOBAL;
        break;
      default:
        applyMode = UPGRADE_APPLY_MODE.SINGLE;
        size = size * 0.8;
        break;
    }

    UPGRADES.push(new Upgrade(type, x, y, size, applyMode));
  }

  // =====================================
  // CANCER CLUSTER SPAWNING
  // =====================================

  spawnMultipleCancerClusters(debug = false) {

    const { CANCER_CELLS, CancerCell } = this.game;

    let clusterCount = 2;
    if (!debug) {
      clusterCount = 2 + Math.floor(Math.random() * 2);
    }

    const positions = [];
    const minDistanceBetweenClusters = 300;

    const availableMarkers = Object
      .values(CellMarker)
      .filter(m => m !== CellMarker.NONE);

    const shuffled = [...availableMarkers]
      .sort(() => Math.random() - 0.5);

    const clusterMarkers = [];
    clusterMarkers.push(shuffled[0]);
    clusterMarkers.push(shuffled[1]);

    for (let i = 2; i < clusterCount; i++) {
      clusterMarkers.push(
        availableMarkers[
          Math.floor(Math.random() * availableMarkers.length)
        ]
      );
    }

    for (let i = 0; i < clusterCount; i++) {

      const size = CancerCellConfig.size;
      const radius = CancerCellConfig.clusterRadius * this.rand(0.7, 1.3);
      const noise = CancerCellConfig.noiseAmount * this.rand(0.7, 1.3);

      const safeMargin = radius + noise + size;

      let attempts = 0;
      let validPosition = false;
      let x, y;

      while (!validPosition && attempts < 30) {

        x = safeMargin + Math.random() * (this.canvas.width - safeMargin * 2);
        y = safeMargin + Math.random() * (this.canvas.height - safeMargin * 2);

        validPosition = true;

        for (const pos of positions) {
          if (Math.hypot(pos.x - x, pos.y - y) < minDistanceBetweenClusters) {
            validPosition = false;
            break;
          }
        }

        attempts++;
      }

      positions.push({ x, y });

      this.spawnCancerClusterAt(x, y, size, radius, noise, clusterMarkers[i]);
    }
  }

  spawnCancerClusterAt(centerX, centerY, size, clusterRadius, noiseAmount, marker) {
    const { CANCER_CELLS, CancerCell } = this.game;

    const positions = this.generateClusterPositions(
      centerX,
      centerY,
      size,
      clusterRadius,
      noiseAmount
    );

    positions.forEach(pos => {
      CANCER_CELLS.push(
        new CancerCell(
          pos.x,
          pos.y,
          size * this.rand(0.8, 1.2),
          marker,
          this.game.images
        )
      );
    });
  }

  generateClusterPositions(centerX, centerY, size, clusterRadius, noiseAmount) {
    const positions = [];

    const spacingX = size * 0.95;
    const spacingY = size * Math.sqrt(3) / 2;

    for (let y = -clusterRadius; y <= clusterRadius; y += spacingY) {
      for (let x = -clusterRadius; x <= clusterRadius; x += spacingX) {

        const offsetX = (Math.round(y / spacingY) % 2) * (spacingX / 2);

        const px = x + offsetX;
        const py = y;

        if (px * px + py * py > clusterRadius * clusterRadius) continue;

        const nx = (Math.random() - 0.5) * noiseAmount;
        const ny = (Math.random() - 0.5) * noiseAmount;

        positions.push({
          x: centerX + px + nx,
          y: centerY + py + ny,
        });
      }
    }

    return positions;
  }

  rand(min, max) {
    return Math.random() * (max - min) + min;
  }
}