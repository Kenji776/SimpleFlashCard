import { MascotBase } from "./mascot/core/mascot-base.js";
import * as UI from "./mascot/core/ui.js";
import * as Idle from "./mascot/core/idle.js";
import * as Input from "./mascot/core/input.js";
import * as Audio from "./mascot/core/audio.js";
import * as Physics from "./mascot/core/physics.js";
import * as Effects from "./mascot/core/effects.js";
import * as Vehicles from "./mascot/core/vehicles.js";
import * as Health from "./mascot/core/health.js";
import * as Offscreen from "./mascot/core/offscreen.js";

export class Mascot extends MascotBase {
	constructor(data, apiClient) {
		super(data, apiClient);
		Object.assign(this, UI, Idle, Input, Audio, Physics, Effects, Vehicles, Health, Offscreen);
	}
}

window.mascot = Mascot;