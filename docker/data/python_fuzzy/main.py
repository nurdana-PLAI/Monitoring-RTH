from pathlib import Path

from src.fis_engine.engine import HierarchicalFISEngine
from src.mqtt_service.config import MQTTConfig
from src.mqtt_service.service import MQTTService
from src.utils.logging_config import configure_logging


def main() -> None:
    configure_logging()
    engine = HierarchicalFISEngine(
        Path("RTH_FIS-1.fis"),
        Path("RTH_FIS-2.fis"),
    )
    service = MQTTService(engine=engine, config=MQTTConfig.from_env())
    service.run_forever()


if __name__ == "__main__":
    main()
