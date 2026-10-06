import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/physics/RampSolver.ts", import.meta.url), "utf8");
const { outputText, diagnostics = [] } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
  reportDiagnostics: true,
});
assert.equal(diagnostics.length, 0, "solver should transpile cleanly");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
const { RampSolver } = await import(moduleUrl);

test("only a ball reaching the target completes the ball lesson", () => {
  const simulation = new RampSolver();
  const cube = simulation.addBody("cube");
  for (let i = 0; i < 1800 && !cube.finished; i += 1) simulation.step();
  assert.equal(cube.finished, true, "cube should travel through the workbench");
  assert.equal(simulation.hasReachedTarget("ball"), false);

  const ball = simulation.addBody("ball");
  for (let i = 0; i < 1800 && !ball.finished; i += 1) simulation.step();
  assert.equal(ball.finished, true, "ball should travel through the workbench");
  assert.equal(simulation.hasReachedTarget("ball"), true);
});

test("reset clears active bodies, elapsed time, and target completion", () => {
  const simulation = new RampSolver();
  const ball = simulation.addBody("ball");
  for (let i = 0; i < 1800 && !ball.finished; i += 1) simulation.step();
  assert.equal(simulation.hasReachedTarget("ball"), true);

  simulation.reset();
  assert.equal(simulation.elapsed, 0);
  assert.equal(simulation.bodies.length, 0);
  assert.equal(simulation.hasReachedTarget("ball"), false);
  assert.equal(simulation.addBody("ball").id, 1, "entity IDs restart deterministically");
});

test("removing one selected body leaves the rest of the simulation intact", () => {
  const simulation = new RampSolver();
  const first = simulation.addBody("ball");
  const second = simulation.addBody("cube");

  assert.equal(simulation.removeBody(first.id), true);
  assert.deepEqual(simulation.bodies.map(body => body.id), [second.id]);
  assert.equal(simulation.removeBody(first.id), false, "unknown IDs should be ignored");
});

test("fixed-step runs are deterministic for matching inputs", () => {
  const run = () => {
    const simulation = new RampSolver();
    simulation.gravity = 3.71;
    simulation.addBody("ball");
    for (let i = 0; i < 240; i += 1) simulation.step();
    return simulation.bodies.map(({ id, kind, x, y, speed, rotation, finished }) => ({
      id, kind, x, y, speed, rotation, finished,
    }));
  };

  assert.deepEqual(run(), run());
});

test("ramp meets the table without an upward hop", () => {
  const simulation = new RampSolver();
  const ball = simulation.addBody("ball");
  let previousY = ball.y;
  let crossedRampLip = false;
  for (let i = 0; i < 600 && !crossedRampLip; i += 1) {
    simulation.step();
    assert.ok(ball.y <= previousY + 1e-9, "the body must not jump upward at the ramp-to-table transition");
    if (ball.x >= 1.72) {
      assert.ok(Math.abs(ball.y - previousY) < 0.03, "the body should meet the tabletop without a visible vertical snap");
    }
    previousY = ball.y;
    crossedRampLip = ball.x >= 1.72;
  }
  assert.equal(crossedRampLip, true, "the ball should reach the level table");
  assert.ok(Math.abs(ball.y - 0.64) < 0.03, "the body should meet the raised tabletop at its surface height");
});

test("rolling ball energy transfers from height to motion on the ramp", () => {
  const simulation = new RampSolver();
  const ball = simulation.addBody("ball");
  const initialEnergy = simulation.energyFor(ball).total;
  for (let i = 0; i < 60; i += 1) simulation.step();
  const energy = simulation.energyFor(ball);

  assert.ok(energy.kinetic > 0, "the falling ball gains kinetic energy");
  assert.ok(energy.potential < initialEnergy, "the ball loses potential energy as it descends");
  assert.ok(Math.abs(energy.total - initialEnergy) / initialEnergy < 0.02,
    "the rolling model should conserve mechanical energy within the fixed-step integration tolerance");
  assert.deepEqual(simulation.totalEnergy, energy, "the lab readout should sum the energy of all bodies");
});

test("different body types collide on the ramp using mass and restitution", () => {
  const simulation = new RampSolver();
  const cube = simulation.addBody("cube");
  const ball = simulation.addBody("ball");
  cube.mass = 2;
  ball.mass = 1;
  cube.restitution = 0.5;
  ball.restitution = 0.5;

  let impactObserved = false;
  let impactMomentumError = Number.POSITIVE_INFINITY;
  for (let i = 0; i < 240 && !impactObserved; i += 1) {
    const momentumBefore = cube.mass * cube.speed + ball.mass * ball.speed;
    simulation.step();
    if (cube.speed < ball.speed && cube.x < 1.7) {
      const gravityImpulse = (cube.mass + ball.mass * (5 / 7))
        * simulation.gravity * Math.sin(0.235) * simulation.fixedStep;
      const momentumAfter = cube.mass * cube.speed + ball.mass * ball.speed;
      impactMomentumError = Math.abs(momentumAfter - momentumBefore - gravityImpulse);
      impactObserved = true;
    }
  }

  assert.equal(impactObserved, true, "the faster cube should catch the rolling ball");
  assert.ok(cube.x + (0.22 * 0.875) * Math.cos(0.235) <= ball.x - 0.22 * Math.cos(0.235) + 1e-6,
    "collision resolution should keep the bodies from overlapping");
  assert.ok(impactMomentumError < 1e-8, "the impact should conserve along-track momentum, aside from gravity's step impulse");
  assert.ok(simulation.energyFor(cube).kinetic > 0, "the rebound should retain physically meaningful motion");
});
