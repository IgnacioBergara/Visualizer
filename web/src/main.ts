import "./style.css";
import { GraphEditor } from "./editor/GraphEditor";
import { RandomGraphPanel } from "./editor/RandomGraphPanel";
import { loadEngine, runAlgorithm, type EngineModule } from "./engine/engine";
import type { AlgorithmId, Step } from "./engine/types";
import { ALGORITHM_NAMES, checkAlgorithms, type AlgorithmCheck, type Verdict } from "./graph/compatibility";
import {
  copyAsCustom,
  emptyGraph,
  loadCustomSlots,
  MAX_CUSTOM_GRAPHS,
  saveCustomSlots,
  slotName,
} from "./graph/customGraph";
import { samples, type SampleGraph, type SampleId } from "./graph/samples";
import { Player } from "./player/Player";
import { cellKey, deriveState, describeStep, type VisualState } from "./player/state";
import { GraphView, type Viewport } from "./render/GraphView";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const NEEDS_TARGET = new Set<AlgorithmId>(["dijkstra", "bellman-ford", "floyd-warshall"]);
const NO_SOURCE = new Set<AlgorithmId>(["kahn", "kruskal"]);
const BUILDS_TREE = new Set<AlgorithmId>(["prim", "kruskal"]);

const ui = {
  runPanel: $<HTMLElement>("run-panel"),
  editorPanel: $<HTMLElement>("editor-panel"),
  editGraph: $<HTMLButtonElement>("edit-graph"),
  newGraph: $<HTMLButtonElement>("new-graph"),
  deleteGraph: $<HTMLButtonElement>("delete-graph"),
  slotsHint: $<HTMLParagraphElement>("slots-hint"),
  algorithmChips: $<HTMLDivElement>("algorithm-chips"),
  algorithmHint: $<HTMLParagraphElement>("algorithm-hint"),
  editorDone: $<HTMLButtonElement>("editor-done"),
  editorDelete: $<HTMLButtonElement>("editor-delete"),
  randomGraph: $<HTMLButtonElement>("random-graph"),
  randomPanel: $<HTMLElement>("random-panel"),
  randomCancel: $<HTMLButtonElement>("random-cancel"),
  randomUse: $<HTMLButtonElement>("random-use"),
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

const editorUi = {
  name: $<HTMLInputElement>("editor-name"),
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

const randomUi = {
  nodes: $<HTMLInputElement>("random-nodes"),
  density: $<HTMLInputElement>("random-density"),
  minWeight: $<HTMLInputElement>("random-min"),
  maxWeight: $<HTMLInputElement>("random-max"),
  directed: $<HTMLInputElement>("random-directed"),
  acyclic: $<HTMLInputElement>("random-acyclic"),
  connected: $<HTMLInputElement>("random-connected"),
  seed: $<HTMLInputElement>("random-seed"),
  reroll: $<HTMLButtonElement>("random-reroll"),
  summary: $<HTMLParagraphElement>("random-summary"),
  report: $<HTMLUListElement>("random-report"),
};

/** Los ejemplos fijos, los grafos personalizados (custom-0, custom-1, ...) y el aleatorio. */
type CustomId = `custom-${number}`;
type GraphId = SampleId | CustomId | "random";

const customId = (slot: number): CustomId => `custom-${slot}`;
const slotOf = (id: GraphId): number | null => (id.startsWith("custom-") ? Number(id.slice(7)) : null);

const sampleIds = Object.keys(samples) as SampleId[];
const customSlots = loadCustomSlots();
let randomGraph: SampleGraph | null = null;

/** Primer espacio personalizado libre, o -1 si están todos ocupados. */
const freeSlot = () => customSlots.findIndex((g) => g === null);

function graphFor(id: GraphId): SampleGraph {
  const slot = slotOf(id);
  if (slot !== null) return customSlots[slot] ?? emptyGraph();
  if (id === "random") return randomGraph ?? emptyGraph();
  return samples[id as SampleId];
}
const graphIds = (): GraphId[] => [
  ...sampleIds,
  ...customSlots.flatMap((g, slot) => (g ? [customId(slot)] : [])),
  ...(randomGraph ? (["random"] as const) : []),
];

// Si hay grafos personalizados guardados, se arranca mostrando el primero.
const firstSaved = customSlots.findIndex((g) => g !== null);
let currentId: GraphId = firstSaved >= 0 ? customId(firstSaved) : "weighted";
let sample: SampleGraph = graphFor(currentId);
let view: GraphView | null = new GraphView($("graph"), sample);
let editor: GraphEditor | null = null;
/** Espacio personalizado que se está editando. */
let editingSlot: number | null = null;
let generator: RandomGraphPanel | null = null;
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
  updateGraphTools();
}

// "Nuevo" necesita un espacio libre; "Editar" también, salvo que ya sea un
// personalizado. "Borrar" solo aparece sobre un personalizado.
function updateGraphTools(): void {
  const full = freeSlot() === -1;
  const isCustom = slotOf(currentId) !== null;
  ui.newGraph.disabled = full;
  ui.editGraph.disabled = full && !isCustom;
  ui.deleteGraph.hidden = !isCustom;
  ui.slotsHint.hidden = !full;
  ui.slotsHint.textContent = `Ya tenés ${MAX_CUSTOM_GRAPHS} grafos personalizados: para crear otro, borrá uno con 🗑.`;
}

// Todos los grafos se pueden elegir: lo que se filtra son los algoritmos.
function updateSampleOptions(): void {
  ui.sample.replaceChildren(...graphIds().map((id) => new Option(graphFor(id).name, id)));
  ui.sample.value = currentId;
}

const VERDICT_ICONS: Record<Verdict, string> = { ok: "✓", warning: "!", blocked: "✗" };

// Un botón por algoritmo con su estado para el grafo elegido; los disponibles se pueden clicar.
function renderAlgorithmChips(checks: readonly AlgorithmCheck[]): void {
  ui.algorithmChips.replaceChildren(
    ...checks.map((check) => {
      const chipButton = document.createElement("button");
      chipButton.className = check.verdict;
      chipButton.classList.toggle("active", check.algorithm === ui.algorithm.value);
      chipButton.disabled = check.verdict === "blocked";
      chipButton.title = check.message;
      chipButton.dataset.algorithm = check.algorithm;
      const icon = document.createElement("span");
      icon.className = "icon";
      icon.textContent = VERDICT_ICONS[check.verdict];
      chipButton.append(icon, ALGORITHM_NAMES[check.algorithm]);
      return chipButton;
    }),
  );
}

/**
 * Ajusta los algoritmos al grafo elegido: deshabilita los incompatibles y, si
 * el elegido quedó entre ellos, pasa a uno disponible avisando por qué. Si el
 * elegido se puede correr con una advertencia, la muestra.
 */
function refreshAlgorithms(): void {
  const checks = checkAlgorithms(sample.graph);
  const byAlgorithm = new Map(checks.map((c) => [c.algorithm, c]));
  for (const option of ui.algorithm.options) {
    const check = byAlgorithm.get(option.value as AlgorithmId)!;
    option.disabled = check.verdict === "blocked";
    option.title = check.message;
  }

  let notice: string | null = null;
  const chosen = byAlgorithm.get(ui.algorithm.value as AlgorithmId)!;
  if (chosen.verdict === "blocked") {
    // BFS siempre se puede correr, así que siempre hay reemplazo.
    const replacement = checks.find((c) => c.verdict !== "blocked")!;
    ui.algorithm.value = replacement.algorithm;
    notice = `Se cambió a ${ALGORITHM_NAMES[replacement.algorithm]}: ${chosen.message}`;
  }

  const current = byAlgorithm.get(ui.algorithm.value as AlgorithmId)!;
  const warning = current.verdict === "warning" ? current.message : null;
  ui.algorithmHint.textContent = notice ?? warning ?? "";
  ui.algorithmHint.hidden = notice === null && warning === null;
  ui.algorithmHint.classList.toggle("warning", notice === null && warning !== null);
  renderAlgorithmChips(checks);
}

// Borra un grafo personalizado después de confirmarlo. Devuelve si se borró.
function removeCustomGraph(slot: number): boolean {
  const name = customSlots[slot]?.name ?? slotName(slot);
  if (!confirm(`¿Borrar «${name}»? No se puede deshacer.`)) return false;
  customSlots[slot] = null;
  saveCustomSlots(customSlots);
  return true;
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

// Abre el editor sobre un espacio personalizado. El espacio queda reservado
// enseguida y cada cambio se guarda, así nada se pierde al recargar.
function openEditor(slot: number, start: SampleGraph, viewport?: Viewport): void {
  player.pause();
  view?.destroy();
  view = null;
  editingSlot = slot;
  customSlots[slot] = start;
  saveCustomSlots(customSlots);
  const onChange = (g: SampleGraph) => {
    customSlots[slot] = g;
    saveCustomSlots(customSlots);
  };
  editor = new GraphEditor($("graph"), start, editorUi, onChange, viewport);
  ui.runPanel.hidden = true;
  ui.editorPanel.hidden = false;
}

// Un personalizado se edita en su lugar; un ejemplo o el aleatorio, como copia en un espacio libre.
function startEditing(): void {
  const viewport = view?.viewport;
  const slot = slotOf(currentId);
  if (slot !== null) {
    openEditor(slot, customSlots[slot] ?? emptyGraph(false, slotName(slot)), viewport);
    return;
  }
  const free = freeSlot();
  if (free !== -1) openEditor(free, copyAsCustom(sample, slotName(free)), viewport);
}

// Grafo vacío en un espacio libre, con la cámara centrada en el origen.
function startNewGraph(): void {
  const free = freeSlot();
  if (free === -1) return;
  const { width, height } = $("graph").getBoundingClientRect();
  openEditor(free, emptyGraph(false, slotName(free)), { zoom: 1, pan: { x: width / 2, y: height / 2 } });
}

function closeEditor(engine: EngineModule, show: GraphId): void {
  editor = null;
  editingSlot = null;
  ui.editorPanel.hidden = true;
  ui.runPanel.hidden = false;
  showGraph(engine, show);
}

/** Muestra un grafo y ajusta a él la lista de grafos, los algoritmos y la animación. */
function showGraph(engine: EngineModule, id: GraphId): void {
  selectSample(id);
  updateSampleOptions();
  refreshAlgorithms();
  recompute(engine);
}

function finishEditing(engine: EngineModule): void {
  if (!editor || editingSlot === null) return;
  const slot = editingSlot;
  customSlots[slot] = editor.finish();
  saveCustomSlots(customSlots);
  closeEditor(engine, customId(slot));
}

function deleteEditingGraph(engine: EngineModule): void {
  if (!editor || editingSlot === null || !removeCustomGraph(editingSlot)) return;
  editor.finish();
  closeEditor(engine, "weighted");
}

// Botón 🗑 de la vista principal: borra el personalizado elegido sin abrir el editor.
function deleteCurrentGraph(engine: EngineModule): void {
  const slot = slotOf(currentId);
  if (slot === null || !removeCustomGraph(slot)) return;
  showGraph(engine, "weighted");
}

// El generador ocupa el lienzo mientras está abierto; "Cancelar" vuelve al grafo anterior.
function startRandom(): void {
  player.pause();
  view?.destroy();
  view = null;
  generator = new RandomGraphPanel($("graph"), randomUi);
  ui.runPanel.hidden = true;
  ui.randomPanel.hidden = false;
}

function closeRandom(engine: EngineModule, use: boolean): void {
  if (!generator) return;
  const generated = generator.finish();
  generator = null;
  ui.randomPanel.hidden = true;
  ui.runPanel.hidden = false;

  if (use) randomGraph = generated;
  showGraph(engine, use ? "random" : currentId);
}

fillNodeSelects();
updateSampleOptions();
updateGraphTools();
refreshAlgorithms();

async function main(): Promise<void> {
  const engine = await loadEngine();
  ui.sample.addEventListener("change", () => {
    selectSample(ui.sample.value as GraphId);
    refreshAlgorithms();
    recompute(engine);
  });
  ui.algorithm.addEventListener("change", () => {
    refreshAlgorithms();
    recompute(engine);
  });
  // Clic en un algoritmo disponible del panel: lo elige.
  ui.algorithmChips.addEventListener("click", (e) => {
    const chipButton = (e.target as HTMLElement).closest<HTMLButtonElement>("button[data-algorithm]");
    if (!chipButton || chipButton.disabled) return;
    ui.algorithm.value = chipButton.dataset.algorithm!;
    ui.algorithm.dispatchEvent(new Event("change"));
  });
  ui.deleteGraph.addEventListener("click", () => deleteCurrentGraph(engine));
  for (const select of [ui.source, ui.target]) {
    select.addEventListener("change", () => recompute(engine));
  }
  ui.editGraph.addEventListener("click", startEditing);
  ui.newGraph.addEventListener("click", startNewGraph);
  ui.editorDone.addEventListener("click", () => finishEditing(engine));
  ui.editorDelete.addEventListener("click", () => deleteEditingGraph(engine));
  ui.randomGraph.addEventListener("click", startRandom);
  ui.randomUse.addEventListener("click", () => closeRandom(engine, true));
  ui.randomCancel.addEventListener("click", () => closeRandom(engine, false));
  ui.play.addEventListener("click", () => player.toggle());
  ui.forward.addEventListener("click", () => player.stepForward());
  ui.back.addEventListener("click", () => player.stepBack());
  ui.reset.addEventListener("click", () => player.load(steps));
  ui.timeline.addEventListener("input", () => player.seek(Number(ui.timeline.value)));
  // El slider va de lento (izquierda) a rápido (derecha).
  ui.speed.addEventListener("input", () => player.setDelay(1600 - Number(ui.speed.value)));

  document.addEventListener("keydown", (e) => {
    // Sin atajos mientras se edita, se genera o se escribe en un campo.
    if (editor || generator || e.target instanceof HTMLSelectElement || e.target instanceof HTMLInputElement) {
      return;
    }
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
