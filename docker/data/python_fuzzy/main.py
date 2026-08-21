from pathlib import Path

from src.fis_engine.engine import FISEngine
from src.mqtt_service.config import MQTTConfig
from src.mqtt_service.service import MQTTService
from src.utils.logging_config import configure_logging


def main() -> None:
    configure_logging()
    engine = FISEngine(Path("SPK_RTH.fis"))
    service = MQTTService(engine=engine, config=MQTTConfig.from_env())
    service.run_forever()


if __name__ == "__main__":
    main()
