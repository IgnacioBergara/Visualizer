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
  /** Número que se muestra bajo cada nodo: nivel (BFS), profundidad (DFS) o distancia (Dijkstra). */
  nodeValues: Map<number, number>;
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
    nodeValues: new Map(),
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
    }
  }

  for (const [child, p] of parent) state.treeEdges.add(edgeKey(p, child, directed));
  return state;
}

const VALUE_NAMES: Record<AlgorithmId, string> = {
  bfs: "nivel",
  dfs: "profundidad",
  dijkstra: "distancia",
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
      return step.node < 0
        ? `Empieza en ${t} (${value}).`
        : `${t} entra en la frontera desde ${n} (${value}).`;
    case "visit":
      return `Procesando ${n} (${value}).`;
    case "explore-edge":
      return `Mirando la arista ${n} → ${t} (peso ${step.value}).`;
    case "relax":
      return step.node < 0
        ? `dist(${t}) = 0.`
        : `dist(${t}) mejora a ${step.value} pasando por ${n}.`;
    case "finish":
      return `${n} terminado.`;
    case "path-edge":
      return `Camino mínimo: ${n} → ${t} (acumulado ${step.value}).`;
  }
}
