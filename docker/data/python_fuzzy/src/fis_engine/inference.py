from __future__ import annotations

from dataclasses import dataclass

from .membership import MembershipFunctionEvaluator
from .model import FISRule, FISSystem, FISVariable


@dataclass(frozen=True)
class EvaluationResult:
    crisp_outputs: dict[str, float]


@dataclass(frozen=True)
class OutputInterpretation:
    value: float
    label: str


class MamdaniInference:
    def __init__(self, resolution: int = 1001) -> None:
        self._membership_evaluator = MembershipFunctionEvaluator()
        self._resolution = resolution

    def evaluate(self, model: FISSystem, sensor_data: dict[str, float]) -> EvaluationResult:
        normalized_inputs = self._normalize_inputs(model, sensor_data)
        fuzzified_inputs = self._fuzzify_inputs(model, normalized_inputs)

        crisp_outputs: dict[str, float] = {}
        for output_index, output_variable in enumerate(model.outputs):
            samples = self._build_samples(output_variable)
            aggregated = [0.0 for _ in samples]

            for rule in model.rules:
                rule_strength = self._compute_rule_strength(model, rule, fuzzified_inputs)
                if rule_strength <= 0.0:
                    continue

                consequent_index = rule.consequents[output_index]
                if consequent_index <= 0:
                    continue

                membership_function = output_variable.membership_functions[consequent_index - 1]
                for sample_index, sample in enumerate(samples):
                    mf_degree = self._membership_evaluator.evaluate(membership_function, sample)
                    implied = min(rule_strength, mf_degree)
                    aggregated[sample_index] = max(aggregated[sample_index], implied)

            crisp_outputs[output_variable.name] = self._defuzzify(output_variable, samples, aggregated)

        return EvaluationResult(crisp_outputs=crisp_outputs)

    def _normalize_inputs(self, model: FISSystem, sensor_data: dict[str, float]) -> dict[str, float]:
        normalized: dict[str, float] = {}
        for variable in model.inputs:
            if variable.name not in sensor_data:
                raise ValueError(f"Missing required input: {variable.name}")

            value = float(sensor_data[variable.name])
            lower, upper = variable.value_range
            normalized[variable.name] = min(max(value, lower), upper)

        return normalized

    def _fuzzify_inputs(
        self,
        model: FISSystem,
        sensor_data: dict[str, float],
    ) -> dict[str, tuple[float, ...]]:
        fuzzified: dict[str, tuple[float, ...]] = {}
        for variable in model.inputs:
            value = sensor_data[variable.name]
            fuzzified[variable.name] = tuple(
                self._membership_evaluator.evaluate(membership_function, value)
                for membership_function in variable.membership_functions
            )
        return fuzzified

    def _compute_rule_strength(
        self,
        model: FISSystem,
        rule: FISRule,
        fuzzified_inputs: dict[str, tuple[float, ...]],
    ) -> float:
        active_degrees: list[float] = []

        for input_index, antecedent_index in enumerate(rule.antecedents):
            if antecedent_index == 0:
                continue

            variable = model.inputs[input_index]
            membership_degrees = fuzzified_inputs[variable.name]
            mf_index = abs(antecedent_index) - 1
            degree = membership_degrees[mf_index]
            if antecedent_index < 0:
                degree = 1.0 - degree
            active_degrees.append(degree)

        if not active_degrees:
            return 0.0

        if rule.connection == 1:
            strength = min(active_degrees)
        elif rule.connection == 2:
            strength = max(active_degrees)
        else:
            raise ValueError(f"Unsupported rule connection: {rule.connection}")

        return strength * rule.weight

    def _build_samples(self, output_variable: FISVariable) -> list[float]:
        lower, upper = output_variable.value_range
        if self._resolution < 2:
            raise ValueError("Resolution must be at least 2")

        step = (upper - lower) / (self._resolution - 1)
        return [lower + (step * index) for index in range(self._resolution)]

    def _defuzzify(
        self,
        output_variable: FISVariable,
        samples: list[float],
        aggregated: list[float],
    ) -> float:
        denominator = sum(aggregated)
        if denominator == 0.0:
            lower, upper = output_variable.value_range
            return (lower + upper) / 2.0

        numerator = sum(sample * degree for sample, degree in zip(samples, aggregated))
        return numerator / denominator
