from src.fis_engine.membership import MembershipFunctionEvaluator
from src.fis_engine.model import MembershipFunction


def test_trimf_membership_values() -> None:
    evaluator = MembershipFunctionEvaluator()
    membership_function = MembershipFunction(
        name="Sedang",
        mf_type="trimf",
        parameters=(40.0, 60.0, 80.0),
    )

    assert evaluator.evaluate(membership_function, 40.0) == 0.0
    assert evaluator.evaluate(membership_function, 60.0) == 1.0
    assert evaluator.evaluate(membership_function, 50.0) == 0.5
    assert evaluator.evaluate(membership_function, 80.0) == 0.0


def test_trapmf_membership_values() -> None:
    evaluator = MembershipFunctionEvaluator()
    membership_function = MembershipFunction(
        name="Dingin",
        mf_type="trapmf",
        parameters=(15.0, 15.0, 20.0, 26.0),
    )

    assert evaluator.evaluate(membership_function, 15.0) == 1.0
    assert evaluator.evaluate(membership_function, 18.0) == 1.0
    assert evaluator.evaluate(membership_function, 23.0) == 0.5
    assert evaluator.evaluate(membership_function, 26.0) == 0.0
