import type { BodyKind } from "../physics/RampSolver";

const MAX_EXPERIMENT_BODIES = 14;

export interface ExperimentSetup {
  gravity: number;
  bodies: Array<Pick<ExperimentBody, "kind" | "mass" | "restitution">>;
}

export interface ExperimentBody {
  kind: BodyKind;
  mass: number;
  restitution: number;
}

export interface PhysicsLabDocument extends ExperimentSetup {
  format: "physicslab";
  version: 1;
}

export function createPhysicsLabDocument(setup: ExperimentSetup): PhysicsLabDocument {
  const document: PhysicsLabDocument = {
    format: "physicslab",
    version: 1,
    gravity: setup.gravity,
    bodies: setup.bodies.map(({ kind, mass, restitution }) => ({ kind, mass, restitution })),
  };
  validateDocument(document);
  return document;
}

export function serializePhysicsLabDocument(setup: ExperimentSetup): string {
  return `${JSON.stringify(createPhysicsLabDocument(setup), null, 2)}\n`;
}

export function parsePhysicsLabDocument(serialized: string): PhysicsLabDocument {
  let input: unknown;
  try {
    input = JSON.parse(serialized);
  } catch {
    throw new Error("The file is not valid JSON.");
  }
  validateDocument(input);
  return input;
}

function validateDocument(input: unknown): asserts input is PhysicsLabDocument {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("The file must contain a PhysicsLab experiment object.");
  }
  const document = input as Record<string, unknown>;
  if (document.format !== "physicslab" || document.version !== 1) {
    throw new Error("This PhysicsLab file format or version is not supported.");
  }
  if (typeof document.gravity !== "number" || !Number.isFinite(document.gravity)
      || document.gravity < 1 || document.gravity > 25) {
    throw new Error("Gravity must be between 1 and 25 m/s².");
  }
  if (!Array.isArray(document.bodies) || document.bodies.length > MAX_EXPERIMENT_BODIES) {
    throw new Error(`An experiment can contain at most ${MAX_EXPERIMENT_BODIES} bodies.`);
  }
  for (const [index, item] of document.bodies.entries()) {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new Error(`Body ${index + 1} is invalid.`);
    }
    const body = item as Record<string, unknown>;
    if (body.kind !== "ball" && body.kind !== "cube") {
      throw new Error(`Body ${index + 1} has an unsupported type.`);
    }
    if (typeof body.mass !== "number" || !Number.isFinite(body.mass)
        || body.mass < 0.25 || body.mass > 5) {
      throw new Error(`Body ${index + 1} mass must be between 0.25 and 5 kg.`);
    }
    if (typeof body.restitution !== "number" || !Number.isFinite(body.restitution)
        || body.restitution < 0 || body.restitution > 0.9) {
      throw new Error(`Body ${index + 1} bounce must be between 0 and 0.9.`);
    }
  }
}
