import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.scenario import Scenario, ScenarioConfiguration
from app.models.simulation import SimulationRun
from app.models.evaluation import TrainingRecommendation
from app.schemas.evaluation import TrainingRecommendationOut
from app.schemas.simulation import SimulationRunState
from app.engine.service import SimulationService

router = APIRouter(prefix="/training", tags=["Adaptive Training"])


@router.get("/recommendations", response_model=List[TrainingRecommendationOut])
def list_recommendations(
    run_id: Optional[str] = Query(None),
    unlaunched_only: bool = Query(False),
    deduplicate: bool = Query(True),
    db: Session = Depends(get_db)
):
    query = db.query(TrainingRecommendation)
    if run_id:
        query = query.filter(TrainingRecommendation.run_id == run_id)
    if unlaunched_only:
        query = query.filter(TrainingRecommendation.is_launched == False)
    all_recs = query.order_by(TrainingRecommendation.created_at.desc()).all()

    if not deduplicate:
        return all_recs

    # Deduplication and deterministic ordering
    priority_weights = {"HIGH": 3, "MEDIUM": 2, "LOW": 1}

    # Fetch launched run info for progression tracking
    launched_ids = [r.launched_run_id for r in all_recs if r.launched_run_id]
    launched_map = {}
    if launched_ids:
        launched_runs = db.query(SimulationRun).filter(SimulationRun.id.in_(launched_ids)).all()
        launched_map = {lr.id: lr for lr in launched_runs}

    if run_id:
        # Deduplicate within this single run by gap_type
        seen_gaps = set()
        deduped = []
        for r in all_recs:
            if r.gap_type not in seen_gaps:
                seen_gaps.add(r.gap_type)
                lrun = launched_map.get(r.launched_run_id)
                out_dict = {
                    "id": r.id,
                    "run_id": r.run_id,
                    "target_skill": r.target_skill,
                    "gap_type": r.gap_type,
                    "priority": r.priority,
                    "reason": r.reason,
                    "recommended_difficulty": r.recommended_difficulty,
                    "learning_objective": r.learning_objective,
                    "suggested_scenario_config": r.suggested_scenario_config,
                    "is_launched": r.is_launched,
                    "launched_run_id": r.launched_run_id,
                    "launched_run_score": lrun.overall_score if lrun else None,
                    "launched_run_status": lrun.status if lrun else None,
                    "occurrence_count": 1,
                    "source_runs": [r.run_id],
                    "created_at": r.created_at
                }
                deduped.append(out_dict)
        deduped.sort(
            key=lambda x: (
                priority_weights.get(x["priority"], 0),
                x["created_at"].timestamp() if x["created_at"] else 0
            ),
            reverse=True
        )
        return deduped
    else:
        # Aggregated across all runs: group by (gap_type, target_skill, recommended_difficulty)
        groups = {}
        for r in all_recs:
            sig = (r.gap_type, r.target_skill, r.recommended_difficulty)
            if sig not in groups:
                groups[sig] = []
            groups[sig].append(r)

        deduped = []
        for sig, items in groups.items():
            primary = items[0]
            source_runs = list(dict.fromkeys(r.run_id for r in items))
            occ_count = len(items)

            reason_text = primary.reason
            if occ_count > 1 and "Recurring" not in reason_text:
                reason_text = f"Recurring Deficit ({occ_count} runs): {primary.reason}"

            lrun = launched_map.get(primary.launched_run_id)
            out_dict = {
                "id": primary.id,
                "run_id": primary.run_id,
                "target_skill": primary.target_skill,
                "gap_type": primary.gap_type,
                "priority": primary.priority,
                "reason": reason_text,
                "recommended_difficulty": primary.recommended_difficulty,
                "learning_objective": primary.learning_objective,
                "suggested_scenario_config": primary.suggested_scenario_config,
                "is_launched": primary.is_launched,
                "launched_run_id": primary.launched_run_id,
                "launched_run_score": lrun.overall_score if lrun else None,
                "launched_run_status": lrun.status if lrun else None,
                "occurrence_count": occ_count,
                "source_runs": source_runs,
                "created_at": primary.created_at
            }
            deduped.append(out_dict)

        deduped.sort(
            key=lambda x: (
                priority_weights.get(x["priority"], 0),
                x["occurrence_count"],
                x["created_at"].timestamp() if x["created_at"] else 0
            ),
            reverse=True
        )
        return deduped


@router.post("/recommendations/{recommendation_id}/launch", response_model=SimulationRunState)
def launch_recommended_training(
    recommendation_id: str,
    db: Session = Depends(get_db)
):
    rec = db.query(TrainingRecommendation).filter(TrainingRecommendation.id == recommendation_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Recommendation not found")

    cfg_data = rec.suggested_scenario_config
    # Create a new tailored scenario for this drill
    scenario_id = str(uuid.uuid4())
    scenario = Scenario(
        id=scenario_id,
        name=cfg_data.get("name", f"Adaptive Drill: {rec.target_skill}"),
        description=f"Automated adaptive drill generated by GARUDA: {rec.learning_objective}",
        environment=cfg_data.get("environment", "urban"),
        difficulty=rec.recommended_difficulty,
        duration_seconds=cfg_data.get("duration_seconds", 120),
        seed=cfg_data.get("seed", 777),
        status="active",
        is_preset=0
    )
    db.add(scenario)
    db.flush()

    cfg = ScenarioConfiguration(
        id=str(uuid.uuid4()),
        scenario_id=scenario.id,
        num_entities=cfg_data.get("num_entities", 5),
        threat_density=cfg_data.get("threat_density", "medium"),
        sensor_reliability=cfg_data.get("sensor_reliability", 0.85),
        observation_delay_mean=cfg_data.get("observation_delay_mean", 2.0),
        observation_delay_jitter=cfg_data.get("observation_delay_jitter", 0.5),
        observation_loss_rate=cfg_data.get("observation_loss_rate", 0.10),
        noise_level=cfg_data.get("noise_level", 0.15),
        weather=cfg_data.get("weather", "Clear Day"),
        radar_coverage_percent=cfg_data.get("radar_coverage_percent", 90.0),
        rf_scanner_enabled=1,
        acoustic_sensor_enabled=1,
        optical_eoir_enabled=1
    )
    db.add(cfg)
    db.commit()

    # Launch new run from this tailored scenario
    new_run = SimulationService.initialize_run(
        db=db,
        scenario_id=scenario.id,
        trainee_id="Trainee-Alpha",
        custom_seed=scenario.seed,
        override_config=cfg_data
    )

    rec.is_launched = True
    rec.launched_run_id = new_run.id
    db.commit()

    return SimulationService.get_workspace_state(db, new_run.id)["run_state"]
