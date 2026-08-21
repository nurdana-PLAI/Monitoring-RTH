from __future__ import annotations

import re
from pathlib import Path

from .model import FISRule, FISSystem, FISVariable, MembershipFunction


class FISParser:
    _SECTION_PATTERN = re.compile(r"^\[(?P<name>[^\]]+)\]$")
    _MF_PATTERN = re.compile(
        r"^MF\d+='(?P<name>[^']+)':'(?P<type>[^']+)',\[(?P<params>[^\]]+)\]$"
    )

    def parse(self, fis_path: str | Path) -> FISSystem:
        path = Path(fis_path)
        sections = self._read_sections(path)

        system = sections["System"]
        inputs = self._build_variables(sections, "Input", "input")
        outputs = self._build_variables(sections, "Output", "output")
        rules = self._build_rules(sections["Rules"])

        return FISSystem(
            name=self._unquote(system["Name"]),
            system_type=self._unquote(system["Type"]),
            version=float(system["Version"]),
            and_method=self._unquote(system["AndMethod"]),
            or_method=self._unquote(system["OrMethod"]),
            implication_method=self._unquote(system["ImpMethod"]),
            aggregation_method=self._unquote(system["AggMethod"]),
            defuzzification_method=self._unquote(system["DefuzzMethod"]),
            inputs=inputs,
            outputs=outputs,
            rules=rules,
        )

    def _read_sections(self, path: Path) -> dict[str, list[str] | dict[str, str]]:
        current_section: str | None = None
        raw_sections: dict[str, list[str]] = {}

        for raw_line in path.read_text(encoding="utf-8").splitlines():
            line = raw_line.strip()
            if not line:
                continue

            section_match = self._SECTION_PATTERN.match(line)
            if section_match:
                current_section = section_match.group("name")
                raw_sections[current_section] = []
                continue

            if current_section is None:
                raise ValueError(f"Invalid FIS format before section header: {line}")

            raw_sections[current_section].append(line)

        sections: dict[str, list[str] | dict[str, str]] = {}
        for name, lines in raw_sections.items():
            if name == "Rules":
                sections[name] = lines
                continue

            section_values: dict[str, str] = {}
            for line in lines:
                key, value = line.split("=", 1)
                section_values[key.strip()] = value.strip()
            sections[name] = section_values

        return sections

    def _build_variables(
        self,
        sections: dict[str, list[str] | dict[str, str]],
        prefix: str,
        kind: str,
    ) -> tuple[FISVariable, ...]:
        variables: list[FISVariable] = []
        index = 1
        while f"{prefix}{index}" in sections:
            section = sections[f"{prefix}{index}"]
            if not isinstance(section, dict):
                raise ValueError(f"Section {prefix}{index} is malformed")

            membership_functions = self._build_membership_functions(section)
            variables.append(
                FISVariable(
                    name=self._unquote(section["Name"]),
                    kind=kind,
                    value_range=self._parse_range(section["Range"]),
                    membership_functions=membership_functions,
                )
            )
            index += 1

        return tuple(variables)

    def _build_membership_functions(
        self, section: dict[str, str]
    ) -> tuple[MembershipFunction, ...]:
        num_mfs = int(section["NumMFs"])
        functions: list[MembershipFunction] = []

        for index in range(1, num_mfs + 1):
            mf_line = section[f"MF{index}"]
            match = self._MF_PATTERN.match(f"MF{index}={mf_line}")
            if match is None:
                raise ValueError(f"Invalid membership function line: MF{index}={mf_line}")

            parameters = tuple(
                float(value.strip()) for value in match.group("params").split()
            )
            functions.append(
                MembershipFunction(
                    name=match.group("name"),
                    mf_type=match.group("type"),
                    parameters=parameters,
                )
            )

        return tuple(functions)

    def _build_rules(self, rules_section: list[str] | dict[str, str]) -> tuple[FISRule, ...]:
        if not isinstance(rules_section, list):
            raise ValueError("Rules section is malformed")

        rules: list[FISRule] = []
        for line in rules_section:
            head, tail = line.split(",", 1)
            consequent_text, metadata_text = tail.split("(", 1)
            weight_text, connection_text = metadata_text.split(")", 1)

            antecedents = tuple(int(value) for value in head.split())
            consequents = tuple(int(value) for value in consequent_text.split())
            connection = int(connection_text.split(":", 1)[1].strip())

            rules.append(
                FISRule(
                    antecedents=antecedents,
                    consequents=consequents,
                    weight=float(weight_text.strip()),
                    connection=connection,
                )
            )

        return tuple(rules)

    @staticmethod
    def _parse_range(raw_range: str) -> tuple[float, float]:
        stripped = raw_range.strip()[1:-1]
        lower, upper = stripped.split()
        return float(lower), float(upper)

    @staticmethod
    def _unquote(value: str) -> str:
        return value.strip("'")
