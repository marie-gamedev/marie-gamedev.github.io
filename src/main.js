let debug = false;

import { CancerCluster } from "./Utilities/CancerCluster.js";
import { CancerCell } from "./cell/CancerCell.js";
import { TCell } from "./cell/TCell.js";

import { CellMarker } from "./Utilities/CellMarker.js";
import { MARKER_ORDER } from "./Utilities/MarkerOrder.js";

import { loadImages as loadAssets, loadImages } from "./Utilities/ImageLoader.js";

import { TCellConfig } from "./configs/TCellConfig.js";

import { Car } from "./Utilities/Car.js";

import { Upgrade } from "./Utilities/Upgrade.js";

import { InputController } from "./systems/InputController.js";
import { SpawnSystem } from "./systems/SpawnSystem.js";

import {
  clearInvalidTargets,
  assignTargets,
  resolveKills
} from "./Utilities/Targeting.js";

console.log("MAIN.JS LOADED");

const startOverlay = document.getElementById("startOverlay");

startOverlay.addEventListener("click", () => {
  // 1. Enter fullscreen
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch(() => { });
  }

  // 2. Remove overlay
  startOverlay.remove();

  // 3. (Optional) start audio here later
  // audioContext.resume();

  console.log("GAME STARTED");
});

const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");

function resize() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
resize();
window.addEventListener("resize", resize);

let gameState = "playing"; // "playing" | "victory"
let victoryTimer = 0;

// ================================
// DRAG & DROP INPUT LOGIC
// ================================

// ---- GAME DATA ----
const T_CELLS = [];
const CANCER_CELLS = [];
const CAR_PALETTE = [];
const ACTIVE_CARS = []; // currently dragged / flying cars
const UPGRADES = [];

const CAR_TYPES = Object.values(CellMarker).filter(
  marker => marker !== CellMarker.NONE
);

new InputController(canvas, {
  T_CELLS,
  UPGRADES,
  CAR_PALETTE,
  ACTIVE_CARS,
  Car
});

const PALETTES = [
  {
    id: 0,
    corner: "top-left",
    cx: 0,
    cy: 0,
    startAngle: 0 * Math.PI,
    endAngle: 0.5 * Math.PI,
  },
  {
    id: 1,
    corner: "top-right",
    cx: canvas.width,
    cy: 0,
    startAngle: 0.5 * Math.PI,
    endAngle: Math.PI,
  },
  {
    id: 2,
    corner: "bottom-right",
    cx: canvas.width,
    cy: canvas.height,
    startAngle: Math.PI,
    endAngle: 1.5 * Math.PI,
  },
  {
    id: 3,
    corner: "bottom-left",
    cx: 0,
    cy: canvas.height,
    startAngle: 1.5 * Math.PI,
    endAngle: 2 * Math.PI,
  }
];

const PALETTE_STYLE = {
  radius: 250,
  thickness: 80,
  bgAlpha: 0.7,
  carRadiusOffset: 40
};

const cluster = new CancerCluster(
  canvas.width / 2,
  canvas.height / 2
);

let currentMarkerIndex = 0;
let currentMarker = MARKER_ORDER[currentMarkerIndex];
TCellConfig.spawnMarker = currentMarker;

const images = await loadImages({
  T_CELL: {
    NONE: "../assets/tcell.png",
    CD19: "../assets/tcell_cd19.png",
    CD30: "../assets/tcell_cd30.png",
    CD3: "../assets/tcell_cd3.png",
    CD4: "../assets/tcell_cd4.png",
  },
  CAR: {
    CD19: "../assets/car_cd19.png",
    CD30: "../assets/car_cd30.png",
    CD3: "../assets/car_cd3.png",
    CD4: "../assets/car_cd4.png",
  },
  CANCER: {
    CD19: "../assets/cancer_cd19.png",
    CD30: "../assets/cancer_cd30.png",
    CD3: "../assets/cancer_cd3.png",
    CD4: "../assets/cancer_cd4.png",
  },
  UPGRADE: {
    SPEED: "../assets/upgrades/upgrade_speed.png",
    CHAINREACTION: "../assets/upgrades/upgrade_chainreaction.png",
    LIFETIME: "../assets/upgrades/upgrade_speed.png",
    DAMAGE: "../assets/upgrades/upgrade_speed.png"
  }
});

const bgImage = new Image();
bgImage.src = "../assets/background.png";
await new Promise(res => (bgImage.onload = res));

console.log("IMAGES READY");

const spawnSystem = new SpawnSystem({
  T_CELLS,
  CANCER_CELLS,
  UPGRADES,
  TCell,
  CancerCell,
  Upgrade,
  TCellConfig,
  images
}, canvas);

const PALETTE_SIZE = 60;
const PALETTE_PADDING = 20;

CAR_PALETTE.push({
  marker: CellMarker.CD19,
  x: PALETTE_PADDING,
  y: PALETTE_PADDING,
  size: PALETTE_SIZE
});

CAR_PALETTE.push({
  marker: CellMarker.CD30,
  x: PALETTE_PADDING + PALETTE_SIZE + 10,
  y: PALETTE_PADDING,
  size: PALETTE_SIZE
});

let lastTime = null;
start(images);

function start() {
  startGame();
  requestAnimationFrame(loop);
}

function loop(time) {
  if (lastTime === null) {
    lastTime = time;
    requestAnimationFrame(loop);
    return;
  }

  let deltaTime = (time - lastTime) / 1000;

  // Prevent huge jumps after tab switching
  const MAX_DELTA = 0.05; // 50ms (20 FPS minimum)
  deltaTime = Math.min(deltaTime, MAX_DELTA);
  
  lastTime = time;

  drawBackground();

  if (gameState === "victory") {
    victory(deltaTime);
    return;
  }

  cluster.update();

  spawnSystem.update(deltaTime);

  clearInvalidTargets(T_CELLS, CANCER_CELLS);
  assignTargets(T_CELLS, CANCER_CELLS);

  CANCER_CELLS.forEach(c => c.update(canvas.width, canvas.height, deltaTime, CANCER_CELLS));
  T_CELLS.forEach(c => c.update(canvas.width, canvas.height, deltaTime));
  UPGRADES.forEach(u => u.update(deltaTime));

  resolveKills(T_CELLS, CANCER_CELLS, deltaTime);
  removeDeadInstances();

  if (gameState === "playing" && CANCER_CELLS.length === 0) {
    gameState = "victory";
    victoryTimer = 5;
  }

  CANCER_CELLS.forEach(c => c.draw(ctx));
  T_CELLS.forEach(c => c.draw(ctx));
  drawPalettes();
  ACTIVE_CARS.forEach(car => car.draw(ctx, images));
  UPGRADES.forEach(u => u.draw(ctx, images));

  requestAnimationFrame(loop);
}

function removeDeadInstances() {
  for (let i = CANCER_CELLS.length - 1; i >= 0; i--) {
    if (!CANCER_CELLS[i].alive) {
      CANCER_CELLS.splice(i, 1);
    }
  }

  for (let i = T_CELLS.length - 1; i >= 0; i--) {
    if (!T_CELLS[i].alive) {
      T_CELLS.splice(i, 1);
    }
  }

  for (let i = UPGRADES.length - 1; i >= 0; i--) {
    if (!UPGRADES[i].alive) {
      UPGRADES.splice(i, 1);
    }
  }
}

function victory(deltaTime) {
  if (gameState === "victory") {
    victoryTimer -= deltaTime;

    drawVictoryMessage();

    if (victoryTimer <= 0) {
      startGame();
    }

    requestAnimationFrame(loop);
    return;
  }
}

function startGame() {
  // Clear cancer cells
  CANCER_CELLS.length = 0;

  spawnSystem.spawnMultipleCancerClusters(debug);

  gameState = "playing";

  T_CELLS.length = 0;
}

function drawVictoryMessage() {
  ctx.save();

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "white";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 50px Arial";

  ctx.fillText(
    "You defeated the cancer! Congrats!",
    canvas.width / 2,
    canvas.height / 2
  );

  ctx.restore();
}

function resolvePaletteAnchor(corner) {
  switch (corner) {
    case "top-left":
      return { cx: 0, cy: 0 };
    case "top-right":
      return { cx: canvas.width, cy: 0 };
    case "bottom-right":
      return { cx: canvas.width, cy: canvas.height };
    case "bottom-left":
      return { cx: 0, cy: canvas.height };
  }
}

function drawPalettes() {
  for (const palette of PALETTES) {
    drawPaletteBackground(palette);
    drawPaletteCars(palette);
  }
}

function drawPaletteBackground(palette) {
  const { cx, cy } = resolvePaletteAnchor(palette.corner);
  const { startAngle, endAngle } = palette;
  const { radius, thickness, bgAlpha } = PALETTE_STYLE;

  ctx.save();

  ctx.beginPath();
  ctx.arc(cx, cy, radius, startAngle, endAngle);
  ctx.arc(cx, cy, radius - thickness, endAngle, startAngle, true);
  ctx.closePath();

  const grad = ctx.createRadialGradient(
    cx,
    cy,
    radius - thickness,
    cx,
    cy,
    radius
  );

  grad.addColorStop(0, "rgba(140, 170, 190, 0.15)");
  grad.addColorStop(1, "rgba(90, 120, 140, 0.55)");

  ctx.fillStyle = grad;

  ctx.fill();

  ctx.restore();
}

function drawPaletteCars(palette) {
  const { cx, cy } = resolvePaletteAnchor(palette.corner);
  const { startAngle, endAngle, id: playerId } = palette;
  const { radius, thickness, carRadiusOffset } = PALETTE_STYLE;

  const R_inner = radius - thickness;
  const R_car = R_inner + carRadiusOffset;

  const count = CAR_TYPES.length;

  CAR_TYPES.forEach((marker, i) => {
    const t = count === 1 ? 0.5 : i / (count - 1);
    //const angle = startAngle + t * (endAngle - startAngle);
    const angle = (startAngle + 0.2) + t * ((endAngle - 0.2) - (startAngle + 0.2));

    const x = cx + Math.cos(angle) * R_car;
    const y = cy + Math.sin(angle) * R_car;

    const size = 54;

    CAR_PALETTE.push({
      marker,
      x: x - size / 2,
      y: y - size / 2,
      size,
      playerId
    });

    const img = images.CAR?.[marker];
    if (!img) return;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle + Math.PI / 2);

    ctx.shadowColor = "rgba(0, 0, 0, 0.45)";
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 3;

    ctx.drawImage(img, - size / 2, - size / 2, size, size);

    ctx.restore();
  });
}

function drawBackground() {
  ctx.drawImage(
    bgImage,
    0,
    0,
    canvas.width,
    canvas.height
  );
}
