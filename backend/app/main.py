from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.database import engine, Base, SessionLocal
from app.models import (
    Scenario, ScenarioConfiguration,
    SimulationRun, GroundTruthEvent, Observation, TraineeDecision,
    ScoringRecord, TrainingRecommendation
)
from app.seed import seed_demo_scenarios

from app.api.scenarios import router as scenarios_router
from app.api.runs import router as runs_router
from app.api.observations import router as observations_router
from app.api.decisions import router as decisions_router
from app.api.evaluation import router as evaluation_router
from app.api.training import router as training_router
from app.api.reports import router as reports_router
from app.api.overview import router as overview_router
from app.api.assessment import router as assessment_router
from app.api.telemetry import router as telemetry_router, get_live_telemetry_tick
import logging
import asyncio
from fastapi import WebSocket, WebSocketDisconnect, HTTPException
from app.engine.clock import clock_manager

logger = logging.getLogger("garuda.main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Capture main event loop for authoritative background clock tasks
    clock_manager.set_loop(asyncio.get_running_loop())
    # Initialize database tables
    Base.metadata.create_all(bind=engine)
    # Seed demonstration scenarios
    db = SessionLocal()
    try:
        seed_demo_scenarios(db)
    finally:
        db.close()
    yield


app = FastAPI(
    title="GARUDA — Threat Simulation Trainer API",
    description="AI-Enabled Drone & Counter-Drone Threat Simulation Trainer. Real-time tactical kinematics, degraded evidence analysis, decision assessment, and adaptive training.",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(overview_router, prefix=settings.API_V1_STR)
app.include_router(scenarios_router, prefix=settings.API_V1_STR)
app.include_router(runs_router, prefix=settings.API_V1_STR)
app.include_router(observations_router, prefix=settings.API_V1_STR)
app.include_router(decisions_router, prefix=settings.API_V1_STR)
app.include_router(evaluation_router, prefix=settings.API_V1_STR)
app.include_router(training_router, prefix=settings.API_V1_STR)
app.include_router(reports_router, prefix=settings.API_V1_STR)
app.include_router(assessment_router, prefix=settings.API_V1_STR)
app.include_router(telemetry_router, prefix=settings.API_V1_STR)


@app.websocket("/api/ws/simulation/{run_id}")
async def websocket_simulation_telemetry(websocket: WebSocket, run_id: str):
    """
    Real-time WebSocket telemetry transport broadcasting authoritative 3D simulation ticks.
    """
    await websocket.accept()
    # Verify simulation run exists before initiating stream
    db = SessionLocal()
    try:
        run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
        if not run:
            await websocket.send_json({"error": "Run not found", "run_id": run_id})
            await websocket.close(code=1008)
            return
    finally:
        db.close()

    try:
        while True:
            db = SessionLocal()
            try:
                tick = get_live_telemetry_tick(run_id=run_id, db=db)
                await websocket.send_text(tick.model_dump_json())
            except HTTPException:
                break
            finally:
                db.close()
            await asyncio.sleep(0.5)  # 2 Hz telemetry stream over WS
    except (WebSocketDisconnect, asyncio.CancelledError):
        pass
    except Exception as e:
        logger.warning(f"WebSocket telemetry error for {run_id}: {e}")


@app.get("/")
def root():
    return {
        "project": "GARUDA",
        "description": "AI-Enabled Drone & Counter-Drone Threat Simulation Trainer",
        "platform": "Autonomous Counter-UAS Simulation & Evaluation Rig",
        "version": "1.0.0",
        "status": "OPERATIONAL",
        "docs": "/docs"
    }


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "database": "connected"}
