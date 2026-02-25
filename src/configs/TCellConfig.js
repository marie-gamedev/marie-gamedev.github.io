import { CellMarker } from "../Utilities/CellMarker.js";

export const TCellConfig = {
  size: 125,

  baseSpeed: 22,
  chaseSpeedMultiplier: 2,

  lifetime: 20,
  deathDuration: 0.25,

  spawnMarker: CellMarker.NONE,

  upgradeSpeedMultiplier: 3,
  upgradeLifetimeMultiplier: 2
};