import type { AlgorithmId, GraphDescription } from "../engine/types";

/** Propiedades de un grafo que deciden qué algoritmos se le pueden aplicar. */
export interface GraphTraits {
  directed: boolean;
  negativeWeights: boolean;
}

export function graphTraits(graph: GraphDescription): GraphTraits {
  return {
    directed: graph.directed,
    negativeWeights: graph.edges.some((e) => e.weight < 0),
  };
}

interface Requirement {
  accepts: (traits: GraphTraits) => boolean;
  reason: string;
}

const noNegativeWeights = (algorithm: string): Requirement => ({
  accepts: (t) => !t.negativeWeights,
  reason: `${algorithm} no admite pesos negativos`,
});
const directedOnly = (algorithm: string): Requirement => ({
  accepts: (t) => t.directed,
  reason: `${algorithm} necesita un grafo dirigido`,
});
const undirectedOnly = (algorithm: string): Requirement => ({
  accepts: (t) => !t.directed,
  reason: `${algorithm} necesita un grafo no dirigido`,
});

// Bellman-Ford y Floyd-Warshall aceptan cualquier grafo: detectan los ciclos negativos.
const REQUIREMENTS: Record<AlgorithmId, Requirement[]> = {
  bfs: [],
  dfs: [],
  dijkstra: [noNegativeWeights("Dijkstra")],
  "bellman-ford": [],
  "floyd-warshall": [],
  kahn: [directedOnly("Kahn")],
  prim: [undirectedOnly("Prim")],
  kruskal: [undirectedOnly("Kruskal")],
};

/** Motivo por el que `algorithm` no se puede aplicar a `graph`, o null si se puede. */
export function incompatibility(algorithm: AlgorithmId, graph: GraphDescription): string | null {
  const traits = graphTraits(graph);
  const failed = REQUIREMENTS[algorithm].find((r) => !r.accepts(traits));
  return failed ? failed.reason : null;
}

// ---------------------------------------------------------------------------
// Informe completo: además de los bloqueos, advierte qué va a pasar al correr
// cada algoritmo (p. ej. Kruskal sobre un grafo no conexo arma un bosque).

/** Conexo ignorando la dirección de las aristas. */
function isConnected(graph: GraphDescription): boolean {
  const n = graph.nodeCount;
  if (n === 0) return true;
  const adjacent: number[][] = Array.from({ length: n }, () => []);
  for (const e of graph.edges) {
    adjacent[e.from].push(e.to);
    adjacent[e.to].push(e.from);
  }
  const seen = new Set([0]);
  const stack = [0];
  while (stack.length > 0) {
    for (const v of adjacent[stack.pop()!]) {
      if (!seen.has(v)) {
        seen.add(v);
        stack.push(v);
      }
    }
  }
  return seen.size === n;
}

/** Ciclo dirigido: si Kahn no logra sacar todos los nodos, hay uno. */
function hasDirectedCycle(graph: GraphDescription): boolean {
  const inDegree = new Array<number>(graph.nodeCount).fill(0);
  for (const e of graph.edges) inDegree[e.to]++;
  const queue = inDegree.flatMap((d, v) => (d === 0 ? [v] : []));
  let processed = 0;
  while (queue.length > 0) {
    const u = queue.shift()!;
    processed++;
    for (const e of graph.edges) {
      if (e.from === u && --inDegree[e.to] === 0) queue.push(e.to);
    }
  }
  return processed < graph.nodeCount;
}

/**
 * Ciclo de peso negativo. En un no dirigido basta una arista negativa (ir y
 * volver por ella); en un dirigido se corre Bellman-Ford desde todos los nodos
 * a la vez (distancia inicial 0) y se mira si sigue mejorando en la vuelta V.
 */
function hasNegativeCycle(graph: GraphDescription): boolean {
  if (!graph.directed) return graph.edges.some((e) => e.weight < 0);
  const dist = new Array<number>(graph.nodeCount).fill(0);
  for (let round = 0; round < graph.nodeCount; round++) {
    let improved = false;
    for (const e of graph.edges) {
      if (dist[e.from] + e.weight < dist[e.to]) {
        dist[e.to] = dist[e.from] + e.weight;
        improved = true;
      }
    }
    if (!improved) return false;
  }
  return true;
}

export type Verdict = "ok" | "warning" | "blocked";

export interface AlgorithmCheck {
  algorithm: AlgorithmId;
  verdict: Verdict;
  message: string;
}

export const ALGORITHM_NAMES: Record<AlgorithmId, string> = {
  bfs: "BFS",
  dfs: "DFS",
  dijkstra: "Dijkstra",
  "bellman-ford": "Bellman-Ford",
  "floyd-warshall": "Floyd-Warshall",
  kahn: "Kahn",
  prim: "Prim",
  kruskal: "Kruskal",
};

/** Qué pasa con cada algoritmo sobre `graph`: si se puede correr y con qué advertencias. */
export function checkAlgorithms(graph: GraphDescription): AlgorithmCheck[] {
  const connected = isConnected(graph);
  const negativeWeights = graphTraits(graph).negativeWeights;
  const negativeCycle = hasNegativeCycle(graph);
  const cyclic = graph.directed && hasDirectedCycle(graph);

  const verdictFor = (algorithm: AlgorithmId): [Verdict, string] => {
    const name = ALGORITHM_NAMES[algorithm];
    switch (algorithm) {
      case "bfs":
      case "dfs":
        if (!connected) return ["warning", `${name}: el grafo no es conexo, desde un origen no llega a todos los nodos.`];
        return graph.directed
          ? ["ok", `${name} se puede correr; en un dirigido, lo que alcanza depende del origen.`]
          : ["ok", `${name} se puede correr y llega a todos los nodos.`];
      case "dijkstra":
        return ["ok", "Dijkstra se puede correr: todos los pesos son no negativos."];
      case "bellman-ford":
      case "floyd-warshall":
        if (negativeCycle) {
          return ["warning", `${name}: hay un ciclo negativo; lo va a detectar y esas distancias no están definidas.`];
        }
        return negativeWeights
          ? ["ok", `${name} se puede correr y maneja los pesos negativos.`]
          : ["ok", `${name} se puede correr.`];
      case "kahn":
        return cyclic
          ? ["warning", "Kahn: el grafo tiene ciclos, va a detectar que no existe orden topológico."]
          : ["ok", "Kahn se puede correr: es un DAG y tiene orden topológico."];
      case "prim":
        return connected
          ? ["ok", "Prim se puede correr y encuentra el árbol de cubrimiento mínimo."]
          : ["warning", "Prim: el grafo no es conexo, el árbol cubre solo la componente del origen."];
      case "kruskal":
        return connected
          ? ["ok", "Kruskal se puede correr y encuentra el árbol de cubrimiento mínimo."]
          : ["warning", "Kruskal: el grafo no es conexo, arma un bosque en vez de un árbol."];
    }
  };

  return (Object.keys(ALGORITHM_NAMES) as AlgorithmId[]).map((algorithm) => {
    const blocked = incompatibility(algorithm, graph);
    if (blocked) return { algorithm, verdict: "blocked", message: `${blocked}.` };
    const [verdict, message] = verdictFor(algorithm);
    return { algorithm, verdict, message };
  });
}
