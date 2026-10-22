#include "gv/algorithms.hpp"

#include <vector>

#include "gv/tads/cola.hpp"

namespace gv {

Steps bfs(const Grafo& graph, int source) {
    Steps steps;
    std::vector<bool> seen(graph.cantNodos(), false);
    Cola frontier(graph.cantNodos()); // cada nodo entra una sola vez

    seen[source] = true;
    frontier.encolar(source);
    steps.push_back({StepType::Discover, -1, source});

    while (!frontier.vacia()) {
        int u = frontier.desencolar();
        steps.push_back({StepType::Visit, u});

        for (const NodoAdy* a = graph.adyacentes(u); a; a = a->sig) {
            steps.push_back({StepType::ExploreEdge, u, a->destino, a->peso});
            if (!seen[a->destino]) {
                seen[a->destino] = true;
                frontier.encolar(a->destino);
                steps.push_back({StepType::Discover, u, a->destino});
            }
        }
        steps.push_back({StepType::Finish, u});
    }
    return steps;
}

} // namespace gv
