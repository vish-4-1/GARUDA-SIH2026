from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.simulation import SimulationRun, GroundTruthEvent, Observation, TraineeDecision
from app.schemas.simulation import ObservationOut

router = APIRouter(prefix="/runs/{run_id}", tags=["Observations & Timeline"])


@router.get("/observations", response_model=List[ObservationOut])
def get_observations(
    run_id: str,
    status: Optional[str] = Query(None, description="DELIVERED, DELAYED, LOST"),
    sensor_type: Optional[str] = Query(None),
    trainee_visible_only: bool = Query(False),
    db: Session = Depends(get_db)
):
    run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    query = db.query(Observation).filter(Observation.run_id == run_id)
    if status:
        query = query.filter(Observation.delivery_status == status)
    if sensor_type:
        query = query.filter(Observation.sensor_type == sensor_type)
    if trainee_visible_only:
        query = query.filter(
            Observation.is_lost == False,
            Observation.delivered_at_sim_time <= run.current_sim_time
        )
    return query.order_by(Observation.delivered_at_sim_time).all()


@router.get("/timeline")
def get_evidence_timeline(
    run_id: str,
    filter_type: Optional[str] = Query(None, description="all, delivered, delayed, lost, decisions, ground_truth"),
    role: str = Query("evaluator", description="evaluator or trainee"),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    is_evaluator = (role.lower() == "evaluator")

    # Fetch ground truth events (strictly restricted to evaluator role)
    gt_events = []
    if is_evaluator:
        gt_events = db.query(GroundTruthEvent).filter(GroundTruthEvent.run_id == run_id).order_by(GroundTruthEvent.simulation_time).all()

    # Fetch observations
    obs_query = db.query(Observation).filter(Observation.run_id == run_id)
    if not is_evaluator:
        # Trainee view: strictly delivered observations up to current sim time, never lost or future packets
        obs_query = obs_query.filter(
            Observation.is_lost == False,
            Observation.delivered_at_sim_time <= run.current_sim_time
        )
    observations = obs_query.order_by(Observation.delivered_at_sim_time).all()

    # Fetch decisions
    decisions = db.query(TraineeDecision).filter(TraineeDecision.run_id == run_id).order_by(TraineeDecision.simulation_time).all()

    timeline_items = []

    # Map ground truth events (Evaluator only)
    if is_evaluator:
        for gt in gt_events:
            timeline_items.append({
                "timeline_id": f"gt-{gt.id}",
                "item_type": "GROUND_TRUTH_EVENT",
                "timestamp": gt.simulation_time,
                "entity_id": gt.entity_id,
                "title": f"Ground Truth: {gt.event_type}",
                "description": f"{gt.threat_category} ({'Hostile' if gt.is_hostile else 'Non-Hostile'}) at ({gt.pos_x}m, {gt.pos_y}m), Alt: {gt.altitude}m",
                "is_evaluator_only": True,
                "metadata": {
                    "ground_truth_id": gt.id,
                    "is_hostile": gt.is_hostile,
                    "threat_level": gt.threat_level,
                    "speed": gt.speed,
                    "heading": gt.heading,
                    "payload": gt.event_payload
                }
            })

    # Map observations
    for obs in observations:
        status_label = obs.delivery_status
        is_trainee_visible = (not obs.is_lost and obs.delivered_at_sim_time <= run.current_sim_time)
        timeline_items.append({
            "timeline_id": f"obs-{obs.id}",
            "item_type": f"OBSERVATION_{status_label}",
            "timestamp": obs.delivered_at_sim_time,
            "created_at_sim_time": obs.created_at_sim_time,
            "delay_applied": obs.delay_applied,
            "entity_id": obs.trainee_payload.get("entity_id", "Unknown"),
            "title": f"Sensor Packet: {obs.sensor_type} [{status_label}]",
            "description": f"Delay: {obs.delay_applied}s | Quality: {int(obs.quality_score * 100)}% | Noise: ({obs.noise_offset_x}m, {obs.noise_offset_y}m)",
            "is_evaluator_only": obs.is_lost,
            "is_trainee_visible": is_trainee_visible,
            "metadata": {
                "observation_id": obs.id,
                "source_event_id": obs.source_event_id,
                "sensor_type": obs.sensor_type,
                "is_lost": obs.is_lost,
                "quality_score": obs.quality_score,
                "noise_offset_x": obs.noise_offset_x,
                "noise_offset_y": obs.noise_offset_y,
                "trainee_payload": obs.trainee_payload
            }
        })

    # Map decisions
    for d in decisions:
        timeline_items.append({
            "timeline_id": f"dec-{d.id}",
            "item_type": "TRAINEE_DECISION",
            "timestamp": d.simulation_time,
            "entity_id": d.target_entity_id,
            "title": f"Trainee Decision: {d.decision_type}",
            "description": f"Target: {d.target_entity_id} | Class: {d.selected_classification or 'N/A'} | Assessment: {d.threat_assessment or 'N/A'} | Evidence: {d.evidence_status}",
            "is_evaluator_only": False,
            "is_trainee_visible": True,
            "metadata": {
                "decision_id": d.id,
                "confidence": d.confidence,
                "rationale": d.rationale,
                "evidence_status": d.evidence_status,
                "available_observation_count": d.available_observation_count,
                "referenced_observation_ids": d.referenced_observation_ids
            }
        })

    # Sort all items by timestamp (primary) and entity_id (secondary)
    timeline_items.sort(key=lambda x: (x["timestamp"], 0 if x["item_type"] == "GROUND_TRUTH_EVENT" else 1, x.get("entity_id", "")))

    # Compute category counts across all eligible items for this role
    counts = {
        "all": len(timeline_items),
        "delivered": sum(1 for x in timeline_items if x["item_type"] == "OBSERVATION_DELIVERED"),
        "delayed": sum(1 for x in timeline_items if x["item_type"] == "OBSERVATION_DELAYED"),
        "lost": sum(1 for x in timeline_items if x["item_type"] == "OBSERVATION_LOST"),
        "decisions": sum(1 for x in timeline_items if x["item_type"] == "TRAINEE_DECISION"),
        "ground_truth": sum(1 for x in timeline_items if x["item_type"] == "GROUND_TRUTH_EVENT"),
    }

    # Apply filter if provided
    filtered_items = timeline_items
    if filter_type == "delivered":
        filtered_items = [x for x in timeline_items if x["item_type"] == "OBSERVATION_DELIVERED"]
    elif filter_type == "delayed":
        filtered_items = [x for x in timeline_items if x["item_type"] == "OBSERVATION_DELAYED"]
    elif filter_type == "lost":
        filtered_items = [x for x in timeline_items if x["item_type"] == "OBSERVATION_LOST"]
    elif filter_type == "decisions":
        filtered_items = [x for x in timeline_items if x["item_type"] == "TRAINEE_DECISION"]
    elif filter_type == "ground_truth":
        filtered_items = [x for x in timeline_items if x["item_type"] == "GROUND_TRUTH_EVENT"]

    return {
        "run_id": run.id,
        "current_sim_time": run.current_sim_time,
        "total_items": len(filtered_items),
        "counts": counts,
        "role": role,
        "timeline": filtered_items
    }
