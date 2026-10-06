export type BodyKind = "ball" | "cube";

export interface BodyState {
  id: number;
  kind: BodyKind;
  mass: number;
  restitution: number;
  x: number;
  y: number;
  speed: number;
  rotation: number;
  finished: boolean;
}

export interface EnergyState {
  potential: number;
  kinetic: number;
  total: number;
}

const RAMP_START_X = -3.2;
export const MAX_TRACK_BODIES = 14;
const RAMP_ANGLE = 0.235;
const RAMP_START_Y = 1.31;
const BODY_RADIUS = 0.22;
const TABLE_TOP = 0.14;
const RAMP_END_X = RAMP_START_X + (RAMP_START_Y - TABLE_TOP) / Math.tan(RAMP_ANGLE);
const bodyHalfHeight = (kind: BodyKind) => kind === "ball" ? BODY_RADIUS : BODY_RADIUS * 0.875;
const bodyHalfLength = (kind: BodyKind) => kind === "ball" ? BODY_RADIUS : BODY_RADIUS * 0.875;
const ROLLING_FACTOR = 5 / 7;

export class RampSolver {
  readonly fixedStep = 1 / 60;
  gravity = 9.81;
  elapsed = 0;
  private nextId = 1;
  readonly bodies: BodyState[] = [];

  hasReachedTarget(kind: BodyKind): boolean {
    return this.bodies.some(body => body.kind === kind && body.finished);
  }

  removeBody(id: number): boolean {
    const index = this.bodies.findIndex(body => body.id === id);
    if (index < 0) return false;
    this.bodies.splice(index, 1);
    return true;
  }

  energyFor(body: BodyState): EnergyState {
    // The first lesson uses a documented 1 kg reference mass. A solid sphere
    // rolls without slipping; the cube is modeled as sliding without rotation.
    const mass = body.mass;
    const potential = mass * this.gravity * Math.max(0, body.y - TABLE_TOP);
    const rotationalFactor = body.kind === "ball" ? 1 + 2 / 5 : 1;
    const kinetic = 0.5 * mass * body.speed ** 2 * rotationalFactor;
    return { potential, kinetic, total: potential + kinetic };
  }

  get totalEnergy(): EnergyState {
    return this.bodies.reduce<EnergyState>((sum, body) => {
      const energy = this.energyFor(body);
      sum.potential += energy.potential;
      sum.kinetic += energy.kinetic;
      sum.total += energy.total;
      return sum;
    }, { potential: 0, kinetic: 0, total: 0 });
  }

  reset(): void {
    this.elapsed = 0;
    this.nextId = 1;
    this.bodies.splice(0);
  }

  addBody(kind: BodyKind): BodyState {
    if (this.bodies.length >= MAX_TRACK_BODIES) {
      throw new Error(`The workbench supports at most ${MAX_TRACK_BODIES} bodies in this lesson.`);
    }
    const spacing = this.bodies.length;
    const x = RAMP_START_X + 0.38 + spacing * 0.52;
    const body: BodyState = {
      id: this.nextId++,
      kind,
      mass: 1,
      restitution: 0.35,
      x,
      y: x < RAMP_END_X
        ? RAMP_START_Y - (x - RAMP_START_X) * Math.tan(RAMP_ANGLE) + bodyHalfHeight(kind)
        : TABLE_TOP + bodyHalfHeight(kind),
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
        // Match the table height on the exact step the body crosses the ramp lip.
        // This avoids an upward snap from small mesh/solver rounding differences.
        body.y = body.x >= RAMP_END_X
          ? TABLE_TOP + bodyHalfHeight(body.kind)
          : RAMP_START_Y - (body.x - RAMP_START_X) * Math.tan(RAMP_ANGLE) + bodyHalfHeight(body.kind);
        if (body.kind === "ball") body.rotation -= (body.speed * dt) / BODY_RADIUS;
      } else {
        body.x += body.speed * dt;
        body.y = TABLE_TOP + bodyHalfHeight(body.kind);
        if (body.kind === "ball") body.rotation -= (body.speed * dt) / BODY_RADIUS;
        body.speed = Math.sign(body.speed) * Math.max(0, Math.abs(body.speed) - 0.12 * dt);
      }
      if (body.x >= 4.55) body.finished = true;
    }
    this.resolveTrackCollisions();
  }

  private resolveTrackCollisions(): void {
    const ordered = this.bodies.filter(body => !body.finished).sort((a, b) => a.x - b.x);
    for (let index = 0; index < ordered.length - 1; index += 1) {
      const rear = ordered[index];
      const front = ordered[index + 1];
      const rearOnRamp = rear.x < RAMP_END_X;
      const frontOnRamp = front.x < RAMP_END_X;
      if (rearOnRamp !== frontOnRamp) continue;

      const halfLength = bodyHalfLength(rear.kind) + bodyHalfLength(front.kind);
      const horizontalContactDistance = halfLength * (rearOnRamp ? Math.cos(RAMP_ANGLE) : 1);
      const overlap = rear.x + horizontalContactDistance - front.x;
      if (overlap <= 0 || rear.speed <= front.speed) continue;

      // One-dimensional, along-track impact. The minimum restitution keeps
      // this educational model stable when a pair has slight numerical overlap.
      const restitution = Math.min(rear.restitution, front.restitution);
      const combinedMass = rear.mass + front.mass;
      const rearSpeed = rear.speed;
      const frontSpeed = front.speed;
      rear.speed = ((rear.mass - restitution * front.mass) * rearSpeed
        + (1 + restitution) * front.mass * frontSpeed) / combinedMass;
      front.speed = ((front.mass - restitution * rear.mass) * frontSpeed
        + (1 + restitution) * rear.mass * rearSpeed) / combinedMass;
      rear.x = Math.max(rear.x - overlap * 0.5, RAMP_START_X + 0.01);
      front.x += overlap * 0.5;

      rear.y = rear.x < RAMP_END_X
        ? RAMP_START_Y - (rear.x - RAMP_START_X) * Math.tan(RAMP_ANGLE) + bodyHalfHeight(rear.kind)
        : TABLE_TOP + bodyHalfHeight(rear.kind);
      front.y = front.x < RAMP_END_X
        ? RAMP_START_Y - (front.x - RAMP_START_X) * Math.tan(RAMP_ANGLE) + bodyHalfHeight(front.kind)
        : TABLE_TOP + bodyHalfHeight(front.kind);
    }
  }
}
