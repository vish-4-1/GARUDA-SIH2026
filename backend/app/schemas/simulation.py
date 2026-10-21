from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class SimulationRunCreate(BaseModel):
    scenario_id: Optional[str] = None
    trainee_id: str = "Trainee-Alpha"
    custom_seed: Optional[int] = None
    override_configuration: Optional[Dict[str, Any]] = None


class GroundTruthEventOut(BaseModel):
    id: str
    run_id: str
    simulation_time: float
    entity_id: str
    event_type: str
    is_hostile: bool
    threat_category: str
    threat_level: str
    pos_x: float
    pos_y: float
    altitude: float
    speed: float
    heading: float
    event_payload: Dict[str, Any]

    class Config:
        from_attributes = True


class ObservationOut(BaseModel):
    id: str
    run_id: str
    source_event_id: Optional[str] = None
    created_at_sim_time: float
    delivered_at_sim_time: float
    sensor_type: str
    delay_applied: float
    is_lost: bool
    delivery_status: str
    quality_score: float
    trainee_payload: Dict[str, Any]

    class Config:
        from_attributes = True


class TraineeDecisionCreate(BaseModel):
    target_entity_id: Optional[str] = None
    simulation_time: float = Field(..., ge=0.0)
    decision_type: str = Field(..., description="CLASSIFY, MARK_UNCERTAIN, REQUEST_PING, ENGAGE_COUNTERMEASURE, FLAG_FALSE_ALARM, IGNORE")
    selected_classification: Optional[str] = None
    threat_assessment: Optional[str] = None
    confidence: float = Field(1.0, ge=0.0, le=1.0)
    rationale: Optional[str] = None
    referenced_observation_ids: Optional[List[str]] = None


class TraineeDecisionOut(BaseModel):
    id: str
    run_id: str
    target_entity_id: Optional[str]
    simulation_time: float
    decision_type: str
    selected_classification: Optional[str]
    threat_assessment: Optional[str]
    confidence: float
    rationale: Optional[str]
    referenced_observation_ids: List[str]
    available_observation_count: int
    evidence_status: str
    created_at: datetime

    class Config:
        from_attributes = True


class SimulationRunState(BaseModel):
    id: str
    scenario_id: Optional[str]
    scenario_name: Optional[str] = None
    trainee_id: str
    status: str
    current_sim_time: float
    duration_seconds: int
    seed: int
    active_threat_count: int = 0
    delivered_observations_count: int = 0
    pending_delayed_count: int = 0
    lost_observations_count: int = 0
    trainee_decisions_count: int = 0
    environment: Optional[str] = "urban"
    weather: Optional[str] = "Clear Day"
    configuration_snapshot: Optional[Dict[str, Any]] = None
    overall_score: Optional[float] = None
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class SimulationWorkspaceView(BaseModel):
    run_state: SimulationRunState
    visible_observations: List[ObservationOut]
    trainee_decisions: List[TraineeDecisionOut]
    # In evaluator mode only, ground truth entities and events are attached
    evaluator_ground_truth: Optional[List[GroundTruthEventOut]] = None
