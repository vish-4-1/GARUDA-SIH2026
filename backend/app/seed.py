import uuid
from sqlalchemy.orm import Session
from app.models.scenario import Scenario, ScenarioConfiguration


DEMO_SCENARIOS = [
    {
        "id": "scenario-demo-01-beginner",
        "name": "Alpha-1: Clear Airspace Baseline",
        "description": "Ideal atmospheric conditions and clear sensor telemetry. Minimal observation delay and near-zero packet loss. Ideal for initial baseline assessment and operator familiarization.",
        "environment": "urban",
        "difficulty": "Beginner",
        "duration_seconds": 90,
        "seed": 101,
        "is_preset": 1,
        "config": {
            "num_entities": 4,
            "threat_density": "low",
            "sensor_reliability": 0.96,
            "observation_delay_mean": 1.0,
            "observation_delay_jitter": 0.2,
            "observation_loss_rate": 0.02,
            "noise_level": 0.08,
            "weather": "Clear Day",
            "radar_coverage_percent": 98.0,
            "rf_scanner_enabled": 1,
            "acoustic_sensor_enabled": 1,
            "optical_eoir_enabled": 1,
        }
    },
    {
        "id": "scenario-demo-02-intermediate",
        "name": "Bravo-2: Delayed & Noisy Multi-Vector Ingress",
        "description": "Tactical perimeter with moderate atmospheric turbulence and radio frequency interference. Observations arrive with 3-5s transmission delays and telemetry jitter.",
        "environment": "coastal",
        "difficulty": "Intermediate",
        "duration_seconds": 120,
        "seed": 202,
        "is_preset": 1,
        "config": {
            "num_entities": 6,
            "threat_density": "medium",
            "sensor_reliability": 0.82,
            "observation_delay_mean": 3.2,
            "observation_delay_jitter": 1.2,
            "observation_loss_rate": 0.14,
            "noise_level": 0.22,
            "weather": "Heavy Rain",
            "radar_coverage_percent": 85.0,
            "rf_scanner_enabled": 1,
            "acoustic_sensor_enabled": 1,
            "optical_eoir_enabled": 1,
        }
    },
    {
        "id": "scenario-demo-03-advanced",
        "name": "Charlie-3: Severe Jamming & Incomplete Evidence",
        "description": "High-threat electronic warfare contested zone. Hostile active RF jamming causing 35% packet loss and up to 7s telemetry latency. Trainees must avoid blind actions and utilize evidence-aware verification.",
        "environment": "border",
        "difficulty": "Advanced",
        "duration_seconds": 150,
        "seed": 303,
        "is_preset": 1,
        "config": {
            "num_entities": 8,
            "threat_density": "high",
            "sensor_reliability": 0.65,
            "observation_delay_mean": 5.5,
            "observation_delay_jitter": 2.5,
            "observation_loss_rate": 0.35,
            "noise_level": 0.38,
            "weather": "High RF Jamming",
            "radar_coverage_percent": 65.0,
            "rf_scanner_enabled": 1,
            "acoustic_sensor_enabled": 1,
            "optical_eoir_enabled": 1,
        }
    }
]


def seed_demo_scenarios(db: Session) -> None:
    for item in DEMO_SCENARIOS:
        existing = db.query(Scenario).filter(Scenario.id == item["id"]).first()
        if not existing:
            sc = Scenario(
                id=item["id"],
                name=item["name"],
                description=item["description"],
                environment=item["environment"],
                difficulty=item["difficulty"],
                duration_seconds=item["duration_seconds"],
                seed=item["seed"],
                status="active",
                is_preset=item["is_preset"]
            )
            db.add(sc)
            db.flush()

            cfg_data = item["config"]
            cfg = ScenarioConfiguration(
                id=str(uuid.uuid4()),
                scenario_id=sc.id,
                num_entities=cfg_data["num_entities"],
                threat_density=cfg_data["threat_density"],
                sensor_reliability=cfg_data["sensor_reliability"],
                observation_delay_mean=cfg_data["observation_delay_mean"],
                observation_delay_jitter=cfg_data["observation_delay_jitter"],
                observation_loss_rate=cfg_data["observation_loss_rate"],
                noise_level=cfg_data["noise_level"],
                weather=cfg_data["weather"],
                radar_coverage_percent=cfg_data["radar_coverage_percent"],
                rf_scanner_enabled=cfg_data["rf_scanner_enabled"],
                acoustic_sensor_enabled=cfg_data["acoustic_sensor_enabled"],
                optical_eoir_enabled=cfg_data["optical_eoir_enabled"]
            )
            db.add(cfg)
    db.commit()
