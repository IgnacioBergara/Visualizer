#pragma once

#include <stdexcept>

namespace gv {

// TAD Pila de enteros sobre una lista enlazada.
class Pila {
    struct Nodo {
        int dato;
        Nodo* sig;
    };
    Nodo* cima;

public:
    Pila() : cima(nullptr) {}
    ~Pila() { while (!vacia()) desapilar(); }
    Pila(const Pila&) = delete;
    Pila& operator=(const Pila&) = delete;

    bool vacia() const { return cima == nullptr; }

    void apilar(int x) {
        cima = new Nodo{x, cima};
    }
    int tope() const {
        if (vacia()) throw std::out_of_range("pila vacía");
        return cima->dato;
    }
    void desapilar() {
        if (vacia()) throw std::out_of_range("pila vacía");
        Nodo* aux = cima;
        cima = cima->sig;
        delete aux;
    }
};

} // namespace gv
