#include <catch2/catch_test_macros.hpp>

#include <stdexcept>

#include "gv/graph.hpp"

TEST_CASE("un grafo no dirigido guarda la arista en ambos sentidos") {
    gv::Graph g(2);
    g.addEdge(0, 1, 3.0);

    REQUIRE(g.neighbors(0).size() == 1);
    REQUIRE(g.neighbors(1).size() == 1);
    CHECK(g.neighbors(1)[0].to == 0);
    CHECK(g.neighbors(1)[0].weight == 3.0);
}

TEST_CASE("un grafo dirigido guarda la arista en un solo sentido") {
    gv::Graph g(2, true);
    g.addEdge(0, 1);

    CHECK(g.neighbors(0).size() == 1);
    CHECK(g.neighbors(1).empty());
}

TEST_CASE("addNode devuelve el índice del nodo nuevo") {
    gv::Graph g(3);
    CHECK(g.addNode() == 3);
    CHECK(g.size() == 4);
}

TEST_CASE("usar un nodo inexistente lanza out_of_range") {
    gv::Graph g(2);
    CHECK_THROWS_AS(g.addEdge(0, 5), std::out_of_range);
    CHECK_THROWS_AS(g.neighbors(-1), std::out_of_range);
}
