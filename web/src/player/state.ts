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
  rejectedEdges: Set<EdgeKey>;
  /** Número que se muestra bajo cada nodo: nivel, profundidad, distancia, grado de entrada... */
  nodeValues: Map<number, number>;
  /** Nodos ya agregados al resultado, en orden (orden topológico). */
  output: number[];
  /** Matriz de distancias (Floyd-Warshall), por clave `${i},${j}`. */
  matrix: Map<string, number>;
  /** Pivote en curso y última celda actualizada de la matriz. */
  pivot: number | null;
  updatedCell: { i: number; j: number } | null;
}

export const cellKey = (i: number, j: number) => `${i},${j}`;

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
    rejectedEdges: new Set(),
    nodeValues: new Map(),
    output: [],
    matrix: new Map(),
    pivot: null,
    updatedCell: null,
  };
  const parent = new Map<number, number>();

  for (const step of steps.slice(0, count)) {
    state.activeEdge = null;
    state.updatedCell = null;
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
      case "reject-edge":
        state.rejectedEdges.add(edgeKey(step.node, step.target, directed));
        break;
      case "matrix-update":
        state.matrix.set(cellKey(step.node, step.target), step.value);
        state.updatedCell = { i: step.node, j: step.target };
        break;
    }
  }

  // Floyd-Warshall: el pivote es el último nodo visitado que todavía no terminó.
  if (state.current !== null && !state.finished.has(state.current)) state.pivot = state.current;

  for (const [child, p] of parent) state.treeEdges.add(edgeKey(p, child, directed));
  return state;
}

const VALUE_NAMES: Record<AlgorithmId, string> = {
  bfs: "nivel",
  dfs: "profundidad",
  dijkstra: "distancia",
  "bellman-ford": "distancia",
  "floyd-warshall": "distancia",
  kahn: "grado de entrada",
  prim: "costo de conexión",
  kruskal: "conjunto",
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
      if (algorithm === "floyd-warshall") return `Pivote ${n}: ¿algún camino mejora pasando por ${n}?`;
      return algorithm === "kahn" ? `${n} sale de la cola.` : `Procesando ${n} (${value}).`;
    case "explore-edge":
      return algorithm === "kruskal"
        ? `Siguiente arista más barata: ${n} – ${t} (peso ${step.value}).`
        : `Mirando la arista ${n} → ${t} (peso ${step.value}).`;
    case "relax":
      if (step.node < 0) return algorithm === "prim" ? `El árbol empieza en ${t}.` : `dist(${t}) = 0.`;
      return algorithm === "prim"
        ? `${t} se puede conectar al árbol desde ${n} con peso ${step.value}.`
        : `dist(${t}) mejora a ${step.value} pasando por ${n}.`;
    case "finish":
      return `${n} terminado.`;
    case "path-edge":
      if (algorithm === "kruskal") {
        return `${n} y ${t} están en conjuntos distintos: la arista entra al árbol.`;
      }
      return algorithm === "prim"
        ? `La arista ${n} – ${t} entra al árbol (peso ${step.value}).`
        : `Camino mínimo: ${n} → ${t} (acumulado ${step.value}).`;
    case "negative-cycle":
      if (step.node === step.target) {
        return `${n} está en un ciclo negativo: puede volver a sí mismo con costo ${step.value}.`;
      }
      return `Ciclo negativo: ${n} → ${t}. Las distancias que pasan por él no están definidas.`;
    case "set-value":
      if (algorithm === "kruskal") {
        return step.value === step.node
          ? `${n} empieza en su propio conjunto.`
          : `${n} ahora está en el conjunto de ${labels[step.value]}.`;
      }
      return `${n}: ${value}.`;
    case "output":
      return `${n} va al orden en la posición ${step.value + 1}.`;
    case "blocked":
      return `${n} nunca llega a grado 0 (le quedan ${step.value}): hay un ciclo y no existe orden topológico.`;
    case "reject-edge":
      return `${n} y ${t} ya están en el mismo conjunto: la arista formaría un ciclo y se descarta.`;
    case "matrix-update":
      if (step.node === step.target) return `dist(${n}→${n}) = 0.`;
      return step.aux < 0
        ? `dist(${n}→${t}) = ${step.value} (arista directa).`
        : `dist(${n}→${t}) mejora a ${step.value} pasando por ${labels[step.aux]}.`;
  }
}
