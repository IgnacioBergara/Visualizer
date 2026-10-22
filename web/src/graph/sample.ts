import type { GraphDescription } from "../engine/types";

export interface SampleGraph {
  graph: GraphDescription;
  labels: string[];
  positions: { x: number; y: number }[];
}

const edge = (from: number, to: number, weight: number) => ({ from, to, weight });

// Grafo de ejemplo con pesos pensados para que Dijkstra no coincida con BFS.
export const sampleGraph: SampleGraph = {
  graph: {
    nodeCount: 8,
    directed: false,
    edges: [
      edge(0, 1, 4),
      edge(0, 2, 1),
      edge(2, 1, 2),
      edge(1, 3, 5),
      edge(2, 4, 8),
      edge(3, 4, 3),
      edge(3, 5, 6),
      edge(4, 6, 1),
      edge(5, 7, 2),
      edge(6, 7, 7),
      edge(4, 5, 9),
    ],
  },
  labels: ["A", "B", "C", "D", "E", "F", "G", "H"],
  positions: [
    { x: 0, y: 150 },
    { x: 160, y: 40 },
    { x: 160, y: 260 },
    { x: 340, y: 40 },
    { x: 340, y: 260 },
    { x: 520, y: 80 },
    { x: 520, y: 320 },
    { x: 680, y: 190 },
  ],
};
