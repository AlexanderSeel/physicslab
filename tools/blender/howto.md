# PhysicsLab Blender asset generation

This guide covers the procedural starter asset pack in `tools/blender/generate_assets.py`. It creates editable Blender source files, runtime GLB models, and a JSON manifest.

## What the generator creates

The asset pack covers the first mechanics experiments and the planned water, electricity, heat, gas, wind, and measurement modules:

| Group | Asset IDs |
| --- | --- |
| Mechanics | `ball`, `cube`, `weight`, `ramp`, `platform`, `lever`, `hinge`, `spring`, `domino`, `pulley`, `water_wheel` |
| Water | `bucket`, `water_tank`, `pipe`, `valve`, `pump` |
| Air and heat | `balloon`, `fan`, `burner` |
| Electricity | `battery`, `switch`, `lamp`, `led`, `resistor`, `motor`, `generator` |
| Measurement | `pressure_gauge`, `thermometer`, `sensor` |

The generated models use meter-scale dimensions and a consistent Z-up Blender scene. GLB export converts to glTF's Y-up convention. Interactive parts include named empty markers such as `FLUID_IN`, `SHAFT_AXIS`, `ELECTRICAL_POSITIVE`, and `INTERACTION_HANDLE`. Each model also gets collider and socket metadata in `public/assets/asset-manifest.json`.

The models use controlled geometry and packed, tileable base-color, roughness, and normal maps. The deterministic fallback maps add rubber grain, painted finish, brushed-metal variation, and wood grain without changing collider dimensions. Review dimensions, socket positions, transparent materials, and collider metadata before using them in a lesson that teaches measurements or contact physics.

## Prerequisites

1. Install Blender 4.2 LTS or newer.
2. Clone the `AlexanderSeel/physicslab` repository or open its working copy.
3. Open PowerShell or a terminal at the repository root.

The generator uses Blender's bundled Python and glTF exporter. Run the command from the repository root; the current directory is the default asset root, so no --root argument is needed. You do not need to install Python packages or run Blender interactively.

## Generate the full library

### Windows PowerShell

Run these as two separate PowerShell commands from the repository root. This path matches Blender 5.2; change it if Blender is installed elsewhere:

```powershell
$blender = "D:\Program Files\Blender Foundation\Blender 5.2\blender.exe"
& $blender --background --python tools/blender/generate_assets.py
```

### macOS / Linux

```bash
blender --background --python tools/blender/generate_assets.py
```

The command exits after writing the files. Blender's background mode is intentional: the generator creates the geometry and exports it without needing UI automation.

## Surface textures and visual direction

The generator embeds packed PBR maps in each GLB. To art-direct a material with an image-generated texture, add tileable maps under `tools/blender/textures/` using names such as `wood_basecolor.jpg` or `wood_basecolor.png`, `wood_roughness.png`, and `wood_normal.png`. The checked-in `wood_basecolor.jpg` and `rubber_basecolor.jpg` are generated albedo sources; the Blender script accepts JPEG or PNG for base color, while roughness and tangent-space normal maps should be PNG. Supported styles are `wood`, `rubber`, `metal`, and `paint`. Base-color maps should be evenly lit and free of shadows/highlights; roughness maps should be grayscale; normal maps must be tangent-space normal maps. Any missing map falls back to the deterministic generated map. Keep source textures with the Blender generator and regenerate only the affected model using `--only <asset-id>`.

The generated lab screenshot and asset contact sheet are visual direction only. Treat the Blender-authored mesh and its collider/socket metadata as the authoritative objects. Review any regenerated GLB in a glTF viewer and in the browser before marking its appearance done.

## Generate only selected models

Use comma-separated asset IDs when iterating on a few models:

```powershell
& $blender --background --python tools/blender/generate_assets.py -- --only ball,ramp,water_tank,valve
```

Skip the editable `.blend` files when you only need to refresh GLB output:

```powershell
& $blender --background --python tools/blender/generate_assets.py -- --only ball,ramp --no-blend
```

Unknown asset IDs stop the run with an error. Subset runs merge their entries into the existing asset manifest.

## Lab environment

The app includes a four-wall laboratory shell, a framed panoramic window, warm fixture lights, and a 360-degree outdoor environment dome at `public/assets/textures/lab_environment.jpg`. It is a spherical sky environment mapped in 3D around the scene, visible through the glazing. AI-generated wood and rubber base-color maps are stored under `tools/blender/textures/`; per-material roughness and normal maps are still generated procedurally and packed into each exported GLB.

## Lab environment

The app includes a four-wall laboratory shell, a framed panoramic window, warm fixture lights, and a 360-degree outdoor environment dome at `public/assets/textures/lab_environment.jpg`. It uses the spherical panorama as a 3D background visible through the glazing. The plaster albedo map is stored at `public/assets/textures/lab_plaster.jpg`. The Blender source folder includes generated wood and rubber base-color maps; material roughness and normal maps are generated procedurally and packed into each exported GLB.

## Output paths

| Output | Purpose |
| --- | --- |
| `assets/blender-source/<asset-id>.blend` | Editable Blender source for each asset |
| `public/assets/models/<asset-id>.glb` | Runtime model, materials, and named markers |
| `public/assets/asset-manifest.json` | Asset IDs, model paths, collider descriptions, units, and socket names |

Keep the `.blend` files as the editable source of truth. The application should load the GLB files; it should not need Blender on the learner's device.

## Preview and review

- Open a generated `.blend` file in Blender to adjust its shape, colors, origins, or socket empties.
- Open the exported `.glb` in a glTF viewer or the Babylon Sandbox to check scale, materials, orientation, and marker hierarchy.
- Confirm that names such as `ASSET_ROOT_ball` and `FLUID_IN` survive export.
- Check that the model's origin is useful for placement and rotation in the workbench.
- Check collider dimensions and markers against the lesson before relying on them for physics.

The generator currently produces the library and manifest; the current ramp lesson still uses its code-built workbench meshes. Wiring the manifest and GLBs into the runtime catalogue is the next asset integration step.

If a run stops partway through, fix the reported builder issue and rerun the full command. Each selected run writes directly to the same output filenames and overwrites existing `.glb` and (unless `--no-blend` is set) `.blend` files. A full run replaces every generated model; `--only` replaces only the named model files and merges those entries into the manifest. Keep a backup or use version control before making a large visual change. To generate only the failed model, use `-- --only <asset-id>` (for example, `-- --only bucket`), then rerun the full command to finish the library. Run PowerShell commands as separate lines and invoke the executable with `&`; `--root` must be followed by a repository path when you use it, such as `-- --root "D:\\dev\\my\\physicslab"`.

## Editing and regenerating

Edit the model builder for an asset in `generate_assets.py`, then run it with `--only <asset-id>`. For major visual changes, open the corresponding `.blend` file and refine the geometry/materials there. If you edit the `.blend` directly, export it as GLB using Blender's glTF 2.0 exporter and keep the manifest's socket IDs and collider dimensions in sync.

The runtime format is glTF 2.0 binary (`.glb`), supported by Blender's glTF exporter and Babylon.js's glTF loader:

- [Blender glTF 2.0 export manual](https://docs.blender.org/manual/en/5.3/addons/scene_gltf2.html)
- [Blender background scripting](https://docs.blender.org/api/main/info_advanced_blender_as_bpy.html)
- [Babylon.js glTF loader](https://doc.babylonjs.com/features/featuresDeepDive/importers/glTF/)
