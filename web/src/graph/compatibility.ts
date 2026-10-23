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
