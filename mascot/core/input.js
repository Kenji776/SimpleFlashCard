export const Input = {
  registerMascotHotkeys() {
    document.addEventListener('keydown', e => {
      if (e.key === 'f') this.playRandomSound?.('fart');
    });
  }
};
