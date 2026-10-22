#include "gv/algorithms.hpp"

#include <vector>

namespace gv {

namespace {

void visit(const Grafo& graph, int u, std::vector<bool>& seen, Steps& steps) {
    seen[u] = true;
    steps.push_back({StepType::Visit, u});

    for (const NodoAdy* a = graph.adyacentes(u); a; a = a->sig) {
        steps.push_back({StepType::ExploreEdge, u, a->destino, a->peso});
        if (!seen[a->destino]) {
            steps.push_back({StepType::Discover, u, a->destino});
            visit(graph, a->destino, seen, steps);
        }
    }
    steps.push_back({StepType::Finish, u});
}

} // namespace

Steps dfs(const Grafo& graph, int source) {
    Steps steps;
    std::vector<bool> seen(graph.cantNodos(), false);
    steps.push_back({StepType::Discover, -1, source});
    visit(graph, source, seen, steps);
    return steps;
}

} // namespace gv
