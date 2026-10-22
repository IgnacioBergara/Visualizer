import type { AlgorithmId, Step } from "../engine/types";

export type EdgeKey = string;

/** Clave de arista; en grafos no dirigidos a-b y b-a son la misma. */
export function edgeKey(a: number, b: number, directed: boolean): EdgeKey {
  return directed || a < b ? `e${a}-${b}` : `e${b}-${a}`;
}

/** Foto del algoritmo tras aplicar los primeros N pasos. */
export interface VisualState {
  current: number | null;
  activeEdge: EdgeKey | null;
  frontier: Set<number>;
  visited: Set<number>;
  finished: Set<number>;
  treeEdges: Set<EdgeKey>;
  pathEdges: Set<EdgeKey>;
  cycleNodes: Set<number>;
  cycleEdges: Set<EdgeKey>;
  /** Número que se muestra bajo cada nodo: nivel, profundidad, distancia, grado de entrada... */
  nodeValues: Map<number, number>;
  /** Nodos ya agregados al resultado, en orden (orden topológico). */
  output: number[];
}

// Recalcular desde cero en cada paso es O(pasos), de sobra para grafos
// didácticos, y hace que retroceder sea trivial.
export function deriveState(steps: readonly Step[], count: number, directed: boolean): VisualState {
  const state: VisualState = {
    current: null,
    activeEdge: null,
    frontier: new Set(),
    visited: new Set(),
    finished: new Set(),
    treeEdges: new Set(),
    pathEdges: new Set(),
    cycleNodes: new Set(),
    cycleEdges: new Set(),
    nodeValues: new Map(),
    output: [],
  };
  const parent = new Map<number, number>();

  for (const step of steps.slice(0, count)) {
    state.activeEdge = null;
    switch (step.type) {
      case "discover":
        state.frontier.add(step.target);
        state.nodeValues.set(step.target, step.value);
        if (step.node >= 0) parent.set(step.target, step.node);
        break;
      case "relax":
        // En Bellman-Ford un nodo ya procesado puede mejorar y volver a la cola.
        state.visited.delete(step.target);
        state.finished.delete(step.target);
        state.frontier.add(step.target);
        state.nodeValues.set(step.target, step.value);
        if (step.node >= 0) parent.set(step.target, step.node);
        break;
      case "visit":
        state.frontier.delete(step.node);
        state.visited.add(step.node);
        state.current = step.node;
        break;
      case "explore-edge":
        state.activeEdge = edgeKey(step.node, step.target, directed);
        break;
      case "finish":
        state.finished.add(step.node);
        break;
      case "path-edge":
        state.pathEdges.add(edgeKey(step.node, step.target, directed));
        break;
      case "negative-cycle":
        state.cycleNodes.add(step.node);
        state.cycleNodes.add(step.target);
        state.cycleEdges.add(edgeKey(step.node, step.target, directed));
        break;
      case "set-value":
        state.nodeValues.set(step.node, step.value);
        break;
      case "output":
        state.output.push(step.node);
        break;
      case "blocked":
        state.cycleNodes.add(step.node);
        break;
    }
  }

  for (const [child, p] of parent) state.treeEdges.add(edgeKey(p, child, directed));
  return state;
}

const VALUE_NAMES: Record<AlgorithmId, string> = {
  bfs: "nivel",
  dfs: "profundidad",
  dijkstra: "distancia",
  "bellman-ford": "distancia",
  kahn: "grado de entrada",
  prim: "costo de conexión",
};

export function describeStep(
  step: Step | undefined,
  labels: readonly string[],
  algorithm: AlgorithmId,
): string {
  if (!step) return "Listo para empezar.";
  const n = labels[step.node] ?? "?";
  const t = labels[step.target] ?? "?";
  const value = `${VALUE_NAMES[algorithm]} ${step.value}`;
  switch (step.type) {
    case "discover":
      if (algorithm === "kahn") {
        return step.node < 0
          ? `${t} no tiene dependencias: entra a la cola.`
          : `${t} ya no tiene dependencias pendientes: entra a la cola.`;
      }
      return step.node < 0
        ? `Empieza en ${t} (${value}).`
        : `${t} entra en la frontera desde ${n} (${value}).`;
    case "visit":
      return algorithm === "kahn" ? `${n} sale de la cola.` : `Procesando ${n} (${value}).`;
    case "explore-edge":
      return `Mirando la arista ${n} → ${t} (peso ${step.value}).`;
    case "relax":
      if (step.node < 0) return algorithm === "prim" ? `El árbol empieza en ${t}.` : `dist(${t}) = 0.`;
      return algorithm === "prim"
        ? `${t} se puede conectar al árbol desde ${n} con peso ${step.value}.`
        : `dist(${t}) mejora a ${step.value} pasando por ${n}.`;
    case "finish":
      return `${n} terminado.`;
    case "path-edge":
      return algorithm === "prim"
        ? `La arista ${n} – ${t} entra al árbol (peso ${step.value}).`
        : `Camino mínimo: ${n} → ${t} (acumulado ${step.value}).`;
    case "negative-cycle":
      return `Ciclo negativo: ${n} → ${t}. Las distancias que pasan por él no están definidas.`;
    case "set-value":
      return `${n}: ${value}.`;
    case "output":
      return `${n} va al orden en la posición ${step.value + 1}.`;
    case "blocked":
      return `${n} nunca llega a grado 0 (le quedan ${step.value}): hay un ciclo y no existe orden topológico.`;
  }
}
