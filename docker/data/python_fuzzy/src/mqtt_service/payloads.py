from __future__ import annotations

from copy import deepcopy


class SensorPayloadAdapter:
    _TYPE_MAP = {
        "temperature": "SuhuUdara",
        "humidity": "KelUdara",
        "soil_humidity": "KelTanah",
        "pm25": "PM25",
    }

    def extract_engine_inputs(self, payload: dict) -> dict[str, float]:
        readings = payload.get("readings")
        if not isinstance(readings, list):
            raise ValueError("Payload must contain a readings list")

        values_by_type: dict[str, float] = {}
        for reading in readings:
            if not isinstance(reading, dict):
                continue

            reading_type = reading.get("type")
            reading_value = reading.get("val")
            if reading_type in self._TYPE_MAP and reading_value is not None:
                values_by_type[self._TYPE_MAP[reading_type]] = float(reading_value)

        missing = [
            variable_name
            for variable_name in self._TYPE_MAP.values()
            if variable_name not in values_by_type
        ]
        if missing:
            raise ValueError(f"Missing sensor readings for: {', '.join(missing)}")

        return values_by_type

    def enrich_payload(self, payload: dict, ikl: float, label: str) -> dict:
        enriched = deepcopy(payload)
        fuzzy_block = enriched.get("fuzzy")
        if not isinstance(fuzzy_block, dict):
            fuzzy_block = {}

        fuzzy_block["ikl"] = round(float(ikl), 2)
        fuzzy_block["label"] = label
        enriched["fuzzy"] = fuzzy_block
        return enriched
