from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.database import get_db
from app.models.scenario import Scenario
from app.models.simulation import SimulationRun
from app.engine.service import SimulationService

router = APIRouter(prefix="/overview", tags=["Command Center Overview"])


@router.get("/stats")
def get_overview_statistics(db: Session = Depends(get_db)):
    total_scenarios = db.query(Scenario).filter(Scenario.status == "active").count()
    total_runs = db.query(SimulationRun).count()
    completed_runs_query = db.query(SimulationRun).filter(SimulationRun.status == "COMPLETED")
    completed_runs_count = completed_runs_query.count()

    # Calculate average score of completed runs
    avg_score_res = db.query(func.avg(SimulationRun.overall_score)).filter(
        SimulationRun.overall_score.isnot(None)
    ).scalar()
    avg_score = round(float(avg_score_res), 1) if avg_score_res is not None else 0.0

    # Difficulty distribution
    difficulty_counts = {
        "Beginner": db.query(Scenario).filter(Scenario.difficulty == "Beginner", Scenario.status == "active").count(),
        "Intermediate": db.query(Scenario).filter(Scenario.difficulty == "Intermediate", Scenario.status == "active").count(),
        "Advanced": db.query(Scenario).filter(Scenario.difficulty == "Advanced", Scenario.status == "active").count(),
    }

    # Environment distribution
    environment_counts = {
        "urban": db.query(Scenario).filter(Scenario.environment == "urban", Scenario.status == "active").count(),
        "coastal": db.query(Scenario).filter(Scenario.environment == "coastal", Scenario.status == "active").count(),
        "border": db.query(Scenario).filter(Scenario.environment == "border", Scenario.status == "active").count(),
        "rural": db.query(Scenario).filter(Scenario.environment == "rural", Scenario.status == "active").count(),
    }

    # Recent simulation runs
    recent_runs_db = db.query(SimulationRun).order_by(SimulationRun.created_at.desc()).limit(5).all()
    recent_runs = [
        SimulationService.get_workspace_state(db, r.id)["run_state"]
        for r in recent_runs_db
    ]

    return {
        "total_scenarios": total_scenarios,
        "total_simulation_runs": total_runs,
        "completed_runs": completed_runs_count,
        "average_score": avg_score,
        "difficulty_distribution": difficulty_counts,
        "environment_distribution": environment_counts,
        "recent_runs": recent_runs,
        "system_status": "OPERATIONAL",
        "evidence_engine_status": "ACTIVE_ISOLATION"
    }
