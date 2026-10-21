import uuid
from typing import List, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session

from app.models.simulation import SimulationRun
from app.models.evaluation import TrainingRecommendation


class AdaptiveRecommendationEngine:
    @staticmethod
    def generate_recommendations(db: Session, run_id: str) -> List[TrainingRecommendation]:
        run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
        if not run or not run.summary_metrics:
            return []

        # Clear existing unlaunched recommendations for this run
        db.query(TrainingRecommendation).filter(
            TrainingRecommendation.run_id == run_id,
            TrainingRecommendation.is_launched == False
        ).delete()

        metrics = run.summary_metrics
        det_rate = metrics.get("detection_rate", 100.0)
        class_acc = metrics.get("classification_accuracy", 100.0)
        fa_rate = metrics.get("false_alarm_rate", 0.0)
        latency = metrics.get("mean_response_latency_s", 5.0)
        unassessable = metrics.get("unassessable_count", 0)

        recommendations: List[TrainingRecommendation] = []

        # Rule 1: High False Alarm Rate
        if fa_rate >= 15.0:
            rec = TrainingRecommendation(
                id=str(uuid.uuid4()),
                run_id=run.id,
                target_skill="Clutter & Civilian Discrimination",
                gap_type="FALSE_ALARMS",
                priority="HIGH",
                reason=f"False alarm rate of {fa_rate}% detected. Benign civilian drones or wildlife clutter were flagged as hostile threats.",
                recommended_difficulty="Intermediate",
                learning_objective="Practice cross-referencing Remote-ID beacons and acoustic decibel baselines before initiating engagement protocols.",
                suggested_scenario_config={
                    "name": "Drill: High Clutter & Civilian Identification",
                    "environment": "urban",
                    "difficulty": "Intermediate",
                    "duration_seconds": 120,
                    "seed": 105,
                    "num_entities": 7,
                    "sensor_reliability": 0.90,
                    "observation_delay_mean": 1.5,
                    "observation_delay_jitter": 0.5,
                    "observation_loss_rate": 0.05,
                    "noise_level": 0.15,
                    "weather": "Clear Day",
                },
                is_launched=False,
                created_at=datetime.utcnow()
            )
            recommendations.append(rec)

        # Rule 2: Missed Detections
        if det_rate < 75.0:
            rec = TrainingRecommendation(
                id=str(uuid.uuid4()),
                run_id=run.id,
                target_skill="Low-RCS Rapid Threat Detection",
                gap_type="MISSED_DETECTIONS",
                priority="HIGH",
                reason=f"Detection rate was {det_rate}%. Multiple observable hostile micro-drones breached tactical boundaries without timely identification.",
                recommended_difficulty="Beginner",
                learning_objective="Enhance continuous sector scanning and prioritize small-signature radar returns approaching boundary lines.",
                suggested_scenario_config={
                    "name": "Drill: Micro-UAV Boundary Ingress Tracking",
                    "environment": "border",
                    "difficulty": "Beginner",
                    "duration_seconds": 90,
                    "seed": 302,
                    "num_entities": 4,
                    "sensor_reliability": 0.95,
                    "observation_delay_mean": 1.0,
                    "observation_delay_jitter": 0.2,
                    "observation_loss_rate": 0.02,
                    "noise_level": 0.10,
                    "weather": "Clear Day",
                },
                is_launched=False,
                created_at=datetime.utcnow()
            )
            recommendations.append(rec)

        # Rule 3: High Latency
        if latency > 10.0:
            rec = TrainingRecommendation(
                id=str(uuid.uuid4()),
                run_id=run.id,
                target_skill="Rapid Threat Triaging & Timeliness",
                gap_type="SLOW_REACTION",
                priority="MEDIUM",
                reason=f"Average response latency was {latency}s from initial delivered sensor observation to action.",
                recommended_difficulty="Intermediate",
                learning_objective="Reduce decision-making hesitation by applying standard operating triage rules for high-speed loitering munitions.",
                suggested_scenario_config={
                    "name": "Drill: Fast-Loitering Munition Intercept",
                    "environment": "coastal",
                    "difficulty": "Intermediate",
                    "duration_seconds": 90,
                    "seed": 404,
                    "num_entities": 5,
                    "sensor_reliability": 0.88,
                    "observation_delay_mean": 1.8,
                    "observation_delay_jitter": 0.5,
                    "observation_loss_rate": 0.10,
                    "noise_level": 0.15,
                    "weather": "Clear Day",
                },
                is_launched=False,
                created_at=datetime.utcnow()
            )
            recommendations.append(rec)

        # Rule 4: Action on Zero Evidence / Blind Guessing
        if unassessable >= 2:
            rec = TrainingRecommendation(
                id=str(uuid.uuid4()),
                run_id=run.id,
                target_skill="Degraded Information Discipline & Ping Requests",
                gap_type="DEGRADED_INFO_PANIC",
                priority="HIGH",
                reason=f"Detected {unassessable} decisions enacted with zero delivered sensor confirmation. Blind actions risk collateral harm.",
                recommended_difficulty="Advanced",
                learning_objective="Utilize 'Request Sensor Ping' or 'Mark Uncertain' protocols instead of premature kinetic actions under sensor blackout.",
                suggested_scenario_config={
                    "name": "Drill: Heavy Jamming & Sensor Ping Protocol",
                    "environment": "coastal",
                    "difficulty": "Advanced",
                    "duration_seconds": 120,
                    "seed": 505,
                    "num_entities": 6,
                    "sensor_reliability": 0.70,
                    "observation_delay_mean": 4.5,
                    "observation_delay_jitter": 2.0,
                    "observation_loss_rate": 0.35,
                    "noise_level": 0.35,
                    "weather": "High RF Jamming",
                },
                is_launched=False,
                created_at=datetime.utcnow()
            )
            recommendations.append(rec)

        # Fallback / Mastery Recommendation if performing very well
        if not recommendations:
            rec = TrainingRecommendation(
                id=str(uuid.uuid4()),
                run_id=run.id,
                target_skill="Advanced Multi-Threat Swarm Defense",
                gap_type="MASTERY_PROGRESSION",
                priority="LOW",
                reason="Excellent baseline performance across detection, classification, and evidence discipline.",
                recommended_difficulty="Advanced",
                learning_objective="Test decision endurance against synchronized multi-axis drone swarms under severe sensor delay.",
                suggested_scenario_config={
                    "name": "Drill: Synchronized Swarm in Severe Jamming",
                    "environment": "urban",
                    "difficulty": "Advanced",
                    "duration_seconds": 150,
                    "seed": 999,
                    "num_entities": 8,
                    "sensor_reliability": 0.65,
                    "observation_delay_mean": 4.0,
                    "observation_delay_jitter": 2.0,
                    "observation_loss_rate": 0.30,
                    "noise_level": 0.30,
                    "weather": "Dense Fog",
                },
                is_launched=False,
                created_at=datetime.utcnow()
            )
            recommendations.append(rec)

        db.bulk_save_objects(recommendations)
        db.commit()
        return recommendations

