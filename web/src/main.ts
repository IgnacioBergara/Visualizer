import "./style.css";
import { loadEngine, runAlgorithm, type EngineModule } from "./engine/engine";
import type { AlgorithmId, Step } from "./engine/types";
import { samples, type SampleGraph, type SampleId } from "./graph/samples";
import { Player } from "./player/Player";
import { cellKey, deriveState, describeStep, type VisualState } from "./player/state";
import { GraphView } from "./render/GraphView";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const NEEDS_TARGET = new Set<AlgorithmId>(["dijkstra", "bellman-ford", "floyd-warshall"]);
const NO_SOURCE = new Set<AlgorithmId>(["kahn", "kruskal"]);
const BUILDS_TREE = new Set<AlgorithmId>(["prim", "kruskal"]);

// Algoritmos que solo tienen sentido sobre un tipo de grafo.
const REQUIREMENTS: Partial<Record<AlgorithmId, { directed: boolean; message: string }>> = {
  prim: { directed: false, message: "Prim necesita un grafo no dirigido. Elegí el grafo ponderado." },
  kruskal: { directed: false, message: "Kruskal necesita un grafo no dirigido. Elegí el grafo ponderado." },
  kahn: { directed: true, message: "Kahn necesita un grafo dirigido. Elegí el grafo de dependencias." },
};

const ui = {
  sample: $<HTMLSelectElement>("sample"),
  algorithm: $<HTMLSelectElement>("algorithm"),
  source: $<HTMLSelectElement>("source"),
  sourceField: $<HTMLLabelElement>("source-field"),
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
  outputPanel: $<HTMLElement>("output-panel"),
  outputTitle: $<HTMLSpanElement>("output-title"),
  output: $<HTMLOListElement>("output"),
  matrixPanel: $<HTMLElement>("matrix-panel"),
  matrix: $<HTMLTableElement>("matrix"),
};

let sample: SampleGraph = samples.weighted;
let view = new GraphView($("graph"), sample);
let steps: Step[] = [];
// Mensaje a mostrar cuando el algoritmo no aplica al grafo elegido.
let notice: string | null = null;

function chip(text: string): HTMLLIElement {
  const li = document.createElement("li");
  li.textContent = text;
  return li;
}

// Panel con el resultado parcial: el orden topológico o el peso del árbol.
function renderOutput(state: VisualState, position: number): void {
  const algorithm = ui.algorithm.value as AlgorithmId;
  ui.outputPanel.hidden = steps.length === 0 || (algorithm !== "kahn" && !BUILDS_TREE.has(algorithm));
  if (algorithm === "kahn") {
    ui.outputTitle.textContent = "Orden topológico";
    ui.output.replaceChildren(...state.output.map((node) => chip(sample.labels[node])));
  } else if (BUILDS_TREE.has(algorithm)) {
    const weight = steps
      .slice(0, position)
      .filter((s) => s.type === "path-edge")
      .reduce((total, s) => total + s.value, 0);
    ui.outputTitle.textContent = `Peso del árbol (${state.pathEdges.size} aristas)`;
    ui.output.replaceChildren(chip(String(weight)));
  }
}

// Matriz de Floyd-Warshall: resalta la fila/columna del pivote y la celda que mejoró.
function renderMatrix(state: VisualState): void {
  ui.matrixPanel.hidden = ui.algorithm.value !== "floyd-warshall" || steps.length === 0;
  if (ui.matrixPanel.hidden) return;

  const cell = (tag: "th" | "td", text: string, className = "") => {
    const el = document.createElement(tag);
    el.textContent = text;
    if (className) el.className = className;
    return el;
  };
  const { labels } = sample;
  const header = document.createElement("tr");
  header.append(cell("th", ""), ...labels.map((l) => cell("th", l)));

  const rows = labels.map((rowLabel, i) => {
    const tr = document.createElement("tr");
    tr.append(cell("th", rowLabel));
    labels.forEach((_, j) => {
      const value = state.matrix.get(cellKey(i, j));
      const classes = [];
      if (state.pivot !== null && (i === state.pivot || j === state.pivot)) classes.push("pivot");
      if (state.updatedCell?.i === i && state.updatedCell.j === j) classes.push("updated");
      if (i === j && value !== undefined && value < 0) classes.push("negative");
      tr.append(cell("td", value === undefined ? "∞" : String(value), classes.join(" ")));
    });
    return tr;
  });
  ui.matrix.replaceChildren(header, ...rows);
}

const player = new Player((position, total, playing) => {
  const state = deriveState(steps, position, sample.graph.directed);
  // En Kruskal el valor de cada nodo es su representante: se muestra su etiqueta.
  view.render(state, ui.algorithm.value === "kruskal" ? (v) => sample.labels[v] : String);
  renderOutput(state, position);
  renderMatrix(state);
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
  ui.sourceField.hidden = NO_SOURCE.has(algorithm);
  const requirement = REQUIREMENTS[algorithm];
  if (requirement && requirement.directed !== sample.graph.directed) {
    notice = requirement.message;
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
