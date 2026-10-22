// Tipos del módulo que genera Emscripten (engine.js + engine.wasm).
// Deben coincidir con EMSCRIPTEN_BINDINGS en engine/bindings/bindings.cpp.
import type { GraphDescription, Step } from "../engine/types";

export interface EngineModule {
  bfs(graph: GraphDescription, source: number): Step[];
  dfs(graph: GraphDescription, source: number): Step[];
  dijkstra(graph: GraphDescription, source: number, target: number): Step[];
  bellmanFord(graph: GraphDescription, source: number, target: number): Step[];
  kahn(graph: GraphDescription): Step[];
  prim(graph: GraphDescription, source: number): Step[];
}

declare function createEngine(): Promise<EngineModule>;
export default createEngine;
