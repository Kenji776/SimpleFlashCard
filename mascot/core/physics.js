export const Physics = {
  _applyPos() {
    this.container.style.left = `${this._pos.x}px`;
    this.container.style.top = `${this._pos.y}px`;
    this.container.style.transform = `rotate(${this._angle}rad)`;
  },

  enableThrowPhysics() {
    if (this._phEnabled || !this.container) return;
    const rect = this.container.getBoundingClientRect();
    this.container.style.position = 'fixed';
    this._pos = { x: rect.left, y: rect.top };
    this._phEnabled = true;
  }
};
