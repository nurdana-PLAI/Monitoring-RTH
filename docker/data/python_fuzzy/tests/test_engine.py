from pathlib import Path

from src.fis_engine.engine import FISEngine


BASE_DIR = Path(__file__).resolve().parents[1]
FIS_PATH = BASE_DIR / "SPK_RTH.fis"


def test_engine_evaluate_returns_crisp_ikl() -> None:
    engine = FISEngine(FIS_PATH)

    result = engine.evaluate(
        {
            "SuhuUdara": 28.5,
            "KelUdara": 62.0,
            "KelTanah": 48.0,
            "PM25": 22.0,
        }
    )

    assert isinstance(result, float)
    assert 0.0 <= result <= 100.0


def test_engine_clamps_out_of_range_values() -> None:
    engine = FISEngine(FIS_PATH)

    result = engine.evaluate(
        {
            "SuhuUdara": 6.43,
            "KelUdara": 62.92,
            "KelTanah": 53.33,
            "PM25": 159.1,
        }
    )

    assert isinstance(result, float)
    assert 0.0 <= result <= 100.0


def test_engine_evaluate_all_returns_named_outputs() -> None:
    engine = FISEngine(FIS_PATH)

    result = engine.evaluate_all(
        {
            "SuhuUdara": 28.5,
            "KelUdara": 62.0,
            "KelTanah": 48.0,
            "PM25": 22.0,
        }
    )

    assert set(result.keys()) == {"IKL"}
    assert 0.0 <= result["IKL"] <= 100.0


def test_engine_evaluate_output_returns_value_and_label() -> None:
    engine = FISEngine(FIS_PATH)

    result = engine.evaluate_output(
        {
            "SuhuUdara": 28.5,
            "KelUdara": 62.0,
            "KelTanah": 48.0,
            "PM25": 22.0,
        }
    )

    assert 0.0 <= result.value <= 100.0
    assert result.label in {"Buruk", "KurangBaik", "Cukup", "Baik", "SangatBaik"}
