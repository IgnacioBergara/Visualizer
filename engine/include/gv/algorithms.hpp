#pragma once

#include "gv/grafo.hpp"
#include "gv/step.hpp"

namespace gv {

Steps bfs(const Grafo& graph, int source);
Steps dfs(const Grafo& graph, int source);

// Si `target` es -1 calcula todas las distancias; si no, al final emite el
// camino mínimo hasta `target` como pasos PathEdge.
Steps dijkstra(const Grafo& graph, int source, int target = -1);

} // namespace gv
