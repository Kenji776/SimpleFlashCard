export const UI = {
  createMascotImageContainer() {
    const mascotId = `mascot-image-${this.name}`;
    const existing = document.getElementById(mascotId);
    if (existing) existing.remove();
    const div = document.createElement('div');
    div.id = mascotId;
    div.className = `${this.defaultMascotClass || "happy"} mascot-image`;
    const container = document.getElementById(this.containerName);
    if (!container) throw new Error("Mascot container not found");
    container.appendChild(div);
    return div;
  },

  setMood(moodName) {
    if (!this.moodImages?.[moodName]) return;
    this.currentStatus.value = moodName;
    this.setMascotImage(this.moodImages[moodName]);
  },

  setMascotImage(img) {
    const url = this.buildMascotMediaUrl(img, "img");
    this.mascotDiv.style.backgroundImage = `url(${url})`;
  },

  preloadMascotImages() {
    for (let k in this.moodImages) {
      const url = this.buildMascotMediaUrl(this.moodImages[k], "img");
      const img = new Image();
      img.src = url;
    }
  }
};
