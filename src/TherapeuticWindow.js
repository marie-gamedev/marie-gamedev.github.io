export class TherapeuticWindow {
  constructor({
    initial = 0.4,
    threshold = 0.4,
    increaseRate = 0.3,
    decayRate = 0.05,
    smoothing = 0.05
  } = {}) {
    this.value = initial;

    this.threshold = threshold;
    this.increaseRate = increaseRate;
    this.decayRate = decayRate;
    this.smoothing = smoothing;

    this.smoothedStrength = 0;
  }

  update(deltaTime, rawStrength) {
    // smooth input strength
    this.smoothedStrength +=
      (rawStrength - this.smoothedStrength) * this.smoothing;

    let increase = 0;

    if (this.smoothedStrength > this.threshold) {
      const effectiveStrength =
        (this.smoothedStrength - this.threshold) /
        (1 - this.threshold);

      increase = effectiveStrength * this.increaseRate * deltaTime;
    }

    const decay = this.decayRate * deltaTime;

    this.value += increase;
    this.value -= decay;

    this.value = Math.max(0, Math.min(1, this.value));
  }

  drawTherapeuticWindow(ctx) {
    const x = 50;
    const y = canvas.height - 40;
    const width = 300;
    const height = 20;
  
    // background
    ctx.fillStyle = "#333";
    ctx.fillRect(x, y, width, height);
  
    // fill
    ctx.fillStyle = therapeuticColor(this.value)
    ctx.fillRect(x, y, width * this.value, height);
  
    // border
    ctx.strokeStyle = "#fff";
    ctx.strokeRect(x, y, width, height);
  }

  getValue() {
    return this.value;
  }

  getStrength() {
    return this.smoothedStrength;
  }

  
}

function therapeuticColor(value) {
  // value: 0 → 1
  const hue = (1 - value) * 120; // 120 (green) → 0 (red)
  return `hsl(${hue}, 80%, 50%)`;
}
