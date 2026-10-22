#include "gv/algorithms.hpp"

#include <vector>

#include "gv/tads/mfset.hpp"
#include "gv/tads/min_heap.hpp"

namespace gv {

namespace {

struct Arista {
    int from;
    int to;
    double weight;
};

} // namespace

// Se toman las aristas de menor a mayor peso (MinHeap) y se agrega cada una
// si une dos componentes distintas (MFSet); si no, formaría un ciclo.
Steps kruskal(const Grafo& graph) {
    const int V = graph.cantNodos();
    Steps steps;
    if (V == 0) return steps;

    // En un grafo no dirigido cada arista está en las dos listas de
    // adyacencia; con u < v se toma una sola vez (los lazos no sirven).
    std::vector<Arista> aristas;
    for (int u = 0; u < V; u++) {
        for (const NodoAdy* edge = graph.adyacentes(u); edge; edge = edge->sig) {
            if (u < edge->destino) aristas.push_back({u, edge->destino, edge->peso});
        }
    }

    // El heap guarda enteros: el índice de cada arista, con su peso como prioridad.
    MinHeap edgeHeap(aristas.empty() ? 1 : static_cast<int>(aristas.size()));
    for (int i = 0; i < static_cast<int>(aristas.size()); i++) {
        edgeHeap.insertar(i, aristas[i].weight);
    }

    DisjointSet ds(V);
    std::vector<int> representante(V);
    for (int v = 0; v < V; v++) {
        representante[v] = v;
        steps.push_back({StepType::SetValue, v, -1, static_cast<double>(v)});
    }

    int edgeCount = 0; // aristas agregadas al árbol
    while (!edgeHeap.vacio() && edgeCount < V - 1) {
        int index;
        double weight;
        edgeHeap.extraerMin(index, weight);
        const Arista& minEdge = aristas[index];
        steps.push_back({StepType::ExploreEdge, minEdge.from, minEdge.to, weight});

        if (ds.find(minEdge.from) != ds.find(minEdge.to)) {
            // Están en conjuntos distintos: la arista entra al árbol.
            ds.merge(minEdge.from, minEdge.to);
            edgeCount++;
            steps.push_back({StepType::PathEdge, minEdge.from, minEdge.to, weight});

            // Informa los nodos que cambiaron de conjunto con la unión.
            for (int v = 0; v < V; v++) {
                int rep = ds.find(v);
                if (rep != representante[v]) {
                    representante[v] = rep;
                    steps.push_back({StepType::SetValue, v, -1, static_cast<double>(rep)});
                }
            }
        } else {
            steps.push_back({StepType::RejectEdge, minEdge.from, minEdge.to, weight});
        }
    }
    return steps;
}

} // namespace gv
