export const Offscreen = {
  startOffscreenWatcher() {
    this._offscreenInterval = setInterval(() => {
      const rect = this.container.getBoundingClientRect();
      const H = window.innerHeight, W = window.innerWidth;
      if (rect.bottom < 0 || rect.top > H || rect.right < 0 || rect.left > W) {
        this._resetToOrigin();
      }
    }, 3000);
  },

  _resetToOrigin() {
    this._pos.x = 20; this._pos.y = 20;
    this._applyPos?.();
  }
};
