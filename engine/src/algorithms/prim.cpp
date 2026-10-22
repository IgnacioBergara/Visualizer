#include "gv/algorithms.hpp"

#include <limits>
#include <vector>

namespace gv {

// Versión O(V²), igual que Dijkstra pero `dist[v]` es el peso de la arista
// más barata que conecta `v` con el árbol (no la distancia desde el origen).
Steps prim(const Grafo& graph, int source) {
    constexpr double INF = std::numeric_limits<double>::infinity();
    const int V = graph.cantNodos();

    Steps steps;
    std::vector<double> dist(V, INF);
    std::vector<int> parent(V, -1);
    std::vector<bool> visited(V, false);

    dist[source] = 0;
    steps.push_back({StepType::Relax, -1, source, 0.0});

    for (int count = 0; count < V; count++) {
        // Encuentra el vértice más barato de conectar entre los aún no procesados.
        double minDistance = INF;
        int minIndex = -1;
        for (int v = 0; v < V; v++) {
            if (!visited[v] && dist[v] <= minDistance) {
                minDistance = dist[v];
                minIndex = v;
            }
        }

        if (minIndex == -1 || minDistance == INF) {
            break; // El resto no es alcanzable: el árbol cubre solo esta componente.
        }

        visited[minIndex] = true;
        steps.push_back({StepType::Visit, minIndex, -1, minDistance});
        if (parent[minIndex] != -1) {
            steps.push_back({StepType::PathEdge, parent[minIndex], minIndex, minDistance});
        }

        // Actualiza el costo de conexión de los adyacentes del vértice elegido.
        for (const NodoAdy* edge = graph.adyacentes(minIndex); edge; edge = edge->sig) {
            int v = edge->destino;
            if (visited[v]) continue;
            steps.push_back({StepType::ExploreEdge, minIndex, v, edge->peso});
            if (dist[v] > edge->peso) {
                dist[v] = edge->peso;
                parent[v] = minIndex;
                steps.push_back({StepType::Relax, minIndex, v, dist[v]});
            }
        }
        steps.push_back({StepType::Finish, minIndex, -1, minDistance});
    }
    return steps;
}

} // namespace gv
