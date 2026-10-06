# PhysicsLab Implementation Plan

## Product principle

**Learn → Build → Observe → Measure → Change → Predict → Experiment.** All learning journeys use the same simulation state and solvers; they progressively reveal controls, vocabulary, measurements, and assistance. Rendered Babylon meshes are views of simulation state, never the source of physical truth.

## Architecture decisions

- **Web app:** React 19, TypeScript, Vite.
- **3D:** Babylon.js for scene, materials, picking, rendering, and asset loading.
- **Rigid mechanics:** Babylon Havok plugin for rigid-body contacts and constraints. Keep domain solvers behind interfaces so fluid, electrical, thermal, gas, and aerodynamic models do not depend on Havok.
- **Blender:** Use Blender as an optional authoring and batch-export tool, not an in-browser dependency. Author source `.blend` files, export glTF/GLB, and load them at runtime. Begin with Babylon/code-built primitives and procedural materials; add Blender assets when stable attachment points and colliders are useful.
- **Learning content:** Structured, reviewed data with English and German translations, formula variables/units, and cited sources. Never generate factual claims at runtime.
- **Simulation:** A fixed-step clock owns simulation advancement. Domain systems update deterministically from that clock; Babylon synchronizes presentation after each step.
- **Exchange:** Versioned `.physicslab` experiment and `.physicsmission` challenge formats.

## Milestones

### 0. Foundation and first playable slice — in progress
- [x] Establish product principles, architecture boundaries, and staged roadmap.
- [x] Set up React/Vite/TypeScript and the Babylon scene lifecycle.
- [x] Build a responsive laboratory shell with English/German locale selection.
- [x] Add a fixed-step clock with pause, resume, single-step, and reset.
- [x] Add an initial mechanics scene: ground, ramp, ball, and target.
- [x] Align the ramp exit with tabletop height, move the target onto the tabletop, and add a no-hop regression test.
- [x] Add studio key lighting and soft cast shadows; remove controls without behavior and show the prebuilt ramp as already in the scene.
- [x] Label X-Ray accurately as a velocity vector, align its direction with the ramp, and synchronize lesson progress to completion.
- [ ] Browser-review the corrected first experiment against the visual reference and tune its staging, contrast, and asset scale.\n- [x] Add a four-wall lab shell, multi-pane window, warm fixture lights, and spherical outdoor environment texture.
- [x] Add ball/cube components from the palette; load the committed ball/cube GLBs as runtime visuals with procedural fallback meshes; keep the ramp prebuilt in the first scene.
- [x] Expose gravity control; mass and restitution controls remain planned once contact dynamics are implemented.
- [x] Implement first-lesson completion tracking: only a finished ball satisfies the target, completion persists locally across reset/replay, and storage errors fall back to session-only completion.
- [x] Unit-test persistence across reloads and blocked-storage fallback.
- [ ] Browser-verify the full Run/Step, reset/replay, model-loading, ruler toggle/visibility, and stopwatch controls.
- [x] Add a bilingual fact card with a source link and simple/learn/technical explanation levels.
- [x] Add production build/typecheck scripts.
- [x] Move first-lesson science copy into structured bilingual JSON and validate required explanation levels, formula labels, and an HTTPS source.
- [x] Add CI gates for project validation, solver regression tests, typecheck, and production build.
- [x] Latest GitHub Actions run passed project validation, all five solver/storage tests, TypeScript typecheck, and the Vite production build.

**Acceptance:** A learner can add a ball or cube to the prepared ramp scene, run/pause/step/reset the fixed-step mechanics model, change gravity, switch the core interface between EN and DE, and complete the objective only by getting a ball to the target. Completion is implemented to survive reset/replay in local browser storage; if storage is unavailable, the lesson still completes for the current session. Browser acceptance checks remain open. Mass/restitution controls remain follow-up work because contact dynamics are not implemented.

### 1. Mechanical lab
- [ ] Add Havok-backed balls, boxes, weights, ramps, platforms, hinges, levers, springs, and dominoes.
- [ ] Add object selection/inspection, snapping, undo/redo, save/load, and deterministic reset.
- [x] Add a calibrated 0–8 m ruler to the workbench with 1 m and 0.25 m graduations and EN/DE toolbar feedback.
- [x] Add an independently controlled stopwatch with start, pause, and reset; resetting the experiment also resets the stopwatch.
- [ ] Add a scale and energy readouts.
- Add force/velocity X-Ray and lessons for gravity, velocity, acceleration, friction, momentum, collisions, torque, and mechanical advantage.

### 2. Fluids and water
- Separate low-cost fluid network model: tanks, fluid quantity/level, hydrostatic pressure, pipe resistance, flow, valves, pumps, and buoyancy.
- Dynamic surface/flow presentation via Babylon meshes, particles, and shaders; visual fluid effects must not be mistaken for the solver.
- Flow/pressure X-Ray and meters; sourced bilingual facts.

### 3. Electricity and cross-domain coupling
- Circuit graph and solver for batteries, wires, switches, resistors, lamps, motors, generators, and sensors.
- Couple motor torque into mechanics and mechanical generator output into circuit state.
- Circuit inspection, voltage/current/power meters, and missions that combine water wheels, generators, and lamps.

### 4. Gas, heat, and fire
- Gas state and ideal-gas relationships; balloons, pumps, pistons, and valves.
- Thermal model for heat capacity, conduction, convection approximation, phase changes, and ignition.
- Particle/shader visuals separated from temperature/energy calculations.

### 5. Wind, waves, and magnetism
- Approximate velocity-field forces for fans, sails, lift/drag, and turbines.
- Springs, oscillations, sound/wave visualization, resonance, permanent magnets, electromagnets, and induction.
- Extend X-Ray, instruments, and fact catalog without coupling them to UI rendering.

### 6. Academy and free lab
- Learning journeys: Explorer, Student, Builder, Physics Lab; same underlying world.
- Guided missions with real object/connection validation, pulsing targets, optional hints, and observable consequences.
- Full categorized component palette, mission/experiment creator, versioned import/export, local progress.
- Rube Goldberg challenges across mechanical, fluid, electrical, thermal, gas, and air domains.

### 7. Asset and release pipeline
- Blender source library with named attachment empties, origins, units, and collision meshes.
- [x] Extend the Blender generator with packed PBR base-color, roughness, and normal maps, plus an equator seam for the ball; document image-generated tileable maps as optional art direction.
- [ ] Regenerate the committed GLBs and `.blend` sources with the updated PBR generator, then review the actual exported assets in-browser.
- Blender batch script validates and exports GLB; the repository contains all 29 editable `.blend` sources, GLBs, and the manifest. CI validates manifest paths, Blender source files, glTF 2.0 GLB containers, and required socket nodes. The first lesson loads ball/cube GLBs with primitive fallback; broader catalogue loading and thumbnails remain open.
- CI validates structured lesson content and model assets, runs solver regression tests, typechecks, and builds production output.
- Responsive/accessibility QA, localization completeness, performance budgets, deployment documentation.

## Simulation contracts

- `SimulationState` stores physical values and stable entity IDs, independent of Babylon objects.
- Systems expose `step(state, dt)` and never read React or Babylon scene state.
- `SimulationClock` uses a fixed timestep, bounded catch-up, and explicit pause/step/reset controls.
- Rendering interpolates/presents state; it cannot change solver outcomes.
- Cross-domain effects use explicit typed ports/events: mechanical, fluid, gas, electrical, thermal, air, and logic.

## First asset strategy

1. Use the generated ball and cube GLBs for first-lesson visuals, with procedurally generated fallback shapes. Keep the floor, ramp, supports, and target code-built so solver geometry stays explicit while interaction is changing.
2. Use Blender for distinctive reusable equipment and assets with named attachment markers (hinges, pipe ports, axles, wire terminals, handles), then export GLB.
3. Use 2D images for lesson illustrations, catalogue thumbnails, labels, and backgrounds. A 2D image-to-3D conversion can help create a rough visual reference or decorative mesh, but it is not reliable enough for accurate, editable, physically meaningful parts. Do not make it the core model workflow.
4. Provide a manual GLB import path and generated thumbnails; do not require Blender on the learner's device or at runtime.

## Risks and mitigations

- **Physics scope:** Havok is not a universal simulator. Keep each non-rigid domain as an explicit approximate solver and describe its assumptions.
- **Fluid appearance:** A convincing fluid renderer is not proof of fluid dynamics. Keep physical quantity/pressure/flow models inspectable.
- **Performance:** Start with simple colliders and a modest object budget; make advanced GPU visuals optional.
- **Science accuracy:** Store formulas, units, explanation copy, and references as data; validate content structure and have claims reviewed.
- **Asset mismatch:** Define scale, origins, named sockets, and collider conventions before growing the Blender library.
