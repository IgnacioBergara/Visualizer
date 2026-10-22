#include <catch2/catch_test_macros.hpp>

#include "gv/algorithms.hpp"
#include "test_helpers.hpp"

using Order = std::vector<int>;

TEST_CASE("BFS visita por niveles") {
    // 0 -> {1, 2}, 1 -> 3, 2 -> 4
    gv::Grafo g(5);
    g.agregarAristaNoDirigida(0, 1);
    g.agregarAristaNoDirigida(0, 2);
    g.agregarAristaNoDirigida(1, 3);
    g.agregarAristaNoDirigida(2, 4);

    CHECK(visitOrder(gv::bfs(g, 0)) == Order{0, 1, 2, 3, 4});
}

TEST_CASE("BFS informa el nivel de cada nodo") {
    // 0 - 1 - 2 y el atajo 0 - 2: el nivel de 2 es 1, no 2.
    gv::Grafo g(4);
    g.agregarAristaNoDirigida(0, 1);
    g.agregarAristaNoDirigida(1, 2);
    g.agregarAristaNoDirigida(0, 2);
    g.agregarAristaNoDirigida(2, 3);

    std::vector<double> nivel(4, -1);
    for (const auto& s : stepsOfType(gv::bfs(g, 0), gv::StepType::Visit)) nivel[s.node] = s.value;
    CHECK(nivel == std::vector<double>{0, 1, 1, 2});
}

TEST_CASE("BFS no sale de la componente del origen") {
    gv::Grafo g(4);
    g.agregarAristaNoDirigida(0, 1);
    g.agregarAristaNoDirigida(2, 3);

    CHECK(visitOrder(gv::bfs(g, 2)) == Order{2, 3});
}

TEST_CASE("BFS descubre cada nodo una sola vez aunque haya ciclos") {
    gv::Grafo g(3);
    g.agregarAristaNoDirigida(0, 1);
    g.agregarAristaNoDirigida(1, 2);
    g.agregarAristaNoDirigida(2, 0);

    CHECK(stepsOfType(gv::bfs(g, 0), gv::StepType::Discover).size() == 3);
}
