from __future__ import annotations

from .model import MembershipFunction


class MembershipFunctionEvaluator:
    def evaluate(self, membership_function: MembershipFunction, value: float) -> float:
        mf_type = membership_function.mf_type.lower()
        if mf_type == "trimf":
            return self._trimf(value, membership_function.parameters)
        if mf_type == "trapmf":
            return self._trapmf(value, membership_function.parameters)
        raise ValueError(f"Unsupported membership function type: {membership_function.mf_type}")

    @staticmethod
    def _trimf(value: float, parameters: tuple[float, ...]) -> float:
        if len(parameters) != 3:
            raise ValueError("trimf requires exactly 3 parameters")

        a, b, c = parameters
        if value <= a or value >= c:
            return 0.0
        if value == b:
            return 1.0
        if value < b:
            return MembershipFunctionEvaluator._safe_ratio(value - a, b - a)
        return MembershipFunctionEvaluator._safe_ratio(c - value, c - b)

    @staticmethod
    def _trapmf(value: float, parameters: tuple[float, ...]) -> float:
        if len(parameters) != 4:
            raise ValueError("trapmf requires exactly 4 parameters")

        a, b, c, d = parameters
        if value <= a or value >= d:
            if (value == a and a == b) or (value == d and c == d):
                return 1.0
            return 0.0
        if b <= value <= c:
            return 1.0
        if a < value < b:
            return MembershipFunctionEvaluator._safe_ratio(value - a, b - a)
        return MembershipFunctionEvaluator._safe_ratio(d - value, d - c)

    @staticmethod
    def _safe_ratio(numerator: float, denominator: float) -> float:
        if denominator == 0:
            return 1.0 if numerator >= 0 else 0.0
        return max(0.0, min(1.0, numerator / denominator))
