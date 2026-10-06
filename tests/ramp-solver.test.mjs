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
    previousY = ball.y;
    crossedRampLip = ball.y >= 0.36 - 1e-9;
  }
  assert.equal(crossedRampLip, true, "the ball should reach the level table");
  assert.ok(Math.abs(ball.y - 0.36) < 0.03, "the body should meet the table at its surface height");
});
