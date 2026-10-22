// Tipos compartidos con el motor C++ (ver engine/include/gv/step.hpp).

export type StepType =
  | "visit"
  | "explore-edge"
  | "discover"
  | "relax"
  | "finish"
  | "path-edge";

export interface Step {
  type: StepType;
  /** Nodo principal del paso; en pasos de arista, el origen. -1 si no aplica. */
  node: number;
  /** Nodo destino en pasos de arista. -1 si no aplica. */
  target: number;
  /** Peso o distancia, según el tipo de paso. */
  value: number;
}

export interface GraphEdge {
  from: number;
  to: number;
  weight: number;
}

export interface GraphDescription {
  nodeCount: number;
  directed: boolean;
  edges: GraphEdge[];
}

export type AlgorithmId = "bfs" | "dfs" | "dijkstra";
