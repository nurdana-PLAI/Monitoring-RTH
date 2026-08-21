from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class MembershipFunction:
    name: str
    mf_type: str
    parameters: tuple[float, ...]


@dataclass(frozen=True)
class FISVariable:
    name: str
    kind: str
    value_range: tuple[float, float]
    membership_functions: tuple[MembershipFunction, ...]


@dataclass(frozen=True)
class FISRule:
    antecedents: tuple[int, ...]
    consequents: tuple[int, ...]
    weight: float
    connection: int


@dataclass(frozen=True)
class FISSystem:
    name: str
    system_type: str
    version: float
    and_method: str
    or_method: str
    implication_method: str
    aggregation_method: str
    defuzzification_method: str
    inputs: tuple[FISVariable, ...]
    outputs: tuple[FISVariable, ...]
    rules: tuple[FISRule, ...]
