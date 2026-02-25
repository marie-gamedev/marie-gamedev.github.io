import {
  TCELL_DETECTION_RADIUS
} from "../constants.js";

export function clearInvalidTargets(tCells, cancerCells) {
  const cancerSet = new Set(cancerCells);

  for (const tcell of tCells) {
    const target = tcell.target;

    if (!target) continue;

    if (
      !cancerSet.has(target) ||
      target.dying ||
      target.alive === false
    ) {
      tcell.clearTarget();
      tcell.bindingTarget = null;
    }
  }
}

export function assignTargets(tcells, cancerCells) {

  for (const tcell of tcells) {

    // Skip if already has target
    if (tcell.target) continue;
    if (tcell.retargetCooldown > 0) continue;

    // Skip if recently moved by player
    if (tcell.playerOverrideTime > 0) continue;

    let closest = null;
    let closestDist = TCELL_DETECTION_RADIUS;

    for (const cancer of cancerCells) {

      // Marker must match
      if (cancer.marker !== tcell.marker) continue;

      const dx = cancer.x - tcell.x;
      const dy = cancer.y - tcell.y;
      const dist = Math.hypot(dx, dy);

      // Only consider inside detection radius
      if (dist < closestDist) {
        closest = cancer;
        closestDist = dist;
      }
    }

    if (closest) {
      tcell.setTarget(closest);
    }
  }
}

function weightedRandom(candidates) {
  const total = candidates.reduce((sum, c) => sum + 1 / c.d, 0);
  let r = Math.random() * total;

  for (const c of candidates) {
    r -= 1 / c.d;
    if (r <= 0) return c.cancer;
  }
}

export function resolveKills(tCells, cancerCells, deltaTime) {

  // reset per-frame resolution flag
  for (const tcell of tCells) {
    tcell.hasResolvedThisFrame = false;
  }

  for (let i = cancerCells.length - 1; i >= 0; i--) {
    const cancer = cancerCells[i];

    if (cancer.dying) continue;

    for (const tcell of tCells) {

      if (tcell.hasResolvedThisFrame) continue;
      if (tcell.target !== cancer) continue;

      const dist = Math.hypot(
        tcell.x - cancer.x,
        tcell.y - cancer.y
      );

      if (dist > (tcell.size + cancer.size) * 0.4) continue;

      // binding phase
      if (tcell.bindingTarget === cancer) {
        tcell.bindingTimer -= deltaTime;

        if (tcell.bindingTimer > 0) continue;

        // resolve binding
        if (cancer.marker !== tcell.marker) {
          tcell.rejectedTargets.add(cancer);
        } else {
          cancer.dying = true;
          if (tcell.upgrades.chainReaction) {
            triggerChainReaction(cancer, cancerCells, 3);
            
            tcell.bursting = true;
            tcell.burstTimer = 0;
            tcell.clearTarget();
          }
          //onCancerKilled(cancer);
          //cancer.deathTimer = cancer.deathDuration;
        }

        // HARD RESET of interaction state
        tcell.bindingTarget = null;
        tcell.clearTarget();
        tcell.hasResolvedThisFrame = true;
        continue;
      }

      // start binding
      tcell.bindingTarget = cancer;
      tcell.bindingTimer = 0.5;
      tcell.hasResolvedThisFrame = true;
    }
  }
}

function triggerChainReaction(originCancer, cancerCells, count = 3) {

  const marker = originCancer.marker;

  const others = cancerCells
    .filter(c =>
      c !== originCancer &&
      !c.dying &&
      c.marker === marker   // 🔥 only matching marker
    );

  // Sort by distance
  others.sort((a, b) => {
    const da = Math.hypot(a.x - originCancer.x, a.y - originCancer.y);
    const db = Math.hypot(b.x - originCancer.x, b.y - originCancer.y);
    return da - db;
  });

  const delayStep = 120;

  for (let i = 0; i < Math.min(count, others.length); i++) {
    const target = others[i];

    setTimeout(() => {
      if (!target.dying) {
        target.dying = true;
      }
    }, delayStep * (i + 1));
  }
}