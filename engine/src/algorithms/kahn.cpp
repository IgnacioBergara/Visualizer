#include "gv/algorithms.hpp"

#include <vector>

#include "gv/tads/cola.hpp"

namespace gv {

// Orden topológico de Kahn: se procesan primero los nodos sin dependencias
// (grado de entrada 0) y al sacar cada uno se descuentan sus aristas. Si al
// final quedan nodos sin procesar, hay un ciclo y no existe orden topológico.
Steps topologicalSortKahn(const Grafo& graph) {
    const int V = graph.cantNodos();
    Steps steps;
    std::vector<int> inDegree(V, 0);

    // Calcula el grado de entrada de todos los vértices.
    for (int u = 0; u < V; ++u) {
        for (const NodoAdy* edge = graph.adyacentes(u); edge; edge = edge->sig) {
            inDegree[edge->destino]++;
        }
    }
    for (int v = 0; v < V; ++v) {
        steps.push_back({StepType::SetValue, v, -1, static_cast<double>(inDegree[v])});
    }

    Cola queue(V > 0 ? V : 1); // cada nodo entra una sola vez, al llegar a grado 0
    for (int i = 0; i < V; ++i) {
        if (inDegree[i] == 0) {
            queue.encolar(i);
            steps.push_back({StepType::Discover, -1, i, 0.0});
        }
    }

    int processed = 0;
    while (!queue.vacia()) {
        int u = queue.desencolar();
        steps.push_back({StepType::Visit, u});
        steps.push_back({StepType::Output, u, -1, static_cast<double>(processed)});
        processed++;

        // Reduce el grado de entrada de los vértices adyacentes.
        for (const NodoAdy* edge = graph.adyacentes(u); edge; edge = edge->sig) {
            int v = edge->destino;
            steps.push_back({StepType::ExploreEdge, u, v, edge->peso});
            steps.push_back({StepType::SetValue, v, -1, static_cast<double>(--inDegree[v])});
            if (inDegree[v] == 0) {
                queue.encolar(v);
                steps.push_back({StepType::Discover, u, v, 0.0});
            }
        }
        steps.push_back({StepType::Finish, u});
    }

    if (processed < V) {
        for (int v = 0; v < V; ++v) {
            if (inDegree[v] > 0) steps.push_back({StepType::Blocked, v, -1, static_cast<double>(inDegree[v])});
        }
    }
    return steps;
}

} // namespace gv
