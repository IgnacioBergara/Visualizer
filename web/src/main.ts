import "./style.css";
import { loadEngine, runAlgorithm, type EngineModule } from "./engine/engine";
import type { AlgorithmId, Step } from "./engine/types";
import { sampleGraph } from "./graph/sample";
import { Player } from "./player/Player";
import { deriveState, describeStep } from "./player/state";
import { GraphView } from "./render/GraphView";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const ui = {
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

const { graph, labels } = sampleGraph;
const view = new GraphView($("graph"), sampleGraph);
let steps: Step[] = [];

const player = new Player((position, total, playing) => {
  view.render(deriveState(steps, position, graph.directed));
  ui.timeline.max = String(total);
  ui.timeline.value = String(position);
  ui.counter.textContent = `${position} / ${total}`;
  ui.description.textContent = describeStep(
    steps[position - 1],
    labels,
    ui.algorithm.value as AlgorithmId,
  );
  ui.play.textContent = playing ? "⏸" : "▶";
  ui.back.disabled = position === 0;
  ui.forward.disabled = position === total;
});

for (const select of [ui.source, ui.target]) {
  labels.forEach((label, i) => select.add(new Option(label, String(i))));
}
ui.target.value = String(labels.length - 1);

function recompute(engine: EngineModule): void {
  const algorithm = ui.algorithm.value as AlgorithmId;
  ui.targetField.hidden = algorithm !== "dijkstra";
  steps = runAlgorithm(engine, algorithm, graph, Number(ui.source.value), Number(ui.target.value));
  player.load(steps);
}

async function main(): Promise<void> {
  const engine = await loadEngine();
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
