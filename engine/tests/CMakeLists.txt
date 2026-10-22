include(FetchContent)
FetchContent_Declare(
    Catch2
    GIT_REPOSITORY https://github.com/catchorg/Catch2.git
    GIT_TAG v3.7.1
    GIT_SHALLOW TRUE
)
FetchContent_MakeAvailable(Catch2)

add_executable(engine_tests
    grafo_test.cpp
    tads_test.cpp
    bellman_ford_test.cpp
    bfs_test.cpp
    dfs_test.cpp
    dijkstra_test.cpp
    kahn_test.cpp
    kruskal_test.cpp
    prim_test.cpp
)
target_link_libraries(engine_tests PRIVATE gv_core Catch2::Catch2WithMain)

if(EMSCRIPTEN)
    # Con Emscripten los tests son un .js que CTest ejecuta con Node.
    target_link_options(engine_tests PRIVATE -sEXIT_RUNTIME=1 -sALLOW_MEMORY_GROWTH=1)
endif()

add_test(NAME engine_tests COMMAND engine_tests)
