from __future__ import annotations

from pathlib import Path

from .inference import MamdaniInference, OutputInterpretation
from .membership import MembershipFunctionEvaluator
from .model import FISSystem
from .parser import FISParser


class FISEngine:
    def __init__(self, fis_path: str | Path, parser: FISParser | None = None) -> None:
        self._fis_path = Path(fis_path)
        self._parser = parser or FISParser()
        self._model = self._parser.parse(self._fis_path)
        self._inference = self._build_inference()
        self._membership_evaluator = MembershipFunctionEvaluator()

    @property
    def model(self) -> FISSystem:
        return self._model

    def evaluate(self, sensor_data: dict[str, float]) -> float:
        return self.evaluate_output(sensor_data).value

    def evaluate_all(self, sensor_data: dict[str, float]) -> dict[str, float]:
        return self._inference.evaluate(self._model, sensor_data).crisp_outputs

    def evaluate_output(self, sensor_data: dict[str, float]) -> OutputInterpretation:
        result = self._inference.evaluate(self._model, sensor_data)
        if len(result.crisp_outputs) != 1:
            raise ValueError("evaluate_output() currently supports exactly one output")

        output_variable = self._model.outputs[0]
        output_value = next(iter(result.crisp_outputs.values()))
        output_label = self._resolve_output_label(output_variable, output_value)
        return OutputInterpretation(value=output_value, label=output_label)

    def _build_inference(self) -> MamdaniInference:
        if self._model.system_type.lower() != "mamdani":
            raise ValueError(f"Unsupported FIS system type: {self._model.system_type}")
        return MamdaniInference()

    def _resolve_output_label(self, output_variable, output_value: float) -> str:
        best_name = output_variable.membership_functions[0].name
        best_degree = -1.0

        for membership_function in output_variable.membership_functions:
            degree = self._membership_evaluator.evaluate(membership_function, output_value)
            if degree > best_degree:
                best_degree = degree
                best_name = membership_function.name

        return best_name
