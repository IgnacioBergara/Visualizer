import "./style.css";
import { loadEngine, runAlgorithm, type EngineModule } from "./engine/engine";
import type { AlgorithmId, Step } from "./engine/types";
import { samples, type SampleGraph, type SampleId } from "./graph/samples";
import { Player } from "./player/Player";
import { deriveState, describeStep } from "./player/state";
import { GraphView } from "./render/GraphView";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const NEEDS_TARGET = new Set<AlgorithmId>(["dijkstra", "bellman-ford"]);

const ui = {
  sample: $<HTMLSelectElement>("sample"),
  algorithm: $<HTMLSelectElement>("algorithm"),
  source: $<HTMLSelectElement>("source"),
  target: $<HTMLSelectElement>("target"),
  targetField: $<HTMLLabelElement>("target-field"),
  reset: $<HTMLButtonElement>("reset"),
  back: $<HTMLButtonElement>("back"),
  play: $<HTMLButtonElement>("play"),
  forward: $<HTMLButtonElement>("forward"),
  speed: $<HTMLInputElement>("speed"),
  timeline: $<HTMLInputElement>("timeline"),
  counter: $<HTMLParagraphElement>("counter"),
  description: $<HTMLParagraphElement>("description"),
};

let sample: SampleGraph = samples.weighted;
let view = new GraphView($("graph"), sample);
let steps: Step[] = [];
// Mensaje a mostrar cuando el algoritmo no aplica al grafo elegido.
let notice: string | null = null;

const player = new Player((position, total, playing) => {
  view.render(deriveState(steps, position, sample.graph.directed));
  ui.timeline.max = String(total);
  ui.timeline.value = String(position);
  ui.counter.textContent = `${position} / ${total}`;
  ui.description.textContent =
    notice ?? describeStep(steps[position - 1], sample.labels, ui.algorithm.value as AlgorithmId);
  ui.play.textContent = playing ? "⏸" : "▶";
  ui.back.disabled = position === 0;
  ui.forward.disabled = position === total;
});

for (const [id, s] of Object.entries(samples)) ui.sample.add(new Option(s.name, id));

function fillNodeSelects(): void {
  for (const select of [ui.source, ui.target]) {
    select.replaceChildren(...sample.labels.map((label, i) => new Option(label, String(i))));
  }
  ui.target.value = String(sample.labels.length - 1);
}

function selectSample(id: SampleId): void {
  sample = samples[id];
  view.destroy();
  view = new GraphView($("graph"), sample);
  fillNodeSelects();
}

function recompute(engine: EngineModule): void {
  const algorithm = ui.algorithm.value as AlgorithmId;
  ui.targetField.hidden = !NEEDS_TARGET.has(algorithm);
  if (algorithm === "prim" && sample.graph.directed) {
    notice = "Prim necesita un grafo no dirigido. Elegí el grafo ponderado.";
    steps = [];
  } else {
    notice = null;
    steps = runAlgorithm(
      engine,
      algorithm,
      sample.graph,
      Number(ui.source.value),
      Number(ui.target.value),
    );
  }
  player.load(steps);
}

fillNodeSelects();

async function main(): Promise<void> {
  const engine = await loadEngine();
  ui.sample.addEventListener("change", () => {
    selectSample(ui.sample.value as SampleId);
    recompute(engine);
  });
  for (const select of [ui.algorithm, ui.source, ui.target]) {
    select.addEventListener("change", () => recompute(engine));
  }
  ui.play.addEventListener("click", () => player.toggle());
  ui.forward.addEventListener("click", () => player.stepForward());
  ui.back.addEventListener("click", () => player.stepBack());
  ui.reset.addEventListener("click", () => player.load(steps));
  ui.timeline.addEventListener("input", () => player.seek(Number(ui.timeline.value)));
  // El slider va de lento (izquierda) a rápido (derecha).
  ui.speed.addEventListener("input", () => player.setDelay(1600 - Number(ui.speed.value)));

  document.addEventListener("keydown", (e) => {
    if (e.target instanceof HTMLSelectElement) return;
    if (e.key === "ArrowRight") player.stepForward();
    else if (e.key === "ArrowLeft") player.stepBack();
    else if (e.key === " ") {
      e.preventDefault();
      player.toggle();
    }
  });

  recompute(engine);
}

main().catch((err) => {
  console.error(err);
  ui.description.textContent =
    "No se pudo cargar el motor WebAssembly. ¿Ejecutaste `npm run build:wasm`?";
});
