import type { GraphDescription } from "../engine/types";

export interface SampleGraph {
  name: string;
  graph: GraphDescription;
  labels: string[];
  positions: { x: number; y: number }[];
}

const edge = (from: number, to: number, weight: number) => ({ from, to, weight });

export const samples = {
  // Pesos pensados para que Dijkstra no coincida con BFS.
  weighted: {
    name: "Ponderado (no dirigido)",
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
  },

  // Grafo dirigido sin ciclos (p. ej. materias y sus previas) para el orden topológico.
  dag: {
    name: "Dependencias (dirigido, sin ciclos)",
    graph: {
      nodeCount: 8,
      directed: true,
      edges: [
        edge(0, 2, 1),
        edge(1, 2, 1),
        edge(2, 4, 1),
        edge(3, 4, 1),
        edge(3, 5, 1),
        edge(4, 6, 1),
        edge(5, 6, 1),
        edge(6, 7, 1),
        edge(5, 7, 1),
      ],
    },
    labels: ["A", "B", "C", "D", "E", "F", "G", "H"],
    positions: [
      { x: 0, y: 40 },
      { x: 0, y: 260 },
      { x: 180, y: 40 },
      { x: 180, y: 260 },
      { x: 360, y: 40 },
      { x: 360, y: 260 },
      { x: 540, y: 120 },
      { x: 720, y: 220 },
    ],
  },

  // Dijkstra cierra B con 4 antes de ver C -> B (-3) y se equivoca en D, E y F.
  negative: {
    name: "Pesos negativos (dirigido)",
    graph: {
      nodeCount: 6,
      directed: true,
      edges: [
        edge(0, 1, 4),
        edge(0, 2, 5),
        edge(2, 1, -3),
        edge(1, 3, 3),
        edge(2, 4, 4),
        edge(3, 4, 2),
        edge(4, 5, 1),
        edge(3, 5, 6),
      ],
    },
    labels: ["A", "B", "C", "D", "E", "F"],
    positions: [
      { x: 0, y: 150 },
      { x: 180, y: 40 },
      { x: 180, y: 260 },
      { x: 360, y: 40 },
      { x: 360, y: 260 },
      { x: 540, y: 150 },
    ],
  },

  // B -> C -> D -> B suma 2 - 4 + 1 = -1: las distancias no están definidas.
  negativeCycle: {
    name: "Ciclo negativo (dirigido)",
    graph: {
      nodeCount: 5,
      directed: true,
      edges: [
        edge(0, 1, 1),
        edge(1, 2, 2),
        edge(2, 3, -4),
        edge(3, 1, 1),
        edge(3, 4, 2),
      ],
    },
    labels: ["A", "B", "C", "D", "E"],
    positions: [
      { x: 0, y: 150 },
      { x: 180, y: 150 },
      { x: 360, y: 40 },
      { x: 360, y: 260 },
      { x: 540, y: 150 },
    ],
  },
} satisfies Record<string, SampleGraph>;

export type SampleId = keyof typeof samples;
