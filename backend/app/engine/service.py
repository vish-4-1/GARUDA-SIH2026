import uuid
from datetime import datetime
from typing import Dict, Any, List, Optional
from sqlalchemy.orm import Session

from app.models.scenario import Scenario, ScenarioConfiguration
from app.models.simulation import SimulationRun, GroundTruthEvent, Observation, TraineeDecision
from app.engine.generator import generate_synthetic_ground_truth
from app.engine.degradation import apply_sensor_degradation
from app.engine.clock import clock_manager


class SimulationService:
    @staticmethod
    def initialize_run(
        db: Session,
        scenario_id: Optional[str] = None,
        trainee_id: str = "Trainee-Alpha",
        custom_seed: Optional[int] = None,
        override_config: Optional[Dict[str, Any]] = None
    ) -> SimulationRun:
        config_dict: Dict[str, Any] = {
            "num_entities": 5,
            "threat_density": "medium",
            "sensor_reliability": 0.85,
            "observation_delay_mean": 2.5,
            "observation_delay_jitter": 1.0,
            "observation_loss_rate": 0.15,
            "noise_level": 0.20,
            "weather": "Clear Day",
            "radar_coverage_percent": 90.0,
            "rf_scanner_enabled": 1,
            "acoustic_sensor_enabled": 1,
            "optical_eoir_enabled": 1,
        }
        duration = 120
        seed = custom_seed if custom_seed is not None else 42
        
        if scenario_id:
            scenario = db.query(Scenario).filter(Scenario.id == scenario_id).first()
            if scenario:
                duration = scenario.duration_seconds
                config_dict["environment"] = scenario.environment
                if custom_seed is None:
                    seed = scenario.seed
                if scenario.configuration:
                    cfg = scenario.configuration
                    config_dict.update({
                        "num_entities": cfg.num_entities,
                        "threat_density": cfg.threat_density,
                        "sensor_reliability": cfg.sensor_reliability,
                        "observation_delay_mean": cfg.observation_delay_mean,
                        "observation_delay_jitter": cfg.observation_delay_jitter,
                        "observation_loss_rate": cfg.observation_loss_rate,
                        "noise_level": cfg.noise_level,
                        "weather": cfg.weather,
                        "radar_coverage_percent": cfg.radar_coverage_percent,
                        "rf_scanner_enabled": cfg.rf_scanner_enabled,
                        "acoustic_sensor_enabled": cfg.acoustic_sensor_enabled,
                        "optical_eoir_enabled": cfg.optical_eoir_enabled,
                    })

        if override_config:
            config_dict.update(override_config)

        run = SimulationRun(
            id=str(uuid.uuid4()),
            scenario_id=scenario_id,
            trainee_id=trainee_id,
            status="INITIALIZED",
            current_sim_time=0.0,
            duration_seconds=duration,
            seed=seed,
            configuration_snapshot=config_dict,
            created_at=datetime.utcnow()
        )
        db.add(run)
        db.flush()

        # 1. Deterministically generate ground truth events
        raw_gt_events = generate_synthetic_ground_truth(
            run_id=run.id,
            duration_seconds=duration,
            seed=seed,
            config=config_dict
        )

        gt_event_objects: List[GroundTruthEvent] = []
        gt_with_ids: List[Dict[str, Any]] = []
        for raw_gt in raw_gt_events:
            ev_id = str(uuid.uuid4())
            ev = GroundTruthEvent(
                id=ev_id,
                run_id=run.id,
                simulation_time=raw_gt["simulation_time"],
                entity_id=raw_gt["entity_id"],
                event_type=raw_gt["event_type"],
                is_hostile=raw_gt["is_hostile"],
                threat_category=raw_gt["threat_category"],
                threat_level=raw_gt["threat_level"],
                pos_x=raw_gt["pos_x"],
                pos_y=raw_gt["pos_y"],
                altitude=raw_gt["altitude"],
                speed=raw_gt["speed"],
                heading=raw_gt["heading"],
                event_payload=raw_gt["event_payload"],
                created_at=datetime.utcnow()
            )
            gt_event_objects.append(ev)
            raw_gt_copy = dict(raw_gt)
            raw_gt_copy["id"] = ev_id
            gt_with_ids.append(raw_gt_copy)

        db.bulk_save_objects(gt_event_objects)
        db.flush()

        # 2. Generate degraded observations
        raw_observations = apply_sensor_degradation(
            run_id=run.id,
            ground_truth_events_with_ids=gt_with_ids,
            seed=seed,
            config=config_dict
        )

        obs_objects: List[Observation] = []
        for raw_obs in raw_observations:
            obs = Observation(
                id=str(uuid.uuid4()),
                run_id=run.id,
                source_event_id=raw_obs.get("source_event_id"),
                created_at_sim_time=raw_obs["created_at_sim_time"],
                delivered_at_sim_time=raw_obs["delivered_at_sim_time"],
                sensor_type=raw_obs["sensor_type"],
                delay_applied=raw_obs["delay_applied"],
                is_lost=raw_obs["is_lost"],
                delivery_status=raw_obs["delivery_status"],
                quality_score=raw_obs["quality_score"],
                noise_offset_x=raw_obs["noise_offset_x"],
                noise_offset_y=raw_obs["noise_offset_y"],
                trainee_payload=raw_obs["trainee_payload"],
                created_at=datetime.utcnow()
            )
            obs_objects.append(obs)

        db.bulk_save_objects(obs_objects)
        db.commit()
        db.refresh(run)
        return run

    @staticmethod
    def start_run(db: Session, run_id: str) -> SimulationRun:
        run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
        if not run:
            raise ValueError(f"Run {run_id} not found")
        if run.status in ["INITIALIZED", "PAUSED"]:
            run.status = "RUNNING"
            if not run.started_at:
                run.started_at = datetime.utcnow()
            db.commit()
            db.refresh(run)
            clock_manager.start_clock(run.id)
        return run

    @staticmethod
    def pause_run(db: Session, run_id: str) -> SimulationRun:
        run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
        if not run:
            raise ValueError(f"Run {run_id} not found")
        if run.status == "RUNNING":
            run.status = "PAUSED"
            db.commit()
            db.refresh(run)
            clock_manager.stop_clock(run.id)
        return run

    @staticmethod
    def resume_run(db: Session, run_id: str) -> SimulationRun:
        return SimulationService.start_run(db, run_id)

    @staticmethod
    def step_run(db: Session, run_id: str, step_seconds: float = 5.0) -> SimulationRun:
        run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
        if not run:
            raise ValueError(f"Run {run_id} not found")
        
        new_time = round(run.current_sim_time + step_seconds, 2)
        if new_time >= run.duration_seconds:
            run.current_sim_time = float(run.duration_seconds)
            run.status = "COMPLETED"
            run.completed_at = datetime.utcnow()
            clock_manager.stop_clock(run.id)
        else:
            run.current_sim_time = new_time
            if run.status == "INITIALIZED":
                run.status = "RUNNING"
                run.started_at = datetime.utcnow()

        db.commit()
        db.refresh(run)
        return run

    @staticmethod
    def seek_run(db: Session, run_id: str, target_time: float) -> SimulationRun:
        run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
        if not run:
            raise ValueError(f"Run {run_id} not found")
        clamped_time = round(max(0.0, min(float(run.duration_seconds), target_time)), 2)
        run.current_sim_time = clamped_time
        if clamped_time >= run.duration_seconds:
            run.status = "COMPLETED"
            run.completed_at = datetime.utcnow()
            clock_manager.stop_clock(run.id)
        elif run.status == "COMPLETED" and clamped_time < run.duration_seconds:
            run.status = "PAUSED"
        db.commit()
        db.refresh(run)
        return run

    @staticmethod
    def reset_run(db: Session, run_id: str) -> SimulationRun:
        run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
        if not run:
            raise ValueError(f"Run {run_id} not found")
        
        clock_manager.stop_clock(run.id)
        # Reset sim time and clear decisions
        run.current_sim_time = 0.0
        run.status = "INITIALIZED"
        run.overall_score = None
        run.summary_metrics = {}
        run.completed_at = None
        
        db.query(TraineeDecision).filter(TraineeDecision.run_id == run_id).delete()
        db.commit()
        db.refresh(run)
        return run

    @staticmethod
    def record_decision(
        db: Session,
        run_id: str,
        data: Dict[str, Any]
    ) -> TraineeDecision:
        run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
        if not run:
            raise ValueError(f"Run {run_id} not found")
            
        sim_time = data.get("simulation_time", run.current_sim_time)
        target_entity_id = data.get("target_entity_id")

        # Evidence-aware audit: What observations were DELIVERED to the trainee at or before sim_time?
        delivered_obs = db.query(Observation).filter(
            Observation.run_id == run_id,
            Observation.is_lost == False,
            Observation.delivered_at_sim_time <= sim_time
        ).all()

        delivered_for_target = [
            obs for obs in delivered_obs 
            if obs.trainee_payload.get("entity_id") == target_entity_id
        ]
        
        available_count = len(delivered_for_target)
        
        # Check if there were ground truth events for this target that were NOT delivered yet
        pending_delayed = db.query(Observation).filter(
            Observation.run_id == run_id,
            Observation.delivered_at_sim_time > sim_time,
            Observation.created_at_sim_time <= sim_time
        ).all()
        pending_for_target = [
            obs for obs in pending_delayed 
            if obs.trainee_payload.get("entity_id") == target_entity_id
        ]
        
        lost_obs = db.query(Observation).filter(
            Observation.run_id == run_id,
            Observation.is_lost == True,
            Observation.created_at_sim_time <= sim_time
        ).all()
        lost_for_target = [
            obs for obs in lost_obs 
            if obs.trainee_payload.get("entity_id") == target_entity_id
        ]
        
        if available_count >= 2:
            evidence_status = "ADEQUATE"
        elif len(pending_for_target) > 0:
            evidence_status = "EVIDENCE_DELAYED"
        elif len(lost_for_target) > 0:
            evidence_status = "EVIDENCE_LOST"
        else:
            evidence_status = "EVIDENCE_LIMITED" if available_count > 0 else "UNASSESSABLE"

        decision = TraineeDecision(
            id=str(uuid.uuid4()),
            run_id=run_id,
            target_entity_id=target_entity_id,
            simulation_time=sim_time,
            decision_type=data["decision_type"],
            selected_classification=data.get("selected_classification"),
            threat_assessment=data.get("threat_assessment"),
            confidence=data.get("confidence", 1.0),
            rationale=data.get("rationale"),
            referenced_observation_ids=[obs.id for obs in delivered_for_target],
            available_observation_count=available_count,
            evidence_status=evidence_status,
            created_at=datetime.utcnow()
        )
        db.add(decision)
        db.commit()
        db.refresh(decision)
        return decision

    @staticmethod
    def get_workspace_state(
        db: Session,
        run_id: str,
        is_evaluator: bool = False
    ) -> Dict[str, Any]:
        run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
        if not run:
            raise ValueError(f"Run {run_id} not found")

        curr_time = run.current_sim_time

        # Strictly filter observations delivered by current simulation time
        if is_evaluator:
            # Evaluator can see everything
            visible_obs = db.query(Observation).filter(
                Observation.run_id == run_id
            ).all()
        else:
            # Trainee only sees non-lost observations delivered on or before curr_time
            visible_obs = db.query(Observation).filter(
                Observation.run_id == run_id,
                Observation.is_lost == False,
                Observation.delivered_at_sim_time <= curr_time
            ).all()

        decisions = db.query(TraineeDecision).filter(
            TraineeDecision.run_id == run_id,
            TraineeDecision.simulation_time <= curr_time
        ).order_by(TraineeDecision.simulation_time.desc()).all()

        # Counts
        total_obs = db.query(Observation).filter(Observation.run_id == run_id).count()
        delivered_count = db.query(Observation).filter(
            Observation.run_id == run_id,
            Observation.is_lost == False,
            Observation.delivered_at_sim_time <= curr_time
        ).count()
        pending_delayed_count = db.query(Observation).filter(
            Observation.run_id == run_id,
            Observation.is_lost == False,
            Observation.delivered_at_sim_time > curr_time,
            Observation.created_at_sim_time <= curr_time
        ).count()
        lost_count = db.query(Observation).filter(
            Observation.run_id == run_id,
            Observation.is_lost == True,
            Observation.created_at_sim_time <= curr_time
        ).count()

        scenario_name = run.scenario.name if run.scenario else "Custom Seeded Run"

        result = {
            "run_state": {
                "id": run.id,
                "scenario_id": run.scenario_id,
                "scenario_name": scenario_name,
                "trainee_id": run.trainee_id,
                "status": run.status,
                "current_sim_time": run.current_sim_time,
                "duration_seconds": run.duration_seconds,
                "seed": run.seed,
                "active_threat_count": run.configuration_snapshot.get("num_entities", 5),
                "delivered_observations_count": delivered_count,
                "pending_delayed_count": pending_delayed_count,
                "lost_observations_count": lost_count,
                "trainee_decisions_count": len(decisions),
                "environment": run.configuration_snapshot.get("environment") or (run.scenario.environment if run.scenario else "urban"),
                "weather": run.configuration_snapshot.get("weather", "Clear Day"),
                "configuration_snapshot": run.configuration_snapshot,
                "overall_score": run.overall_score,
                "created_at": run.created_at,
                "started_at": run.started_at,
                "completed_at": run.completed_at
            },
            "visible_observations": visible_obs,
            "trainee_decisions": decisions,
            "evaluator_ground_truth": None
        }

        if is_evaluator:
            # Attach full ground truth for evaluator inspection only
            gt_events = db.query(GroundTruthEvent).filter(
                GroundTruthEvent.run_id == run_id
            ).order_by(GroundTruthEvent.simulation_time).all()
            result["evaluator_ground_truth"] = gt_events

        return result
