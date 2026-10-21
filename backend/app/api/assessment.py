from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from typing import Dict, Any

from app.core.database import get_db
from app.models.simulation import SimulationRun

router = APIRouter(prefix="/assessment", tags=["Unit & Individual Assessment"])


@router.get("/unit-summary")
def get_unit_summary(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """
    SIH26247 Requirement 6:
    Maintain individual session histories and aggregate performance across multiple trainees.
    Provide unit-level summaries only when multiple trainee records exist.
    Display N/A when there is insufficient data instead of inventing aggregate statistics.
    """
    scored_runs = db.query(SimulationRun).filter(SimulationRun.overall_score.isnot(None)).all()

    trainee_map: Dict[str, list] = {}
    for r in scored_runs:
        tid = r.trainee_id or "Anonymous"
        trainee_map.setdefault(tid, []).append(r)

    unique_trainees_count = len(trainee_map)
    total_missions_evaluated = len(scored_runs)

    # Unit summaries only when multiple trainee records exist (>= 2 distinct trainees)
    has_sufficient_unit_data = (unique_trainees_count >= 2)

    individual_profiles = [
        {
            "trainee_id": tid,
            "runs_count": len(runs),
            "mean_score": round(sum(r.overall_score for r in runs) / len(runs), 1),
            "best_score": round(max(r.overall_score for r in runs), 1),
            "latest_run_id": runs[0].id,
            "status": "Verified Trainee Record"
        }
        for tid, runs in trainee_map.items()
    ]

    if not has_sufficient_unit_data:
        return {
            "has_sufficient_unit_data": False,
            "unique_trainees_count": unique_trainees_count,
            "total_missions_evaluated": total_missions_evaluated,
            "unit_readiness_score": "N/A",
            "unit_mean_detection_rate": "N/A",
            "unit_mean_classification_accuracy": "N/A",
            "unit_mean_latency_s": "N/A",
            "notice": "Unit-level aggregate summary requires records from multiple distinct trainees. Displaying N/A per SIH data integrity standards.",
            "individual_trainees": individual_profiles
        }

    # Multiple trainees confirmed: compute truthful unit-level arithmetic aggregates
    all_scores = [r.overall_score for r in scored_runs]
    unit_readiness_score = round(sum(all_scores) / len(all_scores), 1)

    detection_rates = [
        r.summary_metrics.get("detection_rate", 0)
        for r in scored_runs if r.summary_metrics and "detection_rate" in r.summary_metrics
    ]
    accuracies = [
        r.summary_metrics.get("classification_accuracy", 0)
        for r in scored_runs if r.summary_metrics and "classification_accuracy" in r.summary_metrics
    ]
    latencies = [
        r.summary_metrics.get("mean_response_latency_s", 0)
        for r in scored_runs if r.summary_metrics and "mean_response_latency_s" in r.summary_metrics
    ]

    return {
        "has_sufficient_unit_data": True,
        "unique_trainees_count": unique_trainees_count,
        "total_missions_evaluated": total_missions_evaluated,
        "unit_readiness_score": f"{unit_readiness_score}%",
        "unit_mean_detection_rate": f"{round(sum(detection_rates) / len(detection_rates), 1)}%" if detection_rates else "N/A",
        "unit_mean_classification_accuracy": f"{round(sum(accuracies) / len(accuracies), 1)}%" if accuracies else "N/A",
        "unit_mean_latency_s": f"{round(sum(latencies) / len(latencies), 2)}s" if latencies else "N/A",
        "notice": f"Unit-level aggregate computed across {unique_trainees_count} verified trainees and {total_missions_evaluated} completed missions.",
        "individual_trainees": individual_profiles
    }
