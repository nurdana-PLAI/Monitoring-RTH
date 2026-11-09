from pathlib import Path

from src.fis_engine.engine import FISEngine, HierarchicalFISEngine


BASE_DIR = Path(__file__).resolve().parents[1]
MICRO_FIS_PATH = BASE_DIR / "RTH_FIS-1.fis"
FINAL_FIS_PATH = BASE_DIR / "RTH_FIS-2.fis"


def test_microclimate_engine_evaluate_returns_crisp_output() -> None:
    engine = FISEngine(MICRO_FIS_PATH)

    result = engine.evaluate(
        {
            "SuhuUdara": 28.5,
            "KelUdara": 62.0,
            "KelTanah": 48.0,
        }
    )

    assert isinstance(result, float)
    assert 0.0 <= result <= 100.0


def test_final_engine_clamps_out_of_range_values() -> None:
    engine = FISEngine(FINAL_FIS_PATH)

    result = engine.evaluate(
        {
            "IndeksMikro": 115.0,
            "PM25": 159.1,
        }
    )

    assert isinstance(result, float)
    assert 0.0 <= result <= 100.0


def test_engine_evaluate_all_returns_named_outputs() -> None:
    engine = FISEngine(FINAL_FIS_PATH)

    result = engine.evaluate_all(
        {
            "IndeksMikro": 78.0,
            "PM25": 22.0,
        }
    )

    assert set(result.keys()) == {"IKL"}
    assert 0.0 <= result["IKL"] <= 100.0


def test_engine_evaluate_output_returns_value_and_label() -> None:
    engine = FISEngine(FINAL_FIS_PATH)

    result = engine.evaluate_output(
        {
            "IndeksMikro": 78.0,
            "PM25": 22.0,
        }
    )

    assert 0.0 <= result.value <= 100.0
    assert result.label in {"SangatBuruk", "Buruk", "Cukup", "Baik", "SangatBaik"}


def test_hierarchical_engine_evaluate_output_returns_value_and_label() -> None:
    engine = HierarchicalFISEngine(MICRO_FIS_PATH, FINAL_FIS_PATH)

    result = engine.evaluate_output(
        {
            "SuhuUdara": 28.5,
            "KelUdara": 62.0,
            "KelTanah": 48.0,
            "PM25": 22.0,
        }
    )

    assert 0.0 <= result.value <= 100.0
    assert result.label in {"SangatBuruk", "Buruk", "Cukup", "Baik", "SangatBaik"}


def test_hierarchical_engine_evaluate_all_returns_intermediate_and_final_outputs() -> None:
    engine = HierarchicalFISEngine(MICRO_FIS_PATH, FINAL_FIS_PATH)

    result = engine.evaluate_all(
        {
            "SuhuUdara": 28.5,
            "KelUdara": 62.0,
            "KelTanah": 48.0,
            "PM25": 22.0,
        }
    )

    assert set(result.keys()) == {"IKL", "IndeksMikro"}
    assert 0.0 <= result["IndeksMikro"] <= 100.0
    assert 0.0 <= result["IKL"] <= 100.0
