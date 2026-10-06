import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArcRotateCamera,
  Color3,
  Color4,
  DirectionalLight,
  DynamicTexture,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  Material,
  Node,
  PBRMaterial,
  PointLight,
  Quaternion,
  Scene,
  ShadowGenerator,
  StandardMaterial,
  Texture,
  Vector3,
  PointerEventTypes,
} from "@babylonjs/core";
import { PhysicsAggregate } from "@babylonjs/core/Physics/v2/physicsAggregate";
import { PhysicsMotionType, PhysicsShapeType } from "@babylonjs/core/Physics/v2/IPhysicsEnginePlugin";
import { HavokPlugin } from "@babylonjs/core/Physics/v2/Plugins/havokPlugin";
import motionLesson from "./content/motion-01.json";
import { isMotionLessonComplete, persistMotionLessonCompletion } from "./content/lessonProgress";
import { parsePhysicsLabDocument, serializePhysicsLabDocument } from "./content/experimentFile";
import "@babylonjs/loaders/glTF/2.0";
import { LoadAssetContainerAsync, TransformNode, type AssetContainer } from "@babylonjs/core";
import { RampSolver, type BodyKind, type BodyState } from "./physics/RampSolver";

type Locale = "en" | "de";
type BodyTheme = "rubber" | "wood" | "metal";
const copy = {
  en: {
    eyebrow: "PHYSICSLAB / MOTION 01", title: "Build. Observe. Understand.",
    subtitle: "A physics playground where every experiment has a real cause and effect.",
    academy: "ACADEMY", freeLab: "FREE LAB", missions: "MISSIONS", lesson: "FIRST EXPERIMENT",
    lessonTitle: "Can you get the ball to the target?", lessonBody: "Start the simulation and watch gravity pull the ball down the ramp. Try changing gravity, then compare the motion.",
    components: "COMPONENTS", mechanics: "MECHANICS", ball: "Ball", cube: "Cube", domino: "Domino", weight: "Weight", ramp: "Ramp",
    play: "Run", pause: "Pause", step: "Step", reset: "Reset", gravity: "Gravity", xray: "Velocity",
    ready: "READY TO EXPERIMENT", running: "SIMULATION RUNNING", paused: "SIMULATION PAUSED", success: "TARGET REACHED",
    fact: motionLesson.locales.en.fact, factTitle: motionLesson.locales.en.factTitle, factText: motionLesson.locales.en.simple,
    learnText: motionLesson.locales.en.learn,
    technicalText: motionLesson.locales.en.technical,
    formulaCaption: motionLesson.formula.caption.en, source: motionLesson.source.title.en,
    simple: "SIMPLE", learn: "LEARN", technical: "TECHNICAL", time: "SIM TIME", stopwatch: "STOPWATCH", stopwatchStart: "Start stopwatch", stopwatchPause: "Pause stopwatch", stopwatchReset: "Reset stopwatch", speed: "SPEED", mass: "MASS / BODY", referenceMass: "TOTAL MASS", energy: "TOTAL ENERGY", restitution: "BOUNCE", selectedBody: "SELECT BODY", noBody: "Add a ball or cube to edit its properties.", removeBody: "REMOVE BODY", saveSetup: "Save setup", loadSetup: "Load setup", loadedSetup: "Experiment loaded. Press Run to start.", maxBodies: "The lesson track is full (14 bodies). Remove one to add another.", target: "TARGET", journeyLabel: "LEARNING JOURNEY", motion: "Motion", lessonProgress: "1 of 8", lessonCompleted: "Completed", explorer: "Explorer", workbench: "Workbench 01", rampMotion: "Ramp & Motion", measure: "Measure", measureOn: "RULER ON", rulerScale: "1 m major · 0.25 m minor", labNotes: "LAB NOTES", orbitHint: "DRAG TO ORBIT", zoomHint: "SCROLL TO ZOOM", objects: "OBJECTS", gravityLabel: "GRAVITY", rampAngle: "RAMP ANGLE", tryThis: "Try this", factSourceLabel: "SOURCE", rollingTitle: motionLesson.formula.title.en,
  },
  de: {
    eyebrow: "PHYSICSLAB / BEWEGUNG 01", title: "Bauen. Beobachten. Verstehen.",
    subtitle: "Ein Physik-Spielplatz, in dem jedes Experiment echte Ursache und Wirkung zeigt.",
    academy: "AKADEMIE", freeLab: "FREIES LABOR", missions: "MISSIONEN", lesson: "ERSTES EXPERIMENT",
    lessonTitle: "Schaffst du es, den Ball ins Ziel zu bringen?", lessonBody: "Starte die Simulation und beobachte, wie die Schwerkraft den Ball die Rampe hinunterzieht. Ändere die Gravitation und vergleiche die Bewegung.",
    components: "BAUTEILE", mechanics: "MECHANIK", ball: "Ball", cube: "Würfel", domino: "Dominostein", weight: "Gewicht", ramp: "Rampe",
    play: "Start", pause: "Pause", step: "Schritt", reset: "Zurücksetzen", gravity: "Gravitation", xray: "Geschwindigkeit",
    ready: "BEREIT ZUM EXPERIMENTIEREN", running: "SIMULATION LÄUFT", paused: "SIMULATION PAUSIERT", success: "ZIEL ERREICHT",
    fact: motionLesson.locales.de.fact, factTitle: motionLesson.locales.de.factTitle, factText: motionLesson.locales.de.simple,
    learnText: motionLesson.locales.de.learn,
    technicalText: motionLesson.locales.de.technical,
    formulaCaption: motionLesson.formula.caption.de, source: motionLesson.source.title.de,
    simple: "EINFACH", learn: "LERNEN", technical: "TECHNISCH", time: "SIM-ZEIT", stopwatch: "STOPPUHR", stopwatchStart: "Stoppuhr starten", stopwatchPause: "Stoppuhr anhalten", stopwatchReset: "Stoppuhr zurücksetzen", speed: "TEMPO", mass: "MASSE / KÖRPER", referenceMass: "GESAMTMASSE", energy: "GESAMTENERGIE", restitution: "RÜCKPRALL", selectedBody: "KÖRPER WÄHLEN", noBody: "Füge einen Ball oder Würfel hinzu, um Eigenschaften zu ändern.", removeBody: "KÖRPER ENTFERNEN", saveSetup: "Aufbau speichern", loadSetup: "Aufbau laden", loadedSetup: "Experiment geladen. Mit Start geht es los.", maxBodies: "Die Versuchsrampe ist voll (14 Körper). Entferne einen Körper, um weiterzubauen.", target: "ZIEL", journeyLabel: "LERNPFAD", motion: "Bewegung", lessonProgress: "1 von 8", lessonCompleted: "Abgeschlossen", explorer: "Entdecker", workbench: "Werkbank 01", rampMotion: "Rampe & Bewegung", measure: "Messen", measureOn: "LINEAL AN", rulerScale: "1 m groß · 0,25 m klein", labNotes: "LABORNOTIZEN", orbitHint: "ZIEHEN ZUM DREHEN", zoomHint: "SCROLLEN ZUM ZOOMEN", objects: "OBJEKTE", gravityLabel: "GRAVITATION", rampAngle: "RAMPENWINKEL", tryThis: "Probiere das", factSourceLabel: "QUELLE", rollingTitle: motionLesson.formula.title.de,
  },
} as const;

interface VisualBody { root: TransformNode; fallbackMesh?: Mesh; arrow: Mesh; state: BodyState; aggregate?: PhysicsAggregate; theme: BodyTheme }

type ViewMode = "3d" | "side";

function drawTargetLabel(texture: DynamicTexture, label: string): void {
  const context = texture.getContext() as unknown as CanvasRenderingContext2D;
  context.clearRect(0, 0, 512, 128);
  context.fillStyle = "rgba(18, 48, 39, 0.88)";
  context.beginPath();
  context.roundRect(10, 10, 492, 108, 22);
  context.fill();
  context.fillStyle = "#ffffff";
  context.font = "700 48px Arial";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(label.toUpperCase(), 256, 64);
  texture.update();
}

function attachGlb(visual: VisualBody, container: AssetContainer): void {
  if (!visual.fallbackMesh) return;
  const instances = container.instantiateModelsToScene(
    name => `${name}-body-${visual.state.id}`,
    true,
  );
  if (instances.rootNodes.length === 0) return;
  const groundOriginOffset = visual.state.kind === "ball" ? bodyRadius : visual.state.kind === "domino" ? 0.3 : visual.state.kind === "weight" ? 0.18 : bodyRadius * 0.875;
  for (const node of instances.rootNodes) {
    node.parent = visual.root;
    // Blender models use a grounded origin; the solver positions each body by its center.
    (node as TransformNode).position.y -= groundOriginOffset;
  }
  visual.fallbackMesh.dispose(false, true);
  visual.fallbackMesh = undefined;
  applyBodyTheme(visual, visual.theme);
}

function createRulerRig(scene: Scene): TransformNode {
  const root = new TransformNode("meter-ruler", scene);
  const rulerY = 0.625;
  const baseline = MeshBuilder.CreateLines("ruler-baseline", {
    points: [new Vector3(-4, rulerY, -2.35), new Vector3(4, rulerY, -2.35)],
  }, scene);
  baseline.color = Color3.FromHexString("#315e4f");
  baseline.parent = root;

  for (let index = 0; index <= 32; index += 1) {
    const x = -4 + index * 0.25;
    const major = index % 4 === 0;
    const halfMeter = index % 2 === 0;
    const height = major ? 0.18 : halfMeter ? 0.12 : 0.075;
    const tick = MeshBuilder.CreateLines(`ruler-tick-${index}`, {
      points: [new Vector3(x, rulerY, -2.35), new Vector3(x, rulerY + height, -2.35)],
    }, scene);
    tick.color = major ? Color3.FromHexString("#315e4f") : Color3.FromHexString("#719984");
    tick.parent = root;
  }
  root.setEnabled(false);
  return root;
}

function disposeVisual(visual: VisualBody): void {
  visual.aggregate?.dispose();
  visual.arrow.dispose();
  visual.root.dispose(false, true);
}
const bodyRadius = 0.22;
const tabletopY = 0.6;

const applyBodyTheme = (visual: VisualBody, theme: BodyTheme) => {
  visual.theme = theme;
  const appearance = theme === "rubber"
    ? { color: visual.state.kind === "ball" ? "#377d79" : "#7562a6", metallic: 0.08, roughness: 0.42, friction: 0.78 }
    : theme === "wood"
      ? { color: "#b27a42", metallic: 0, roughness: 0.72, friction: 0.88 }
      : { color: "#a7b3b3", metallic: 0.78, roughness: 0.28, friction: 0.35 };
  for (const mesh of visual.root.getChildMeshes()) {
    const material = mesh.material;
    if (material instanceof PBRMaterial) {
      material.albedoColor = Color3.FromHexString(appearance.color);
      material.metallic = appearance.metallic;
      material.roughness = appearance.roughness;
    } else if (material instanceof StandardMaterial) {
      material.diffuseColor = Color3.FromHexString(appearance.color);
    }
  }
  if (visual.aggregate) {
    visual.aggregate.shape.material = { ...visual.aggregate.shape.material, friction: appearance.friction };
  }
};

function createDynamicAggregate(visual: VisualBody, scene: Scene): PhysicsAggregate {
  const { state, root } = visual;
  const aggregate = new PhysicsAggregate(
    root,
    state.kind === "ball" ? PhysicsShapeType.SPHERE : state.kind === "weight" ? PhysicsShapeType.CYLINDER : PhysicsShapeType.BOX,
    {
      mass: state.mass,
      extents: state.kind === "domino" ? new Vector3(0.08, 0.3, 0.12) : new Vector3(bodyRadius * 0.875, bodyRadius * 0.875, bodyRadius * 0.875),
      radius: state.kind === "weight" ? 0.2 : bodyRadius,
      pointA: new Vector3(0, -0.18, 0),
      pointB: new Vector3(0, 0.18, 0),
      friction: 0.72,
      restitution: state.restitution,
    },
    scene,
  );
  aggregate.body.setMotionType(PhysicsMotionType.STATIC);
  visual.aggregate = aggregate;
  root.metadata = { physicslabBodyId: state.id, physicsRole: "havok-dynamic-body" };
  return aggregate;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneFrameRef = useRef<HTMLDivElement>(null);
  const headerMenuRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const cameraRef = useRef<ArcRotateCamera | null>(null);
  const targetLabelTextureRef = useRef<DynamicTexture | null>(null);
  const solverRef = useRef(new RampSolver());
  const visualsRef = useRef<VisualBody[]>([]);
  const modelAssetsRef = useRef<Partial<Record<BodyKind, AssetContainer>>>({});
  const accumulator = useRef(0);
  const playingRef = useRef(false);
  const playbackSpeedRef = useRef(1);
  const physicsReadyRef = useRef(false);
  const singlePhysicsStepRef = useRef(false);
  const [locale, setLocale] = useState<Locale>("en");
  const [darkMode, setDarkMode] = useState(() => {
    try { return localStorage.getItem("physicslab-theme") === "dark"; } catch { return false; }
  });
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("3d");
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [stopwatchTime, setStopwatchTime] = useState(0);
  const [stopwatchRunning, setStopwatchRunning] = useState(false);
  const stopwatchRunningRef = useRef(false);
  const stopwatchElapsedRef = useRef(0);
  const stopwatchPublishRef = useRef(0);
  const [bodyCount, setBodyCount] = useState(0);
  const [selectedBodyId, setSelectedBodyId] = useState<number | null>(null);
  const [bodyMass, setBodyMass] = useState(1);
  const [bodyRestitution, setBodyRestitution] = useState(0.35);
  const [selectedBodyTheme, setSelectedBodyTheme] = useState<BodyTheme>("rubber");
  const [, setPropertyRevision] = useState(0);
  const [fileMessage, setFileMessage] = useState("");
  const experimentInputRef = useRef<HTMLInputElement>(null);
  const [gravity, setGravity] = useState(9.81);
  const gravityRef = useRef(9.81);
  const [xray, setXray] = useState(false);
  const [measureVisible, setMeasureVisible] = useState(false);
  const measureRigRef = useRef<TransformNode | null>(null);
  const [targetReached, setTargetReached] = useState(false);
  const targetReachedRef = useRef(false);
  const [lessonCompleted, setLessonCompleted] = useState(isMotionLessonComplete);
  const lessonCompletedRef = useRef(lessonCompleted);
  const recordLessonCompletion = useCallback(() => {
    if (lessonCompletedRef.current) return;
    lessonCompletedRef.current = true;
    setLessonCompleted(true);
    persistMotionLessonCompletion();
  }, []);
  const [depth, setDepth] = useState<"simple" | "learn" | "technical">("simple");
  const [activeExperiment, setActiveExperiment] = useState<"gravity" | "collision" | "edge" | "domino" | null>(null);
  const xrayRef = useRef(false);
  const t = copy[locale];
  const ui = locale === "en"
    ? { dark: "Dark", light: "Light", switchDark: "Switch to dark mode", switchLight: "Switch to light mode", view3d: "3D View", sideView: "Side View", fullscreen: "Toggle fullscreen", playback: "Playback speed", energy: "Energy", potential: "Potential", kinetic: "Kinetic", totalEnergy: "Total mechanical energy", motion: "Motion", speed: "Speed", position: "Position", simTime: "Sim time", gravity: "Gravity", path: "Path view", top: "top", target: "target", experiments: "TRY AN EXPERIMENT", gravityTest: "Moon gravity", collisionTest: "Mass collision", edgeTest: "Table edge drop", dominoTest: "Domino chain", experimentHint: "Choose a setup, then press Run.", menu: "Tools menu", material: "Body material", rubber: "Rubber", wood: "Wood", metal: "Metal", themeHint: "Material changes surface friction.", massHint: "Mass changes impacts; gravity gives equal free-fall acceleration." }
    : { dark: "Dunkel", light: "Hell", switchDark: "Dunkelmodus aktivieren", switchLight: "Hellmodus aktivieren", view3d: "3D-Ansicht", sideView: "Seitenansicht", fullscreen: "Vollbild umschalten", playback: "Wiedergabetempo", energy: "Energie", potential: "Potenzial", kinetic: "Kinetisch", totalEnergy: "Mechanische Gesamtenergie", motion: "Bewegung", speed: "Tempo", position: "Position", simTime: "Sim-Zeit", gravity: "Gravitation", path: "Bahnansicht", top: "oben", target: "Ziel", experiments: "EXPERIMENTE", gravityTest: "Mondgravitation", collisionTest: "Massenstoß", edgeTest: "Tischkante", dominoTest: "Dominokette", experimentHint: "Aufbau wählen und Start drücken.", menu: "Werkzeuge", material: "Körpermaterial", rubber: "Gummi", wood: "Holz", metal: "Metall", themeHint: "Material verändert die Reibung.", massHint: "Masse ändert Stöße; im freien Fall ist die Beschleunigung gleich." };
  const currentEnergy = solverRef.current.totalEnergy;
  const totalEnergy = Math.max(currentEnergy.total, 0.001);
  const activeBody = solverRef.current.bodies.find(body => body.id === selectedBodyId) ?? solverRef.current.bodies.at(-1);
  const pathPercent = (x: number) => `${Math.max(0, Math.min(100, ((x + 5.75) / 11.5) * 100))}%`;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Engine(canvas, true, { preserveDrawingBuffer: true, stencil: true, antialias: true });
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.91, 0.92, 0.89, 1);
    sceneRef.current = scene;
    engineRef.current = engine;
    const staticPhysicsMeshes: Mesh[] = [];
    scene.onPointerObservable.add(pointer => {
      if (pointer.type !== PointerEventTypes.POINTERPICK) return;
      let pickedNode: Node | null = pointer.pickInfo?.pickedMesh ?? null;
      while (pickedNode) {
        const bodyId = pickedNode.metadata?.physicslabBodyId;
        if (typeof bodyId === "number") {
          const body = solverRef.current.bodies.find(candidate => candidate.id === bodyId);
          if (body) {
            setSelectedBodyId(body.id);
            setBodyMass(body.mass);
            setBodyRestitution(body.restitution);
            setSelectedBodyTheme(visualsRef.current.find(visual => visual.state.id === body.id)?.theme ?? "rubber");
          }
          return;
        }
        pickedNode = pickedNode.parent;
      }
    }, PointerEventTypes.POINTERPICK);

    const camera = new ArcRotateCamera("camera", -Math.PI / 2.28, 1.18, 12, new Vector3(0.15, 1.35, 0), scene);
    cameraRef.current = camera;
    camera.lowerRadiusLimit = 8;
    camera.upperRadiusLimit = 12.4;
    camera.lowerBetaLimit = 1.13;
    camera.upperBetaLimit = 1.43;
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

    const wall = (name: string, width: number, height: number, depth: number, x: number, y: number, z: number, material: Material = wallMat) => {
      const piece = MeshBuilder.CreateBox(name, { width, height, depth }, scene);
      piece.position.set(x, y, z);
      piece.material = material;
      piece.receiveShadows = true;
      if (material !== glassMat) {
        piece.metadata = { physicsRole: "static-collider" };
        staticPhysicsMeshes.push(piece);
      }
      return piece;
    };
    // Four enclosing walls. The back wall is split around a broad multi-pane window.
    const roomFrontZ = -14.5;
    const sideWindowStart = -1;
    const sideWindowEnd = 5;
    const sideWindowCenter = (sideWindowStart + sideWindowEnd) / 2;
    const roomBackZ = 13.6;
    for (const x of [-13, 13]) {
      const insideX = x - Math.sign(x) * 0.17;
      const frontDepth = sideWindowStart - roomFrontZ;
      const backDepth = roomBackZ - sideWindowEnd;
      wall("lab-side-wall-front", 0.28, roomHeight, frontDepth, x, roomFloorY + roomHeight / 2, (roomFrontZ + sideWindowStart) / 2);
      wall("lab-side-wall-back", 0.28, roomHeight, backDepth, x, roomFloorY + roomHeight / 2, (roomBackZ + sideWindowEnd) / 2);
      wall("lab-side-wall-sill", 0.28, 1.25 - roomFloorY, sideWindowEnd - sideWindowStart, x, roomFloorY + (1.25 - roomFloorY) / 2, sideWindowCenter);
      wall("lab-side-wall-header", 0.28, roomTop - 5.15, sideWindowEnd - sideWindowStart, x, 5.15 + (roomTop - 5.15) / 2, sideWindowCenter);
      const sideGlass = MeshBuilder.CreateBox("side-lab-window", { width: 0.06, height: 3.82, depth: 5.82 }, scene);
      sideGlass.position.set(insideX, 3.2, sideWindowCenter);
      sideGlass.material = glassMat;
      sideGlass.isPickable = false;
      for (const z of [sideWindowStart, sideWindowCenter, sideWindowEnd]) {
        wall("side-window-vertical-frame", 0.11, 3.98, 0.075, insideX, 3.2, z, trimMat);
      }
      for (const y of [1.25, 3.2, 5.15]) {
        wall("side-window-horizontal-frame", 0.11, 0.075, 6.16, insideX, y, sideWindowCenter, trimMat);
      }
      wall("side-window-oak-sill", 0.38, 0.12, 6.3, x - Math.sign(x) * 0.01, 1.19, sideWindowCenter, woodTrimMat);
    }
    wall("lab-wall-front", 26, roomHeight, 0.28, 0, roomFloorY + roomHeight / 2, roomFrontZ);
    const windowWidth = 10;
    const windowBottom = 1.25;
    const windowTop = 5.15;
    const backWallZ = roomBackZ;
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
    const posterFrame = MeshBuilder.CreateBox("physics-poster-frame", { width: 2.7, height: 2.25, depth: 0.12 }, scene);
    posterFrame.position.set(8.3, 3.55, backWallZ - 0.18);
    posterFrame.material = mat("poster-frame-material", "#314d3e", 0.16, 0.48);
    const poster = MeshBuilder.CreatePlane("physics-poster", { width: 2.5, height: 2.05 }, scene);
    poster.position.set(8.3, 3.55, backWallZ - 0.25);
    poster.rotation.y = Math.PI;
    const posterTexture = new DynamicTexture("physics-poster-texture", { width: 512, height: 420 }, scene, false, Texture.TRILINEAR_SAMPLINGMODE);
    const posterContext = posterTexture.getContext() as unknown as CanvasRenderingContext2D;
    posterContext.fillStyle = "#f2eddf";
    posterContext.fillRect(0, 0, 512, 420);
    posterContext.fillStyle = "#244b3b";
    posterContext.fillRect(0, 0, 512, 112);
    posterContext.fillStyle = "#f5f2e9";
    posterContext.font = "700 31px Arial";
    posterContext.fillText("FORCES IN MOTION", 28, 68);
    posterContext.fillStyle = "#345947";
    posterContext.font = "600 21px Arial";
    posterContext.fillText("OBSERVE  ·  MEASURE  ·  EXPLAIN", 30, 150);
    posterContext.strokeStyle = "#df874d";
    posterContext.lineWidth = 13;
    posterContext.beginPath();
    posterContext.moveTo(76, 325);
    posterContext.lineTo(252, 216);
    posterContext.lineTo(432, 325);
    posterContext.stroke();
    posterContext.fillStyle = "#368b82";
    posterContext.beginPath();
    posterContext.arc(148, 268, 25, 0, Math.PI * 2);
    posterContext.fill();
    posterTexture.update();
    const posterMaterial = new StandardMaterial("physics-poster-material", scene);
    posterMaterial.diffuseTexture = posterTexture;
    posterMaterial.emissiveColor = Color3.White();
    posterMaterial.backFaceCulling = false;
    poster.material = posterMaterial;
    const wallShelf = MeshBuilder.CreateBox("wall-shelf", { width: 2.9, height: 0.1, depth: 0.46 }, scene);
    wallShelf.position.set(8.3, 2.1, backWallZ - 0.37);
    wallShelf.material = woodTrimMat;
    wallShelf.receiveShadows = true;
    staticPhysicsMeshes.push(wallShelf);
    // Baseboards and a restrained oak wall band provide scale and material variation.
    for (const x of [-12.82, 12.82]) {
      wall("lab-side-baseboard", 0.09, 0.2, 23.1, x, roomFloorY + 0.1, -2.75, woodTrimMat);
    }
    wall("lab-back-baseboard-left", 8, 0.2, 0.1, -9, roomFloorY + 0.1, roomBackZ - 0.18, woodTrimMat);
    wall("lab-back-baseboard-right", 8, 0.2, 0.1, 9, roomFloorY + 0.1, roomBackZ - 0.18, woodTrimMat);
    const ceiling = MeshBuilder.CreateBox("lab-ceiling", { width: 26, height: 0.18, depth: roomBackZ - roomFrontZ }, scene);
    ceiling.position.set(0, roomTop + 0.09, (roomBackZ + roomFrontZ) / 2);
    ceiling.material = wallMat;
    ceiling.receiveShadows = true;
    ceiling.metadata = { physicsRole: "static-collider" };
    staticPhysicsMeshes.push(ceiling);

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
    const rampMat = mat("ramp", "#ffffff", 0.04, 0.48);
    const rampTexture = new Texture("/assets/textures/bench_oak.jpg", scene, false, false, Texture.TRILINEAR_SAMPLINGMODE);
    rampTexture.uScale = 1;
    rampTexture.vScale = 1;
    rampMat.albedoTexture = rampTexture;
    const railMat = mat("rail", "#f09b62", 0.18, 0.38);
    const targetMat = mat("target", "#57a983", 0.1, 0.45);
    const floor = MeshBuilder.CreateBox("workbench", { width: 11.5, height: 0.1, depth: 3.2 }, scene);
    floor.position.set(0, 0.55, 0);
    floor.material = benchMat;
    floor.receiveShadows = true;
    staticPhysicsMeshes.push(floor);
    const benchFrameMat = mat("bench-frame", "#655447", 0.12, 0.62);
    for (const x of [-5.25, 5.25]) {
      for (const z of [-1.35, 1.35]) {
        const leg = MeshBuilder.CreateBox("workbench-leg", { width: 0.22, height: 0.93, depth: 0.22 }, scene);
        leg.position.set(x, 0.035, z);
        leg.material = benchFrameMat;
        leg.receiveShadows = true;
        leg.metadata = { physicsRole: "static-collider" };
        staticPhysicsMeshes.push(leg);
        shadowGenerator.addShadowCaster(leg);
      }
    }
    for (const z of [-1.35, 1.35]) {
      const apron = MeshBuilder.CreateBox("workbench-apron", { width: 10.5, height: 0.12, depth: 0.1 }, scene);
      apron.position.set(0, 0.455, z);
      apron.material = benchFrameMat;
      apron.metadata = { physicsRole: "static-collider" };
      staticPhysicsMeshes.push(apron);
    }
    const ramp = MeshBuilder.CreateBox("ramp", { width: 5.05, height: 0.16, depth: 1.5 }, scene);
    ramp.position.set(-0.75, 1.11, 0);
    ramp.rotation.z = -0.235;
    ramp.material = rampMat;
    ramp.receiveShadows = true;
    staticPhysicsMeshes.push(ramp);
    shadowGenerator.addShadowCaster(ramp);
    for (const z of [-0.78, 0.78]) {
      const rail = MeshBuilder.CreateBox("ramp-rail", { width: 5.05, height: 0.12, depth: 0.09 }, scene);
      rail.position.set(-0.75, 0.99, z);
      rail.rotation.z = -0.235;
      rail.material = railMat;
      rail.receiveShadows = true;
      staticPhysicsMeshes.push(rail);
      shadowGenerator.addShadowCaster(rail);
    }
    for (const [x, height] of [[-2.55, 1.1], [1.28, 0.12]]) {
      const support = MeshBuilder.CreateBox("support", { width: 0.2, height, depth: 1.2 }, scene);
      support.position.set(x, tabletopY + height / 2, 0);
      support.material = mat("aluminum-support", "#9ba9a7", 0.62, 0.35);
      support.receiveShadows = true;
      staticPhysicsMeshes.push(support);
      shadowGenerator.addShadowCaster(support);
    }
    const target = MeshBuilder.CreateTorus("target", { diameter: 1.06, thickness: 0.09, tessellation: 48 }, scene);
    target.position.set(4.55, tabletopY + 0.045, 0);
    target.rotation.x = 0;
    target.material = targetMat;
    target.receiveShadows = true;
    const targetLabel = MeshBuilder.CreatePlane("target-world-label", { width: 1.3, height: 0.34 }, scene);
    targetLabel.position.set(4.55, 1.3, 0);
    targetLabel.billboardMode = Mesh.BILLBOARDMODE_ALL;
    targetLabel.isPickable = false;
    const targetLabelTexture = new DynamicTexture("target-world-label-texture", { width: 512, height: 128 }, scene, false, Texture.TRILINEAR_SAMPLINGMODE);
    targetLabelTexture.hasAlpha = true;
    drawTargetLabel(targetLabelTexture, "Target");
    targetLabelTextureRef.current = targetLabelTexture;
    const targetLabelMaterial = new StandardMaterial("target-world-label-material", scene);
    targetLabelMaterial.diffuseTexture = targetLabelTexture;
    targetLabelMaterial.opacityTexture = targetLabelTexture;
    targetLabelMaterial.emissiveColor = Color3.White();
    targetLabelMaterial.disableLighting = true;
    targetLabelMaterial.backFaceCulling = false;
    targetLabel.material = targetLabelMaterial;
    const grid = MeshBuilder.CreateGround("grid", { width: 26, height: roomBackZ - roomFrontZ, subdivisions: 1 }, scene);
    grid.position.set(0, -0.43, (roomBackZ + roomFrontZ) / 2);
    const labFloorMat = mat("lab-floor-terrazzo", "#c8c5bd", 0.02, 0.82);
    const labFloorTexture = new Texture("/assets/textures/lab_floor.png", scene, true, false, Texture.TRILINEAR_SAMPLINGMODE);
    labFloorTexture.uScale = 9;
    labFloorTexture.vScale = 11;
    labFloorMat.albedoTexture = labFloorTexture;
    grid.material = labFloorMat;
    grid.receiveShadows = true;
    staticPhysicsMeshes.push(grid);
    const shadow = MeshBuilder.CreateDisc("target-shadow", { radius: 0.56, tessellation: 36 }, scene);
    shadow.position.set(4.55, tabletopY + 0.002, 0);
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
      if (!physicsReadyRef.current && playingRef.current) {
        accumulator.current += delta * playbackSpeedRef.current;
        let changed = false;
        while (accumulator.current >= solverRef.current.fixedStep) {
          solverRef.current.step();
          accumulator.current -= solverRef.current.fixedStep;
          changed = true;
        }
        if (changed) {
          for (const visual of visualsRef.current) syncBody(visual);
          setTime(solverRef.current.elapsed);
          if (!targetReachedRef.current && solverRef.current.hasReachedTarget("ball")) {
            targetReachedRef.current = true;
            setTargetReached(true);
            recordLessonCompletion();
          }
        }
      } else if (physicsReadyRef.current) {
        const advancing = playingRef.current || singlePhysicsStepRef.current;
        const physicsEngine = scene.getPhysicsEngine();
        physicsEngine?.setTimeStep(singlePhysicsStepRef.current ? 1 / 60 : (1 / 60) * playbackSpeedRef.current);
        for (const visual of visualsRef.current) visual.aggregate?.body.setMotionType(advancing ? PhysicsMotionType.DYNAMIC : PhysicsMotionType.STATIC);
        scene.render();
        if (advancing) {
          const elapsedStep = singlePhysicsStepRef.current ? 1 / 60 : delta * playbackSpeedRef.current;
          solverRef.current.elapsed += elapsedStep;
      for (const visual of visualsRef.current) {
            const { state, root, aggregate } = visual;
            if (!aggregate) continue;
            state.x = root.position.x;
            state.y = root.position.y;
            const velocity = aggregate.body.getLinearVelocity();
            state.speed = velocity.length();
            state.verticalSpeed = velocity.y;
            state.rotation = root.rotation.z;
            state.falling = state.x > 5.75 && state.y < tabletopY + bodyRadius;
            state.finished = state.x >= 4.55;
            if (xrayRef.current) {
              visual.arrow.setEnabled(state.speed > 0.04);
              visual.arrow.position.set(state.x, state.y + 0.35, 0);
              visual.arrow.rotation.z = Math.atan2(velocity.y, velocity.x);
              visual.arrow.scaling.x = Math.min(1.25, state.speed * 0.35);
            }
          }
          setTime(solverRef.current.elapsed);
          if (!targetReachedRef.current && solverRef.current.hasReachedTarget("ball")) {
            targetReachedRef.current = true;
            setTargetReached(true);
            recordLessonCompletion();
          }
          if (singlePhysicsStepRef.current) {
            singlePhysicsStepRef.current = false;
            for (const visual of visualsRef.current) visual.aggregate?.body.setMotionType(PhysicsMotionType.STATIC);
          }
        }
      } else {
        scene.render();
      }
    };
    let sceneDisposed = false;
    void import("@babylonjs/havok").then(({ default: initializeHavok }) => initializeHavok()).then(havok => {
      if (sceneDisposed) return;
      const plugin = new HavokPlugin(true, havok);
      scene.enablePhysics(new Vector3(0, -gravityRef.current, 0), plugin);
      for (const mesh of staticPhysicsMeshes) {
        new PhysicsAggregate(mesh, PhysicsShapeType.BOX, { mass: 0, friction: 0.72, restitution: 0 }, scene);
      }
      for (const visual of visualsRef.current) createDynamicAggregate(visual, scene);
      physicsReadyRef.current = true;
    }).catch(error => {
      console.warn("[PhysicsLab] Havok could not initialize; using the first-lesson track solver.", error);
    });
    for (const kind of ["ball", "cube", "domino", "weight"] as const) {
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
      physicsReadyRef.current = false;
      measureRigRef.current?.dispose(false, true);
      measureRigRef.current = null;
      targetLabelTextureRef.current = null;
      cameraRef.current = null;
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
    if (!physicsReadyRef.current || !visual.aggregate) {
      root.position.set(state.x, state.y, 0);
      if (state.kind === "ball") root.rotation.z = state.rotation;
      else root.rotation.z = state.rotation * 0.35;
    }
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

  const placeBodyFromState = (visual: VisualBody) => {
    visual.root.position.set(visual.state.x, visual.state.y, 0);
    visual.root.rotation.z = visual.state.kind === "ball" ? visual.state.rotation : visual.state.rotation * 0.35;
    visual.aggregate?.body.setTargetTransform(visual.root.position, Quaternion.FromEulerAngles(0, 0, visual.root.rotation.z));
  };

  const addBody = useCallback((kind: BodyKind) => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (solverRef.current.bodies.length >= 14) {
      setFileMessage(t.maxBodies);
      return;
    }
    const state = solverRef.current.addBody(kind);
    setSelectedBodyId(state.id);
    setBodyMass(state.mass);
    setBodyRestitution(state.restitution);
    const mesh = kind === "ball"
      ? MeshBuilder.CreateSphere(`ball-${state.id}`, { diameter: bodyRadius * 2, segments: 32 }, scene)
      : kind === "weight"
        ? MeshBuilder.CreateCylinder(`weight-${state.id}`, { height: 0.36, diameter: 0.4, tessellation: 32 }, scene)
        : kind === "domino"
          ? MeshBuilder.CreateBox(`domino-${state.id}`, { width: 0.16, height: 0.6, depth: 0.24 }, scene)
          : MeshBuilder.CreateBox(`cube-${state.id}`, { size: bodyRadius * 1.75 }, scene);
    const root = new TransformNode(`body-root-${state.id}`, scene);
    root.metadata = { physicslabBodyId: state.id, physicsRole: "solver-driven-dynamic-body" };
    mesh.parent = root;
    const material = new PBRMaterial(`body-mat-${state.id}`, scene);
    material.albedoColor = kind === "ball" ? Color3.FromHexString("#377d79") : kind === "weight" ? Color3.FromHexString("#a7b3b3") : kind === "domino" ? Color3.FromHexString("#df8d4c") : Color3.FromHexString("#7562a6");
    material.metallic = 0.14;
    material.roughness = 0.28;
    mesh.material = material;
    const arrow = MeshBuilder.CreateBox(`velocity-${state.id}`, { width: 1, height: 0.035, depth: 0.035 }, scene);
    const arrowMat = new StandardMaterial(`velocity-mat-${state.id}`, scene);
    arrowMat.diffuseColor = Color3.FromHexString("#d85638");
    arrow.material = arrowMat;
    arrow.setEnabled(false);
    const initialTheme: BodyTheme = kind === "domino" ? "wood" : kind === "weight" ? "metal" : "rubber";
    const visual: VisualBody = { root, fallbackMesh: mesh, arrow, state, theme: initialTheme };
    visualsRef.current.push(visual);
    syncBody(visual);
    if (physicsReadyRef.current) createDynamicAggregate(visual, scene);
    applyBodyTheme(visual, initialTheme);
    setSelectedBodyTheme(initialTheme);
    const modelContainer = modelAssetsRef.current[kind];
    if (modelContainer) attachGlb(visual, modelContainer);
    setBodyCount(solverRef.current.bodies.length);
  }, [xray, t.maxBodies]);

  const selectBody = (id: number) => {
    const body = solverRef.current.bodies.find(candidate => candidate.id === id);
    if (!body) return;
    setSelectedBodyId(body.id);
    setBodyMass(body.mass);
    setBodyRestitution(body.restitution);
    setSelectedBodyTheme(visualsRef.current.find(visual => visual.state.id === body.id)?.theme ?? "rubber");
  };

  const updateSelectedBody = (property: "mass" | "restitution", value: number) => {
    const body = solverRef.current.bodies.find(candidate => candidate.id === selectedBodyId);
    if (!body) return;
    body[property] = value;
    if (property === "mass") setBodyMass(value);
    else setBodyRestitution(value);
    const visual = visualsRef.current.find(candidate => candidate.state.id === body.id);
    if (visual?.aggregate) {
      if (property === "mass") visual.aggregate.body.setMassProperties({ mass: value });
      else visual.aggregate.shape.material = { ...visual.aggregate.shape.material, restitution: value };
    }
    // Publish a render so the total mass and energy readouts react immediately.
    setPropertyRevision(revision => revision + 1);
  };

  const removeSelectedBody = () => {
    if (selectedBodyId === null || !solverRef.current.removeBody(selectedBodyId)) return;
    const visualIndex = visualsRef.current.findIndex(visual => visual.state.id === selectedBodyId);
    if (visualIndex >= 0) disposeVisual(visualsRef.current.splice(visualIndex, 1)[0]);
    const nextBody = solverRef.current.bodies.at(-1);
    setBodyCount(solverRef.current.bodies.length);
    setSelectedBodyId(nextBody?.id ?? null);
    setBodyMass(nextBody?.mass ?? 1);
    setBodyRestitution(nextBody?.restitution ?? 0.35);
    setSelectedBodyTheme(visualsRef.current.find(visual => visual.state.id === nextBody?.id)?.theme ?? "rubber");
  };

  const start = () => {
    if (solverRef.current.bodies.length === 0) addBody("ball");
    accumulator.current = 0;
    if (physicsReadyRef.current) for (const visual of visualsRef.current) visual.aggregate?.body.setMotionType(PhysicsMotionType.DYNAMIC);
    playingRef.current = true;
    setPlaying(true);
  };

  const updateSelectedBodyTheme = (theme: BodyTheme) => {
    const visual = visualsRef.current.find(candidate => candidate.state.id === selectedBodyId);
    if (!visual) return;
    setSelectedBodyTheme(theme);
    applyBodyTheme(visual, theme);
    setPropertyRevision(revision => revision + 1);
  };
  const pause = () => {
    playingRef.current = false;
    for (const visual of visualsRef.current) visual.aggregate?.body.setMotionType(PhysicsMotionType.STATIC);
    setPlaying(false);
  };
  const step = () => {
    if (playingRef.current) return;
    if (solverRef.current.bodies.length === 0) addBody("ball");
    if (physicsReadyRef.current) {
      singlePhysicsStepRef.current = true;
      for (const visual of visualsRef.current) visual.aggregate?.body.setMotionType(PhysicsMotionType.DYNAMIC);
    } else {
      solverRef.current.step();
      visualsRef.current.forEach(syncBody);
      setTime(solverRef.current.elapsed);
      if (!targetReachedRef.current && solverRef.current.hasReachedTarget("ball")) {
        targetReachedRef.current = true;
        setTargetReached(true);
        recordLessonCompletion();
      }
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
    setSelectedBodyId(null);
    setBodyMass(1);
    setBodyRestitution(0.35);
    targetReachedRef.current = false;
    setTargetReached(false);
    setActiveExperiment(null);
  };

  const loadExperiment = (kind: "gravity" | "collision" | "edge" | "domino") => {
    reset();
    if (kind === "gravity") {
      setGravity(1.6);
      addBody("ball");
    } else if (kind === "collision") {
      setGravity(9.81);
      addBody("cube");
      const rear = solverRef.current.bodies.at(-1);
      addBody("ball");
      const front = solverRef.current.bodies.at(-1);
      if (rear) { rear.mass = 2.5; rear.restitution = 0.8; }
      if (front) { front.mass = 0.5; front.restitution = 0.8; }
      for (const visual of visualsRef.current) {
        if (visual.aggregate) {
          visual.aggregate.body.setMassProperties({ mass: visual.state.mass });
          visual.aggregate.shape.material = { ...visual.aggregate.shape.material, restitution: visual.state.restitution };
        }
      }
      if (front) {
        setSelectedBodyId(front.id);
        setBodyMass(front.mass);
        setBodyRestitution(front.restitution);
      }
    } else if (kind === "edge") {
      setGravity(9.81);
      addBody("ball");
      const body = solverRef.current.bodies.at(-1);
      if (body) {
        body.x = 5.0;
        body.y = tabletopY + bodyRadius;
        body.speed = 2;
        body.falling = false;
        const visual = visualsRef.current.at(-1);
        if (visual) {
          placeBodyFromState(visual);
          visual.aggregate?.body.setLinearVelocity(new Vector3(body.speed, 0, 0));
        }
      }
    } else {
      setGravity(9.81);
      addBody("ball");
      const starter = solverRef.current.bodies.at(-1);
      const starterVisual = visualsRef.current.at(-1);
      if (starter && starterVisual) {
        starter.x = 0.8;
        starter.y = tabletopY + bodyRadius;
        starter.speed = 3.2;
        placeBodyFromState(starterVisual);
        starterVisual.aggregate?.body.setLinearVelocity(new Vector3(starter.speed, 0, 0));
      }
      for (let index = 0; index < 5; index += 1) {
        addBody("domino");
        const domino = solverRef.current.bodies.at(-1);
        const visual = visualsRef.current.at(-1);
        if (!domino || !visual) continue;
        domino.x = 1.85 + index * 0.25;
        domino.y = tabletopY + 0.3;
        domino.mass = 0.55;
        domino.restitution = 0.18;
        if (visual.aggregate) {
          visual.aggregate.body.setMassProperties({ mass: domino.mass });
          visual.aggregate.shape.material = { ...visual.aggregate.shape.material, restitution: domino.restitution };
        }
        placeBodyFromState(visual);
      }
      if (starter) {
        setSelectedBodyId(starter.id);
        setBodyMass(starter.mass);
        setBodyRestitution(starter.restitution);
        setSelectedBodyTheme(starterVisual?.theme ?? "rubber");
      }
    }
    setActiveExperiment(kind);
  };

  const saveSetup = () => {
    const serialized = serializePhysicsLabDocument({
      gravity: gravity,
      bodies: solverRef.current.bodies.map(({ kind, mass, restitution }) => ({ kind, mass, restitution })),
    });
    const url = URL.createObjectURL(new Blob([serialized], { type: "application/vnd.physicslab+json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "experiment.physicslab";
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFileMessage(locale === "en" ? "Experiment setup saved." : "Versuchsaufbau gespeichert.");
  };

  const loadSetup = async (file: File) => {
    try {
      const document = parsePhysicsLabDocument(await file.text());
      if (!sceneRef.current) throw new Error("The 3D scene is not ready yet. Try again in a moment.");
      reset();
      solverRef.current.gravity = document.gravity;
      setGravity(document.gravity);
      for (const savedBody of document.bodies) {
        addBody(savedBody.kind);
        const body = solverRef.current.bodies.at(-1);
        if (!body) continue;
        body.mass = savedBody.mass;
        body.restitution = savedBody.restitution;
        const visual = visualsRef.current.at(-1);
        if (visual) {
          visual.aggregate?.body.setMassProperties({ mass: body.mass });
          if (visual.aggregate) visual.aggregate.shape.material = { ...visual.aggregate.shape.material, restitution: body.restitution };
          syncBody(visual);
        }
        setBodyMass(body.mass);
        setBodyRestitution(body.restitution);
      }
      setFileMessage(t.loadedSetup);
    } catch (error) {
      setFileMessage(error instanceof Error ? error.message : "Could not load this experiment file.");
    }
  };

  const selectExperimentFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) void loadSetup(file);
  };

  const toggleFullscreen = () => {
    const frame = sceneFrameRef.current;
    if (!frame) return;
    if (document.fullscreenElement === frame) void document.exitFullscreen();
    else void frame.requestFullscreen().catch(() => setFileMessage(locale === "en" ? "Fullscreen is unavailable in this browser." : "Vollbild ist in diesem Browser nicht verfügbar."));
  };

  useEffect(() => {
    gravityRef.current = gravity;
    solverRef.current.gravity = gravity;
    sceneRef.current?.getPhysicsEngine()?.setGravity(new Vector3(0, -gravity, 0));
  }, [gravity]);

  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    try { localStorage.setItem("physicslab-theme", darkMode ? "dark" : "light"); } catch { /* Theme remains available for this session. */ }
  }, [darkMode]);

  useEffect(() => {
    if (!headerMenuOpen) return;
    const closeOutside = (event: PointerEvent) => {
      if (event.target instanceof window.Node && !headerMenuRef.current?.contains(event.target)) setHeaderMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setHeaderMenuOpen(false); };
    document.addEventListener("pointerdown", closeOutside);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [headerMenuOpen]);

  useEffect(() => { playbackSpeedRef.current = playbackSpeed; }, [playbackSpeed]);

  useEffect(() => {
    const camera = cameraRef.current;
    if (!camera) return;
    camera.alpha = viewMode === "3d" ? -Math.PI / 2.28 : -Math.PI / 2;
    camera.beta = viewMode === "3d" ? 1.18 : 1.48;
    camera.radius = viewMode === "3d" ? 12 : 13;
    camera.setTarget(new Vector3(0.15, 1.1, 0));
  }, [viewMode]);

  useEffect(() => {
    if (targetLabelTextureRef.current) drawTargetLabel(targetLabelTextureRef.current, t.target);
  }, [t.target]);

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
        <div className="topbar-context"><span>{t.eyebrow.split(" / ")[1]}</span><b>{t.rampMotion}</b></div>
        <div className="top-actions"><span className="status-pill"><i />{t.eyebrow.split(" / ")[1]}</span><button className="locale" onClick={() => setLocale(locale === "en" ? "de" : "en")}>{locale.toUpperCase()}</button><button className="theme-toggle" type="button" onClick={() => setDarkMode(value => !value)} aria-label={darkMode ? ui.switchLight : ui.switchDark} title={darkMode ? ui.light : ui.dark}>{darkMode ? "☀" : "☾"}<span>{darkMode ? ui.light : ui.dark}</span></button><div className="header-menu-wrap" ref={headerMenuRef}><button className="header-menu-trigger" type="button" aria-expanded={headerMenuOpen} aria-haspopup="true" onClick={() => setHeaderMenuOpen(value => !value)}><span>☰</span><span>{ui.menu}</span><b>{headerMenuOpen ? "⌃" : "⌄"}</b></button>{headerMenuOpen && <div className="header-menu" role="menu"><button role="menuitemcheckbox" aria-checked={xray} onClick={() => setXray(value => !value)}><span>◉</span>{t.xray}<i>{xray ? "✓" : ""}</i></button><button role="menuitemcheckbox" aria-checked={measureVisible} onClick={() => setMeasureVisible(value => !value)}><span>⌗</span>{t.measure}<i>{measureVisible ? "✓" : ""}</i></button><div className="header-menu-divider" /><button role="menuitem" onClick={() => { saveSetup(); setHeaderMenuOpen(false); }}><span>↓</span>{t.saveSetup}</button><button role="menuitem" onClick={() => { setHeaderMenuOpen(false); experimentInputRef.current?.click(); }}><span>↑</span>{t.loadSetup}</button><input ref={experimentInputRef} className="visually-hidden-file" type="file" accept=".physicslab,application/json" onChange={selectExperimentFile} /></div>}</div></div>
      </header>

      <div className="workspace">
        <aside className="left-rail">
          <div className="rail-heading"><span className="section-kicker">{t.lesson}</span><span className="lesson-number">01 / 08</span></div>
          <h2>{t.lessonTitle}</h2><p className="lesson-copy">{t.lessonBody}</p>
          <div className="progress-track"><span style={{ width: lessonCompleted ? "100%" : "16%" }} /></div><div className="progress-caption"><span>{t.motion}</span><span>{lessonCompleted ? t.lessonCompleted : t.lessonProgress}</span></div>
          <div className="experiment-picker"><div className="category-label">{ui.experiments}</div><button className={activeExperiment === "gravity" ? "experiment-option active" : "experiment-option"} onClick={() => loadExperiment("gravity")}>{ui.gravityTest}<small>g = 1.6 m/s²</small></button><button className={activeExperiment === "collision" ? "experiment-option active" : "experiment-option"} onClick={() => loadExperiment("collision")}>{ui.collisionTest}<small>2 bodies · different mass</small></button><button className={activeExperiment === "edge" ? "experiment-option active" : "experiment-option"} onClick={() => loadExperiment("edge")}>{ui.edgeTest}<small>v₀ = 2 m/s</small></button><button className={activeExperiment === "domino" ? "experiment-option active" : "experiment-option"} onClick={() => loadExperiment("domino")}>{ui.dominoTest}<small>ball + 5 dominoes</small></button><p>{ui.experimentHint}</p></div>
          <div className="separator" />
          <div className="rail-heading"><span className="section-kicker">{t.components}</span></div>
          <div className="category-label">{t.mechanics}</div>
          <button className="component-row" disabled={bodyCount >= 14} onClick={() => addBody("ball")}><span className="component-icon ball-icon">●</span><span>{t.ball}</span><span className="add-sign">＋</span></button>
          <button className="component-row" disabled={bodyCount >= 14} onClick={() => addBody("cube")}><span className="component-icon cube-icon">◆</span><span>{t.cube}</span><span className="add-sign">＋</span></button><button className="component-row" disabled={bodyCount >= 14} onClick={() => addBody("weight")}><span className="component-icon weight-icon">⬟</span><span>{t.weight}</span><span className="add-sign">＋</span></button><button className="component-row" disabled={bodyCount >= 14} onClick={() => addBody("domino")}><span className="component-icon domino-icon">▮</span><span>{t.domino}</span><span className="add-sign">＋</span></button>
          <div className="component-row component-row-static"><span className="component-icon ramp-icon">▱</span><span>{t.ramp}</span><span className="in-scene-badge">{locale === "en" ? "IN SCENE" : "IM AUFBAU"}</span></div>
          <div className="rail-bottom"><div className="avatar small-avatar">✦</div><div><b>PhysicsLab</b><span>Learning through play</span></div> </div>
        </aside>

        <section className="lab-column">
          <div className="lab-toolbar"><div className="lab-title"><span className="live-dot" /> <b>{t.workbench}</b><span className="toolbar-divider">/</span><span>{t.rampMotion}</span></div></div>
          <div className="scene-frame" ref={sceneFrameRef}><canvas ref={canvasRef} aria-label="Interactive 3D physics workbench" /><div className="scene-badge"><span className={playing ? "badge-dot active" : "badge-dot"} />{targetReached ? t.success : playing ? t.running : time > 0 ? t.paused : t.ready}</div><div className="scene-view-tools"><button className={viewMode === "3d" ? "active" : ""} onClick={() => setViewMode("3d")}>{ui.view3d}</button><button className={viewMode === "side" ? "active" : ""} onClick={() => setViewMode("side")}>{ui.sideView}</button><button className="fullscreen-button" onClick={toggleFullscreen} title={ui.fullscreen} aria-label={ui.fullscreen}>⛶</button></div>{fileMessage && <div className="file-message" role="status">{fileMessage}</div>}{measureVisible && <div className="ruler-legend" role="status"><b>{t.measureOn}</b><span>{t.rulerScale}</span></div>}<div className="scene-hint">{t.orbitHint} <span>·</span> {t.zoomHint}</div>
            {xray && <div className="xray-legend"><b>{t.xray.toUpperCase()}</b><span><i className="motion-line" /> {t.speed} · {visualsRef.current.at(-1)?.state.speed.toFixed(1) ?? "0.0"} m/s</span></div>}
          </div>
          <div className="transport"><div className="transport-buttons"><button className="reset-button" onClick={reset} title={t.reset}>↺</button>{playing ? <button className="play-button" onClick={pause}>Ⅱ <span>{t.pause}</span></button> : <button className="play-button" onClick={start}>▶ <span>{t.play}</span></button>}<button className="step-button" onClick={step}>▸│ <span>{t.step}</span></button><span className="transport-divider" /><span className="time-readout"><small>{t.time}</small><b>{time.toFixed(2)}<i>s</i></b></span><span className="transport-divider stopwatch-divider" /><div className="stopwatch-readout"><span className="stopwatch-value"><small>{t.stopwatch}</small><b>{stopwatchTime.toFixed(1)}<i>s</i></b></span><div className="stopwatch-controls"><button type="button" onClick={toggleStopwatch} aria-label={stopwatchRunning ? t.stopwatchPause : t.stopwatchStart} title={stopwatchRunning ? t.stopwatchPause : t.stopwatchStart}>{stopwatchRunning ? "Ⅱ" : "▶"}</button><button type="button" onClick={resetStopwatch} aria-label={t.stopwatchReset} title={t.stopwatchReset}>↺</button></div></div></div>
            <label className="playback-control"><span>{ui.playback}</span><input type="range" min="0.25" max="2" step="0.25" value={playbackSpeed} onChange={event => setPlaybackSpeed(Number(event.target.value))} /><b>{playbackSpeed.toFixed(2)}×</b></label>
            <div className="gravity-control"><label htmlFor="gravity">{t.gravity} <b>{gravity.toFixed(1)} m/s²</b></label><input id="gravity" type="range" min="1" max="25" step="0.1" value={gravity} onChange={e => setGravity(Number(e.target.value))} /><span className="gravity-ends"><span>MOON 1.6</span><span>EARTH 9.8</span><span>JUPITER 24.8</span></span></div>
            <div className="speed-readout"><small>{t.speed}</small><b>{(solverRef.current.bodies.at(-1)?.speed ?? 0).toFixed(1)} <i>m/s</i></b></div>
          </div>
          <div className="analysis-grid">
            <section className="analysis-card energy-chart"><h3>{ui.energy} <small>(J)</small></h3><div className="energy-bars"><div><span>{ui.potential}</span><i><b style={{ width: `${(currentEnergy.potential / totalEnergy) * 100}%` }} /></i><strong>{currentEnergy.potential.toFixed(2)}</strong></div><div><span>{ui.kinetic}</span><i><b className="kinetic-bar" style={{ width: `${(currentEnergy.kinetic / totalEnergy) * 100}%` }} /></i><strong>{currentEnergy.kinetic.toFixed(2)}</strong></div></div><div className="energy-total"><span>{ui.totalEnergy}</span><b>{currentEnergy.total.toFixed(2)} J</b></div></section>
            <section className="analysis-card motion-card"><h3>{ui.motion}</h3><div className="motion-metrics"><div><span>{ui.speed}</span><b>{(activeBody?.speed ?? 0).toFixed(2)} m/s</b></div><div><span>{ui.position}</span><b>{(activeBody?.x ?? 0).toFixed(2)} m</b></div><div><span>{ui.simTime}</span><b>{time.toFixed(2)} s</b></div><div><span>{ui.gravity}</span><b>{gravity.toFixed(1)} m/s²</b></div></div></section>
            <section className="analysis-card path-card"><h3>{ui.path} <small>{ui.top}</small></h3><div className="path-track"><span className="path-ramp" /><span className="path-target" style={{ left: pathPercent(4.55) }} /><span className="path-bodies">{solverRef.current.bodies.map(body => <i key={body.id} className={`path-${body.kind}`} style={{ left: pathPercent(body.x) }} title={`${body.kind} ${body.id}`} />)}</span></div><div className="path-scale"><span>−5.75 m</span><span>{ui.target}</span><span>+5.75 m</span></div></section>
          </div>
        </section>

          <aside className="right-rail"><div className="inspector-head"><span className="section-kicker">{t.labNotes}</span></div><div className="note-icon">✳</div><div className="note-label">{t.fact}</div><h3>{t.factTitle}</h3><p className="fact-copy">{depth === "simple" ? t.factText : depth === "learn" ? t.learnText : t.technicalText}</p><div className="depth-tabs"><button className={depth === "simple" ? "active" : ""} onClick={() => setDepth("simple")}>{t.simple}</button><button className={depth === "learn" ? "active" : ""} onClick={() => setDepth("learn")}>{t.learn}</button><button className={depth === "technical" ? "active" : ""} onClick={() => setDepth("technical")}>{t.technical}</button></div><div className="formula-card"><div className="formula-title">{t.rollingTitle}</div><div className="formula">{motionLesson.formula.expression}</div><div className="formula-caption">{t.formulaCaption}</div></div><div className="source-note"><span className="source-check">↗</span><span><b>{t.factSourceLabel}</b><small>{t.source}</small></span><a className="source-link" href={motionLesson.source.url} target="_blank" rel="noreferrer" aria-label="Open source">↗</a></div><div className="inspector-separator" /><div className="quick-stats"><div><span>{t.objects}</span><b>{bodyCount.toString().padStart(2, "0")}</b></div><div><span>{t.gravityLabel}</span><b>{gravity.toFixed(1)}<small> m/s²</small></b></div><div><span>{t.rampAngle}</span><b>13.5<small>°</small></b></div><div><span>{t.referenceMass}</span><b>{solverRef.current.bodies.reduce((total, body) => total + body.mass, 0).toFixed(1)}<small> kg</small></b></div><div className="energy-stat"><span>{t.energy}</span><b>{solverRef.current.totalEnergy.total.toFixed(1)}<small> J</small></b></div></div><section className="physics-controls"><div className="material-theme-picker"><div className="material-preview-row"><span className={`material-preview ${selectedBodyTheme} ${activeBody?.kind ?? "ball"}`} /><span><label>{ui.material}</label><b>{ui[selectedBodyTheme]}</b></span></div><div className="material-theme-options"><button type="button" className={selectedBodyTheme === "rubber" ? "active" : ""} disabled={selectedBodyId === null} aria-pressed={selectedBodyTheme === "rubber"} onClick={() => updateSelectedBodyTheme("rubber")}>{ui.rubber}</button><button type="button" className={selectedBodyTheme === "wood" ? "active" : ""} disabled={selectedBodyId === null} aria-pressed={selectedBodyTheme === "wood"} onClick={() => updateSelectedBodyTheme("wood")}>{ui.wood}</button><button type="button" className={selectedBodyTheme === "metal" ? "active" : ""} disabled={selectedBodyId === null} aria-pressed={selectedBodyTheme === "metal"} onClick={() => updateSelectedBodyTheme("metal")}>{ui.metal}</button></div><p>{ui.themeHint}</p></div><label htmlFor="body-select">{t.selectedBody}</label><select id="body-select" value={selectedBodyId ?? ""} onChange={event => selectBody(Number(event.target.value))} disabled={solverRef.current.bodies.length === 0}><option value="" disabled>{t.noBody}</option>{solverRef.current.bodies.map(body => <option key={body.id} value={body.id}>{locale === "en" ? { ball: t.ball, cube: t.cube, domino: t.domino, weight: t.weight }[body.kind] : { ball: "Ball", cube: "Würfel", domino: t.domino, weight: t.weight }[body.kind]} · {String(body.id).padStart(2, "0")}</option>)}</select><button className="remove-body-button" type="button" onClick={removeSelectedBody} disabled={selectedBodyId === null}>{t.removeBody}</button><div className="physics-slider"><label htmlFor="body-mass">{t.mass}<b>{bodyMass.toFixed(2)} kg</b></label><input id="body-mass" type="range" min="0.25" max="5" step="0.25" value={bodyMass} disabled={selectedBodyId === null} onChange={event => updateSelectedBody("mass", Number(event.target.value))} /></div><div className="physics-slider"><label htmlFor="body-restitution">{t.restitution}<b>{bodyRestitution.toFixed(2)}</b></label><input id="body-restitution" type="range" min="0" max="0.9" step="0.05" value={bodyRestitution} disabled={selectedBodyId === null} onChange={event => updateSelectedBody("restitution", Number(event.target.value))} /></div><p>{locale === "en" ? "Havok 3D rigid-body contacts" : "Havok-3D-Starrkörperkontakte"}</p><p className="physics-note">{ui.massHint}</p></section><div className="tip-card"><span>✦</span><p><b>{t.tryThis}</b><br />{locale === "en" ? "What changes when you increase gravity?" : "Was ändert sich, wenn du die Gravitation erhöhst?"}</p></div></aside>
      </div>
      <footer className="footer"><span>PHYSICSLAB <i>·</i> LEARN BY EXPERIMENTING</span><span>SIMULATION 01 <i>·</i> {bodyCount} OBJECTS</span></footer>
    </main>
  );
}
