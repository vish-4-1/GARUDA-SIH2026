import io
import csv
import json
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, JSONResponse
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.simulation import SimulationRun, GroundTruthEvent, Observation, TraineeDecision
from app.scoring.evaluator import EvidenceAwareScoringEngine

router = APIRouter(prefix="/runs/{run_id}", tags=["Reports & Exports"])


@router.get("/export.json")
def export_run_json(run_id: str, db: Session = Depends(get_db)):
    run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    score_data = EvidenceAwareScoringEngine.evaluate_run(db, run_id)
    gt_events = db.query(GroundTruthEvent).filter(GroundTruthEvent.run_id == run_id).all()
    observations = db.query(Observation).filter(Observation.run_id == run_id).all()
    decisions = db.query(TraineeDecision).filter(TraineeDecision.run_id == run_id).all()

    report = {
        "export_metadata": {
            "system": "GARUDA Threat Simulation Trainer",
            "problem_statement": "SIH26247",
            "version": "1.0.0",
        },
        "run_summary": {
            "run_id": run.id,
            "scenario_id": run.scenario_id,
            "scenario_name": run.scenario.name if run.scenario else "Custom Seeded Run",
            "trainee_id": run.trainee_id,
            "seed": run.seed,
            "duration_seconds": run.duration_seconds,
            "status": run.status,
            "overall_score": run.overall_score,
            "configuration": run.configuration_snapshot,
            "metrics": run.summary_metrics,
        },
        "evidence_aware_scoring": score_data,
        "ground_truth_events": [
            {
                "id": g.id,
                "simulation_time": g.simulation_time,
                "entity_id": g.entity_id,
                "event_type": g.event_type,
                "is_hostile": g.is_hostile,
                "threat_category": g.threat_category,
                "pos_x": g.pos_x,
                "pos_y": g.pos_y,
                "altitude": g.altitude,
                "speed": g.speed,
                "heading": g.heading,
            }
            for g in gt_events
        ],
        "sensor_observations": [
            {
                "id": o.id,
                "source_event_id": o.source_event_id,
                "created_at_sim_time": o.created_at_sim_time,
                "delivered_at_sim_time": o.delivered_at_sim_time,
                "sensor_type": o.sensor_type,
                "delay_applied": o.delay_applied,
                "is_lost": o.is_lost,
                "delivery_status": o.delivery_status,
                "quality_score": o.quality_score,
                "trainee_payload": o.trainee_payload,
            }
            for o in observations
        ],
        "trainee_decisions": [
            {
                "id": d.id,
                "simulation_time": d.simulation_time,
                "target_entity_id": d.target_entity_id,
                "decision_type": d.decision_type,
                "selected_classification": d.selected_classification,
                "threat_assessment": d.threat_assessment,
                "confidence": d.confidence,
                "evidence_status": d.evidence_status,
                "available_observation_count": d.available_observation_count,
            }
            for d in decisions
        ]
    }

    return Response(
        content=json.dumps(report, indent=2, default=str),
        media_type="application/json",
        headers={"Content-Disposition": f"attachment; filename=garuda_run_{run_id[:8]}_report.json"}
    )


@router.get("/export.csv")
def export_run_csv(run_id: str, db: Session = Depends(get_db)):
    run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    score_data = EvidenceAwareScoringEngine.evaluate_run(db, run_id)
    output = io.StringIO()
    writer = csv.writer(output)

    # Mission header
    writer.writerow(["GARUDA Threat Simulation Trainer - Mission Evaluation Report"])
    writer.writerow(["Run ID", run.id])
    writer.writerow(["Scenario", run.scenario.name if run.scenario else "Custom"])
    writer.writerow(["Trainee ID", run.trainee_id])
    writer.writerow(["Seed", run.seed])
    writer.writerow(["Overall Score", run.overall_score or "N/A"])
    writer.writerow([])

    # Metrics section
    writer.writerow(["METRIC BREAKDOWN"])
    writer.writerow(["Metric Category", "Metric Name", "Score", "Numerator", "Denominator", "Formula"])
    for rec in score_data.get("metrics", []):
        writer.writerow([
            rec.metric_category,
            rec.metric_name,
            rec.score_value,
            rec.numerator,
            rec.denominator,
            rec.formula_description
        ])
    writer.writerow([])

    # Decisions audit
    writer.writerow(["DECISION-BY-DECISION EVIDENCE AUDIT"])
    writer.writerow([
        "Sim Time (s)", "Target ID", "Decision Type", "Classification", 
        "Ground Truth Category", "Hostile?", "Correct?", "Evidence Status", 
        "Delivered Packets Count", "Audit Notes"
    ])
    for item in score_data.get("decision_evaluations", []):
        writer.writerow([
            item["simulation_time"],
            item["target_entity_id"],
            item["decision_type"],
            item["selected_classification"] or "N/A",
            item["actual_ground_truth_category"],
            "HOSTILE" if item["actual_is_hostile"] else "NON-HOSTILE",
            "YES" if item["is_correct"] else "NO",
            item["evidence_status"],
            item["delivered_evidence_count_at_decision"],
            item["scoring_notes"]
        ])

    csv_content = output.getvalue()
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=garuda_run_{run_id[:8]}_audit.csv"}
    )
