#pragma once

#include "gv/grafo.hpp"
#include "gv/step.hpp"

namespace gv {

// En BFS y DFS el `value` de los pasos Discover/Visit/Finish es el nivel
// (BFS) o la profundidad en el árbol DFS del nodo.
Steps bfs(const Grafo& graph, int from);
Steps dfs(const Grafo& graph, int from);

// Si `target` es -1 calcula todas las distancias; si no, al final emite el
// camino mínimo hasta `target` como pasos PathEdge.
Steps dijkstra(const Grafo& graph, int source, int target = -1);

} // namespace gv
