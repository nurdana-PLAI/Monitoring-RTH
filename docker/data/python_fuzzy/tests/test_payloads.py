from src.mqtt_service.payloads import SensorPayloadAdapter


def test_extract_engine_inputs_from_sensor_payload() -> None:
    adapter = SensorPayloadAdapter()
    payload = {
        "ts": 1782459435994773000,
        "loc_id": "JKT-ESP",
        "readings": [
            {"sensor_id": "S-TEMP-01", "type": "temperature", "unit": "C", "val": 6.43},
            {"sensor_id": "S-HUM-01", "type": "humidity", "unit": "%", "val": 62.92},
            {"sensor_id": "S-SOIL-01", "type": "soil_humidity", "unit": "%", "val": 53.33},
            {"sensor_id": "S-PM25-01", "type": "pm25", "unit": "ug/m3", "val": 159.1},
        ],
    }

    result = adapter.extract_engine_inputs(payload)

    assert result == {
        "SuhuUdara": 6.43,
        "KelUdara": 62.92,
        "KelTanah": 53.33,
        "PM25": 159.1,
    }


def test_enrich_payload_adds_fuzzy_ikl() -> None:
    adapter = SensorPayloadAdapter()
    payload = {
        "ts": 1782459435994773000,
        "loc_id": "JKT-ESP",
        "readings": [],
    }

    result = adapter.enrich_payload(payload, 83.53079938197652, "Baik")

    assert result["fuzzy"]["ikl"] == 83.53
    assert result["fuzzy"]["label"] == "Baik"
    assert "fuzzy" not in payload
