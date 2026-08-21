from __future__ import annotations

import os
from dataclasses import dataclass


@dataclass(frozen=True)
class MQTTConfig:
    host: str
    port: int
    input_topic: str
    output_topic: str
    client_id: str
    qos: int
    keepalive: int

    @classmethod
    def from_env(cls) -> "MQTTConfig":
        return cls(
            host=os.getenv("MQTT_HOST", "nanomq"),
            port=int(os.getenv("MQTT_PORT", "1883")),
            input_topic=os.getenv("MQTT_INPUT_TOPIC", "smartenv/data"),
            output_topic=os.getenv("MQTT_OUTPUT_TOPIC", "smartenv/data/fuzzy"),
            client_id=os.getenv("MQTT_CLIENT_ID", "python-fuzzy-engine"),
            qos=int(os.getenv("MQTT_QOS", "0")),
            keepalive=int(os.getenv("MQTT_KEEPALIVE", "60")),
        )
