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
from fastapi import WebSocket, WebSocketDisconnect
import asyncio


@asynccontextmanager
async def lifespan(app: FastAPI):
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
    description="AI-Enabled Drone & Counter-Drone Threat Simulation Trainer (SIH26247). Generative AI for Realistic Unmanned-threat Detection and Assessment.",
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
    try:
        while True:
            db = SessionLocal()
            try:
                tick = get_live_telemetry_tick(run_id=run_id, db=db)
                await websocket.send_text(tick.model_dump_json())
            finally:
                db.close()
            await asyncio.sleep(0.5)  # 2 Hz telemetry stream over WS
    except (WebSocketDisconnect, Exception):
        pass


@app.get("/")
def root():
    return {
        "project": "GARUDA",
        "description": "AI-Enabled Drone & Counter-Drone Threat Simulation Trainer",
        "problem_statement_id": "SIH26247",
        "team": "DareDevils",
        "status": "OPERATIONAL",
        "docs": "/docs"
    }


@app.get("/api/health")
def health_check():
    return {"status": "healthy", "database": "connected"}
