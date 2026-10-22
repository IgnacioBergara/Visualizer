#include "gv/algorithms.hpp"

#include <vector>

namespace gv {

namespace {

// `step` es la profundidad de `from` en el árbol DFS.
void DFS_rec(const Grafo& graph, int from, int step, std::vector<bool>& visited, Steps& steps) {
    visited[from] = true;
    steps.push_back({StepType::Visit, from, -1, static_cast<double>(step)});

    for (const NodoAdy* edge = graph.adyacentes(from); edge; edge = edge->sig) {
        int w = edge->destino;
        steps.push_back({StepType::ExploreEdge, from, w, edge->peso});
        if (!visited[w]) {
            steps.push_back({StepType::Discover, from, w, static_cast<double>(step + 1)});
            DFS_rec(graph, w, step + 1, visited, steps);
        }
    }
    steps.push_back({StepType::Finish, from, -1, static_cast<double>(step)});
}

} // namespace

Steps dfs(const Grafo& graph, int from) {
    Steps steps;
    std::vector<bool> visited(graph.cantNodos(), false);
    steps.push_back({StepType::Discover, -1, from, 0.0});
    DFS_rec(graph, from, 0, visited, steps);
    return steps;
}

} // namespace gv
