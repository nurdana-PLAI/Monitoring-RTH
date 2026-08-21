from pathlib import Path

from src.fis_engine.engine import FISEngine
from src.fis_engine.parser import FISParser


BASE_DIR = Path(__file__).resolve().parents[1]
FIS_PATH = BASE_DIR / "SPK_RTH.fis"


def test_parser_reads_system_metadata() -> None:
    model = FISParser().parse(FIS_PATH)

    assert model.name == "SPK_RTH"
    assert model.system_type == "mamdani"
    assert model.and_method == "min"
    assert model.aggregation_method == "max"
    assert model.defuzzification_method == "centroid"


def test_parser_reads_variables_and_membership_functions() -> None:
    model = FISParser().parse(FIS_PATH)

    assert len(model.inputs) == 4
    assert len(model.outputs) == 1
    assert model.inputs[0].name == "SuhuUdara"
    assert model.inputs[0].value_range == (15.0, 45.0)
    assert model.inputs[0].membership_functions[0].name == "Dingin"
    assert model.inputs[0].membership_functions[0].mf_type == "trapmf"
    assert model.outputs[0].membership_functions[-1].name == "SangatBaik"


def test_parser_reads_all_rules() -> None:
    model = FISParser().parse(FIS_PATH)

    assert len(model.rules) == 43
    assert model.rules[0].antecedents == (2, 2, 2, 1)
    assert model.rules[0].consequents == (5,)
    assert model.rules[-1].antecedents == (0, 0, 0, 4)
    assert model.rules[-1].consequents == (1,)


def test_engine_caches_parsed_model_at_startup() -> None:
    engine = FISEngine(FIS_PATH)

    assert engine.model.name == "SPK_RTH"
