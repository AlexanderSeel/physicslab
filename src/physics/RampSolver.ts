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

const RAMP_START_X = -3.2;
const RAMP_END_X = 1.9;
const RAMP_ANGLE = 0.235;
const RAMP_START_Y = 1.31;
const BODY_RADIUS = 0.22;
const TABLE_TOP = 0.14;
const bodyHalfHeight = (kind: BodyKind) => kind === "ball" ? BODY_RADIUS : BODY_RADIUS * 0.875;
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
      y: RAMP_START_Y - (0.38 + spacing * 0.52) * Math.tan(RAMP_ANGLE) + bodyHalfHeight(kind),
      speed: 0,
      rotation: 0,
      finished: false,
    };
    this.bodies.push(body);
    return body;
  }

  step(dt = this.fixedStep): void {
    this.elapsed += dt;
    const rampAcceleration = this.gravity * Math.sin(RAMP_ANGLE);
    for (const body of this.bodies) {
      if (body.finished) continue;
      if (body.x < RAMP_END_X) {
        body.speed += rampAcceleration * (body.kind === "ball" ? ROLLING_FACTOR : 1) * dt;
        body.x += body.speed * Math.cos(RAMP_ANGLE) * dt;
        body.y = RAMP_START_Y - (body.x - RAMP_START_X) * Math.tan(RAMP_ANGLE) + bodyHalfHeight(body.kind);
        if (body.kind === "ball") body.rotation -= (body.speed * dt) / BODY_RADIUS;
      } else {
        body.x += body.speed * dt;
        body.y = TABLE_TOP + bodyHalfHeight(body.kind);
        if (body.kind === "ball") body.rotation -= (body.speed * dt) / BODY_RADIUS;
        body.speed = Math.max(0, body.speed - 0.12 * dt);
      }
      if (body.x >= 4.55) body.finished = true;
    }
  }
}
