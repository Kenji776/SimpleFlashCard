export const Idle = {
  registerMascotIdleTimer() {
    if (this.idleTimer) clearInterval(this.idleTimer);
    this.idleTimer = setInterval(() => { this.idleSeconds = (this.idleSeconds || 0) + 1; }, 1000);
  }
};
