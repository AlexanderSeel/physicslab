import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/content/experimentFile.ts", import.meta.url), "utf8");
const { outputText, diagnostics = [] } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  reportDiagnostics: true,
});
assert.equal(diagnostics.length, 0, "experiment file module should transpile cleanly");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
const { parsePhysicsLabDocument, serializePhysicsLabDocument } = await import(moduleUrl);

test("versioned experiment setup round-trips its gravity and body properties", () => {
  const setup = {
    gravity: 3.71,
    bodies: [
      { kind: "ball", mass: 1.5, restitution: 0.75 },
      { kind: "cube", mass: 3, restitution: 0.1 },
    ],
  };
  const parsed = parsePhysicsLabDocument(serializePhysicsLabDocument(setup));
  assert.equal(parsed.format, "physicslab");
  assert.equal(parsed.version, 1);
  assert.deepEqual({ gravity: parsed.gravity, bodies: parsed.bodies }, setup);
});

test("import rejects invalid values and unsupported schema versions", () => {
  assert.throws(() => parsePhysicsLabDocument("{"), /valid JSON/);
  assert.throws(() => parsePhysicsLabDocument(JSON.stringify({ format: "physicslab", version: 2, gravity: 9.81, bodies: [] })), /version is not supported/);
  assert.throws(() => parsePhysicsLabDocument(JSON.stringify({ format: "physicslab", version: 1, gravity: 26, bodies: [] })), /Gravity must be between/);
  assert.throws(() => parsePhysicsLabDocument(JSON.stringify({ format: "physicslab", version: 1, gravity: 9.81, bodies: [{ kind: "ball", mass: 50, restitution: 0.3 }] })), /mass must be between/);
});

test("import limits setup size and validates each body", () => {
  const oversized = Array.from({ length: 33 }, () => ({ kind: "ball", mass: 1, restitution: 0.3 }));
  assert.throws(() => parsePhysicsLabDocument(JSON.stringify({ format: "physicslab", version: 1, gravity: 9.81, bodies: oversized })), /at most 32/);
  assert.throws(() => parsePhysicsLabDocument(JSON.stringify({ format: "physicslab", version: 1, gravity: 9.81, bodies: [{ kind: "spring", mass: 1, restitution: 0.3 }] })), /unsupported type/);
});
