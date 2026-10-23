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
    recommendations = AdaptiveRecommendationEngine.generate_recommendations(db, run_id)

    gt_count = db.query(GroundTruthEvent).filter(GroundTruthEvent.run_id == run_id).count()
    delivered_count = db.query(Observation).filter(Observation.run_id == run_id, Observation.is_lost == False).count()
    lost_count = db.query(Observation).filter(Observation.run_id == run_id, Observation.is_lost == True).count()
    dec_count = db.query(TraineeDecision).filter(TraineeDecision.run_id == run_id).count()

    summary = run.summary_metrics or {}
    evaluation_status = score_data.get("evaluation_status", "EVALUATED")
    strengths = []
    weaknesses = []

    if dec_count == 0:
        evaluation_status = "PENDING_DECISIONS"
        strengths.append("No operational engagements logged. Active simulation participation is required to evaluate tactical strengths.")
        weaknesses.append(
            f"Unengaged Threat Airspace: 0 trainee decisions logged across {gt_count} simulation events "
            f"({delivered_count} delivered to trainee radar/sensors, {lost_count} lost/jammed). "
            f"Hostile contacts remained unengaged."
        )
    else:
        # Metrics from score_data
        metrics_list = score_data.get("metrics", [])
        det_metric = next((m for m in metrics_list if getattr(m, "metric_category", None) == "DETECTION"), None)
        class_metric = next((m for m in metrics_list if getattr(m, "metric_category", None) == "CLASSIFICATION"), None)
        time_metric = next((m for m in metrics_list if getattr(m, "metric_category", None) == "TIMELINESS"), None)
        fa_rate = summary.get("false_alarm_rate", 0)
        blind_guesses = summary.get("unassessable_count", 0)

        # 1. Detection
        if det_metric:
            num = int(det_metric.numerator)
            den = int(det_metric.denominator)
            if den > 0:
                if num == den:
                    strengths.append(f"Perimeter Defense: Detected 100% ({num}/{den}) of observable hostile incursions (jammed/lost contacts excluded per protocol).")
                elif det_metric.score_value >= 80.0:
                    strengths.append(f"Perimeter Surveillance: Detected {det_metric.score_value}% ({num}/{den}) of observable hostile incursions.")
                else:
                    missed = den - num
                    weaknesses.append(f"Observable Threat Gaps: {missed} of {den} observable hostile drone(s) breached perimeter without engagement.")

        # 2. Classification
        if class_metric:
            num = int(class_metric.numerator)
            den = int(class_metric.denominator)
            if den > 0:
                if class_metric.score_value >= 80.0:
                    strengths.append(f"Classification Precision: Accurately identified {class_metric.score_value}% ({num}/{den}) of assessable contacts from delivered evidence.")
                else:
                    errors = den - num
                    weaknesses.append(f"Classification Inaccuracies: {errors} of {den} assessable target(s) misclassified. Cross-reference radar cross-section (RCS) and acoustic profiles.")

        # 3. False Alarms
        if fa_rate == 0:
            strengths.append("Zero False Alarms: Exercised positive target identification without targeting civilian drones or environmental clutter.")
        elif fa_rate > 10.0:
            weaknesses.append(f"False Alarm Discrepancies ({fa_rate}%): Non-hostile contacts or clutter were assessed or engaged as hostile threats. Verify Remote-ID beacons.")

        # 4. Evidence Discipline
        if blind_guesses == 0:
            strengths.append("Evidence Discipline: 100% of decisions were corroborated by delivered sensor evidence; zero blind guesses during sensor latency.")
        else:
            weaknesses.append(f"Premature Actions: Enacted {blind_guesses} decision(s) without prior delivered sensor evidence. Request sensor ping under jamming instead of guessing.")

        # 5. Timeliness
        if time_metric and time_metric.numerator > 0:
            latency_val = time_metric.numerator
            if latency_val <= 4.0:
                strengths.append(f"Rapid Response: Average engagement latency of {latency_val}s from observation delivery.")
            elif latency_val > 8.0:
                weaknesses.append(f"Tactical Hesitation: Average engagement response time of {latency_val}s exceeds the 4.0s target threshold.")

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
        "evaluation_status": evaluation_status,
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
