from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.simulation import SimulationRun, TraineeDecision
from app.schemas.simulation import TraineeDecisionCreate, TraineeDecisionOut
from app.engine.service import SimulationService

router = APIRouter(prefix="/runs/{run_id}/decisions", tags=["Trainee Decisions"])


@router.post("", response_model=TraineeDecisionOut, status_code=201)
def record_trainee_decision(
    run_id: str,
    data: TraineeDecisionCreate,
    db: Session = Depends(get_db)
):
    try:
        decision = SimulationService.record_decision(
            db=db,
            run_id=run_id,
            data=data.model_dump()
        )
        return decision
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("", response_model=List[TraineeDecisionOut])
def list_trainee_decisions(
    run_id: str,
    db: Session = Depends(get_db)
):
    run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")
    
    return db.query(TraineeDecision).filter(
        TraineeDecision.run_id == run_id
    ).order_by(TraineeDecision.simulation_time).all()
