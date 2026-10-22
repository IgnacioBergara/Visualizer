#pragma once

#include <vector>

#include "gv/step.hpp"

// Nodos en el orden en que el algoritmo los visita.
inline std::vector<int> visitOrder(const gv::Steps& steps) {
    std::vector<int> order;
    for (const gv::Step& s : steps) {
        if (s.type == gv::StepType::Visit) order.push_back(s.node);
    }
    return order;
}

inline std::vector<gv::Step> stepsOfType(const gv::Steps& steps, gv::StepType type) {
    std::vector<gv::Step> out;
    for (const gv::Step& s : steps) {
        if (s.type == type) out.push_back(s);
    }
    return out;
}
