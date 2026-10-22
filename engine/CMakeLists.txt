cmake_minimum_required(VERSION 3.20)
project(graph_engine LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

option(GV_BUILD_TESTS "Compilar los tests del motor" ON)

if(EMSCRIPTEN)
    # Emscripten desactiva las excepciones por defecto; las activamos para que
    # un error del motor llegue a JS como excepción en vez de abortar.
    add_compile_options(-fexceptions)
    add_link_options(-fexceptions)
endif()

# Núcleo: C++ puro, sin dependencias de Emscripten. Se compila igual para
# WebAssembly que para nativo.
add_library(gv_core
    src/algorithms/bellman_ford.cpp
    src/algorithms/bfs.cpp
    src/algorithms/dfs.cpp
    src/algorithms/dijkstra.cpp
    src/algorithms/prim.cpp
)
target_include_directories(gv_core PUBLIC include)
target_compile_options(gv_core PRIVATE
    $<$<CXX_COMPILER_ID:MSVC>:/W4>
    $<$<NOT:$<CXX_COMPILER_ID:MSVC>>:-Wall -Wextra -Wpedantic>
)

if(EMSCRIPTEN)
    # Módulo ES6 que la app web importa: web/src/wasm/engine.{js,wasm}
    add_executable(engine bindings/bindings.cpp)
    target_link_libraries(engine PRIVATE gv_core)
    target_link_options(engine PRIVATE
        -lembind
        -sMODULARIZE=1
        -sEXPORT_ES6=1
        -sEXPORT_NAME=createEngine
        -sENVIRONMENT=web
        -sALLOW_MEMORY_GROWTH=1
    )
    set_target_properties(engine PROPERTIES
        SUFFIX ".js"
        RUNTIME_OUTPUT_DIRECTORY "${CMAKE_CURRENT_SOURCE_DIR}/../web/src/wasm"
    )
endif()

if(GV_BUILD_TESTS)
    enable_testing()
    add_subdirectory(tests)
endif()
