import createEngine, { type EngineModule } from "../wasm/engine.js";
import type { AlgorithmId, GraphDescription, Step } from "./types";

export type { EngineModule };

export function loadEngine(): Promise<EngineModule> {
  return createEngine();
}

export function runAlgorithm(
  engine: EngineModule,
  algorithm: AlgorithmId,
  graph: GraphDescription,
  source: number,
  target: number,
): Step[] {
  switch (algorithm) {
    case "bfs":
      return engine.bfs(graph, source);
    case "dfs":
      return engine.dfs(graph, source);
    case "dijkstra":
      return engine.dijkstra(graph, source, target);
    case "bellman-ford":
      return engine.bellmanFord(graph, source, target);
    case "floyd-warshall":
      return engine.floydWarshall(graph, source, target);
    case "kahn":
      return engine.kahn(graph);
    case "prim":
      return engine.prim(graph, source);
    case "kruskal":
      return engine.kruskal(graph);
  }
}
