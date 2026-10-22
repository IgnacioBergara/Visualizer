#include "gv/algorithms.hpp"

#include <limits>
#include <vector>

namespace gv {

// Caminos mínimos entre todos los pares. dist[i][j] es la mejor distancia de
// i a j usando como intermedios solo los pivotes ya procesados, y
// parent[i][j] el nodo anterior a j en ese camino.
Steps floydWarshall(const Grafo& g, int source, int target) {
    constexpr double INF = std::numeric_limits<double>::infinity();
    const int V = g.cantNodos();

    Steps steps;
    std::vector<std::vector<double>> dist(V, std::vector<double>(V, INF));
    std::vector<std::vector<int>> parent(V, std::vector<int>(V, -1));

    for (int i = 0; i < V; i++) {
        dist[i][i] = 0;
        steps.push_back({StepType::MatrixUpdate, i, i, 0.0});
    }

    for (int i = 0; i < V; i++) {
        for (const NodoAdy* edge = g.adyacentes(i); edge; edge = edge->sig) {
            // Con aristas paralelas (o un lazo) se queda la más barata.
            if (edge->peso < dist[i][edge->destino]) {
                dist[i][edge->destino] = edge->peso;
                parent[i][edge->destino] = i;
                steps.push_back({StepType::MatrixUpdate, i, edge->destino, edge->peso});
            }
        }
    }

    // Algoritmo de Floyd-Warshall
    for (int k = 0; k < V; k++) {
        steps.push_back({StepType::Visit, k});
        for (int i = 0; i < V; i++) {
            for (int j = 0; j < V; j++) {
                if (dist[i][k] < INF && dist[k][j] < INF && dist[i][k] + dist[k][j] < dist[i][j]) {
                    dist[i][j] = dist[i][k] + dist[k][j];
                    parent[i][j] = parent[k][j];
                    steps.push_back({StepType::MatrixUpdate, i, j, dist[i][j], k});
                }
            }
        }
        steps.push_back({StepType::Finish, k});
    }

    // Un nodo que puede volver a sí mismo con costo negativo está en un ciclo negativo.
    bool negativeCycle = false;
    for (int i = 0; i < V; i++) {
        if (dist[i][i] < 0) {
            negativeCycle = true;
            steps.push_back({StepType::NegativeCycle, i, i, dist[i][i]});
        }
    }

    // Reconstruye el camino source -> target siguiendo parent[source][·] hacia atrás.
    if (!negativeCycle && source >= 0 && target >= 0 && source != target && parent[source][target] != -1) {
        std::vector<int> path;
        for (int v = target; v != source; v = parent[source][v]) path.push_back(v);
        path.push_back(source);
        for (auto i = path.size() - 1; i > 0; --i) {
            steps.push_back({StepType::PathEdge, path[i], path[i - 1], dist[source][path[i - 1]]});
        }
    }
    return steps;
}

} // namespace gv
