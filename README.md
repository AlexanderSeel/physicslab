# PhysicsLab

PhysicsLab is a browser-based physics learning lab built around one shared simulation: learn a concept, assemble an experiment, observe the result, and inspect why it happened.

## Current slice

The first playable experiment is a deterministic ramp-and-motion scene. Add balls or cubes, change gravity, select each body's mass and restitution, then run, pause, step, and reset the fixed-step simulation. The inspector reports total mass and live mechanical energy. Save and reopen experiment setups as versioned `.physicslab` files. The palette uses the committed ball/cube GLBs when available and falls back to matching primitive meshes if loading fails. Babylon.js presents the world; the mechanics state and solver are kept separately in `src/physics/RampSolver.ts`. The UI supports English and German from the start.

The starter mechanics solver is intentionally focused: it models rolling acceleration down one ramp, motion across the workbench, and one-dimensional along-track impacts with adjustable mass and restitution. This makes the first collision experiment testable without presenting it as general 3D contact physics. Havok is planned for the broader mechanics world with arbitrary orientations, contact shapes, and constraints.

## Blender asset pipeline

Generate the editable source library, runtime GLB models, and socket/collider manifest with Blender in background mode. See [the Blender asset how-to](./tools/blender/howto.md) and run `blender --background --python tools/blender/generate_assets.py` from the repository root.

## Development

Requires Node.js 22 or newer.

```sh
npm install
npm run dev
npm run validate
npm test # ramp solver and lesson persistence regression tests
npm run typecheck
npm run build
```

## 3D assets

The scene currently uses code-generated meshes to keep visible geometry and collision/solver dimensions aligned while interactions are evolving. Blender belongs in the authoring pipeline: create reusable equipment, name attachment empties (for example `fluidIn`, `fluidOut`, `hingeAxis`, `wireIn`), set origins and units, then export GLB for Babylon. Blender is not required for users at runtime.

2D-to-3D tools can produce rough visual references or decorative assets, but image-derived geometry is often hollow, uneven, and hard to give accurate scale or attachment points. Use it selectively; prefer authored Blender geometry for interactive lab modules, and ordinary 2D art for lesson cards and diagrams.

See [PLAN.md](./PLAN.md) for the staged implementation roadmap.
