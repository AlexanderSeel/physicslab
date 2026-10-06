import { useEffect, useMemo, useRef, useState } from "react";
import { ArcRotateCamera, Color3, Color4, DirectionalLight, Engine, HemisphericLight, Mesh, MeshBuilder, PointLight, Scene, StandardMaterial, Vector3 } from "@babylonjs/core";
import { CircuitSolver } from "./physics/CircuitSolver";
import { FluidNetwork } from "./physics/FluidSolver";

export type LabExperiment = "water" | "electricity" | "wind";

export function ExperimentLab({ kind, locale }: { kind: LabExperiment; locale: "en" | "de" }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stageRef = useRef<{ scene: Scene; rotor?: Mesh; blades?: Mesh[]; sourceWater?: Mesh; receiverWater?: Mesh; lamp?: Mesh; lampLight?: PointLight; switchLever?: Mesh; gaugeNeedle?: Mesh } | null>(null);
  const controlsRef = useRef({ running: false, wind: 8, radius: 1.2, power: 8, pump: 0, levels: [0.018, 0.002], lampLevel: 0.45, closed: true });
  const en = locale === "en";
  const [running, setRunning] = useState(false);
  const [valve, setValve] = useState(0.65);
  const [pump, setPump] = useState(0);
  const [voltage, setVoltage] = useState(9);
  const [resistance, setResistance] = useState(12);
  const [closed, setClosed] = useState(true);
  const [wind, setWind] = useState(8);
  const [radius, setRadius] = useState(1.2);
  const [load, setLoad] = useState(0.8);
  const network = useMemo(() => {
    const result = new FluidNetwork();
    result.addTank({ id: "source", capacity: 0.02, volume: 0.018, crossSection: 0.01, elevation: 2 });
    result.addTank({ id: "receiver", capacity: 0.02, volume: 0.002, crossSection: 0.01, elevation: 0 });
    result.addPipe({ id: "pipe", from: "source", to: "receiver", resistance: 1.2e8, valve, pumpPressure: pump * 50000 });
    return result;
  }, []);
  const pipe = network.pipes.get("pipe");
  if (pipe) { pipe.valve = valve; pipe.pumpPressure = pump * 50000; }
  const [waterLevels, setWaterLevels] = useState([0.018, 0.002]);
  const circuit = useMemo(() => {
    const solver = new CircuitSolver();
    solver.add({ id: "battery", kind: "battery", from: "positive", to: "ground", voltage, internalResistance: 0.15 });
    solver.add({ id: "lamp", kind: "lamp", from: "positive", to: "return", resistance });
    solver.add({ id: "switch", kind: "switch", from: "return", to: "ground", closed });
    return solver.solve().get("lamp") ?? { voltage: 0, current: 0, power: 0 };
  }, [voltage, resistance, closed]);
  const airDensity = 1.225;
  const sweptArea = Math.PI * radius * radius;
  const availablePower = 0.5 * airDensity * sweptArea * wind ** 3;
  const power = availablePower * 0.38 * load;
  const rpm = wind > 0 ? wind / (2 * radius) * 60 / (2 * Math.PI) * 6 : 0;

  const lampLevel = closed ? Math.min(1, Math.sqrt(Math.abs(circuit.power) / 30)) : 0;
  const challengeDone = kind === "water" ? waterLevels[1] >= 0.012 : kind === "electricity" ? lampLevel >= 0.8 : power >= 500;
  controlsRef.current = { running, wind, radius, power, pump, levels: waterLevels, lampLevel, closed };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const engine = new Engine(canvas, true, { antialias: true, stencil: true });
    const scene = new Scene(engine);
    scene.clearColor = new Color4(0.91, 0.94, 0.91, 1);
    const camera = new ArcRotateCamera("domain-camera", -Math.PI / 2.45, 1.12, 10.5, new Vector3(0, 1.35, 0), scene);
    camera.lowerRadiusLimit = 7; camera.upperRadiusLimit = 15; camera.wheelPrecision = 45; camera.attachControl(canvas, true);
    new HemisphericLight("domain-fill", new Vector3(0.2, 1, -0.35), scene).intensity = 0.85;
    const key = new DirectionalLight("domain-key", new Vector3(-0.45, -1, 0.4), scene); key.position.set(-4, 8, -5); key.intensity = 1.25;
    const mat = (name: string, color: string, alpha = 1, metallic = 0) => { const material = new StandardMaterial(name, scene); material.diffuseColor = Color3.FromHexString(color); material.specularColor = new Color3(0.25 + metallic * 0.45, 0.27 + metallic * 0.45, 0.25 + metallic * 0.45); material.alpha = alpha; return material; };
    const floor = MeshBuilder.CreateGround("domain-floor", { width: 20, height: 16 }, scene); floor.position.y = -0.16; floor.material = mat("warm-floor", "#c9b18f");
    const back = MeshBuilder.CreateBox("domain-backdrop", { width: 20, height: 8, depth: 0.18 }, scene); back.position.set(0, 3.8, 4.2); back.material = mat("sage-wall", "#d7ddd2");
    const top = MeshBuilder.CreateBox("domain-workbench", { width: 8.2, height: 0.24, depth: 3.8 }, scene); top.position.y = 0.65; top.material = mat("oak-workbench", "#a96e38");
    for (const x of [-3.55, 3.55]) for (const z of [-1.45, 1.45]) { const leg = MeshBuilder.CreateBox("domain-leg", { width: 0.22, height: 0.72, depth: 0.22 }, scene); leg.position.set(x, 0.18, z); leg.material = mat("table-legs", "#614a37"); }
    const tankGlass = mat("tank-glass", "#a6e1e5", 0.28); tankGlass.backFaceCulling = false;
    const waterMat = mat("water-blue", "#16a8c6", 0.84);
    let sourceWater: Mesh | undefined; let receiverWater: Mesh | undefined; let rotor: Mesh | undefined; let lamp: Mesh | undefined; let lampLight: PointLight | undefined; let switchLever: Mesh | undefined; let gaugeNeedle: Mesh | undefined; let blades: Mesh[] | undefined;
    if (kind === "water") {
      for (const [x, label] of [[-2, "source"], [2, "receiver"]] as const) {
        const tank = MeshBuilder.CreateBox(`${label}-tank`, { width: 1.25, height: 1.65, depth: 1.1 }, scene); tank.position.set(x, 1.58, 0); tank.material = tankGlass;
      }
      sourceWater = MeshBuilder.CreateBox("source-water", { width: 1.12, height: 0.7, depth: 0.98 }, scene); sourceWater.position.set(-2, 1.13, 0); sourceWater.material = waterMat;
      receiverWater = MeshBuilder.CreateBox("receiver-water", { width: 1.12, height: 0.2, depth: 0.98 }, scene); receiverWater.position.set(2, 0.88, 0); receiverWater.material = waterMat;
      const pipeMat = mat("copper-pipe", "#b47a4c", 1, 0.25);
      const pipe = MeshBuilder.CreateTube("water-pipe", { path: [new Vector3(-2, 0.8, 0), new Vector3(-2, 0.82, 0), new Vector3(2, 0.82, 0), new Vector3(2, 0.8, 0)], radius: 0.07, tessellation: 16 }, scene); pipe.material = pipeMat;
      const valve = MeshBuilder.CreateTorus("valve-wheel", { diameter: 0.42, thickness: 0.055 }, scene); valve.position.set(0, 0.98, 0); valve.material = mat("valve-red", "#c8503d");
      const pump = MeshBuilder.CreateCylinder("hand-pump", { height: 0.58, diameter: 0.34, tessellation: 24 }, scene); pump.position.set(0.95, 1.12, 0); pump.material = mat("pump-body", "#526d67", 1, 0.4);
      const gauge = MeshBuilder.CreateCylinder("pressure-gauge", { height: 0.12, diameter: 0.42, tessellation: 32 }, scene); gauge.position.set(0.95, 1.58, 0); gauge.rotation.x = Math.PI / 2; gauge.material = mat("gauge-face", "#f2ead4");
      gaugeNeedle = MeshBuilder.CreateBox("gauge-needle", { width: 0.025, height: 0.25, depth: 0.035 }, scene); gaugeNeedle.position.set(0.95, 1.58, -0.075); gaugeNeedle.rotation.z = -Math.PI / 4; gaugeNeedle.material = mat("gauge-needle-red", "#c8503d");
      for (const x of [-2, 2]) { const foot = MeshBuilder.CreateBox("tank-foot", { width: 1.5, height: 0.12, depth: 1.3 }, scene); foot.position.set(x, 0.82, 0); foot.material = mat("steel", "#707e7b", 1, 0.45); }
    } else if (kind === "electricity") {
      const battery = MeshBuilder.CreateCylinder("battery", { height: 1.05, diameter: 0.58, tessellation: 32 }, scene); battery.position.set(-2.15, 1.3, 0); battery.material = mat("battery-teal", "#277c72", 1, 0.2);
      for (const [x, symbol] of [[-2.15, "positive"], [-2.15, "negative"]] as const) { const pin = MeshBuilder.CreateCylinder(`${symbol}-terminal`, { height: 0.13, diameter: 0.18 }, scene); pin.position.set(x, symbol === "positive" ? 1.9 : 0.73, 0); pin.material = mat("terminal-metal", "#bcc1b9", 1, 0.7); }
      const wireMat = mat("copper-wire", "#b8783f", 1, 0.25);
      const wirePaths = [[new Vector3(-2.15, 1.9, 0), new Vector3(-2.15, 2.9, 0), new Vector3(2.15, 2.9, 0), new Vector3(2.15, 1.9, 0), new Vector3(2.15, 0.73, 0), new Vector3(0.28, 0.73, 0)], [new Vector3(-0.28, 0.73, 0), new Vector3(-2.15, 0.73, 0)]];
      wirePaths.forEach((path, index) => { const wire = MeshBuilder.CreateTube(`circuit-wire-${index}`, { path, radius: 0.035, tessellation: 10 }, scene); wire.material = wireMat; });
      switchLever = MeshBuilder.CreateBox("switch-lever", { width: 0.62, height: 0.075, depth: 0.12 }, scene); switchLever.position.set(0, 0.76, 0); switchLever.material = mat("switch-brass", "#c18b3d", 1, 0.45);
      const socket = MeshBuilder.CreateCylinder("lamp-socket", { height: 0.28, diameter: 0.62 }, scene); socket.position.set(2.15, 2.68, 0); socket.material = mat("socket", "#58645f", 1, 0.45);
      lamp = MeshBuilder.CreateSphere("circuit-lamp", { diameter: 0.58, segments: 24 }, scene); lamp.position.set(2.15, 3.12, 0); lamp.material = mat("lamp-off", "#b4b7a7", 1, 0.05);
      lampLight = new PointLight("lamp-glow", new Vector3(2.15, 3.12, 0), scene); lampLight.diffuse = Color3.FromHexString("#ffd25b"); lampLight.range = 4; lampLight.intensity = 0;
      const filament = MeshBuilder.CreateTorus("lamp-filament", { diameter: 0.2, thickness: 0.035 }, scene); filament.position.set(2.15, 3.12, 0); filament.material = mat("filament", "#f6d263");
      const resistor = MeshBuilder.CreateBox("resistor", { width: 0.8, height: 0.24, depth: 0.28 }, scene); resistor.position.set(0, 2.9, 0); resistor.material = mat("resistor-ceramic", "#d0a46b");
    } else {
      const mast = MeshBuilder.CreateCylinder("turbine-mast", { height: 2.55, diameterTop: 0.13, diameterBottom: 0.25, tessellation: 24 }, scene); mast.position.set(0, 2.02, 0); mast.material = mat("mast", "#6f8984", 1, 0.4);
      rotor = new Mesh("turbine-rotor", scene); rotor.position.set(0, 3.35, 0);
      const hub = MeshBuilder.CreateSphere("turbine-hub", { diameter: 0.34, segments: 24 }, scene); hub.parent = rotor; hub.material = mat("hub", "#f1f1e8", 1, 0.45);
      blades = [];
      for (let index = 0; index < 3; index += 1) { const blade = MeshBuilder.CreateBox(`turbine-blade-${index}`, { width: 0.22, height: 1.55, depth: 0.09 }, scene); blade.position.y = 0.88; blade.rotation.z = index * Math.PI * 2 / 3; blade.parent = rotor; blade.material = mat("blade", "#f3f1e6"); blades.push(blade); }
      const base = MeshBuilder.CreateCylinder("turbine-base", { height: 0.18, diameter: 0.72 }, scene); base.position.y = 0.86; base.material = mat("base", "#687a73", 1, 0.35);
    }
    stageRef.current = { scene, rotor, blades, sourceWater, receiverWater, lamp, lampLight, switchLever, gaugeNeedle };
    engine.runRenderLoop(() => {
      const stage = stageRef.current;
      if (stage?.rotor && controlsRef.current.running) stage.rotor.rotation.z += controlsRef.current.wind * 6 / controlsRef.current.radius * engine.getDeltaTime() / 1000;
      if (stage?.sourceWater && stage.receiverWater) {
        const level = Math.max(0.04, Math.min(1.55, controlsRef.current.levels[0] / 0.02 * 1.55));
        stage.sourceWater.scaling.y = level / 0.7; stage.sourceWater.position.y = 0.82 + level / 2;
        const receiver = Math.max(0.04, Math.min(1.55, controlsRef.current.levels[1] / 0.02 * 1.55));
        stage.receiverWater.scaling.y = receiver / 0.7; stage.receiverWater.position.y = 0.82 + receiver / 2;
      }
      if (stage?.lamp?.material instanceof StandardMaterial) {
        const material = stage.lamp.material;
        material.diffuseColor = Color3.Lerp(Color3.FromHexString("#8a948e"), Color3.FromHexString("#ffe36d"), controlsRef.current.lampLevel);
        material.emissiveColor = Color3.FromHexString("#f5bd36").scale(controlsRef.current.lampLevel);
      }
      if (stage?.lampLight) stage.lampLight.intensity = controlsRef.current.lampLevel * 2.5;
      if (stage?.switchLever) stage.switchLever.rotation.z = controlsRef.current.closed ? 0 : -0.85;
      if (stage?.gaugeNeedle) stage.gaugeNeedle.rotation.z = -0.75 + controlsRef.current.pump * 0.35;
      if (stage?.blades) for (const blade of stage.blades) { blade.scaling.y = controlsRef.current.radius / 1.2; blade.position.y = 0.88 * controlsRef.current.radius / 1.2; }
      scene.render();
    });
    const resize = () => engine.resize(); window.addEventListener("resize", resize);
    return () => { window.removeEventListener("resize", resize); stageRef.current = null; scene.dispose(); engine.dispose(); };
  }, [kind]);

  useEffect(() => {
    if (!running || kind !== "water") return;
    const timer = window.setInterval(() => {
      network.step(0.05);
      setWaterLevels([network.tanks.get("source")!.volume, network.tanks.get("receiver")!.volume]);
    }, 50);
    return () => window.clearInterval(timer);
  }, [kind, network, running]);
  const reset = () => {
    setRunning(false);
    if (kind === "water") {
      network.tanks.get("source")!.volume = 0.018;
      network.tanks.get("receiver")!.volume = 0.002;
      setWaterLevels([0.018, 0.002]);
    } else if (kind === "electricity") {
      setVoltage(9); setResistance(12); setClosed(true);
    } else {
      setWind(8); setRadius(1.2); setLoad(0.8);
    }
  };
  const title = kind === "water" ? (en ? "Water pressure & flow" : "Wasserdruck & Strömung") : kind === "electricity" ? (en ? "Build a circuit" : "Stromkreis bauen") : (en ? "Wind turbine" : "Windkraftanlage");
  const description = kind === "water" ? (en ? "Open the valve or add pump pressure. Watch water move between tanks." : "Öffne das Ventil oder erhöhe den Pumpendruck. Beobachte den Wasserfluss zwischen den Behältern.") : kind === "electricity" ? (en ? "Change voltage and lamp resistance. Open the switch to break the circuit." : "Ändere Spannung und Lampenwiderstand. Öffne den Schalter, um den Stromkreis zu unterbrechen.") : (en ? "Change wind speed and blade radius to see how available wind power changes." : "Ändere Windgeschwindigkeit und Rotorgröße und beobachte die verfügbare Windleistung.");
  const challenge = kind === "water" ? (en ? "Fill the receiver to 12 L" : "Fülle den Auffangbehälter auf 12 L") : kind === "electricity" ? (en ? "Light the lamp brightly: reach 80%" : "Bring die Lampe auf mindestens 80% Helligkeit") : (en ? "Generate at least 500 W" : "Erzeuge mindestens 500 W");
  return <div className={`experiment-lab experiment-${kind}`}>
    <header><div><span className="section-kicker">{en ? "INTERACTIVE EXPERIMENT" : "INTERAKTIVES EXPERIMENT"}</span><h2>{title}</h2><p>{description}</p></div><div className="experiment-actions"><button onClick={() => setRunning(value => !value)}>{running ? (en ? "Pause" : "Pause") : (en ? "Run" : "Start")}</button><button className="secondary" onClick={reset}>{en ? "Reset" : "Zurücksetzen"}</button></div></header>
    <div className={`experiment-challenge ${challengeDone ? "complete" : ""}`}><span>{challengeDone ? "✓" : "✦"}</span><div><b>{en ? "YOUR CHALLENGE" : "DEINE AUFGABE"}</b><p>{challenge}</p></div><strong>{challengeDone ? (en ? "COMPLETE" : "GESCHAFFT") : (en ? "EXPERIMENT" : "AUSPROBIEREN")}</strong></div>
    <div className="domain-stage"><canvas ref={canvasRef} aria-label={title} /></div>
    {kind === "water" && <><div className="experiment-controls"><label>{en ? "Valve opening" : "Ventilöffnung"}<b>{Math.round(valve * 100)}%</b><input type="range" min="0" max="1" step="0.05" value={valve} onChange={e => setValve(Number(e.target.value))} /></label><label>{en ? "Pump pressure" : "Pumpendruck"}<b>{(pump * 50).toFixed(0)} kPa</b><input type="range" min="0" max="4" step="0.1" value={pump} onChange={e => setPump(Number(e.target.value))} /></label></div><div className="experiment-readouts"><span>{en ? "Source volume" : "Quellvolumen"}<b>{(waterLevels[0] * 1000).toFixed(1)} L</b></span><span>{en ? "Receiver volume" : "Auffangvolumen"}<b>{(waterLevels[1] * 1000).toFixed(1)} L</b></span><span>{en ? "Flow rate" : "Durchfluss"}<b>{(network.pipes.get("pipe")?.flow ?? 0).toFixed(4)} m³/s</b></span></div></>}
    {kind === "electricity" && <><div className="experiment-controls"><label>{en ? "Battery voltage" : "Batteriespannung"}<b>{voltage} V</b><input type="range" min="1.5" max="24" step="0.5" value={voltage} onChange={e => setVoltage(Number(e.target.value))} /></label><label>{en ? "Lamp resistance" : "Lampenwiderstand"}<b>{resistance} Ω</b><input type="range" min="3" max="60" step="1" value={resistance} onChange={e => setResistance(Number(e.target.value))} /></label><button className={`circuit-switch ${closed ? "closed" : ""}`} onClick={() => setClosed(value => !value)}>{closed ? (en ? "Open switch" : "Schalter öffnen") : (en ? "Close switch" : "Schalter schließen")}</button></div><div className="experiment-readouts"><span>{en ? "Current" : "Stromstärke"}<b>{Math.abs(circuit.current).toFixed(2)} A</b></span><span>{en ? "Lamp power" : "Lampenleistung"}<b>{Math.abs(circuit.power).toFixed(2)} W</b></span><span>{en ? "Circuit" : "Stromkreis"}<b>{closed ? (en ? "Closed" : "Geschlossen") : (en ? "Open" : "Offen")}</b></span></div></>}
    {kind === "wind" && <><div className="experiment-controls"><label>{en ? "Wind speed" : "Windgeschwindigkeit"}<b>{wind} m/s</b><input type="range" min="0" max="25" step="0.5" value={wind} onChange={e => setWind(Number(e.target.value))} /></label><label>{en ? "Blade radius" : "Rotorblattlänge"}<b>{radius.toFixed(1)} m</b><input type="range" min="0.5" max="3" step="0.1" value={radius} onChange={e => setRadius(Number(e.target.value))} /></label><label>{en ? "Generator load" : "Generatorlast"}<b>{Math.round(load * 100)}%</b><input type="range" min="0.1" max="1" step="0.05" value={load} onChange={e => setLoad(Number(e.target.value))} /></label></div><div className="experiment-readouts"><span>{en ? "Rotor speed" : "Rotordrehzahl"}<b>{rpm.toFixed(0)} rpm</b></span><span>{en ? "Electrical output" : "Elektrische Leistung"}<b>{power.toFixed(0)} W</b></span><span>{en ? "Wind power available" : "Verfügbare Windleistung"}<b>{availablePower.toFixed(0)} W</b></span></div></>}
  </div>;
}
