#include <catch2/catch_test_macros.hpp>

#include <stdexcept>
#include <vector>

#include "gv/tads/cola.hpp"
#include "gv/tads/mfset.hpp"
#include "gv/tads/min_heap.hpp"
#include "gv/tads/pila.hpp"

TEST_CASE("Cola es FIFO y reutiliza el buffer circular") {
    gv::Cola c(2);
    c.encolar(1);
    c.encolar(2);
    CHECK(c.desencolar() == 1);
    c.encolar(3); // da la vuelta al buffer
    CHECK(c.desencolar() == 2);
    CHECK(c.desencolar() == 3);
    CHECK(c.vacia());
}

TEST_CASE("Cola avisa si se llena o está vacía") {
    gv::Cola c(1);
    CHECK_THROWS_AS(c.desencolar(), std::out_of_range);
    c.encolar(7);
    CHECK_THROWS_AS(c.encolar(8), std::length_error);
}

TEST_CASE("Pila es LIFO") {
    gv::Pila p;
    p.apilar(1);
    p.apilar(2);
    CHECK(p.tope() == 2);
    p.desapilar();
    CHECK(p.tope() == 1);
    p.desapilar();
    CHECK(p.vacia());
    CHECK_THROWS_AS(p.tope(), std::out_of_range);
}

TEST_CASE("MinHeap extrae en orden de prioridad") {
    gv::MinHeap h(6);
    const double prios[] = {5.0, 1.5, 3.0, 0.5, 4.0, 2.0};
    for (int i = 0; i < 6; ++i) h.insertar(i, prios[i]);

    std::vector<int> orden;
    while (!h.vacio()) {
        int nodo;
        double p;
        h.extraerMin(nodo, p);
        orden.push_back(nodo);
    }
    CHECK(orden == std::vector<int>{3, 1, 5, 2, 4, 0});
}

TEST_CASE("MinHeap avisa si se llena o está vacío") {
    gv::MinHeap h(1);
    int nodo;
    double p;
    CHECK_THROWS_AS(h.extraerMin(nodo, p), std::out_of_range);
    h.insertar(0, 1.0);
    CHECK_THROWS_AS(h.insertar(1, 2.0), std::length_error);
}

TEST_CASE("MFSet une conjuntos de forma transitiva") {
    gv::DisjointSet ds(5);
    CHECK(ds.merge(0, 1));
    CHECK(ds.merge(1, 2));
    CHECK(ds.find(0) == ds.find(2));
    CHECK(ds.find(0) != ds.find(3));
    CHECK_FALSE(ds.merge(2, 0)); // ya estaban juntos
}

TEST_CASE("MFSet cuelga el árbol más bajo del más alto") {
    gv::DisjointSet ds(3);
    ds.merge(0, 1); // raíz 0, altura 1
    ds.merge(2, 0); // 2 tiene altura 0, así que cuelga de 0
    CHECK(ds.find(2) == 0);
    CHECK_THROWS_AS(ds.find(3), std::out_of_range);
}
