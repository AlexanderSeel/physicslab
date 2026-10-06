import { useCallback, useEffect, useRef, useState } from "react";
import {
  ArcRotateCamera,
  Color3,
  Color4,
  Engine,
  HemisphericLight,
  Mesh,
  MeshBuilder,
  PBRMaterial,
  Scene,
  StandardMaterial,
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
    play: "Run", pause: "Pause", step: "Step", reset: "Reset", gravity: "Gravity", xray: "Force X-Ray",
    ready: "READY TO EXPERIMENT", running: "SIMULATION RUNNING", paused: "SIMULATION PAUSED", success: "TARGET REACHED",
    fact: motionLesson.locales.en.fact, factTitle: motionLesson.locales.en.factTitle, factText: motionLesson.locales.en.simple,
    learnText: motionLesson.locales.en.learn,
    technicalText: motionLesson.locales.en.technical,
    formulaCaption: motionLesson.formula.caption.en, source: motionLesson.source.title.en,
    simple: "SIMPLE", learn: "LEARN", technical: "TECHNICAL", time: "TIME", speed: "SPEED", target: "TARGET", journeyLabel: "LEARNING JOURNEY", motion: "Motion", lessonProgress: "1 of 8", lessonCompleted: "Completed", explorer: "Explorer", workbench: "Workbench 01", rampMotion: "Ramp & Motion", measure: "Measure", measureOn: "RULER ON", rulerScale: "1 m major · 0.25 m minor", labNotes: "LAB NOTES", orbitHint: "DRAG TO ORBIT", zoomHint: "SCROLL TO ZOOM", objects: "OBJECTS", gravityLabel: "GRAVITY", rampAngle: "RAMP ANGLE", tryThis: "Try this", factSourceLabel: "SOURCE", rollingTitle: motionLesson.formula.title.en,
  },
  de: {
    eyebrow: "PHYSICSLAB / BEWEGUNG 01", title: "Bauen. Beobachten. Verstehen.",
    subtitle: "Ein Physik-Spielplatz, in dem jedes Experiment echte Ursache und Wirkung zeigt.",
    academy: "AKADEMIE", freeLab: "FREIES LABOR", missions: "MISSIONEN", lesson: "ERSTES EXPERIMENT",
    lessonTitle: "Schaffst du es, den Ball ins Ziel zu bringen?", lessonBody: "Starte die Simulation und beobachte, wie die Schwerkraft den Ball die Rampe hinunterzieht. Ändere die Gravitation und vergleiche die Bewegung.",
    components: "BAUTEILE", mechanics: "MECHANIK", ball: "Ball", cube: "Würfel", ramp: "Rampe",
    play: "Start", pause: "Pause", step: "Schritt", reset: "Zurücksetzen", gravity: "Gravitation", xray: "Kraft-Röntgen",
    ready: "BEREIT ZUM EXPERIMENTIEREN", running: "SIMULATION LÄUFT", paused: "SIMULATION PAUSIERT", success: "ZIEL ERREICHT",
    fact: motionLesson.locales.de.fact, factTitle: motionLesson.locales.de.factTitle, factText: motionLesson.locales.de.simple,
    learnText: motionLesson.locales.de.learn,
    technicalText: motionLesson.locales.de.technical,
    formulaCaption: motionLesson.formula.caption.de, source: motionLesson.source.title.de,
    simple: "EINFACH", learn: "LERNEN", technical: "TECHNISCH", time: "ZEIT", speed: "TEMPO", target: "ZIEL", journeyLabel: "LERNPFAD", motion: "Bewegung", lessonProgress: "1 von 8", lessonCompleted: "Abgeschlossen", explorer: "Entdecker", workbench: "Werkbank 01", rampMotion: "Rampe & Bewegung", measure: "Messen", measureOn: "LINEAL AN", rulerScale: "1 m groß · 0,25 m klein", labNotes: "LABORNOTIZEN", orbitHint: "ZIEHEN ZUM DREHEN", zoomHint: "SCROLLEN ZUM ZOOMEN", objects: "OBJEKTE", gravityLabel: "GRAVITATION", rampAngle: "RAMPENWINKEL", tryThis: "Probiere das", factSourceLabel: "QUELLE", rollingTitle: motionLesson.formula.title.de,
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
    scene.clearColor = new Color4(0.87, 0.91, 0.9, 1);
    sceneRef.current = scene;
    engineRef.current = engine;

    const camera = new ArcRotateCamera("camera", -Math.PI / 2.28, 1.04, 12, new Vector3(0.15, 1.1, 0), scene);
    camera.lowerRadiusLimit = 8;
    camera.upperRadiusLimit = 18;
    camera.wheelPrecision = 45;
    camera.panningSensibility = 0;
    camera.attachControl(canvas, true);
    new HemisphericLight("softbox", new Vector3(-0.4, 1, -0.25), scene).intensity = 0.9;
    measureRigRef.current = createRulerRig(scene);

    const mat = (name: string, color: string, metallic = 0.1, roughness = 0.6) => {
      const material = new PBRMaterial(name, scene);
      material.albedoColor = Color3.FromHexString(color);
      material.metallic = metallic;
      material.roughness = roughness;
      return material;
    };
    const benchMat = mat("bench", "#d9dfda", 0.08, 0.8);
    const rampMat = mat("ramp", "#e5783d", 0.18, 0.38);
    const railMat = mat("rail", "#f09b62", 0.18, 0.38);
    const targetMat = mat("target", "#57a983", 0.1, 0.45);
    const floor = MeshBuilder.CreateBox("workbench", { width: 12.5, height: 0.3, depth: 5.6 }, scene);
    floor.position.set(0, -0.01, 0);
    floor.material = benchMat;
    const ramp = MeshBuilder.CreateBox("ramp", { width: 5.2, height: 0.16, depth: 1.5 }, scene);
    ramp.position.set(-0.62, 0.63, 0);
    ramp.rotation.z = -0.235;
    ramp.material = rampMat;
    for (const z of [-0.78, 0.78]) {
      const rail = MeshBuilder.CreateBox("ramp-rail", { width: 5.2, height: 0.12, depth: 0.09 }, scene);
      rail.position.set(-0.62, 0.79, z);
      rail.rotation.z = -0.235;
      rail.material = railMat;
    }
    for (const [x, height] of [[-2.55, 1.1], [1.28, 0.12]]) {
      const support = MeshBuilder.CreateBox("support", { width: 0.2, height, depth: 1.2 }, scene);
      support.position.set(x, 0.14 + height / 2, 0);
      support.material = mat("aluminum-support", "#9ba9a7", 0.62, 0.35);
    }
    const target = MeshBuilder.CreateTorus("target", { diameter: 1.06, thickness: 0.09, tessellation: 48 }, scene);
    target.position.set(4.55, 0.59, 0);
    target.rotation.x = Math.PI / 2;
    target.material = targetMat;
    const grid = MeshBuilder.CreateGround("grid", { width: 20, height: 12, subdivisions: 1 }, scene);
    grid.position.y = -0.43;
    grid.material = mat("floor-matte", "#dfe5df", 0, 0.9);
    const shadow = MeshBuilder.CreateDisc("target-shadow", { radius: 0.56, tessellation: 36 }, scene);
    shadow.position.set(4.55, 0.142, 0);
    shadow.rotation.x = Math.PI / 2;
    shadow.material = new StandardMaterial("target-shadow-mat", scene);
    (shadow.material as StandardMaterial).diffuseColor = Color3.FromHexString("#acd2bc");
    (shadow.material as StandardMaterial).alpha = 0.38;

    const render = () => {
      const delta = Math.min(engine.getDeltaTime() / 1000, 0.05);
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
  const reset = () => {
    pause();
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
        <nav className="main-nav" aria-label="Main navigation"><button className="nav-active">{t.academy}</button><button>{t.freeLab}</button><button>{t.missions}</button></nav>
        <div className="top-actions"><span className="status-pill"><i />{t.eyebrow.split(" / ")[1]}</span><button className="locale" onClick={() => setLocale(locale === "en" ? "de" : "en")}>{locale.toUpperCase()} <span>⌄</span></button><button className="avatar">A</button></div>
      </header>

      <section className="page-heading"><div><div className="eyebrow">{t.eyebrow}</div><h1>{t.title}</h1><p>{t.subtitle}</p></div><button className="journey-button"><span className="journey-dot">01</span><span><small>{t.journeyLabel}</small><b>{t.explorer}</b></span><span className="chevron">⌄</span></button></section>

      <div className="workspace">
        <aside className="left-rail">
          <div className="rail-heading"><span className="section-kicker">{t.lesson}</span><span className="lesson-number">01 / 08</span></div>
          <h2>{t.lessonTitle}</h2><p className="lesson-copy">{t.lessonBody}</p>
          <div className="progress-track"><span /></div><div className="progress-caption"><span>{t.motion}</span><span>{lessonCompleted ? t.lessonCompleted : t.lessonProgress}</span></div>
          <div className="separator" />
          <div className="rail-heading"><span className="section-kicker">{t.components}</span><button className="text-button">＋</button></div>
          <div className="category-label">{t.mechanics}</div>
          <button className="component-row" onClick={() => addBody("ball")}><span className="component-icon ball-icon">●</span><span>{t.ball}</span><span className="add-sign">＋</span></button>
          <button className="component-row" onClick={() => addBody("cube")}><span className="component-icon cube-icon">◆</span><span>{t.cube}</span><span className="add-sign">＋</span></button>
          <button className="component-row" onClick={reset}><span className="component-icon ramp-icon">▱</span><span>{t.ramp}</span><span className="add-sign">↺</span></button>
          <div className="rail-bottom"><div className="avatar small-avatar">✦</div><div><b>PhysicsLab</b><span>Learning through play</span></div><button className="more">···</button></div>
        </aside>

        <section className="lab-column">
          <div className="lab-toolbar"><div className="lab-title"><span className="live-dot" /> <b>{t.workbench}</b><span className="toolbar-divider">/</span><span>{t.rampMotion}</span></div><div className="toolbar-tools"><button className={xray ? "tool-button selected" : "tool-button"} onClick={() => setXray(!xray)}><span>◉</span> {t.xray}</button><button className={measureVisible ? "tool-button selected" : "tool-button"} aria-pressed={measureVisible} onClick={() => setMeasureVisible(value => !value)}><span>⌗</span> {t.measure}</button><button className="tool-button icon-only" aria-label="More options">···</button></div></div>
          <div className="scene-frame"><canvas ref={canvasRef} aria-label="Interactive 3D physics workbench" /><div className="scene-badge"><span className={playing ? "badge-dot active" : "badge-dot"} />{targetReached ? t.success : playing ? t.running : time > 0 ? t.paused : t.ready}</div>{measureVisible && <div className="ruler-legend" role="status"><b>{t.measureOn}</b><span>{t.rulerScale}</span></div>}<div className="scene-hint">{t.orbitHint} <span>·</span> {t.zoomHint}</div><div className="target-label">{t.target}<span>04</span></div>
            {xray && <div className="xray-legend"><b>{t.xray.toUpperCase()}</b><span><i className="gravity-line" /> Gravity · {gravity.toFixed(1)} m/s²</span><span><i className="motion-line" /> Velocity</span></div>}
          </div>
          <div className="transport"><div className="transport-buttons"><button className="reset-button" onClick={reset} title={t.reset}>↺</button>{playing ? <button className="play-button" onClick={pause}>Ⅱ <span>{t.pause}</span></button> : <button className="play-button" onClick={start}>▶ <span>{t.play}</span></button>}<button className="step-button" onClick={step}>▸│ <span>{t.step}</span></button><span className="transport-divider" /><span className="time-readout"><small>{t.time}</small><b>{time.toFixed(2)}<i>s</i></b></span></div>
            <div className="gravity-control"><label htmlFor="gravity">{t.gravity} <b>{gravity.toFixed(1)} m/s²</b></label><input id="gravity" type="range" min="1" max="25" step="0.1" value={gravity} onChange={e => setGravity(Number(e.target.value))} /><span className="gravity-ends"><span>MOON 1.6</span><span>EARTH 9.8</span><span>JUPITER 24.8</span></span></div>
            <div className="speed-readout"><small>{t.speed}</small><b>{(solverRef.current.bodies.at(-1)?.speed ?? 0).toFixed(1)} <i>m/s</i></b></div>
          </div>
        </section>

        <aside className="right-rail"><div className="inspector-head"><span className="section-kicker">{t.labNotes}</span><button className="more">···</button></div><div className="note-icon">✳</div><div className="note-label">{t.fact}</div><h3>{t.factTitle}</h3><p className="fact-copy">{depth === "simple" ? t.factText : depth === "learn" ? t.learnText : t.technicalText}</p><div className="depth-tabs"><button className={depth === "simple" ? "active" : ""} onClick={() => setDepth("simple")}>{t.simple}</button><button className={depth === "learn" ? "active" : ""} onClick={() => setDepth("learn")}>{t.learn}</button><button className={depth === "technical" ? "active" : ""} onClick={() => setDepth("technical")}>{t.technical}</button></div><div className="formula-card"><div className="formula-title">{t.rollingTitle}</div><div className="formula">{motionLesson.formula.expression}</div><div className="formula-caption">{t.formulaCaption}</div></div><div className="source-note"><span className="source-check">↗</span><span><b>{t.factSourceLabel}</b><small>{t.source}</small></span><a className="source-link" href={motionLesson.source.url} target="_blank" rel="noreferrer" aria-label="Open source">↗</a></div><div className="inspector-separator" /><div className="quick-stats"><div><span>{t.objects}</span><b>{bodyCount.toString().padStart(2, "0")}</b></div><div><span>{t.gravityLabel}</span><b>{gravity.toFixed(1)}<small> m/s²</small></b></div><div><span>{t.rampAngle}</span><b>13.5<small>°</small></b></div></div><div className="tip-card"><span>✦</span><p><b>{t.tryThis}</b><br />{locale === "en" ? "What changes when you increase gravity?" : "Was ändert sich, wenn du die Gravitation erhöhst?"}</p><button>→</button></div></aside>
      </div>
      <footer className="footer"><span>PHYSICSLAB <i>·</i> LEARN BY EXPERIMENTING</span><span>SIMULATION 01 <i>·</i> {bodyCount} OBJECTS</span></footer>
    </main>
  );
}
