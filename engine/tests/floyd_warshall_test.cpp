#include <catch2/catch_test_macros.hpp>

#include <limits>
#include <utility>
#include <vector>

#include "gv/algorithms.hpp"
#include "test_helpers.hpp"

using Matrix = std::vector<std::vector<double>>;
using EdgeList = std::vector<std::pair<int, int>>;

namespace {

constexpr double INF = std::numeric_limits<double>::infinity();

// Reconstruye la matriz final aplicando los MatrixUpdate en orden.
Matrix finalMatrix(const gv::Steps& steps, int n) {
    Matrix m(n, std::vector<double>(n, INF));
    for (const auto& s : stepsOfType(steps, gv::StepType::MatrixUpdate)) m[s.node][s.target] = s.value;
    return m;
}

EdgeList pathEdges(const gv::Steps& steps) {
    EdgeList edges;
    for (const auto& s : stepsOfType(steps, gv::StepType::PathEdge)) edges.emplace_back(s.node, s.target);
    return edges;
}

} // namespace

TEST_CASE("Floyd-Warshall calcula las distancias entre todos los pares") {
    // Dirigido: 0->1 (3), 1->2 (1), 0->2 (5), 2->0 (2).
    gv::Grafo g(3);
    g.agregarArista(0, 1, 3);
    g.agregarArista(1, 2, 1);
    g.agregarArista(0, 2, 5);
    g.agregarArista(2, 0, 2);

    CHECK(finalMatrix(gv::floydWarshall(g), 3) == Matrix{
        {0, 3, 4},
        {3, 0, 1},
        {2, 5, 0},
    });
}

TEST_CASE("Floyd-Warshall deja infinito lo inalcanzable") {
    gv::Grafo g(2);
    g.agregarArista(0, 1, 7);

    auto m = finalMatrix(gv::floydWarshall(g), 2);
    CHECK(m[0][1] == 7);
    CHECK(m[1][0] == INF);
}

TEST_CASE("Floyd-Warshall informa el pivote de cada mejora") {
    gv::Grafo g(3);
    g.agregarArista(0, 1, 1);
    g.agregarArista(1, 2, 1);

    auto updates = stepsOfType(gv::floydWarshall(g), gv::StepType::MatrixUpdate);
    REQUIRE_FALSE(updates.empty());
    const auto& last = updates.back();
    CHECK(std::pair{last.node, last.target} == std::pair{0, 2});
    CHECK(last.value == 2);
    CHECK(last.aux == 1);
}

TEST_CASE("Floyd-Warshall reconstruye el camino entre origen y destino") {
    gv::Grafo g(4);
    g.agregarAristaNoDirigida(0, 1, 1);
    g.agregarAristaNoDirigida(1, 2, 1);
    g.agregarAristaNoDirigida(0, 2, 5);
    g.agregarAristaNoDirigida(2, 3, 2);

    auto steps = gv::floydWarshall(g, 0, 3);
    CHECK(pathEdges(steps) == EdgeList{{0, 1}, {1, 2}, {2, 3}});
    CHECK(stepsOfType(steps, gv::StepType::PathEdge).back().value == 4);
    CHECK(pathEdges(steps) == pathEdges(gv::dijkstra(g, 0, 3)));
}

TEST_CASE("Floyd-Warshall se queda con la arista paralela más barata") {
    gv::Grafo g(2);
    g.agregarArista(0, 1, 9);
    g.agregarArista(0, 1, 4);
    g.agregarArista(0, 1, 6);
    g.agregarArista(0, 0, 3); // un lazo positivo no pisa dist[0][0] = 0

    auto m = finalMatrix(gv::floydWarshall(g), 2);
    CHECK(m[0][1] == 4);
    CHECK(m[0][0] == 0);
}

TEST_CASE("Floyd-Warshall detecta los nodos en un ciclo negativo") {
    // 0->1 (1), ciclo 1->2 (2), 2->1 (-4).
    gv::Grafo g(3);
    g.agregarArista(0, 1, 1);
    g.agregarArista(1, 2, 2);
    g.agregarArista(2, 1, -4);

    auto steps = gv::floydWarshall(g, 0, 2);
    std::vector<int> enCiclo;
    for (const auto& s : stepsOfType(steps, gv::StepType::NegativeCycle)) enCiclo.push_back(s.node);
    CHECK(enCiclo == std::vector<int>{1, 2});
    CHECK(pathEdges(steps).empty());
}
