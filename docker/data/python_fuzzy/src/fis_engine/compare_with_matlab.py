from pathlib import Path
import sys


PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from src.fis_engine.engine import HierarchicalFISEngine


def main() -> None:
    engine = HierarchicalFISEngine(
        PROJECT_ROOT / "RTH_FIS-1.fis",
        PROJECT_ROOT / "RTH_FIS-2.fis",
    )

    samples = [
        {"SuhuUdara": 28, "KelUdara": 62, "KelTanah": 45, "PM25": 10},
    {"SuhuUdara": 28, "KelUdara": 62, "KelTanah": 45, "PM25": 35},
    {"SuhuUdara": 28, "KelUdara": 62, "KelTanah": 45, "PM25": 100},
    {"SuhuUdara": 28, "KelUdara": 62, "KelTanah": 45, "PM25": 200},
    {"SuhuUdara": 28, "KelUdara": 62, "KelTanah": 45, "PM25": 300},
    {"SuhuUdara": 40, "KelUdara": 30, "KelTanah": 20, "PM25": 200},
    {"SuhuUdara": 20, "KelUdara": 85, "KelTanah": 80, "PM25": 120},
    {"SuhuUdara": 27, "KelUdara": 40, "KelTanah": 45, "PM25": 35},
    {"SuhuUdara": 27, "KelUdara": 85, "KelTanah": 45, "PM25": 35},
    {"SuhuUdara": 27, "KelUdara": 60, "KelTanah": 75, "PM25": 35}
    ]

    for sample in samples:
        result = engine.evaluate_all(sample)
        print(sample, result)


if __name__ == "__main__":
    main()
