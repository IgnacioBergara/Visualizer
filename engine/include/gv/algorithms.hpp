#pragma once

#include "gv/grafo.hpp"
#include "gv/step.hpp"

namespace gv {

// En BFS y DFS el `value` de los pasos Discover/Visit/Finish es el nivel
// (BFS) o la profundidad en el árbol DFS del nodo.
Steps bfs(const Grafo& graph, int from);
Steps dfs(const Grafo& graph, int from);

// Calcula todas las distancias desde `source`. Si `target` no es -1, al final
// emite el camino mínimo hasta `target` como pasos PathEdge.
Steps dijkstra(const Grafo& graph, int source, int target = -1);

// Árbol de cubrimiento mínimo (grafo no dirigido). Cada arista que entra al
// árbol se emite como PathEdge con su peso.
Steps prim(const Grafo& graph, int source);

} // namespace gv
