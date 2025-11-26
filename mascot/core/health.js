export const Health = {
  createHealthBar() {
    const bar = document.createElement('div');
    bar.className = 'life-bar';
    const fill = document.createElement('div');
    fill.className = 'life-fill';
    bar.appendChild(fill);
    this.container.appendChild(bar);
    this._lifeBar = bar;
    this._lifeFill = fill;
  },

  updateHealthBar() {
    if (!this._lifeFill) return;
    const pct = Math.max(0, Math.min(100, this.health));
    this._lifeFill.style.width = pct + '%';
  }
};
