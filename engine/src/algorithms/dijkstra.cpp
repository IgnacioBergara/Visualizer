#include "gv/algorithms.hpp"

#include <limits>
#include <vector>

namespace gv {

// Versión O(V²): en cada vuelta se busca linealmente el nodo no visitado con
// menor distancia, sin cola de prioridad.
Steps dijkstra(const Grafo& graph, int source, int target) {
    constexpr double INF = std::numeric_limits<double>::infinity();
    const int V = graph.cantNodos();

    Steps steps;
    std::vector<double> dist(V, INF);
    std::vector<int> parent(V, -1);
    std::vector<bool> visited(V, false);

    dist[source] = 0;
    steps.push_back({StepType::Relax, -1, source, 0.0});

    // V vueltas (y no V-1) para que el último nodo también quede procesado
    // en la animación; no cambia ninguna distancia.
    for (int count = 0; count < V; count++) {
        // Encuentra el vértice con la distancia mínima de los aún no procesados.
        double minDistance = INF;
        int minIndex = -1;
        for (int v = 0; v < V; v++) {
            if (!visited[v] && dist[v] <= minDistance) {
                minDistance = dist[v];
                minIndex = v;
            }
        }

        if (minIndex == -1 || minDistance == INF) {
            break; // No hay más vértices alcanzables por procesar.
        }

        visited[minIndex] = true;
        steps.push_back({StepType::Visit, minIndex, -1, minDistance});

        // Actualiza la distancia de los adyacentes del vértice elegido.
        for (const NodoAdy* edge = graph.adyacentes(minIndex); edge; edge = edge->sig) {
            int v = edge->destino;
            if (visited[v]) continue;
            steps.push_back({StepType::ExploreEdge, minIndex, v, edge->peso});
            if (dist[v] > dist[minIndex] + edge->peso) {
                dist[v] = dist[minIndex] + edge->peso;
                parent[v] = minIndex;
                steps.push_back({StepType::Relax, minIndex, v, dist[v]});
            }
        }
        steps.push_back({StepType::Finish, minIndex, -1, minDistance});
    }

    // Reconstruye el camino hasta `target` siguiendo parent desde el final.
    if (target >= 0 && parent[target] != -1) {
        std::vector<int> path;
        for (int v = target; v != -1; v = parent[v]) path.push_back(v);
        for (auto i = path.size() - 1; i > 0; --i) {
            steps.push_back({StepType::PathEdge, path[i], path[i - 1], dist[path[i - 1]]});
        }
    }
    return steps;
}

} // namespace gv
