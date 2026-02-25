export class CancerCluster {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.rotation = 0;
  }

  update() {
    this.rotation += 0.001; // slow global rotation
  }
}
