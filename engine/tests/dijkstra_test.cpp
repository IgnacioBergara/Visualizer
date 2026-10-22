#include <catch2/catch_test_macros.hpp>

#include <utility>

#include "gv/algorithms.hpp"
#include "test_helpers.hpp"

namespace {

// 0-1 (peso 1), 1-2 (peso 1) y el atajo 0-2 (peso 5).
void buildTriangle(gv::Grafo& g) {
    g.agregarAristaNoDirigida(0, 1, 1.0);
    g.agregarAristaNoDirigida(1, 2, 1.0);
    g.agregarAristaNoDirigida(0, 2, 5.0);
}

} // namespace

TEST_CASE("Dijkstra prefiere el camino más barato aunque tenga más aristas") {
    gv::Grafo g(3);
    buildTriangle(g);
    auto path = stepsOfType(gv::dijkstra(g, 0, 2), gv::StepType::PathEdge);

    REQUIRE(path.size() == 2);
    CHECK(std::pair{path[0].node, path[0].target} == std::pair{0, 1});
    CHECK(std::pair{path[1].node, path[1].target} == std::pair{1, 2});
    CHECK(path[1].value == 2.0);
}

TEST_CASE("Dijkstra visita los nodos en orden de distancia") {
    gv::Grafo g(3);
    buildTriangle(g);
    CHECK(visitOrder(gv::dijkstra(g, 0)) == std::vector<int>{0, 1, 2});
}

TEST_CASE("Dijkstra procesa todos los alcanzables, también el último") {
    gv::Grafo g(4);
    g.agregarAristaNoDirigida(0, 1, 1.0);
    g.agregarAristaNoDirigida(1, 2, 1.0);
    g.agregarAristaNoDirigida(2, 3, 1.0);

    CHECK(visitOrder(gv::dijkstra(g, 0, 1)) == std::vector<int>{0, 1, 2, 3});
}

TEST_CASE("Dijkstra desempata quedándose con el índice más alto") {
    // 1 y 2 están a la misma distancia; con `<=` gana el último encontrado.
    gv::Grafo g(3);
    g.agregarAristaNoDirigida(0, 1, 1.0);
    g.agregarAristaNoDirigida(0, 2, 1.0);

    CHECK(visitOrder(gv::dijkstra(g, 0)) == std::vector<int>{0, 2, 1});
}

TEST_CASE("Dijkstra no emite camino si el destino es inalcanzable") {
    gv::Grafo g(3);
    g.agregarAristaNoDirigida(0, 1, 1.0);

    auto steps = gv::dijkstra(g, 0, 2);
    CHECK(stepsOfType(steps, gv::StepType::PathEdge).empty());
    CHECK(visitOrder(steps) == std::vector<int>{0, 1});
}
