from __future__ import annotations

import json
import logging

from paho.mqtt import client as mqtt_client

from src.fis_engine.engine import FISEngine

from .config import MQTTConfig
from .payloads import SensorPayloadAdapter


LOGGER = logging.getLogger(__name__)


class MQTTService:
    def __init__(self, engine: FISEngine, config: MQTTConfig) -> None:
        self._engine = engine
        self._config = config
        self._payload_adapter = SensorPayloadAdapter()
        self._client = mqtt_client.Client(
            callback_api_version=mqtt_client.CallbackAPIVersion.VERSION2,
            client_id=config.client_id,
        )
        self._client.on_connect = self._on_connect
        self._client.on_message = self._on_message

    def run_forever(self) -> None:
        LOGGER.info(
            "Starting MQTT service for input topic '%s' and output topic '%s'",
            self._config.input_topic,
            self._config.output_topic,
        )
        self._client.connect(
            host=self._config.host,
            port=self._config.port,
            keepalive=self._config.keepalive,
        )
        self._client.loop_forever()

    def process_payload(self, payload: dict) -> dict:
        engine_inputs = self._payload_adapter.extract_engine_inputs(payload)
        result = self._engine.evaluate_output(engine_inputs)
        return self._payload_adapter.enrich_payload(payload, result.value, result.label)

    def _on_connect(
        self,
        client: mqtt_client.Client,
        userdata: object,
        flags: mqtt_client.ConnectFlags,
        reason_code: mqtt_client.ReasonCode,
        properties: mqtt_client.Properties | None,
    ) -> None:
        if reason_code.is_failure:
            LOGGER.error("MQTT connection failed: %s", reason_code)
            return

        LOGGER.info("Connected to MQTT broker at %s:%s", self._config.host, self._config.port)
        client.subscribe(self._config.input_topic, qos=self._config.qos)
        LOGGER.info("Subscribed to topic '%s'", self._config.input_topic)

    def _on_message(
        self,
        client: mqtt_client.Client,
        userdata: object,
        message: mqtt_client.MQTTMessage,
    ) -> None:
        try:
            payload = json.loads(message.payload.decode("utf-8"))
            enriched_payload = self.process_payload(payload)
            client.publish(
                self._config.output_topic,
                json.dumps(enriched_payload),
                qos=self._config.qos,
            )
            LOGGER.info("Published enriched payload with IKL to '%s'", self._config.output_topic)
        except Exception as exc:
            LOGGER.exception("Failed to process MQTT message: %s", exc)
