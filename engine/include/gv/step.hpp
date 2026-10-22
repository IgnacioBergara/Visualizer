#pragma once

#include <string_view>
#include <vector>

namespace gv {

// Cada algoritmo no anima nada: solo registra lo que hace como una lista de
// pasos que la UI reproduce después (hacia delante o hacia atrás).
enum class StepType {
    Visit,       // `node` sale de la frontera y se procesa
    ExploreEdge, // se mira la arista node -> target
    Discover,    // `target` entra en la frontera (cola/pila) desde `node`
    Relax,       // la distancia de `target` mejora a `value` pasando por `node`
    Finish,      // `node` queda completamente procesado
    PathEdge,    // la arista node -> target forma parte del camino resultado
};

struct Step {
    StepType type;
    int node = -1;
    int target = -1;
    double value = 0.0;
};

using Steps = std::vector<Step>;

constexpr std::string_view toString(StepType type) {
    switch (type) {
        case StepType::Visit: return "visit";
        case StepType::ExploreEdge: return "explore-edge";
        case StepType::Discover: return "discover";
        case StepType::Relax: return "relax";
        case StepType::Finish: return "finish";
        case StepType::PathEdge: return "path-edge";
    }
    return "unknown";
}

} // namespace gv
