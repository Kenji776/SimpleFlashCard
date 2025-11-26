export class MascotBase {
  constructor(constructorData, serverConnection) {
    if (!serverConnection) throw new Error("No server connection provided");
    this.apiClient = serverConnection;
    if (typeof constructorData === 'object') Object.assign(this, constructorData);
    this.name = this.name || "Default Mascot";
    this.containerName = this.containerName || "mascot-container";
    this.mute = false;
    this.isActive = true;
    console.log("MascotBase initialized:", this.name);
  }
}
