from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.schemas.simulation import ObservationOut, TraineeDecisionOut, GroundTruthEventOut


class ScoringRecordOut(BaseModel):
    id: str
    run_id: str
    metric_category: str
    metric_name: str
    score_value: float
    weight: float
    numerator: float
    denominator: float
    formula_description: str
    evidence_limited_count: int
    unassessable_count: int
    calculation_details: Dict[str, Any]

    class Config:
        from_attributes = True


class DecisionEvaluationItem(BaseModel):
    decision_id: str
    target_entity_id: Optional[str]
    simulation_time: float
    decision_type: str
    selected_classification: Optional[str]
    actual_ground_truth_category: Optional[str]
    actual_is_hostile: Optional[bool]
    confidence: float
    is_correct: bool
    evidence_status: str  # ADEQUATE, EVIDENCE_DELAYED, EVIDENCE_LOST, UNASSESSABLE
    delivered_evidence_count_at_decision: int
    scoring_notes: str


class OverallScoreOut(BaseModel):
    run_id: str
    trainee_id: str
    overall_score: float
    detection_score: float
    classification_score: float
    timeliness_score: float
    evidence_awareness_score: float
    summary_metrics: Optional[Dict[str, Any]] = None
    engine_metadata: Optional[Dict[str, Any]] = None
    evaluation_status: Optional[str] = "EVALUATED"
    metrics: List[ScoringRecordOut]
    decision_evaluations: List[DecisionEvaluationItem]
    evidence_aware_disclaimer: str


class TrainingRecommendationOut(BaseModel):
    id: str
    run_id: str
    target_skill: str
    gap_type: str
    priority: str
    reason: str
    recommended_difficulty: str
    learning_objective: str
    suggested_scenario_config: Dict[str, Any]
    is_launched: bool = False
    launched_run_id: Optional[str] = None
    launched_run_score: Optional[float] = None
    launched_run_status: Optional[str] = None
    occurrence_count: Optional[int] = 1
    source_runs: Optional[List[str]] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class AfterActionReviewOut(BaseModel):
    run_id: str
    scenario_id: Optional[str]
    scenario_name: str
    difficulty: str
    environment: str
    seed: int
    trainee_id: str
    status: str
    duration_seconds: int
    current_sim_time: float
    overall_score: float
    evaluation_status: Optional[str] = "EVALUATED"
    score_breakdown: OverallScoreOut
    recommendations: List[TrainingRecommendationOut]
    timeline_summary: Dict[str, int]
    strengths: List[str]
    areas_for_improvement: List[str]
    configuration_snapshot: Dict[str, Any]
