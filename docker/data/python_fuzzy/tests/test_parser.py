from pathlib import Path

from src.fis_engine.engine import FISEngine
from src.fis_engine.parser import FISParser


BASE_DIR = Path(__file__).resolve().parents[1]
MICRO_FIS_PATH = BASE_DIR / "RTH_Mikroklimat.fis"
FINAL_FIS_PATH = BASE_DIR / "RTH_IKL_Final.fis"


def test_parser_reads_microclimate_system_metadata() -> None:
    model = FISParser().parse(MICRO_FIS_PATH)

    assert model.name == "RTH_Mikroklimat"
    assert model.system_type == "mamdani"
    assert model.and_method == "min"
    assert model.aggregation_method == "max"
    assert model.defuzzification_method == "centroid"


def test_parser_reads_microclimate_variables_and_membership_functions() -> None:
    model = FISParser().parse(MICRO_FIS_PATH)

    assert len(model.inputs) == 3
    assert len(model.outputs) == 1
    assert model.inputs[0].name == "SuhuUdara"
    assert model.inputs[0].value_range == (0.0, 45.0)
    assert model.inputs[0].membership_functions[0].name == "Dingin"
    assert model.inputs[0].membership_functions[0].mf_type == "trapmf"
    assert model.outputs[0].membership_functions[-1].name == "SangatBaik"


def test_parser_reads_all_microclimate_rules() -> None:
    model = FISParser().parse(MICRO_FIS_PATH)

    assert len(model.rules) == 27
    assert model.rules[0].antecedents == (1, 1, 1)
    assert model.rules[0].consequents == (1,)
    assert model.rules[-1].antecedents == (3, 3, 3)
    assert model.rules[-1].consequents == (1,)


def test_engine_caches_parsed_model_at_startup() -> None:
    engine = FISEngine(FINAL_FIS_PATH)

    assert engine.model.name == "RTH_IKL_Final"


def test_parser_reads_hierarchical_microclimate_fis() -> None:
    model = FISParser().parse(MICRO_FIS_PATH)

    assert model.name == "RTH_Mikroklimat"
    assert len(model.inputs) == 3
    assert len(model.outputs) == 1
    assert model.outputs[0].name == "IndeksMikro"
    assert len(model.rules) == 27


def test_parser_reads_hierarchical_final_fis() -> None:
    model = FISParser().parse(FINAL_FIS_PATH)

    assert model.name == "RTH_IKL_Final"
    assert len(model.inputs) == 2
    assert model.inputs[0].name == "IndeksMikro"
    assert model.inputs[1].name == "PM25"
    assert model.outputs[0].name == "IKL"
    assert len(model.rules) == 25
