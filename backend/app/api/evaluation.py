from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.simulation import SimulationRun, GroundTruthEvent, Observation, TraineeDecision
from app.models.evaluation import TrainingRecommendation
from app.schemas.evaluation import OverallScoreOut, AfterActionReviewOut
from app.scoring.evaluator import EvidenceAwareScoringEngine
from app.recommender.engine import AdaptiveRecommendationEngine

router = APIRouter(prefix="/runs/{run_id}", tags=["Evaluation & Review"])


@router.post("/evaluate", response_model=OverallScoreOut)
def evaluate_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    score_result = EvidenceAwareScoringEngine.evaluate_run(db, run_id)
    # Automatically generate adaptive training recommendations based on gaps
    AdaptiveRecommendationEngine.generate_recommendations(db, run_id)
    return score_result


@router.get("/score", response_model=OverallScoreOut)
def get_run_score(run_id: str, db: Session = Depends(get_db)):
    run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    # If not evaluated yet or missing score, evaluate now
    return EvidenceAwareScoringEngine.evaluate_run(db, run_id)


@router.get("/review", response_model=AfterActionReviewOut)
def get_after_action_review(run_id: str, db: Session = Depends(get_db)):
    run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    # Evaluate score if needed
    score_data = EvidenceAwareScoringEngine.evaluate_run(db, run_id)
    recommendations = db.query(TrainingRecommendation).filter(TrainingRecommendation.run_id == run_id).all()
    if not recommendations:
        recommendations = AdaptiveRecommendationEngine.generate_recommendations(db, run_id)

    # Derive strengths & weaknesses from metrics
    summary = run.summary_metrics or {}
    strengths = []
    weaknesses = []

    if summary.get("detection_rate", 0) >= 80:
        strengths.append(f"Strong perimeter surveillance: {summary.get('detection_rate')}% of observable hostile drones detected.")
    else:
        weaknesses.append(f"Missed {round(100 - summary.get('detection_rate', 0), 1)}% of observable hostile drone incursions.")

    if summary.get("classification_accuracy", 0) >= 80:
        strengths.append(f"High classification accuracy: {summary.get('classification_accuracy')}% on assessable targets.")
    else:
        weaknesses.append("Classification error on incoming contacts; review radar cross section and acoustic profiles.")

    if summary.get("false_alarm_rate", 0) == 0:
        strengths.append("Zero false alarms: No civilian drones or wildlife clutter targeted.")
    elif summary.get("false_alarm_rate", 0) > 15:
        weaknesses.append(f"Excessive false alarm rate ({summary.get('false_alarm_rate')}%); verify Remote-ID beacons.")

    if summary.get("evidence_awareness_score", 0) >= 85:
        strengths.append("High degraded-information discipline: Exercised proper verification under packet loss.")
    else:
        weaknesses.append("Acted prematurely on unobservable or zero-evidence contacts; risk of collateral error.")

    gt_count = db.query(GroundTruthEvent).filter(GroundTruthEvent.run_id == run_id).count()
    delivered_count = db.query(Observation).filter(Observation.run_id == run_id, Observation.is_lost == False).count()
    lost_count = db.query(Observation).filter(Observation.run_id == run_id, Observation.is_lost == True).count()
    dec_count = db.query(TraineeDecision).filter(TraineeDecision.run_id == run_id).count()

    scenario_name = run.scenario.name if run.scenario else "Custom Seeded Run"
    difficulty = run.scenario.difficulty if run.scenario else "Intermediate"
    environment = run.scenario.environment if run.scenario else "urban"

    return {
        "run_id": run.id,
        "scenario_id": run.scenario_id,
        "scenario_name": scenario_name,
        "difficulty": difficulty,
        "environment": environment,
        "seed": run.seed,
        "trainee_id": run.trainee_id,
        "status": run.status,
        "duration_seconds": run.duration_seconds,
        "current_sim_time": run.current_sim_time,
        "overall_score": score_data["overall_score"],
        "score_breakdown": score_data,
        "recommendations": recommendations,
        "timeline_summary": {
            "ground_truth_events": gt_count,
            "delivered_observations": delivered_count,
            "lost_observations": lost_count,
            "trainee_decisions": dec_count
        },
        "strengths": strengths or ["Completed training mission under synthetic operating conditions."],
        "areas_for_improvement": weaknesses or ["Continue practicing on Advanced multi-threat scenarios."],
        "configuration_snapshot": run.configuration_snapshot or {}
    }
