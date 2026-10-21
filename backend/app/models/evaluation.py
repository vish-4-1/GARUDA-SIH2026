import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base


class ScoringRecord(Base):
    __tablename__ = "scoring_records"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String(36), ForeignKey("simulation_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    metric_category = Column(String(50), nullable=False)  # DETECTION, CLASSIFICATION, TIMELINESS, EVIDENCE_AWARENESS, OVERALL
    metric_name = Column(String(60), nullable=False)
    score_value = Column(Float, nullable=False)  # 0.0 - 100.0 or ratio
    weight = Column(Float, default=1.0)
    
    numerator = Column(Float, default=0.0)
    denominator = Column(Float, default=0.0)
    formula_description = Column(Text, nullable=False)
    
    # Evidence awareness metrics
    evidence_limited_count = Column(Integer, default=0)
    unassessable_count = Column(Integer, default=0)
    calculation_details = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("SimulationRun", back_populates="scoring_records")


class TrainingRecommendation(Base):
    __tablename__ = "training_recommendations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String(36), ForeignKey("simulation_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    target_skill = Column(String(80), nullable=False)
    gap_type = Column(String(60), nullable=False)  # MISSED_DETECTIONS, FALSE_ALARMS, SLOW_REACTION, DEGRADED_INFO_PANIC, LOW_CONFIDENCE
    priority = Column(String(20), default="HIGH")  # HIGH, MEDIUM, LOW
    
    reason = Column(Text, nullable=False)
    recommended_difficulty = Column(String(30), default="Intermediate")
    learning_objective = Column(Text, nullable=False)
    
    # Ready-to-launch scenario configuration preset
    suggested_scenario_config = Column(JSON, nullable=False, default=dict)
    
    is_launched = Column(Boolean, default=False)
    launched_run_id = Column(String(36), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("SimulationRun", back_populates="recommendations")
