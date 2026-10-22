#pragma once

#include <stdexcept>

namespace gv {

// TAD Cola de prioridad (min-heap binario).
// Guarda pares (nodo, prioridad) y extrae siempre el de menor prioridad.
// `nodo` es un entero cualquiera: un vértice en Dijkstra/Prim o el índice de
// una arista en Kruskal.
class MinHeap {
    int* nodos;
    double* prio;
    int capacidad;
    int tam;

    void intercambiar(int i, int j) {
        int tn = nodos[i];    nodos[i] = nodos[j];  nodos[j] = tn;
        double tp = prio[i];  prio[i] = prio[j];    prio[j] = tp;
    }

    void flotar(int i) {
        while (i > 0) {
            int padre = (i - 1) / 2;
            if (prio[padre] <= prio[i]) break;
            intercambiar(i, padre);
            i = padre;
        }
    }

    void hundir(int i) {
        while (true) {
            int menor = i, izq = 2 * i + 1, der = 2 * i + 2;
            if (izq < tam && prio[izq] < prio[menor]) menor = izq;
            if (der < tam && prio[der] < prio[menor]) menor = der;
            if (menor == i) break;
            intercambiar(i, menor);
            i = menor;
        }
    }

public:
    explicit MinHeap(int capacidad) : capacidad(capacidad), tam(0) {
        if (capacidad <= 0) throw std::invalid_argument("la capacidad debe ser positiva");
        nodos = new int[capacidad];
        prio = new double[capacidad];
    }
    ~MinHeap() { delete[] nodos; delete[] prio; }
    MinHeap(const MinHeap&) = delete;
    MinHeap& operator=(const MinHeap&) = delete;

    bool vacio() const { return tam == 0; }
    int cantidad() const { return tam; }

    void insertar(int nodo, double p) {
        if (tam == capacidad) throw std::length_error("heap lleno");
        nodos[tam] = nodo;
        prio[tam] = p;
        flotar(tam);
        tam++;
    }

    // Extrae el elemento de menor prioridad.
    void extraerMin(int& nodo, double& p) {
        if (vacio()) throw std::out_of_range("heap vacío");
        nodo = nodos[0];
        p = prio[0];
        tam--;
        if (tam > 0) {
            nodos[0] = nodos[tam];
            prio[0] = prio[tam];
            hundir(0);
        }
    }
};

} // namespace gv
