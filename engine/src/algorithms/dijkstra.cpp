#include "gv/algorithms.hpp"

#include <limits>
#include <vector>

#include "gv/tads/min_heap.hpp"

namespace gv {

Steps dijkstra(const Grafo& graph, int source, int target) {
    constexpr double inf = std::numeric_limits<double>::infinity();
    const int n = graph.cantNodos();

    Steps steps;
    std::vector<double> dist(n, inf);
    std::vector<int> prev(n, -1);
    std::vector<bool> done(n, false);
    // Sin decrease-key: cada relajación inserta una entrada nueva, así que
    // como mucho hay una por arista más la del origen.
    MinHeap frontier(graph.cantAristas() + 1);

    dist[source] = 0.0;
    frontier.insertar(source, 0.0);
    steps.push_back({StepType::Relax, -1, source, 0.0});

    while (!frontier.vacio()) {
        int u;
        double d;
        frontier.extraerMin(u, d);
        if (done[u]) continue; // entrada obsoleta del heap
        done[u] = true;
        steps.push_back({StepType::Visit, u, -1, d});
        if (u == target) break;

        for (const NodoAdy* a = graph.adyacentes(u); a; a = a->sig) {
            int v = a->destino;
            if (done[v]) continue;
            steps.push_back({StepType::ExploreEdge, u, v, a->peso});
            double candidate = d + a->peso;
            if (candidate < dist[v]) {
                dist[v] = candidate;
                prev[v] = u;
                frontier.insertar(v, candidate);
                steps.push_back({StepType::Relax, u, v, candidate});
            }
        }
        steps.push_back({StepType::Finish, u, -1, d});
    }

    if (target >= 0 && prev[target] != -1) {
        std::vector<int> path;
        for (int v = target; v != -1; v = prev[v]) path.push_back(v);
        for (auto i = path.size() - 1; i > 0; --i) {
            steps.push_back({StepType::PathEdge, path[i], path[i - 1], dist[path[i - 1]]});
        }
    }
    return steps;
}

} // namespace gv
