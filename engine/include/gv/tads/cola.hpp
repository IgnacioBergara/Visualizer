#pragma once

#include <stdexcept>

namespace gv {

// TAD Cola de enteros sobre un buffer circular de capacidad fija.
class Cola {
    int* datos;
    int capacidad, frente, tam;

public:
    explicit Cola(int capacidad) : capacidad(capacidad), frente(0), tam(0) {
        if (capacidad <= 0) throw std::invalid_argument("la capacidad debe ser positiva");
        datos = new int[capacidad];
    }
    ~Cola() { delete[] datos; }
    Cola(const Cola&) = delete;
    Cola& operator=(const Cola&) = delete;

    bool vacia() const { return tam == 0; }
    bool llena() const { return tam == capacidad; }
    int cantidad() const { return tam; }

    void encolar(int x) {
        if (llena()) throw std::length_error("cola llena");
        datos[(frente + tam) % capacidad] = x;
        tam++;
    }
    int desencolar() {
        if (vacia()) throw std::out_of_range("cola vacía");
        int x = datos[frente];
        frente = (frente + 1) % capacidad;
        tam--;
        return x;
    }
};

} // namespace gv
