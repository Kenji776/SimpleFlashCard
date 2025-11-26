export const Effects = {
  explodeEffect(opts = {}) {
    const x = opts.x ?? window.innerWidth / 2;
    const y = opts.y ?? window.innerHeight / 2;
    const div = document.createElement('div');
    div.className = 'explosion-effect';
    Object.assign(div.style, {
      position: 'fixed',
      left: `${x - 250}px`,
      top: `${y - 250}px`,
      width: '500px',
      height: '500px',
      backgroundImage: `url(${this.buildMascotMediaUrl("explosion.gif", "img")})`,
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      zIndex: 9999
    });
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 1000);
  }
};
