import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  PointLight,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  Texture,
  Vector3,
} from "@babylonjs/core";
import motionLesson from "./content/motion-01.json";
import { isMotionLessonComplete, persistMotionLessonCompletion } from "./content/lessonProgress";
import "@babylonjs/loaders/glTF/2.0";
import { LoadAssetContainerAsync, TransformNode, type AssetContainer } from "@babylonjs/core";
import { RampSolver, type BodyKind, type BodyState } from "./physics/RampSolver";

type Locale = "en" | "de";
const copy = {
  en: {
    eyebrow: "PHYSICSLAB / MOTION 01", title: "Build. Observe. Understand.",
    subtitle: "A physics playground where every experiment has a real cause and effect.",
    academy: "ACADEMY", freeLab: "FREE LAB", missions: "MISSIONS", lesson: "FIRST EXPERIMENT",
    lessonTitle: "Can you get the ball to the target?", lessonBody: "Start the simulation and watch gravity pull the ball down the ramp. Try changing gravity, then compare the motion.",
    components: "COMPONENTS", mechanics: "MECHANICS", ball: "Ball", cube: "Cube", ramp: "Ramp",
    play: "Run", pause: "Pause", step: "Step", reset: "Reset", gravity: "Gravity", xray: "Velocity",
    ready: "READY TO EXPERIMENT", running: "SIMULATION RUNNING", paused: "SIMULATION PAUSED", success: "TARGET REACHED",
    fact: motionLesson.locales.en.fact, factTitle: motionLesson.locales.en.factTitle, factText: motionLesson.locales.en.simple,
    learnText: motionLesson.locales.en.learn,
    technicalText: motionLesson.locales.en.technical,
    formulaCaption: motionLesson.formula.caption.en, source: motionLesson.source.title.en,
    simple: "SIMPLE", learn: "LEARN", technical: "TECHNICAL", time: "SIM TIME", stopwatch: "STOPWATCH", stopwatchStart: "Start stopwatch", stopwatchPause: "Pause stopwatch", stopwatchReset: "Reset stopwatch", speed: "SPEED", target: "TARGET", journeyLabel: "LEARNING JOURNEY", motion: "Motion", lessonProgress: "1 of 8", lessonCompleted: "Completed", explorer: "Explorer", workbench: "Workbench 01", rampMotion: "Ramp & Motion", measure: "Measure", measureOn: "RULER ON", rulerScale: "1 m major · 0.25 m minor", labNotes: "LAB NOTES", orbitHint: "DRAG TO ORBIT", zoomHint: "SCROLL TO ZOOM", objects: "OBJECTS", gravityLabel: "GRAVITY", rampAngle: "RAMP ANGLE", tryThis: "Try this", factSourceLabel: "SOURCE", rollingTitle: motionLesson.formula.title.en,
  },
  de: {
    eyebrow: "PHYSICSLAB / BEWEGUNG 01", title: "Bauen. Beobachten. Verstehen.",
    subtitle: "Ein Physik-Spielplatz, in dem jedes Experiment echte Ursache und Wirkung zeigt.",
    academy: "AKADEMIE", freeLab: "FREIES LABOR", missions: "MISSIONEN", lesson: "ERSTES EXPERIMENT",
    lessonTitle: "Schaffst du es, den Ball ins Ziel zu bringen?", lessonBody: "Starte die Simulation und beobachte, wie die Schwerkraft den Ball die Rampe hinunterzieht. Ändere die Gravitation und vergleiche die Bewegung.",
    components: "BAUTEILE", mechanics: "MECHANIK", ball: "Ball", cube: "Würfel", ramp: "Rampe",
    play: "Start", pause: "Pause", step: "Schritt", reset: "Zurücksetzen", gravity: "Gravitation", xray: "Geschwindigkeit",
    ready: "BEREIT ZUM EXPERIMENTIEREN", running: "SIMULATION LÄUFT", paused: "SIMULATION PAUSIERT", success: "ZIEL ERREICHT",
    fact: motionLesson.locales.de.fact, factTitle: motionLesson.locales.de.factTitle, factText: motionLesson.locales.de.simple,
    learnText: motionLesson.locales.de.learn,
    technicalText: motionLesson.locales.de.technical,
    formulaCaption: motionLesson.formula.caption.de, source: motionLesson.source.title.de,
    simple: "EINFACH", learn: "LERNEN", technical: "TECHNISCH", time: "SIM-ZEIT", stopwatch: "STOPPUHR", stopwatchStart: "Stoppuhr starten", stopwatchPause: "Stoppuhr anhalten", stopwatchReset: "Stoppuhr zurücksetzen", speed: "TEMPO", target: "ZIEL", journeyLabel: "LERNPFAD", motion: "Bewegung", lessonProgress: "1 von 8", lessonCompleted: "Abgeschlossen", explorer: "Entdecker", workbench: "Werkbank 01", rampMotion: "Rampe & Bewegung", measure: "Messen", measureOn: "LINEAL AN", rulerScale: "1 m groß · 0,25 m klein", labNotes: "LABORNOTIZEN", orbitHint: "ZIEHEN ZUM DREHEN", zoomHint: "SCROLLEN ZUM ZOOMEN", objects: "OBJEKTE", gravityLabel: "GRAVITATION", rampAngle: "RAMPENWINKEL", tryThis: "Probiere das", factSourceLabel: "QUELLE", rollingTitle: motionLesson.formula.title.de,
  },
} as const;

interface VisualBody { root: TransformNode; fallbackMesh?: Mesh; arrow: Mesh; state: BodyState }

function attachGlb(visual: VisualBody, container: AssetContainer): void {
  if (!visual.fallbackMesh) return;
  const instances = container.instantiateModelsToScene(
    name => `${name}-body-${visual.state.id}`,
    true,
  );
  if (instances.rootNodes.length === 0) return;
  for (const node of instances.rootNodes) node.parent = visual.root;
  visual.fallbackMesh.dispose(false, true);
  visual.fallbackMesh = undefined;
}

function createRulerRig(scene: Scene): TransformNode {
  const root = new TransformNode("meter-ruler", scene);
  const baseline = MeshBuilder.CreateLines("ruler-baseline", {
    points: [new Vector3(-4, 0.165, -2.35), new Vector3(4, 0.165, -2.35)],
  }, scene);
  baseline.color = Color3.FromHexString("#315e4f");
  baseline.parent = root;

  for (let index = 0; index <= 32; index += 1) {
    const x = -4 + index * 0.25;
    const major = index % 4 === 0;
    const halfMeter = index % 2 === 0;
    const height = major ? 0.18 : halfMeter ? 0.12 : 0.075;
    const tick = MeshBuilder.CreateLines(`ruler-tick-${index}`, {
      points: [new Vector3(x, 0.165, -2.35), new Vector3(x, 0.165 + height, -2.35)],
    }, scene);
    tick.color = major ? Color3.FromHexString("#315e4f") : Color3.FromHexString("#719984");
    tick.parent = root;
  }
  root.setEnabled(false);
  return root;
}

function disposeVisual(visual: VisualBody): void {
  visual.arrow.dispose();
  visual.root.dispose(false, true);
}
const bodyRadius = 0.22;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const solverRef = useRef(new RampSolver());
  const visualsRef = useRef<VisualBody[]>([]);
  const modelAssetsRef = useRef<Partial<Record<BodyKind, AssetContainer>>>({});
  const accumulator = useRef(0);
  const playingRef = useRef(false);
  const [locale, setLocale] = useState<Locale>("en");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const stopwatchRunningRef = useRef(false);
  const stopwatchElapsedRef = useRef(0);
  const stopwatchPublishRef = useRef(0);
  const [bodyCount, setBodyCount] = useState(0);
  const [gravity, setGravity] = useState(9.81);
  const [xray, setXray] = useState(false);
  const [measureVisible, setMeasureVisible] = useState(false);
  const measureRigRef = useRef<TransformNode | null>(null);
  const [targetReached, setTargetReached] = useState(false);
  const [lessonCompleted, setLessonCompleted] = useState(isMotionLessonComplete);
  const lessonCompletedRef = useRef(lessonCompleted);
  const recordLessonCompletion = useCallback(() => {
    if (lessonCompletedRef.current) return;
    lessonCompletedRef.current = true;
    setLessonCompleted(true);
    persistMotionLessonCompletion();
  }, []);
  const [depth, setDepth] = useState<"simple" | "learn" | "technical">("simple");
  const xrayRef = useRef(false);
  const t = copy[locale];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, antialias: true });
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.91, 0.92, 0.89, 1);
    sceneRef.current = scene;
    engineRef.current = engine;

    const camera = new ArcRotateCamera("camera", -Math.PI / 2.28, 1.04, 12, new Vector3(0.15, 1.1, 0), scene);
    camera.lowerRadiusLimit = 8;
    camera.upperRadiusLimit = 18;
    camera.wheelPrecision = 45;
    camera.panningSensibility = 0;
    camera.attachControl(canvas, true);
    new HemisphericLight("softbox", new Vector3(-0.4, 1, -0.25), scene).intensity = 0.78;
    const keyLight = new DirectionalLight("studio-key", new Vector3(-0.4, -1, 0.55), scene);
    keyLight.position = new Vector3(-4.5, 8, -5.5);
    keyLight.intensity = 1.35;
    const shadowGenerator = new ShadowGenerator(1024, keyLight);
    shadowGenerator.useBlurExponentialShadowMap = true;
    shadowGenerator.blurKernel = 20;
    measureRigRef.current = createRulerRig(scene);

    const mat = (name: string, color: string, metallic = 0.1, roughness = 0.6) => {
      const material = new PBRMaterial(name, scene);
      material.albedoColor = Color3.FromHexString(color);
      material.metallic = metallic;
      material.roughness = roughness;
      return material;
    };
    // Spherical 360° outdoor environment, visible through the glazed laboratory windows.
    const environment = MeshBuilder.CreateSphere("outdoor-environment", {
      diameter: 240,
      segments: 48,
      sideOrientation: Mesh.BACKSIDE,
    }, scene);
    const environmentMaterial = new StandardMaterial("outdoor-environment-material", scene);
    const environmentTexture = new Texture("/assets/textures/lab_environment.jpg", scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
    environmentTexture.uScale = -1;
    environmentMaterial.emissiveTexture = environmentTexture;
    environmentMaterial.disableLighting = true;
    environmentMaterial.backFaceCulling = false;
    environment.material = environmentMaterial;
    environment.isPickable = false;
    environment.infiniteDistance = true;

    const roomFloorY = -0.43;
    const roomTop = 6.4;
    const roomHeight = roomTop - roomFloorY;
    const wallMat = mat("warm-lab-plaster", "#d6d0c2", 0, 0.92);
    const plasterTexture = new Texture("/assets/textures/lab_plaster.jpg", scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
    plasterTexture.uScale = 7;
    plasterTexture.vScale = 3;
    wallMat.albedoTexture = plasterTexture;
    const trimMat = mat("lab-window-trim", "#44534e", 0.48, 0.36);
    const woodTrimMat = mat("lab-oak-trim", "#966d4b", 0.03, 0.62);
    const glassMat = new StandardMaterial("window-glass", scene);
    glassMat.diffuseColor = Color3.FromHexString("#c4e1e5");
    glassMat.emissiveColor = Color3.FromHexString("#6f8d91");
    glassMat.alpha = 0.2;
    glassMat.specularColor = Color3.FromHexString("#ffffff");
    glassMat.specularPower = 96;
    glassMat.backFaceCulling = false;

    const wall = (name: string, width: number, height: number, depth: number, x: number, y: number, z: number, material = wallMat) => {
      const piece = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
      piece.position.set(x, y, z);
      piece.material = material;
      piece.receiveShadows = true;
      return piece;
    };
    // Four enclosing walls. The back wall is split around a broad multi-pane window.
    wall("lab-wall-left", 0.28, roomHeight, 23.5, -13, roomFloorY + roomHeight / 2, -2.75);
    wall("lab-wall-right", 0.28, roomHeight, 23.5, 13, roomFloorY + roomHeight / 2, -2.75);
    wall("lab-wall-front", 26, roomHeight, 0.28, 0, roomFloorY + roomHeight / 2, -14.5);
    const windowWidth = 10;
    const windowBottom = 1.25;
    const windowTop = 5.15;
    const backWallZ = 9;
    wall("lab-wall-back-left", 8, roomHeight, 0.28, -9, roomFloorY + roomHeight / 2, backWallZ);
    wall("lab-wall-back-right", 8, roomHeight, 0.28, 9, roomFloorY + roomHeight / 2, backWallZ);
    wall("lab-wall-back-sill", windowWidth, windowBottom - roomFloorY, 0.28, 0, roomFloorY + (windowBottom - roomFloorY) / 2, backWallZ);
    wall("lab-wall-back-header", windowWidth, roomTop - windowTop, 0.28, 0, windowTop + (roomTop - windowTop) / 2, backWallZ);
    const glass = MeshBuilder.CreateBox("large-lab-window", { width: windowWidth - 0.18, height: windowTop - windowBottom - 0.08, depth: 0.06 }, scene);
    glass.position.set(0, (windowTop + windowBottom) / 2, backWallZ + 0.17);
    glass.material = glassMat;
    glass.isPickable = false;
    // Dark anodized frame and slim oak inner returns make the glazing read at a glance.
    for (const x of [-5, -1.7, 1.7, 5]) {
      wall("window-vertical-frame", 0.075, windowTop - windowBottom + 0.14, 0.11, x, (windowTop + windowBottom) / 2, backWallZ + 0.2, trimMat);
    }
    for (const y of [windowBottom, 3.22, windowTop]) {
      wall("window-horizontal-frame", windowWidth + 0.16, 0.075, 0.11, 0, y, backWallZ + 0.2, trimMat);
    }
    wall("back-wall-oak-sill", windowWidth + 0.3, 0.12, 0.38, 0, windowBottom - 0.06, backWallZ - 0.01, woodTrimMat);
    // Baseboards and a restrained oak wall band provide scale and material variation.
    for (const x of [-12.82, 12.82]) {
      wall("lab-side-baseboard", 0.09, 0.2, 23.1, x, roomFloorY + 0.1, -2.75, woodTrimMat);
    }
    wall("lab-back-baseboard-left", 8, 0.2, 0.1, -9, roomFloorY + 0.1, 8.82, woodTrimMat);
    wall("lab-back-baseboard-right", 8, 0.2, 0.1, 9, roomFloorY + 0.1, 8.82, woodTrimMat);
    const ceilingLightMat = new StandardMaterial("ceiling-light-emission", scene);
    ceilingLightMat.emissiveColor = Color3.FromHexString("#ffe5bc");
    ceilingLightMat.disableLighting = true;
    for (const x of [-4.2, 0, 4.2]) {
      const fixture = MeshBuilder.CreateBox("ceiling-light-fixture", { width: 2.4, height: 0.08, depth: 0.58 }, scene);
      fixture.position.set(x, 5.95, -0.6);
      fixture.material = ceilingLightMat;
      const fill = new PointLight("ceiling-fill", new Vector3(x, 5.7, -0.6), scene);
      fill.diffuse = Color3.FromHexString("#ffe7c7");
      fill.intensity = 0.22;
      fill.range = 13;
    }

    const benchMat = mat("bench", "#c4a47c", 0.02, 0.68);
    const benchTexture = new Texture("/assets/textures/bench_oak.jpg", scene, false, false, Texture.TRILINEAR_SAMPLINGMODE);
    benchTexture.uScale = 2;
    benchTexture.vScale = 1;
    benchMat.albedoTexture = benchTexture;
    const rampMat = mat("ramp", "#e5783d", 0.18, 0.38);
    const railMat = mat("rail", "#f09b62", 0.18, 0.38);
    const targetMat = mat("target", "#57a983", 0.1, 0.45);
    const floor = MeshBuilder.CreateBox("workbench", { width: 12.5, height: 0.3, depth: 5.6 }, scene);
    floor.position.set(0, -0.01, 0);
    floor.material = benchMat;
    floor.receiveShadows = true;
    const ramp = MeshBuilder.CreateBox("ramp", { width: 5.05, height: 0.16, depth: 1.5 }, scene);
    ramp.position.set(-0.75, 0.65, 0);
    ramp.rotation.z = -0.235;
    ramp.material = rampMat;
    ramp.receiveShadows = true;
    shadowGenerator.addShadowCaster(ramp);
    for (const z of [-0.78, 0.78]) {
      const rail = MeshBuilder.CreateBox("ramp-rail", { width: 5.05, height: 0.12, depth: 0.09 }, scene);
      rail.position.set(-0.75, 0.81, z);
      rail.rotation.z = -0.235;
      rail.material = railMat;
      rail.receiveShadows = true;
      shadowGenerator.addShadowCaster(rail);
    }
    for (const [x, height] of [[-2.55, 1.1], [1.28, 0.12]]) {
      const support = MeshBuilder.CreateBox("support", { width: 0.2, height, depth: 1.2 }, scene);
      support.position.set(x, 0.14 + height / 2, 0);
      support.material = mat("aluminum-support", "#9ba9a7", 0.62, 0.35);
      support.receiveShadows = true;
      shadowGenerator.addShadowCaster(support);
    }
    const target = MeshBuilder.CreateTorus("target", { diameter: 1.06, thickness: 0.09, tessellation: 48 }, scene);
    target.position.set(4.55, 0.152, 0);
    target.rotation.x = Math.PI / 2;
    target.material = targetMat;
    target.receiveShadows = true;
    const grid = MeshBuilder.CreateGround("grid", { width: 26, height: 23.5, subdivisions: 1 }, scene);
    grid.position.y = -0.43;
    grid.material = mat("floor-matte", "#e2dfd7", 0, 0.9);
    grid.receiveShadows = true;
    const shadow = MeshBuilder.CreateDisc("target-shadow", { radius: 0.56, tessellation: 36 }, scene);
    shadow.position.set(4.55, 0.142, 0);
    shadow.rotation.x = Math.PI / 2;
    shadow.material = new StandardMaterial("target-shadow-mat", scene);
    (shadow.material as StandardMaterial).diffuseColor = Color3.FromHexString("#acd2bc");
    (shadow.material as StandardMaterial).alpha = 0.38;

    const render = () => {
      const delta = Math.min(engine.getDeltaTime() / 1000, 0.05);
      if (stopwatchRunningRef.current) {
        stopwatchElapsedRef.current += delta;
        stopwatchPublishRef.current += delta;
        if (stopwatchPublishRef.current >= 0.1) {
          stopwatchPublishRef.current %= 0.1;
          setStopwatchTime(stopwatchElapsedRef.current);
        }
      }
      if (playingRef.current) {
        accumulator.current += delta;
        let changed = false;
        while (accumulator.current >= solverRef.current.fixedStep) {
          solverRef.current.step();
          accumulator.current -= solverRef.current.fixedStep;
          changed = true;
        }
        if (changed) {
          for (const visual of visualsRef.current) syncBody(visual);
          setTime(solverRef.current.elapsed);
          if (solverRef.current.hasReachedTarget("ball")) {
            setTargetReached(true);
            recordLessonCompletion();
            playingRef.current = false;
            setPlaying(false);
          }
        }
      }
      scene.render();
    };
    let sceneDisposed = false;
    for (const kind of ["ball", "cube"] as const) {
      void LoadAssetContainerAsync(`/assets/models/${kind}.glb`, scene)
        .then(container => {
          if (sceneDisposed) {
            container.dispose();
            return;
          }
          modelAssetsRef.current[kind] = container;
          for (const visual of visualsRef.current) {
            if (visual.state.kind === kind) attachGlb(visual, container);
          }
        })
        .catch(error => {
          console.warn(`[PhysicsLab] Could not load ${kind}.glb; keeping the procedural fallback.`, error);
        });
    }
    engine.runRenderLoop(render);
    const resize = () => engine.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      engine.stopRenderLoop(render);
      sceneDisposed = true;
      measureRigRef.current?.dispose(false, true);
      measureRigRef.current = null;
      shadowGenerator.dispose();
      visualsRef.current.forEach(disposeVisual);
      for (const container of Object.values(modelAssetsRef.current)) container?.dispose();
      modelAssetsRef.current = {};
      scene.dispose();
      engine.dispose();
      sceneRef.current = null;
      engineRef.current = null;
    };
  }, [recordLessonCompletion]);

  const syncBody = (visual: VisualBody) => {
    const { root, arrow, state } = visual;
    root.position.set(state.x, state.y, 0);
    if (state.kind === "ball") root.rotation.z = state.rotation;
    else root.rotation.z = state.rotation * 0.35;
    if (xrayRef.current) {
      arrow.rotation.z = state.x < 1.7 ? -0.235 : 0;
      if (arrow) {
        arrow.setEnabled(state.speed > 0.04);
        arrow.position.set(state.x, state.y + 0.35, 0);
        const length = Math.min(1.25, state.speed * 0.35);
        arrow.scaling.x = length;
      }
    } else {
      arrow.setEnabled(false);
    }
  };

  const addBody = useCallback((kind: BodyKind) => {
    const scene = sceneRef.current;
    if (!scene) return;
    const state = solverRef.current.addBody(kind);
    const mesh = kind === "ball"
      ? MeshBuilder.CreateSphere(`ball-${state.id}`, { diameter: bodyRadius * 2, segments: 32 }, scene)
      : MeshBuilder.CreateBox(`cube-${state.id}`, { size: bodyRadius * 1.75 }, scene);
    const root = new TransformNode(`body-root-${state.id}`, scene);
    mesh.parent = root;
    const material = new PBRMaterial(`body-mat-${state.id}`, scene);
    material.albedoColor = kind === "ball" ? Color3.FromHexString("#377d79") : Color3.FromHexString("#7562a6");
    material.metallic = 0.14;
    material.roughness = 0.28;
    mesh.material = material;
    const arrow = MeshBuilder.CreateBox(`velocity-${state.id}`, { width: 1, height: 0.035, depth: 0.035 }, scene);
    const arrowMat = new StandardMaterial(`velocity-mat-${state.id}`, scene);
    arrowMat.diffuseColor = Color3.FromHexString("#d85638");
    arrow.material = arrowMat;
    arrow.setEnabled(false);
    const visual: VisualBody = { root, fallbackMesh: mesh, arrow, state };
    visualsRef.current.push(visual);
    syncBody(visual);
    const modelContainer = modelAssetsRef.current[kind];
    if (modelContainer) attachGlb(visual, modelContainer);
    setBodyCount(solverRef.current.bodies.length);
  }, [xray]);

  const start = () => {
    if (solverRef.current.bodies.length === 0) addBody("ball");
    accumulator.current = 0;
    playingRef.current = true;
    setPlaying(true);
  };
  const pause = () => { playingRef.current = false; setPlaying(false); };
  const step = () => {
    if (playingRef.current) return;
    if (solverRef.current.bodies.length === 0) addBody("ball");
    solverRef.current.step();
    visualsRef.current.forEach(syncBody);
    setTime(solverRef.current.elapsed);
    if (solverRef.current.hasReachedTarget("ball")) {
      setTargetReached(true);
      recordLessonCompletion();
    }
  };
  const toggleStopwatch = () => {
    stopwatchRunningRef.current = !stopwatchRunningRef.current;
    setStopwatchRunning(stopwatchRunningRef.current);
  };
  const resetStopwatch = () => {
    stopwatchRunningRef.current = false;
    stopwatchElapsedRef.current = 0;
    stopwatchPublishRef.current = 0;
    setStopwatchRunning(false);
    setStopwatchTime(0);
  };
  const reset = () => {
    pause();
    resetStopwatch();
    visualsRef.current.forEach(disposeVisual);
    visualsRef.current = [];
    solverRef.current.reset();
    accumulator.current = 0;
    setTime(0);
    setBodyCount(0);
    setTargetReached(false);
  };

  useEffect(() => {
    solverRef.current.gravity = gravity;
  }, [gravity]);

  useEffect(() => {
    measureRigRef.current?.setEnabled(measureVisible);
  }, [measureVisible]);

  useEffect(() => {
    xrayRef.current = xray;
    for (const visual of visualsRef.current) syncBody(visual);
  }, [xray]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="PhysicsLab home"><span className="brand-mark">P</span><span>physics<span className="brand-light">lab</span></span></a>
        <nav className="main-nav" aria-label="Main navigation"><span className="nav-active" aria-current="page">{t.academy}</span></nav>
        <div className="top-actions"><span className="status-pill"><i />{t.eyebrow.split(" / ")[1]}</span><button className="locale" onClick={() => setLocale(locale === "en" ? "de" : "en")}>{locale.toUpperCase()} <span>⌄</span></button> </div>
      </header>

      <section className="page-heading"><div><div className="eyebrow">{t.eyebrow}</div><h1>{t.title}</h1><p>{t.subtitle}</p></div><div className="journey-button"><span className="journey-dot">01</span><span><small>{t.journeyLabel}</small><b>{t.explorer}</b></span><span className="chevron">01 / 08</span></div></section>

      <div className="workspace">
        <aside className="left-rail">
          <div className="rail-heading"><span className="section-kicker">{t.lesson}</span><span className="lesson-number">01 / 08</span></div>
          <h2>{t.lessonTitle}</h2><p className="lesson-copy">{t.lessonBody}</p>
          <div className="progress-track"><span style={{ width: lessonCompleted ? "100%" : "16%" }} /></div><div className="progress-caption"><span>{t.motion}</span><span>{lessonCompleted ? t.lessonCompleted : t.lessonProgress}</span></div>
          <div className="separator" />
          <div className="rail-heading"><span className="section-kicker">{t.components}</span></div>
          <div className="category-label">{t.mechanics}</div>
          <button className="component-row" onClick={() => addBody("ball")}><span className="component-icon ball-icon">●</span><span>{t.ball}</span><span className="add-sign">＋</span></button>
          <button className="component-row" onClick={() => addBody("cube")}><span className="component-icon cube-icon">◆</span><span>{t.cube}</span><span className="add-sign">＋</span></button>
          <div className="component-row component-row-static"><span className="component-icon ramp-icon">▱</span><span>{t.ramp}</span><span className="in-scene-badge">{locale === "en" ? "IN SCENE" : "IM AUFBAU"}</span></div>
          <div className="rail-bottom"><div className="avatar small-avatar">✦</div><div><b>PhysicsLab</b><span>Learning through play</span></div> </div>
        </aside>

        <section className="lab-column">
          <div className="lab-toolbar"><div className="lab-title"><span className="live-dot" /> <b>{t.workbench}</b><span className="toolbar-divider">/</span><span>{t.rampMotion}</span></div><div className="toolbar-tools"><button className={xray ? "tool-button selected" : "tool-button"} onClick={() => setXray(!xray)}><span>◉</span> {t.xray}</button><button className={measureVisible ? "tool-button selected" : "tool-button"} aria-pressed={measureVisible} onClick={() => setMeasureVisible(value => !value)}><span>⌗</span> {t.measure}</button> </div></div>
          <div className="scene-frame"><canvas ref={canvasRef} aria-label="Interactive 3D physics workbench" /><div className="scene-badge"><span className={playing ? "badge-dot active" : "badge-dot"} />{targetReached ? t.success : playing ? t.running : time > 0 ? t.paused : t.ready}</div>{measureVisible && <div className="ruler-legend" role="status"><b>{t.measureOn}</b><span>{t.rulerScale}</span></div>}<div className="scene-hint">{t.orbitHint} <span>·</span> {t.zoomHint}</div><div className="target-label">{t.target}<span>04</span></div>
            {xray && <div className="xray-legend"><b>{t.xray.toUpperCase()}</b><span><i className="motion-line" /> {t.speed} · {visualsRef.current.at(-1)?.state.speed.toFixed(1) ?? "0.0"} m/s</span></div>}
          </div>
          <div className="transport"><div className="transport-buttons"><button className="reset-button" onClick={reset} title={t.reset}>↺</button>{playing ? <button className="play-button" onClick={pause}>Ⅱ <span>{t.pause}</span></button> : <button className="play-button" onClick={start}>▶ <span>{t.play}</span></button>}<button className="step-button" onClick={step}>▸│ <span>{t.step}</span></button><span className="transport-divider" /><span className="time-readout"><small>{t.time}</small><b>{time.toFixed(2)}<i>s</i></b></span><span className="transport-divider stopwatch-divider" /><div className="stopwatch-readout"><span className="stopwatch-value"><small>{t.stopwatch}</small><b>{stopwatchTime.toFixed(1)}<i>s</i></b></span><div className="stopwatch-controls"><button type="button" onClick={toggleStopwatch} aria-label={stopwatchRunning ? t.stopwatchPause : t.stopwatchStart} title={stopwatchRunning ? t.stopwatchPause : t.stopwatchStart}>{stopwatchRunning ? "Ⅱ" : "▶"}</button><button type="button" onClick={resetStopwatch} aria-label={t.stopwatchReset} title={t.stopwatchReset}>↺</button></div></div></div>
            <div className="gravity-control"><label htmlFor="gravity">{t.gravity} <b>{gravity.toFixed(1)} m/s²</b></label><input id="gravity" type="range" min="1" max="25" step="0.1" value={gravity} onChange={e => setGravity(Number(e.target.value))} /><span className="gravity-ends"><span>MOON 1.6</span><span>EARTH 9.8</span><span>JUPITER 24.8</span></span></div>
            <div className="speed-readout"><small>{t.speed}</small><b>{(solverRef.current.bodies.at(-1)?.speed ?? 0).toFixed(1)} <i>m/s</i></b></div>
          </div>
        </section>

        <aside className="right-rail"><div className="inspector-head"><span className="section-kicker">{t.labNotes}</span></div><div className="note-icon">✳</div><div className="note-label">{t.fact}</div><h3>{t.factTitle}</h3><p className="fact-copy">{depth === "simple" ? t.factText : depth === "learn" ? t.learnText : t.technicalText}</p><div className="depth-tabs"><button className={depth === "simple" ? "active" : ""} onClick={() => setDepth("simple")}>{t.simple}</button><button className={depth === "learn" ? "active" : ""} onClick={() => setDepth("learn")}>{t.learn}</button><button className={depth === "technical" ? "active" : ""} onClick={() => setDepth("technical")}>{t.technical}</button></div><div className="formula-card"><div className="formula-title">{t.rollingTitle}</div><div className="formula">{motionLesson.formula.expression}</div><div className="formula-caption">{t.formulaCaption}</div></div><div className="source-note"><span className="source-check">↗</span><span><b>{t.factSourceLabel}</b><small>{t.source}</small></span><a className="source-link" href={motionLesson.source.url} target="_blank" rel="noreferrer" aria-label="Open source">↗</a></div><div className="inspector-separator" /><div className="quick-stats"><div><span>{t.objects}</span><b>{bodyCount.toString().padStart(2, "0")}</b></div><div><span>{t.gravityLabel}</span><b>{gravity.toFixed(1)}<small> m/s²</small></b></div><div><span>{t.rampAngle}</span><b>13.5<small>°</small></b></div></div><div className="tip-card"><span>✦</span><p><b>{t.tryThis}</b><br />{locale === "en" ? "What changes when you increase gravity?" : "Was ändert sich, wenn du die Gravitation erhöhst?"}</p></div></aside>
      </div>
      <footer className="footer"><span>PHYSICSLAB <i>·</i> LEARN BY EXPERIMENTING</span><span>SIMULATION 01 <i>·</i> {bodyCount} OBJECTS</span></footer>
    </main>
  );
}
