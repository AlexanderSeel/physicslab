import { readFileSync, statSync } from "node:fs";
import { dirname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const issues = [];

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    issues.push(`${label}: ${error.message}`);
    return null;
  }
}

function requireText(value, label) {
  if (typeof value !== "string" || value.trim().length === 0) {
    issues.push(`${label} must be a non-empty string`);
  }
}

function requireSafeRelativePath(value, label) {
  if (typeof value !== "string" || value.length === 0 || value.includes("\\") || value.startsWith("/")) {
    issues.push(`${label} must be a safe repository-relative path`);
    return false;
  }
  const segments = value.split("/");
  if (segments.some(segment => segment === ".." || segment === "." || segment === "")) {
    issues.push(`${label} must not contain traversal or empty path segments`);
    return false;
  }
  return true;
}

const lesson = readJson(resolve(root, "src/content/motion-01.json"), "motion-01 lesson");
if (lesson) {
  if (lesson.schemaVersion !== 1) issues.push("motion-01 lesson schemaVersion must be 1");
  if (lesson.id !== "motion-01") issues.push("motion-01 lesson id must be motion-01");
  for (const locale of ["en", "de"]) {
    const copy = lesson.locales?.[locale];
    if (!copy) {
      issues.push(`motion-01 is missing locale ${locale}`);
      continue;
    }
    for (const field of ["fact", "factTitle", "simple", "learn", "technical"]) {
      requireText(copy[field], `motion-01.${locale}.${field}`);
    }
    requireText(lesson.source?.title?.[locale], `motion-01.source.title.${locale}`);
    requireText(lesson.formula?.title?.[locale], `motion-01.formula.title.${locale}`);
    requireText(lesson.formula?.caption?.[locale], `motion-01.formula.caption.${locale}`);
  }
  requireText(lesson.formula?.expression, "motion-01.formula.expression");
  try {
    const sourceUrl = new URL(lesson.source?.url);
    if (sourceUrl.protocol !== "https:") issues.push("motion-01 source URL must use HTTPS");
  } catch {
    issues.push("motion-01 source URL must be a valid absolute URL");
  }
}

const manifest = readJson(resolve(root, "public/assets/asset-manifest.json"), "asset manifest");
if (manifest) {
  if (manifest.schemaVersion !== 1) issues.push("asset manifest schemaVersion must be 1");
  if (manifest.coordinateSystem !== "Y-up glTF, meter units") issues.push("asset manifest coordinate system is unexpected");
  if (!Array.isArray(manifest.assets) || manifest.assets.length === 0) {
    issues.push("asset manifest must contain at least one asset");
  } else {
    const ids = new Set();
    for (const asset of manifest.assets) {
      const label = `asset ${asset?.id ?? "(missing id)"}`;
      if (typeof asset?.id !== "string" || !/^[a-z0-9_]+$/.test(asset.id)) {
        issues.push(`${label}: id must use lowercase letters, digits, and underscores`);
        continue;
      }
      if (ids.has(asset.id)) issues.push(`${label}: duplicate id`);
      ids.add(asset.id);
      if (asset.units !== "meters") issues.push(`${label}: units must be meters`);
      if (!asset.collider || typeof asset.collider !== "object" || typeof asset.collider.type !== "string") {
        issues.push(`${label}: collider type is required`);
      }
      if (!Array.isArray(asset.sockets) || asset.sockets.some(socket => typeof socket !== "string" || !socket.trim())) {
        issues.push(`${label}: sockets must be an array of non-empty names`);
      }

      if (requireSafeRelativePath(asset.model, `${label}.model`)) {
        const expectedModel = `assets/models/${asset.id}.glb`;
        if (asset.model !== expectedModel) issues.push(`${label}: model path must be ${expectedModel}`);
        const modelPath = resolve(root, "public", asset.model);
        const publicRoot = resolve(root, "public") + sep;
        if (!modelPath.startsWith(publicRoot)) {
          issues.push(`${label}: model path escapes public assets`);
        } else {
          try {
            const bytes = readFileSync(modelPath);
            if (bytes.length < 20 || bytes.toString("ascii", 0, 4) !== "glTF") {
              issues.push(`${label}: model is not a valid GLB container`);
            } else {
              const version = bytes.readUInt32LE(4);
              const declaredLength = bytes.readUInt32LE(8);
              const chunkLength = bytes.readUInt32LE(12);
              const chunkType = bytes.readUInt32LE(16);
              if (version !== 2 || declaredLength !== bytes.length) {
                issues.push(`${label}: GLB version or declared file length is invalid`);
              }
              if (chunkType !== 0x4e4f534a || 20 + chunkLength > bytes.length) {
                issues.push(`${label}: first GLB chunk must contain JSON`);
              } else {
                try {
                  const json = bytes.subarray(20, 20 + chunkLength).toString("utf8").replace(/\\0+$/g, "").trim();
                  const gltf = JSON.parse(json);
                  if (gltf.asset?.version !== "2.0") issues.push(`${label}: glTF asset version must be 2.0`);
                } catch {
                  issues.push(`${label}: GLB JSON chunk is not parseable`);
                }
              }
            }
          } catch {
            issues.push(`${label}: missing model file ${asset.model}`);
          }
        }
      }

      if (asset.source !== null && asset.source !== undefined) {
        if (requireSafeRelativePath(asset.source, `${label}.source`)) {
          const sourcePath = resolve(root, asset.source);
          if (!sourcePath.startsWith(root + sep)) {
            issues.push(`${label}: source path escapes repository`);
          } else {
            try {
              if (statSync(sourcePath).size === 0) issues.push(`${label}: source file is empty`);
            } catch {
              issues.push(`${label}: missing Blender source ${asset.source}`);
            }
          }
        }
      }
    }
  }
}

if (issues.length) {
  console.error("PhysicsLab validation failed:");
  for (const issue of issues) console.error(` - ${issue}`);
  process.exitCode = 1;
} else {
  console.log(`PhysicsLab validation passed: bilingual motion lesson and ${manifest.assets.length} GLB assets.`);
}
