export const Audio = {
  playRandomSound(category) {
    if (!this.urls?.sounds?.[category]) return;
    const pick = this.urls.sounds[category][Math.floor(Math.random() * this.urls.sounds[category].length)];
    this.playSound(category, pick);
  },

  playSound(category, soundName) {
    if (this.mute) return;
    const url = this.buildMascotMediaUrl(soundName, "sfx");
    try { new Audio(url).play(); } catch (e) { console.warn("Play failed", e); }
  }
};
