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
    fact: "PHYSICS NOTE", factTitle: "Gravity along a slope", factText: "A ramp redirects part of gravity along its surface. A steeper ramp gives the ball more acceleration down the slope.",
    simple: "SIMPLE", learn: "LEARN", technical: "TECHNICAL", time: "TIME", speed: "SPEED", target: "TARGET",
  },
  de: {
    eyebrow: "PHYSICSLAB / BEWEGUNG 01", title: "Bauen. Beobachten. Verstehen.",
    subtitle: "Ein Physik-Spielplatz, in dem jedes Experiment echte Ursache und Wirkung zeigt.",
    academy: "AKADEMIE", freeLab: "FREIES LABOR", missions: "MISSIONEN", lesson: "ERSTES EXPERIMENT",
    lessonTitle: "Schaffst du es, den Ball ins Ziel zu bringen?", lessonBody: "Starte die Simulation und beobachte, wie die Schwerkraft den Ball die Rampe hinunterzieht. Ändere die Gravitation und vergleiche die Bewegung.",
    components: "BAUTEILE", mechanics: "MECHANIK", ball: "Ball", cube: "Würfel", ramp: "Rampe",
    play: "Start", pause: "Pause", step: "Schritt", reset: "Zurücksetzen", gravity: "Gravitation", xray: "Kraft-Röntgen",
    ready: "BEREIT ZUM EXPERIMENTIEREN", running: "SIMULATION LÄUFT", paused: "SIMULATION PAUSIERT", success: "ZIEL ERREICHT",
    fact: "PHYSIK-NOTIZ", factTitle: "Schwerkraft an einer Schräge", factText: "Eine Rampe lenkt einen Teil der Schwerkraft entlang ihrer Oberfläche. Je steiler die Rampe, desto stärker beschleunigt der Ball nach unten.",
    simple: "EINFACH", learn: "LERNEN", technical: "TECHNISCH", time: "ZEIT", speed: "TEMPO", target: "ZIEL",
  },
} as const;

interface VisualBody { mesh: Mesh; state: BodyState }
const bodyRadius = 0.22;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<Scene | null>(null);
  const engineRef = useRef<Engine | null>(null);
  const solverRef = useRef(new RampSolver());
  const visualsRef = useRef<VisualBody[]>([]);
  const accumulator = useRef(0);
  const playingRef = useRef(false);
  const [locale, setLocale] = useState<Locale>("en");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [bodyCount, setBodyCount] = useState(0);
  const [gravity, setGravity] = useState(9.81);
  const [xray, setXray] = useState(false);
  const [ready, setReady] = useState(false);
  const [targetReached, setTargetReached] = useState(false);
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
    floor.position.set(0, -0.25, 0);
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
    for (const [x, height] of [[-2.55, 0.78], [1.28, 0.31]]) {
      const support = MeshBuilder.CreateBox("support", { width: 0.2, height, depth: 1.2 }, scene);
      support.position.set(x, -0.1 + height / 2, 0);
      support.material = mat("aluminum-support", "#9ba9a7", 0.62, 0.35);
    }
    const target = MeshBuilder.CreateTorus("target", { diameter: 1.06, thickness: 0.09, tessellation: 48 }, scene);
    target.position.set(4.55, 0.02, 0);
    target.rotation.x = Math.PI / 2;
    target.material = targetMat;
    const grid = MeshBuilder.CreateGround("grid", { width: 20, height: 12, subdivisions: 1 }, scene);
    grid.position.y = -0.43;
    grid.material = mat("floor-matte", "#dfe5df", 0, 0.9);
    const shadow = MeshBuilder.CreateDisc("target-shadow", { radius: 0.56, tessellation: 36 }, scene);
    shadow.position.set(4.55, -0.075, 0);
    shadow.rotation.x = Math.PI / 2;
    shadow.material = new StandardMaterial("target-shadow-mat", scene);
    (shadow.material as StandardMaterial).diffuseColor = Color3.FromHexString("#acd2bc");
    (shadow.material as StandardMaterial).alpha = 0.38;
    setReady(true);

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
          if (solverRef.current.bodies.some(body => body.finished)) {
            setTargetReached(true);
            playingRef.current = false;
            setPlaying(false);
          }
        }
      }
      scene.render();
    };
    engine.runRenderLoop(render);
    const resize = () => engine.resize();
    window.addEventListener("resize", resize);
    return () => {
      window.removeEventListener("resize", resize);
      engine.stopRenderLoop(render);
      visualsRef.current.forEach(({ mesh }) => mesh.dispose());
      scene.dispose();
      engine.dispose();
      sceneRef.current = null;
      engineRef.current = null;
    };
  }, []);

  const syncBody = (visual: VisualBody) => {
    const { mesh, state } = visual;
    mesh.position.set(state.x, state.y, 0);
    if (state.kind === "ball") mesh.rotation.z = state.rotation;
    else mesh.rotation.z = state.rotation * 0.35;
    if (xray) {
      const arrow = mesh.metadata?.arrow as Mesh | undefined;
      if (arrow) {
        arrow.setEnabled(state.speed > 0.04);
        arrow.position.set(state.x, state.y + 0.35, 0);
        const length = Math.min(1.25, state.speed * 0.35);
        arrow.scaling.x = length;
      }
    }
  };

  const addBody = useCallback((kind: BodyKind) => {
    const scene = sceneRef.current;
    if (!scene) return;
    const state = solverRef.current.addBody(kind);
    const mesh = kind === "ball"
      ? MeshBuilder.CreateSphere(`ball-${state.id}`, { diameter: bodyRadius * 2, segments: 32 }, scene)
      : MeshBuilder.CreateBox(`cube-${state.id}`, { size: bodyRadius * 1.75 }, scene);
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
    mesh.metadata = { arrow };
    const visual = { mesh, state };
    visualsRef.current.push(visual);
    syncBody(visual);
    setBodyCount(solverRef.current.bodies.length);
    setTargetReached(false);
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
  };
  const reset = () => {
    pause();
    visualsRef.current.forEach(({ mesh }) => mesh.dispose());
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
    for (const visual of visualsRef.current) syncBody(visual);
  }, [xray]);

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="brand" href="#" aria-label="PhysicsLab home"><span className="brand-mark">P</span><span>physics<span className="brand-light">lab</span></span></a>
        <nav className="main-nav" aria-label="Main navigation"><button className="nav-active">{t.academy}</button><button>{t.freeLab}</button><button>{t.missions}</button></nav>
        <div className="top-actions"><span className="status-pill"><i />{t.eyebrow.split(" / ")[1]}</span><button className="locale" onClick={() => setLocale(locale === "en" ? "de" : "en")}>{locale.toUpperCase()} <span>⌄</span></button><button className="avatar">A</button></div>
      </header>

      <section className="page-heading"><div><div className="eyebrow">{t.eyebrow}</div><h1>{t.title}</h1><p>{t.subtitle}</p></div><button className="journey-button"><span className="journey-dot">01</span><span><small>LEARNING JOURNEY</small><b>Explorer</b></span><span className="chevron">⌄</span></button></section>

      <div className="workspace">
        <aside className="left-rail">
          <div className="rail-heading"><span className="section-kicker">{t.lesson}</span><span className="lesson-number">01 / 08</span></div>
          <h2>{t.lessonTitle}</h2><p className="lesson-copy">{t.lessonBody}</p>
          <div className="progress-track"><span /></div><div className="progress-caption"><span>Motion</span><span>1 of 8</span></div>
          <div className="separator" />
          <div className="rail-heading"><span className="section-kicker">{t.components}</span><button className="text-button">＋</button></div>
          <div className="category-label">{t.mechanics}</div>
          <button className="component-row" onClick={() => addBody("ball")}><span className="component-icon ball-icon">●</span><span>{t.ball}</span><span className="add-sign">＋</span></button>
          <button className="component-row" onClick={() => addBody("cube")}><span className="component-icon cube-icon">◆</span><span>{t.cube}</span><span className="add-sign">＋</span></button>
          <button className="component-row" onClick={reset}><span className="component-icon ramp-icon">▱</span><span>{t.ramp}</span><span className="add-sign">↺</span></button>
          <div className="rail-bottom"><div className="avatar small-avatar">✦</div><div><b>PhysicsLab</b><span>Learning through play</span></div><button className="more">···</button></div>
        </aside>

        <section className="lab-column">
          <div className="lab-toolbar"><div className="lab-title"><span className="live-dot" /> <b>Workbench 01</b><span className="toolbar-divider">/</span><span>Ramp &amp; Motion</span></div><div className="toolbar-tools"><button className={xray ? "tool-button selected" : "tool-button"} onClick={() => setXray(!xray)}><span>◉</span> {t.xray}</button><button className="tool-button"><span>⌗</span> Measure</button><button className="tool-button icon-only" aria-label="More options">···</button></div></div>
          <div className="scene-frame"><canvas ref={canvasRef} aria-label="Interactive 3D physics workbench" /><div className="scene-badge"><span className={playing ? "badge-dot active" : "badge-dot"} />{targetReached ? t.success : playing ? t.running : time > 0 ? t.paused : t.ready}</div><div className="scene-hint">DRAG TO ORBIT <span>·</span> SCROLL TO ZOOM</div><div className="target-label">{t.target}<span>04</span></div>
            {xray && <div className="xray-legend"><b>FORCE X-RAY</b><span><i className="gravity-line" /> Gravity · {gravity.toFixed(1)} m/s²</span><span><i className="motion-line" /> Velocity</span></div>}
          </div>
          <div className="transport"><div className="transport-buttons"><button className="reset-button" onClick={reset} title={t.reset}>↺</button>{playing ? <button className="play-button" onClick={pause}>Ⅱ <span>{t.pause}</span></button> : <button className="play-button" onClick={start}>▶ <span>{t.play}</span></button>}<button className="step-button" onClick={step}>▸│ <span>{t.step}</span></button><span className="transport-divider" /><span className="time-readout"><small>{t.time}</small><b>{time.toFixed(2)}<i>s</i></b></span></div>
            <div className="gravity-control"><label htmlFor="gravity">{t.gravity} <b>{gravity.toFixed(1)} m/s²</b></label><input id="gravity" type="range" min="1" max="25" step="0.1" value={gravity} onChange={e => setGravity(Number(e.target.value))} /><span className="gravity-ends"><span>MOON 1.6</span><span>EARTH 9.8</span><span>JUPITER 24.8</span></span></div>
            <div className="speed-readout"><small>{t.speed}</small><b>{(solverRef.current.bodies.at(-1)?.speed ?? 0).toFixed(1)} <i>m/s</i></b></div>
          </div>
        </section>

        <aside className="right-rail"><div className="inspector-head"><span className="section-kicker">LAB NOTES</span><button className="more">···</button></div><div className="note-icon">✳</div><div className="note-label">{t.fact}</div><h3>{t.factTitle}</h3><p className="fact-copy">{t.factText}</p><div className="depth-tabs"><button className="active">{t.simple}</button><button>{t.learn}</button><button>{t.technical}</button></div><div className="formula-card"><div className="formula-title">FORCE ALONG RAMP</div><div className="formula">a = g <span>·</span> sin(θ)</div><div className="formula-caption">Gravity × ramp angle</div></div><div className="source-note"><span className="source-check">✓</span><span><b>Fact checked</b><small>OpenStax · College Physics 2e</small></span><button>↗</button></div><div className="inspector-separator" /><div className="quick-stats"><div><span>OBJECTS</span><b>{bodyCount.toString().padStart(2, "0")}</b></div><div><span>GRAVITY</span><b>{gravity.toFixed(1)}<small> m/s²</small></b></div><div><span>RAMP ANGLE</span><b>13.5<small>°</small></b></div></div><div className="tip-card"><span>✦</span><p><b>Try this</b><br />What changes when you increase gravity?</p><button>→</button></div></aside>
      </div>
      <footer className="footer"><span>PHYSICSLAB <i>·</i> LEARN BY EXPERIMENTING</span><span>SIMULATION 01 <i>·</i> {bodyCount} OBJECTS</span></footer>
    </main>
  );
}
