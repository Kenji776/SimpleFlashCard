import { MascotBase } from './core/mascot-base.js';
import * as UI from './core/ui.js';
import * as Idle from './core/idle.js';
import * as Input from './core/input.js';
import * as Audio from './core/audio.js';
import * as Physics from './core/physics.js';
import * as Effects from './core/effects.js';
import * as Vehicles from './core/vehicles.js';
import * as Health from './core/health.js';
import * as Offscreen from './core/offscreen.js';

export class Mascot extends MascotBase {
  constructor(data, apiClient) {
    super(data, apiClient);
    Object.assign(this, UI, Idle, Input, Audio, Physics, Effects, Vehicles, Health, Offscreen);
  }
}
