import "./style.css";
import { GraphEditor } from "./editor/GraphEditor";
import { loadEngine, runAlgorithm, type EngineModule } from "./engine/engine";
import type { AlgorithmId, Step } from "./engine/types";
import { incompatibility } from "./graph/compatibility";
import { copyAsCustom, emptyGraph, loadCustom, saveCustom } from "./graph/customGraph";
import { samples, type SampleGraph, type SampleId } from "./graph/samples";
import { Player } from "./player/Player";
import { cellKey, deriveState, describeStep, type VisualState } from "./player/state";
import { GraphView } from "./render/GraphView";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const NEEDS_TARGET = new Set<AlgorithmId>(["dijkstra", "bellman-ford", "floyd-warshall"]);
const NO_SOURCE = new Set<AlgorithmId>(["kahn", "kruskal"]);
const BUILDS_TREE = new Set<AlgorithmId>(["prim", "kruskal"]);

const ui = {
  runPanel: $<HTMLElement>("run-panel"),
  editorPanel: $<HTMLElement>("editor-panel"),
  editGraph: $<HTMLButtonElement>("edit-graph"),
  editorDone: $<HTMLButtonElement>("editor-done"),
  sample: $<HTMLSelectElement>("sample"),
  sampleHint: $<HTMLParagraphElement>("sample-hint"),
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

const editorUi = {
  directed: $<HTMLInputElement>("editor-directed"),
  weight: $<HTMLInputElement>("editor-weight"),
  edgePanel: $<HTMLElement>("editor-edge"),
  edgeLabel: $<HTMLElement>("editor-edge-label"),
  edgeWeight: $<HTMLInputElement>("editor-edge-weight"),
  edgeDelete: $<HTMLButtonElement>("editor-edge-delete"),
  clear: $<HTMLButtonElement>("editor-clear"),
  exportButton: $<HTMLButtonElement>("editor-export"),
  importInput: $<HTMLInputElement>("editor-import"),
  summary: $<HTMLParagraphElement>("editor-summary"),
  message: $<HTMLParagraphElement>("editor-message"),
};

/** Los ejemplos fijos más el grafo personalizado, si existe. */
type GraphId = SampleId | "custom";

const sampleIds = Object.keys(samples) as SampleId[];
let customGraph: SampleGraph | null = loadCustom();

const graphFor = (id: GraphId): SampleGraph =>
  id === "custom" ? (customGraph ?? emptyGraph()) : samples[id];
const graphIds = (): GraphId[] => (customGraph ? [...sampleIds, "custom"] : sampleIds);

// Si hay un grafo personalizado guardado, se arranca mostrándolo.
let currentId: GraphId = customGraph ? "custom" : "weighted";
let sample: SampleGraph = graphFor(currentId);
let view: GraphView | null = new GraphView($("graph"), sample);
let editor: GraphEditor | null = null;
let steps: Step[] = [];

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
  view?.render(state, ui.algorithm.value === "kruskal" ? (v) => sample.labels[v] : String);
  renderOutput(state, position);
  renderMatrix(state);
  ui.timeline.max = String(total);
  ui.timeline.value = String(position);
  ui.counter.textContent = `${position} / ${total}`;
  ui.description.textContent =
    sample.graph.nodeCount === 0
      ? "El grafo está vacío: tocá «✎ Editar» para agregarle nodos."
      : describeStep(steps[position - 1], sample.labels, ui.algorithm.value as AlgorithmId);
  ui.play.textContent = playing ? "⏸" : "▶";
  ui.back.disabled = position === 0;
  ui.forward.disabled = position === total;
});

function fillNodeSelects(): void {
  for (const select of [ui.source, ui.target]) {
    select.replaceChildren(...sample.labels.map((label, i) => new Option(label, String(i))));
  }
  ui.target.value = String(sample.labels.length - 1);
}

function selectSample(id: GraphId): void {
  currentId = id;
  sample = graphFor(id);
  ui.sample.value = id;
  view?.destroy();
  view = new GraphView($("graph"), sample);
  fillNodeSelects();
}

// Opciones del selector de grafo; las incompatibles con el algoritmo quedan deshabilitadas.
function updateSampleOptions(): void {
  const algorithm = ui.algorithm.value as AlgorithmId;
  ui.sample.replaceChildren(
    ...graphIds().map((id) => {
      const g = graphFor(id);
      const reason = incompatibility(algorithm, g.graph);
      const option = new Option(reason ? `${g.name} — ${reason}` : g.name, id);
      option.disabled = reason !== null;
      return option;
    }),
  );
  ui.sample.value = currentId;
}

// Si el grafo elegido no sirve para el algoritmo, pasa al primero que sí sirva.
function ensureCompatibleSample(): void {
  const algorithm = ui.algorithm.value as AlgorithmId;
  const reason = incompatibility(algorithm, sample.graph);
  ui.sampleHint.hidden = reason === null;
  if (reason === null) return;

  const replacement = graphIds().find((id) => incompatibility(algorithm, graphFor(id).graph) === null);
  if (!replacement) return;
  selectSample(replacement);
  ui.sampleHint.textContent = `Se cambió a «${graphFor(replacement).name}»: ${reason}.`;
}

function recompute(engine: EngineModule): void {
  const algorithm = ui.algorithm.value as AlgorithmId;
  ui.targetField.hidden = !NEEDS_TARGET.has(algorithm);
  ui.sourceField.hidden = NO_SOURCE.has(algorithm);
  steps =
    sample.graph.nodeCount === 0
      ? []
      : runAlgorithm(engine, algorithm, sample.graph, Number(ui.source.value), Number(ui.target.value));
  player.load(steps);
}

// El editor parte del grafo que se está viendo: el personalizado o una copia del ejemplo.
function startEditing(): void {
  const replacesCustom = currentId !== "custom" && (customGraph?.graph.nodeCount ?? 0) > 0;
  if (replacesCustom && !confirm("Esto reemplaza tu grafo personalizado por una copia de este ejemplo. ¿Seguir?")) {
    return;
  }
  player.pause();
  const viewport = view?.viewport;
  view?.destroy();
  view = null;
  const start = currentId === "custom" && customGraph ? customGraph : copyAsCustom(sample);
  editor = new GraphEditor($("graph"), start, editorUi, viewport);
  ui.runPanel.hidden = true;
  ui.editorPanel.hidden = false;
}

function finishEditing(engine: EngineModule): void {
  if (!editor) return;
  customGraph = editor.finish();
  editor = null;
  saveCustom(customGraph);
  ui.editorPanel.hidden = true;
  ui.runPanel.hidden = false;
  ui.sampleHint.hidden = true;

  selectSample("custom");
  updateSampleOptions();
  ensureCompatibleSample();
  recompute(engine);
}

fillNodeSelects();
updateSampleOptions();

async function main(): Promise<void> {
  const engine = await loadEngine();
  ui.sample.addEventListener("change", () => {
    selectSample(ui.sample.value as GraphId);
    ui.sampleHint.hidden = true;
    recompute(engine);
  });
  ui.algorithm.addEventListener("change", () => {
    updateSampleOptions();
    ensureCompatibleSample();
    recompute(engine);
  });
  for (const select of [ui.source, ui.target]) {
    select.addEventListener("change", () => recompute(engine));
  }
  ui.editGraph.addEventListener("click", startEditing);
  ui.editorDone.addEventListener("click", () => finishEditing(engine));
  ui.play.addEventListener("click", () => player.toggle());
  ui.forward.addEventListener("click", () => player.stepForward());
  ui.back.addEventListener("click", () => player.stepBack());
  ui.reset.addEventListener("click", () => player.load(steps));
  ui.timeline.addEventListener("input", () => player.seek(Number(ui.timeline.value)));
  // El slider va de lento (izquierda) a rápido (derecha).
  ui.speed.addEventListener("input", () => player.setDelay(1600 - Number(ui.speed.value)));

  document.addEventListener("keydown", (e) => {
    // Sin atajos mientras se edita o se escribe en un campo.
    if (editor || e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) return;
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
