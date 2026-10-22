#pragma once

#include <stdexcept>
#include <string>

namespace gv {

struct NodoAdy {
    int destino;
    double peso;
    NodoAdy* sig;
};

// TAD Grafo con listas de adyacencia enlazadas. Los nodos son 0..n-1.
// Recorrido de vecinos:
//   for (const NodoAdy* a = g.adyacentes(u); a; a = a->sig) { ... }
class Grafo {
    int n;
    int m;              // cantidad de aristas dirigidas guardadas
    NodoAdy** cabeza;   // primer vecino de cada nodo
    NodoAdy** ultimo;   // último vecino (para insertar al final en O(1))

    void validar(int u) const {
        if (u < 0 || u >= n) throw std::out_of_range("nodo inexistente: " + std::to_string(u));
    }

public:
    explicit Grafo(int n) : n(n), m(0) {
        if (n < 0) throw std::invalid_argument("cantidad de nodos negativa");
        cabeza = new NodoAdy*[n]();
        ultimo = new NodoAdy*[n]();
    }
    ~Grafo() {
        for (int i = 0; i < n; i++) {
            NodoAdy* p = cabeza[i];
            while (p) {
                NodoAdy* aux = p;
                p = p->sig;
                delete aux;
            }
        }
        delete[] cabeza;
        delete[] ultimo;
    }
    Grafo(const Grafo&) = delete;
    Grafo& operator=(const Grafo&) = delete;

    int cantNodos() const { return n; }
    int cantAristas() const { return m; }

    void agregarArista(int u, int v, double peso = 1.0) { // dirigida u -> v
        validar(u);
        validar(v);
        NodoAdy* nuevo = new NodoAdy{v, peso, nullptr};
        if (ultimo[u]) ultimo[u]->sig = nuevo;
        else           cabeza[u] = nuevo;
        ultimo[u] = nuevo;
        m++;
    }
    void agregarAristaNoDirigida(int u, int v, double peso = 1.0) {
        agregarArista(u, v, peso);
        if (u != v) agregarArista(v, u, peso); // un lazo se guarda una sola vez
    }

    const NodoAdy* adyacentes(int u) const {
        validar(u);
        return cabeza[u];
    }
};

} // namespace gv
