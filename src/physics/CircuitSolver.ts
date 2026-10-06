export type CircuitComponent =
  | { id: string; kind: "battery"; from: string; to: string; voltage: number; internalResistance: number }
  | { id: string; kind: "resistor" | "lamp" | "sensor"; from: string; to: string; resistance: number }
  | { id: string; kind: "switch"; from: string; to: string; closed: boolean }
  | { id: string; kind: "motor"; from: string; to: string; resistance: number; torqueConstant: number; angularVelocity: number }
  | { id: string; kind: "generator"; from: string; to: string; internalResistance: number; voltageConstant: number; angularVelocity: number };

export interface CircuitReading {
  voltage: number;
  current: number;
  power: number;
  torque?: number;
}

/** Solves a resistive DC circuit with batteries, lamps, switches, motors, and generators. */
export class CircuitSolver {
  readonly components = new Map<string, CircuitComponent>();
  readonly readings = new Map<string, CircuitReading>();

  add(component: CircuitComponent): void {
    if (!component.id || this.components.has(component.id)) throw new Error(`Component ID is empty or duplicated: ${component.id}`);
    if (!component.from || !component.to || component.from === component.to) {
      throw new Error(`Component ${component.id} must connect two different circuit nodes.`);
    }
    for (const value of Object.values(component)) {
      if (typeof value === "number" && !Number.isFinite(value)) throw new RangeError(`Component ${component.id} contains a non-finite value.`);
    }
    const resistance = "resistance" in component ? component.resistance
      : component.kind === "battery" || component.kind === "generator" ? component.internalResistance : 1;
    if (resistance < 0 || (component.kind !== "switch" && resistance === 0)) {
      throw new RangeError(`Component ${component.id} must have positive resistance.`);
    }
    this.components.set(component.id, { ...component });
  }

  /** Solve node voltages, currents, power, and motor torque for one circuit snapshot. */
  solve(): ReadonlyMap<string, CircuitReading> {
    const nodes = [...new Set([...this.components.values()].flatMap(component => [component.from, component.to]))].sort();
    if (nodes.length < 2) return this.readings;
    const ground = nodes[0];
    const unknowns = nodes.slice(1);
    const index = new Map(unknowns.map((node, i) => [node, i]));
    const size = unknowns.length;
    const matrix = Array.from({ length: size }, () => Array<number>(size).fill(0));
    const current = Array<number>(size).fill(0);
    const equivalent = new Map<string, { resistance: number; emf: number }>();

    for (const component of this.components.values()) {
      if (component.kind === "switch" && !component.closed) continue;
      const resistance = component.kind === "switch" ? 0.001
        : "resistance" in component ? component.resistance
          : component.internalResistance;
      const emf = component.kind === "battery" ? component.voltage
        : component.kind === "motor" ? component.torqueConstant * component.angularVelocity
          : component.kind === "generator" ? component.voltageConstant * component.angularVelocity : 0;
      equivalent.set(component.id, { resistance, emf });
      const conductance = 1 / resistance;
      const from = index.get(component.from);
      const to = index.get(component.to);
      if (from !== undefined) matrix[from][from] += conductance;
      if (to !== undefined) matrix[to][to] += conductance;
      if (from !== undefined && to !== undefined) {
        matrix[from][to] -= conductance;
        matrix[to][from] -= conductance;
      }
      const sourceCurrent = emf * conductance;
      if (from !== undefined) current[from] += sourceCurrent;
      if (to !== undefined) current[to] -= sourceCurrent;
    }

    const solution = solveLinearSystem(matrix, current);
    const voltages = new Map<string, number>([[ground, 0]]);
    unknowns.forEach((node, i) => voltages.set(node, solution[i] ?? 0));
    this.readings.clear();
    for (const component of this.components.values()) {
      const model = equivalent.get(component.id);
      if (!model) {
        this.readings.set(component.id, { voltage: 0, current: 0, power: 0 });
        continue;
      }
      const voltage = (voltages.get(component.from) ?? 0) - (voltages.get(component.to) ?? 0);
      const amps = (voltage - model.emf) / model.resistance;
      const reading: CircuitReading = { voltage, current: amps, power: voltage * amps };
      if (component.kind === "motor") reading.torque = component.torqueConstant * amps;
      this.readings.set(component.id, reading);
    }
    return this.readings;
  }
}

function solveLinearSystem(matrix: number[][], vector: number[]): number[] {
  const size = vector.length;
  const rows = matrix.map((row, index) => [...row, vector[index]]);
  for (let column = 0; column < size; column += 1) {
    let pivot = column;
    for (let row = column + 1; row < size; row += 1) {
      if (Math.abs(rows[row][column]) > Math.abs(rows[pivot][column])) pivot = row;
    }
    if (Math.abs(rows[pivot][column]) < 1e-12) continue;
    [rows[column], rows[pivot]] = [rows[pivot], rows[column]];
    const divisor = rows[column][column];
    for (let entry = column; entry <= size; entry += 1) rows[column][entry] /= divisor;
    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = rows[row][column];
      for (let entry = column; entry <= size; entry += 1) rows[row][entry] -= factor * rows[column][entry];
    }
  }
  return rows.map((row, index) => Math.abs(matrix[index][index]) < 1e-12 ? 0 : row[size]);
}
