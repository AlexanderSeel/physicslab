export interface TankState {
  id: string;
  capacity: number;
  volume: number;
  crossSection: number;
  elevation: number;
}

export interface PipeState {
  id: string;
  from: string;
  to: string;
  resistance: number;
  valve: number;
  pumpPressure: number;
  flow: number;
}

/** Deterministic low-cost liquid network model; volumes are in m³ and pressure in Pa. */
export class FluidNetwork {
  readonly tanks = new Map<string, TankState>();
  readonly pipes = new Map<string, PipeState>();
  gravity = 9.81;
  density = 1000;

  addTank(tank: TankState): void {
    if (!tank.id || this.tanks.has(tank.id)) throw new Error(`Tank ID is empty or duplicated: ${tank.id}`);
    if (!(tank.capacity > 0) || !(tank.crossSection > 0) || tank.volume < 0 || tank.volume > tank.capacity) {
      throw new RangeError(`Tank ${tank.id} has invalid capacity, area, or volume.`);
    }
    this.tanks.set(tank.id, { ...tank });
  }

  addPipe(pipe: Omit<PipeState, "flow">): void {
    if (!pipe.id || this.pipes.has(pipe.id)) throw new Error(`Pipe ID is empty or duplicated: ${pipe.id}`);
    if (!this.tanks.has(pipe.from) || !this.tanks.has(pipe.to) || pipe.from === pipe.to) {
      throw new Error(`Pipe ${pipe.id} must connect two different existing tanks.`);
    }
    if (!(pipe.resistance > 0) || pipe.valve < 0 || pipe.valve > 1) {
      throw new RangeError(`Pipe ${pipe.id} has invalid resistance or valve opening.`);
    }
    this.pipes.set(pipe.id, { ...pipe, flow: 0 });
  }

  pressureAtTank(id: string): number {
    const tank = this.requireTank(id);
    return this.density * this.gravity * (tank.elevation + tank.volume / tank.crossSection);
  }

  step(dt: number): void {
    if (!(dt > 0) || !Number.isFinite(dt)) throw new RangeError("Fluid step must be finite and positive.");
    for (const pipe of this.pipes.values()) {
      const from = this.requireTank(pipe.from);
      const to = this.requireTank(pipe.to);
      if (pipe.valve === 0) {
        pipe.flow = 0;
        continue;
      }
      const requestedFlow = (this.pressureAtTank(from.id) - this.pressureAtTank(to.id) + pipe.pumpPressure)
        / pipe.resistance * pipe.valve;
      const source = requestedFlow >= 0 ? from : to;
      const destination = requestedFlow >= 0 ? to : from;
      const requestedVolume = Math.abs(requestedFlow) * dt;
      const moved = Math.min(requestedVolume, source.volume, destination.capacity - destination.volume);
      source.volume -= moved;
      destination.volume += moved;
      pipe.flow = Math.sign(requestedFlow) * moved / dt;
    }
  }

  buoyantForce(displacedVolume: number): number {
    if (displacedVolume < 0 || !Number.isFinite(displacedVolume)) {
      throw new RangeError("Displaced volume must be finite and non-negative.");
    }
    return this.density * this.gravity * displacedVolume;
  }

  private requireTank(id: string): TankState {
    const tank = this.tanks.get(id);
    if (!tank) throw new Error(`Unknown tank: ${id}`);
    return tank;
  }
}
