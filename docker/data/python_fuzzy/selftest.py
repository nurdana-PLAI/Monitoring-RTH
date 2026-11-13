from pathlib import Path

from src.fis_engine.engine import FISEngine, HierarchicalFISEngine
from src.fis_engine.membership import MembershipFunctionEvaluator
from src.fis_engine.model import MembershipFunction
from src.fis_engine.parser import FISParser
from src.mqtt_service.payloads import SensorPayloadAdapter


BASE_DIR = Path(__file__).resolve().parent
MICRO_FIS_PATH = BASE_DIR / "RTH_Mikroklimat.fis"
FINAL_FIS_PATH = BASE_DIR / "RTH_IKL_Final.fis"


def test_parser() -> None:
    micro = FISParser().parse(MICRO_FIS_PATH)
    final = FISParser().parse(FINAL_FIS_PATH)

    assert micro.name == "RTH_Mikroklimat"
    assert len(micro.inputs) == 3
    assert micro.outputs[0].name == "IndeksMikro"
    assert len(micro.rules) == 27

    assert final.name == "RTH_IKL_Final"
    assert len(final.inputs) == 2
    assert final.inputs[0].name == "IndeksMikro"
    assert final.inputs[1].name == "PM25"
    assert final.outputs[0].name == "IKL"
    assert len(final.rules) == 25


def test_membership() -> None:
    evaluator = MembershipFunctionEvaluator()

    trimf = MembershipFunction(
        name="Sedang",
        mf_type="trimf",
        parameters=(40.0, 60.0, 80.0),
    )
    assert evaluator.evaluate(trimf, 60.0) == 1.0
    assert evaluator.evaluate(trimf, 50.0) == 0.5

    trapmf = MembershipFunction(
        name="Dingin",
        mf_type="trapmf",
        parameters=(15.0, 15.0, 20.0, 26.0),
    )
    assert evaluator.evaluate(trapmf, 15.0) == 1.0
    assert evaluator.evaluate(trapmf, 23.0) == 0.5


def test_payloads() -> None:
    adapter = SensorPayloadAdapter()
    payload = {
        "readings": [
            {"type": "temperature", "val": 28.5},
            {"type": "humidity", "val": 62.0},
            {"type": "soil_humidity", "val": 48.0},
            {"type": "pm25", "val": 22.0},
        ]
    }

    assert adapter.extract_microclimate_inputs(payload) == {
        "SuhuUdara": 28.5,
        "KelUdara": 62.0,
        "KelTanah": 48.0,
    }
    assert adapter.extract_final_inputs(payload, 77.5) == {
        "IndeksMikro": 77.5,
        "PM25": 22.0,
    }

    enriched = adapter.enrich_payload(payload, 83.53, "Baik")
    assert enriched["fuzzy"]["ikl"] == 83.53
    assert enriched["fuzzy"]["label"] == "Baik"


def test_engines() -> None:
    micro_engine = FISEngine(MICRO_FIS_PATH)
    final_engine = FISEngine(FINAL_FIS_PATH)
    hierarchical_engine = HierarchicalFISEngine(MICRO_FIS_PATH, FINAL_FIS_PATH)

    micro_value = micro_engine.evaluate(
        {
            "SuhuUdara": 28.5,
            "KelUdara": 62.0,
            "KelTanah": 48.0,
        }
    )
    assert 0.0 <= micro_value <= 100.0

    final_output = final_engine.evaluate_output(
        {
            "IndeksMikro": 78.0,
            "PM25": 22.0,
        }
    )
    assert 0.0 <= final_output.value <= 100.0
    assert final_output.label in {"SangatBuruk", "Buruk", "Cukup", "Baik", "SangatBaik"}

    hierarchical_outputs = hierarchical_engine.evaluate_all(
        {
            "SuhuUdara": 28.5,
            "KelUdara": 62.0,
            "KelTanah": 48.0,
            "PM25": 22.0,
        }
    )
    assert set(hierarchical_outputs.keys()) == {"IKL", "IndeksMikro"}
    assert 0.0 <= hierarchical_outputs["IndeksMikro"] <= 100.0
    assert 0.0 <= hierarchical_outputs["IKL"] <= 100.0


def main() -> None:
    test_parser()
    test_membership()
    test_payloads()
    test_engines()
    print("Self-test passed")


if __name__ == "__main__":
    main()
