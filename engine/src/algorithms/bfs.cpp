#include "gv/algorithms.hpp"

#include <vector>

#include "gv/tads/cola.hpp"

namespace gv {

// Cada nodo se marca al encolarse (in_queue), así entra a la cola una sola vez.
// El nivel (`step`) de cada nodo es la cantidad de aristas desde `from`; como
// la Cola guarda solo enteros, el nivel se lleva en un array aparte en vez de
// encolar el par (nodo, nivel).
Steps bfs(const Grafo& graph, int from) {
    Steps steps;
    std::vector<bool> in_queue(graph.cantNodos(), false);
    std::vector<int> nivel(graph.cantNodos(), -1);
    Cola queue(graph.cantNodos());

    queue.encolar(from);
    in_queue[from] = true;
    nivel[from] = 0;
    steps.push_back({StepType::Discover, -1, from, 0.0});

    while (!queue.vacia()) {
        int v = queue.desencolar();
        int step = nivel[v];
        steps.push_back({StepType::Visit, v, -1, static_cast<double>(step)});

        for (const NodoAdy* edge = graph.adyacentes(v); edge; edge = edge->sig) {
            int w = edge->destino;
            steps.push_back({StepType::ExploreEdge, v, w, edge->peso});
            if (!in_queue[w]) {
                in_queue[w] = true;
                nivel[w] = step + 1;
                queue.encolar(w);
                steps.push_back({StepType::Discover, v, w, static_cast<double>(step + 1)});
            }
        }
        steps.push_back({StepType::Finish, v, -1, static_cast<double>(step)});
    }
    return steps;
}

} // namespace gv
