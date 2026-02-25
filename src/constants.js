export const CANCER_PROLIFERATION_RADIUS = 60; // px
export const CANCER_PROLIFERATION_TIME = 10;    // seconds
export const CANCER_PROLIFERATION_TIME_VARIANCE = 0.4;
export const CANCER_PROLIFERATION_CHANCE = 0.15; // 25% chance per attempt
export const MAX_CANCER_CELLS = 50;

export const CELL_SPAWN_DURATION = 2.5; // seconds
export const CELL_SPAWN_START_SCALE = 0.4;

export const UPGRADE_SPAWN_INTERVAL = 4;
export const UPGRADE_SPAWN_CHANCE = 0.4;
export const UPGRADE_SIZE = 90;
export const UPGRADE_LIFETIME = 15;

export const TCELL_SWIPE_RADIUS = 50;
export const TCELL_SWIPE_IMPULSE = 1.5;

export const TCELL_SPAWN_BORDER = {
  padding: 10,        // distance from exact screen edge
  thickness: 30      // how deep into the screen they can spawn
};

export const UPGRADE_TYPE = Object.freeze({
  SPEED: "SPEED",
  CHAINREACTION: "CHAINREACTION"
  //LIFETIME: "LIFETIME",
  //DAMAGE: "DAMAGE"
});

export const UPGRADE_APPLY_MODE = Object.freeze({
  SINGLE: "SINGLE",
  GLOBAL: "GLOBAL"
})

export const TCELL_DETECTION_RADIUS = 220;