// Grafo personalizado: operaciones de edición (todas devuelven un grafo nuevo),
// formato JSON para importar/exportar y guardado en el navegador.
import type { GraphEdge } from "../engine/types";
import type { SampleGraph } from "./samples";

export const CUSTOM_NAME = "Personalizado";
export const MAX_NODES = 40;
const MAX_LABEL_LENGTH = 4;
const STORAGE_KEY = "gv.customGraph";

type Point = { x: number; y: number };

export function emptyGraph(directed = false): SampleGraph {
  return {
    name: CUSTOM_NAME,
    graph: { nodeCount: 0, directed, edges: [] },
    labels: [],
    positions: [],
  };
}

/** Copia editable de un grafo (p. ej. para editar a partir de un ejemplo). */
export function copyAsCustom(source: SampleGraph): SampleGraph {
  return {
    name: CUSTOM_NAME,
    graph: { ...source.graph, edges: source.graph.edges.map((e) => ({ ...e })) },
    labels: [...source.labels],
    positions: source.positions.map((p) => ({ ...p })),
  };
}

// A, B, ..., Z, AA, AB, ...
function labelFor(index: number): string {
  let label = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26)) {
    label = String.fromCharCode(65 + ((n - 1) % 26)) + label;
  }
  return label;
}

export function nextLabel(labels: readonly string[]): string {
  for (let i = 0; ; i++) {
    const label = labelFor(i);
    if (!labels.includes(label)) return label;
  }
}

export function addNode(g: SampleGraph, position: Point): SampleGraph {
  if (g.graph.nodeCount >= MAX_NODES) return g;
  return {
    ...g,
    graph: { ...g.graph, nodeCount: g.graph.nodeCount + 1 },
    labels: [...g.labels, nextLabel(g.labels)],
    positions: [...g.positions, { x: Math.round(position.x), y: Math.round(position.y) }],
  };
}

export function moveNode(g: SampleGraph, index: number, position: Point): SampleGraph {
  const positions = g.positions.map((p, i) =>
    i === index ? { x: Math.round(position.x), y: Math.round(position.y) } : p,
  );
  return { ...g, positions };
}

/** Quita el nodo y sus aristas, y corre los índices de los nodos siguientes. */
export function removeNode(g: SampleGraph, index: number): SampleGraph {
  const shift = (i: number) => (i > index ? i - 1 : i);
  return {
    ...g,
    graph: {
      ...g.graph,
      nodeCount: g.graph.nodeCount - 1,
      edges: g.graph.edges
        .filter((e) => e.from !== index && e.to !== index)
        .map((e) => ({ ...e, from: shift(e.from), to: shift(e.to) })),
    },
    labels: g.labels.filter((_, i) => i !== index),
    positions: g.positions.filter((_, i) => i !== index),
  };
}

/** En un grafo no dirigido a-b y b-a son la misma arista. */
export function isSameEdge(e: GraphEdge, from: number, to: number, directed: boolean): boolean {
  return (e.from === from && e.to === to) || (!directed && e.from === to && e.to === from);
}

/** Agrega la arista o, si ya existe, le cambia el peso. Los lazos se ignoran. */
export function setEdge(g: SampleGraph, from: number, to: number, weight: number): SampleGraph {
  if (from === to) return g;
  const { directed, edges } = g.graph;
  const exists = edges.some((e) => isSameEdge(e, from, to, directed));
  const updated = exists
    ? edges.map((e) => (isSameEdge(e, from, to, directed) ? { ...e, weight } : e))
    : [...edges, { from, to, weight }];
  return { ...g, graph: { ...g.graph, edges: updated } };
}

export function removeEdge(g: SampleGraph, from: number, to: number): SampleGraph {
  const { directed, edges } = g.graph;
  return {
    ...g,
    graph: { ...g.graph, edges: edges.filter((e) => !isSameEdge(e, from, to, directed)) },
  };
}

/** Al pasar a no dirigido, a->b y b->a se funden en una sola arista (queda la primera). */
export function setDirected(g: SampleGraph, directed: boolean): SampleGraph {
  let result: SampleGraph = { ...g, graph: { ...g.graph, directed, edges: [] } };
  for (const e of g.graph.edges) {
    const duplicate = result.graph.edges.some((x) => isSameEdge(x, e.from, e.to, directed));
    if (!duplicate) result = setEdge(result, e.from, e.to, e.weight);
  }
  return result;
}

// ---------------------------------------------------------------------------
// JSON

export function toJson(g: SampleGraph): string {
  return JSON.stringify(
    {
      version: 1,
      directed: g.graph.directed,
      nodes: g.labels.map((label, i) => ({ label, x: g.positions[i].x, y: g.positions[i].y })),
      edges: g.graph.edges,
    },
    null,
    2,
  );
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const isFiniteNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

/** Lee un grafo en el formato de toJson(). Lanza Error con un mensaje para el usuario. */
export function fromJson(text: string): SampleGraph {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("El archivo no es un JSON válido.");
  }
  if (!isRecord(data)) throw new Error("El JSON debe ser un objeto con nodes y edges.");
  const { directed, nodes, edges } = data;
  if (typeof directed !== "boolean") throw new Error("Falta \"directed\" (true o false).");
  if (!Array.isArray(nodes)) throw new Error("Falta la lista \"nodes\".");
  if (!Array.isArray(edges)) throw new Error("Falta la lista \"edges\".");
  if (nodes.length > MAX_NODES) throw new Error(`El grafo tiene más de ${MAX_NODES} nodos.`);

  let g = emptyGraph(directed);
  nodes.forEach((node, i) => {
    if (!isRecord(node) || !isFiniteNumber(node.x) || !isFiniteNumber(node.y)) {
      throw new Error(`El nodo ${i} necesita "x" e "y" numéricos.`);
    }
    const label = node.label;
    if (typeof label !== "string" || label.trim() === "" || label.length > MAX_LABEL_LENGTH) {
      throw new Error(`El nodo ${i} necesita un "label" de 1 a ${MAX_LABEL_LENGTH} caracteres.`);
    }
    if (g.labels.includes(label)) throw new Error(`La etiqueta "${label}" está repetida.`);
    g = {
      ...g,
      graph: { ...g.graph, nodeCount: g.graph.nodeCount + 1 },
      labels: [...g.labels, label],
      positions: [...g.positions, { x: node.x, y: node.y }],
    };
  });

  edges.forEach((edge, i) => {
    if (!isRecord(edge)) throw new Error(`La arista ${i} no es un objeto.`);
    const { from, to, weight } = edge;
    const valid = (v: unknown): v is number =>
      Number.isInteger(v) && (v as number) >= 0 && (v as number) < nodes.length;
    if (!valid(from) || !valid(to)) {
      throw new Error(`La arista ${i} apunta a un nodo inexistente.`);
    }
    if (from === to) throw new Error(`La arista ${i} es un lazo (from y to iguales).`);
    if (!isFiniteNumber(weight)) throw new Error(`La arista ${i} necesita un "weight" numérico.`);
    g = setEdge(g, from, to, weight);
  });
  return g;
}

// ---------------------------------------------------------------------------
// Guardado en el navegador. Puede no estar disponible (modo privado, permisos):
// en ese caso el editor funciona igual, solo que no recuerda el grafo.

export function saveCustom(g: SampleGraph): void {
  try {
    localStorage.setItem(STORAGE_KEY, toJson(g));
  } catch {
    // sin almacenamiento disponible
  }
}

export function loadCustom(): SampleGraph | null {
  try {
    const text = localStorage.getItem(STORAGE_KEY);
    return text ? fromJson(text) : null;
  } catch {
    return null;
  }
}
