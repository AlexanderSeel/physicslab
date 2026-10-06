export type BodyKind = "ball" | "cube";

export interface BodyState {
  id: number;
  kind: BodyKind;
  x: number;
  y: number;
  speed: number;
  rotation: number;
  finished: boolean;
}

const RAMP_START_X = -3.05;
const RAMP_END_X = 1.75;
const RAMP_ANGLE = 0.235;
const RAMP_START_Y = 1.12;
const BODY_RADIUS = 0.22;
const ROLLING_FACTOR = 5 / 7;

export class RampSolver {
  readonly fixedStep = 1 / 60;
  gravity = 9.81;
  elapsed = 0;
  private nextId = 1;
  readonly bodies: BodyState[] = [];

  reset(): void {
    this.elapsed = 0;
    this.nextId = 1;
    this.bodies.splice(0);
  }

  addBody(kind: BodyKind): BodyState {
    const spacing = this.bodies.length % 4;
    const body: BodyState = {
      id: this.nextId++,
      kind,
      x: RAMP_START_X + 0.38 + spacing * 0.52,
      y: RAMP_START_Y - spacing * Math.tan(RAMP_ANGLE) * 0.52 + BODY_RADIUS,
      speed: 0,
      rotation: 0,
      finished: false,
    };
    this.bodies.push(body);
    return body;
  }

  step(dt = this.fixedStep): void {
    this.elapsed += dt;
    const rampAcceleration = this.gravity * Math.sin(RAMP_ANGLE) * ROLLING_FACTOR;
    for (const body of this.bodies) {
      if (body.finished) continue;
      if (body.x < RAMP_END_X) {
        body.speed += rampAcceleration * dt;
        body.x += body.speed * Math.cos(RAMP_ANGLE) * dt;
        body.y = RAMP_START_Y - (body.x - RAMP_START_X) * Math.tan(RAMP_ANGLE) + BODY_RADIUS;
        body.rotation -= (body.speed * dt) / BODY_RADIUS;
      } else {
        body.x += body.speed * dt;
        body.y = BODY_RADIUS;
        body.rotation -= (body.speed * dt) / BODY_RADIUS;
        body.speed = Math.max(0, body.speed - 0.12 * dt);
      }
      if (body.x >= 4.55) body.finished = true;
    }
  }
}
