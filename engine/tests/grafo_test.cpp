#include <catch2/catch_test_macros.hpp>

#include <stdexcept>
#include <utility>
#include <vector>

#include "gv/grafo.hpp"

namespace {

// (destino, peso) de cada vecino de `u`, en orden.
std::vector<std::pair<int, double>> vecinos(const gv::Grafo& g, int u) {
    std::vector<std::pair<int, double>> out;
    for (const gv::NodoAdy* a = g.adyacentes(u); a; a = a->sig) out.emplace_back(a->destino, a->peso);
    return out;
}

using Vecinos = std::vector<std::pair<int, double>>;

} // namespace

TEST_CASE("agregarArista es dirigida y guarda el peso") {
    gv::Grafo g(2);
    g.agregarArista(0, 1, 3.5);

    CHECK(vecinos(g, 0) == Vecinos{{1, 3.5}});
    CHECK(vecinos(g, 1).empty());
    CHECK(g.cantAristas() == 1);
}

TEST_CASE("agregarAristaNoDirigida guarda la arista en ambos sentidos") {
    gv::Grafo g(2);
    g.agregarAristaNoDirigida(0, 1, 2.0);

    CHECK(vecinos(g, 0) == Vecinos{{1, 2.0}});
    CHECK(vecinos(g, 1) == Vecinos{{0, 2.0}});
    CHECK(g.cantAristas() == 2);
}

TEST_CASE("los vecinos quedan en orden de inserción") {
    gv::Grafo g(4);
    g.agregarArista(0, 3);
    g.agregarArista(0, 1);
    g.agregarArista(0, 2);

    CHECK(vecinos(g, 0) == Vecinos{{3, 1.0}, {1, 1.0}, {2, 1.0}});
}

TEST_CASE("un lazo no dirigido se guarda una sola vez") {
    gv::Grafo g(1);
    g.agregarAristaNoDirigida(0, 0);
    CHECK(vecinos(g, 0).size() == 1);
}

TEST_CASE("usar un nodo inexistente lanza out_of_range") {
    gv::Grafo g(2);
    CHECK_THROWS_AS(g.agregarArista(0, 5), std::out_of_range);
    CHECK_THROWS_AS(g.adyacentes(-1), std::out_of_range);
}
