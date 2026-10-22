#include "gv/algorithms.hpp"

#include <algorithm>
#include <limits>
#include <utility>
#include <vector>

#include "gv/tads/cola.hpp"

namespace gv {

namespace {

// Busca un ciclo en el grafo de padres (cada nodo apunta a su parent). Si lo
// hay, devuelve sus aristas en orden parent -> hijo; si no, queda vacío.
std::vector<std::pair<int, int>> findParentCycle(const std::vector<int>& parents) {
    const int n = static_cast<int>(parents.size());
    std::vector<int> walk(n, -1); // en qué recorrido se marcó cada nodo

    for (int start = 0; start < n; ++start) {
        int x = start;
        while (x != -1 && walk[x] == -1) {
            walk[x] = start;
            x = parents[x];
        }
        if (x == -1 || walk[x] != start) continue; // llegó a la raíz o a un recorrido viejo

        // x está en el ciclo: lo recorremos hacia atrás y lo damos vuelta.
        std::vector<std::pair<int, int>> cycle;
        int y = x;
        do {
            cycle.emplace_back(parents[y], y);
            y = parents[y];
        } while (y != x);
        std::reverse(cycle.begin(), cycle.end());
        return cycle;
    }
    return {};
}

} // namespace

// Variante con cola (SPFA): solo se vuelve a mirar un nodo cuando su
// distancia mejoró. Si algún nodo entra a la cola `n` veces hay un ciclo
// negativo alcanzable; se lo busca en el grafo de padres, se emite y se corta
// (sin el corte el algoritmo no terminaría nunca).
Steps bellmanFord(const Grafo& g, int start, int target) {
    constexpr double INF = std::numeric_limits<double>::infinity();
    const int n = g.cantNodos();

    Steps steps;
    std::vector<double> distances(n, INF);
    std::vector<int> parents(n, -1);
    std::vector<bool> in_queue(n, false);
    std::vector<int> times_queued(n, 0);
    Cola queue(n); // in_queue garantiza que cada nodo está a lo sumo una vez

    distances[start] = 0;
    steps.push_back({StepType::Relax, -1, start, 0.0});
    queue.encolar(start);
    in_queue[start] = true;
    times_queued[start] = 1;

    while (!queue.vacia()) {
        int u = queue.desencolar();
        in_queue[u] = false;
        steps.push_back({StepType::Visit, u, -1, distances[u]});

        for (const NodoAdy* edge = g.adyacentes(u); edge; edge = edge->sig) {
            int v = edge->destino;
            steps.push_back({StepType::ExploreEdge, u, v, edge->peso});
            if (distances[u] + edge->peso < distances[v]) {
                distances[v] = distances[u] + edge->peso;
                parents[v] = u;
                steps.push_back({StepType::Relax, u, v, distances[v]});

                if (!in_queue[v]) {
                    queue.encolar(v);
                    in_queue[v] = true;
                    if (++times_queued[v] >= n) {
                        auto cycle = findParentCycle(parents);
                        if (!cycle.empty()) {
                            for (auto [from, to] : cycle) {
                                steps.push_back({StepType::NegativeCycle, from, to});
                            }
                            return steps;
                        }
                    }
                }
            }
        }
        steps.push_back({StepType::Finish, u, -1, distances[u]});
    }

    // Sin ciclo negativo: reconstruye el camino hasta `target` siguiendo parents.
    if (target >= 0 && parents[target] != -1) {
        std::vector<int> path;
        for (int v = target; v != -1; v = parents[v]) path.push_back(v);
        for (auto i = path.size() - 1; i > 0; --i) {
            steps.push_back({StepType::PathEdge, path[i], path[i - 1], distances[path[i - 1]]});
        }
    }
    return steps;
}

} // namespace gv
