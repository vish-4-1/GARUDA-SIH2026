from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.simulation import SimulationRun
from app.schemas.simulation import (
    SimulationRunCreate,
    SimulationRunState,
    SimulationWorkspaceView
)
from app.engine.service import SimulationService

router = APIRouter(prefix="/runs", tags=["Simulation Runs"])


@router.post("", response_model=SimulationRunState, status_code=201)
def initialize_run(data: SimulationRunCreate, db: Session = Depends(get_db)):
    run = SimulationService.initialize_run(
        db=db,
        scenario_id=data.scenario_id,
        trainee_id=data.trainee_id,
        custom_seed=data.custom_seed,
        override_config=data.override_configuration
    )
    return SimulationService.get_workspace_state(db, run.id)["run_state"]


@router.get("", response_model=List[SimulationRunState])
def list_runs(
    status: Optional[str] = Query(None),
    trainee_id: Optional[str] = Query(None),
    db: Session = Depends(get_db)
):
    query = db.query(SimulationRun)
    if status:
        query = query.filter(SimulationRun.status == status)
    if trainee_id:
        query = query.filter(SimulationRun.trainee_id == trainee_id)
    
    runs = query.order_by(SimulationRun.created_at.desc()).all()
    out = []
    for r in runs:
        out.append(SimulationService.get_workspace_state(db, r.id)["run_state"])
    return out


@router.get("/{run_id}", response_model=SimulationRunState)
def get_run(run_id: str, db: Session = Depends(get_db)):
    run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Simulation run not found")
    return SimulationService.get_workspace_state(db, run.id)["run_state"]


@router.post("/{run_id}/start", response_model=SimulationRunState)
def start_run(run_id: str, db: Session = Depends(get_db)):
    try:
        run = SimulationService.start_run(db, run_id)
        return SimulationService.get_workspace_state(db, run.id)["run_state"]
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{run_id}/pause", response_model=SimulationRunState)
def pause_run(run_id: str, db: Session = Depends(get_db)):
    try:
        run = SimulationService.pause_run(db, run_id)
        return SimulationService.get_workspace_state(db, run.id)["run_state"]
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{run_id}/resume", response_model=SimulationRunState)
def resume_run(run_id: str, db: Session = Depends(get_db)):
    try:
        run = SimulationService.resume_run(db, run_id)
        return SimulationService.get_workspace_state(db, run.id)["run_state"]
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{run_id}/step", response_model=SimulationRunState)
def step_run(run_id: str, step_seconds: float = Query(5.0, ge=1.0, le=30.0), db: Session = Depends(get_db)):
    try:
        run = SimulationService.step_run(db, run_id, step_seconds=step_seconds)
        return SimulationService.get_workspace_state(db, run.id)["run_state"]
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{run_id}/seek", response_model=SimulationRunState)
def seek_run(run_id: str, target_time: float = Query(0.0, ge=0.0), db: Session = Depends(get_db)):
    try:
        run = SimulationService.seek_run(db, run_id, target_time=target_time)
        return SimulationService.get_workspace_state(db, run.id)["run_state"]
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/{run_id}/reset", response_model=SimulationRunState)
def reset_run(run_id: str, db: Session = Depends(get_db)):
    try:
        run = SimulationService.reset_run(db, run_id)
        return SimulationService.get_workspace_state(db, run.id)["run_state"]
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/{run_id}/workspace", response_model=SimulationWorkspaceView)
def get_workspace_view(
    run_id: str,
    evaluator_mode: bool = Query(False, description="Set True for evaluator review; False for trainee view"),
    db: Session = Depends(get_db)
):
    try:
        return SimulationService.get_workspace_state(db, run_id, is_evaluator=evaluator_mode)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
