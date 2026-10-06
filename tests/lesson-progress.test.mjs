import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import ts from "typescript";

const source = await readFile(new URL("../src/content/lessonProgress.ts", import.meta.url), "utf8");
const { outputText, diagnostics = [] } = ts.transpileModule(source, {
  compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
  },
  reportDiagnostics: true,
});
assert.equal(diagnostics.length, 0, "lesson progress helper should transpile cleanly");
const moduleUrl = `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`;
const { isMotionLessonComplete, persistMotionLessonCompletion } = await import(moduleUrl);

function createStorage() {
  const values = new Map();
  return {
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { values.set(key, String(value)); },
  };
}

test("lesson completion persists across app reloads", () => {
  const storage = createStorage();
  assert.equal(isMotionLessonComplete(storage), false);
  assert.equal(persistMotionLessonCompletion(storage), true);
  assert.equal(isMotionLessonComplete(storage), true);
});

test("completion remains session-valid when browser storage is blocked", () => {
  const blockedStorage = {
    getItem() { throw new Error("storage blocked"); },
    setItem() { throw new Error("storage blocked"); },
  };
  assert.equal(isMotionLessonComplete(blockedStorage), false);
  assert.equal(persistMotionLessonCompletion(blockedStorage), false);
});
