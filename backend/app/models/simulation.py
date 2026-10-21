import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, JSON, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from app.core.database import Base


class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scenario_id = Column(String(36), ForeignKey("scenarios.id", ondelete="SET NULL"), nullable=True)
    trainee_id = Column(String(60), default="Trainee-Alpha", nullable=False)
    status = Column(String(20), default="INITIALIZED")  # INITIALIZED, RUNNING, PAUSED, COMPLETED, RESET
    
    current_sim_time = Column(Float, default=0.0)
    duration_seconds = Column(Integer, default=120)
    seed = Column(Integer, nullable=False, default=42)
    configuration_snapshot = Column(JSON, nullable=False, default=dict)
    
    overall_score = Column(Float, nullable=True)
    summary_metrics = Column(JSON, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    scenario = relationship("Scenario", back_populates="runs")
    ground_truth_events = relationship("GroundTruthEvent", back_populates="run", cascade="all, delete-orphan", order_by="GroundTruthEvent.simulation_time")
    observations = relationship("Observation", back_populates="run", cascade="all, delete-orphan", order_by="Observation.delivered_at_sim_time")
    decisions = relationship("TraineeDecision", back_populates="run", cascade="all, delete-orphan", order_by="TraineeDecision.simulation_time")
    scoring_records = relationship("ScoringRecord", back_populates="run", cascade="all, delete-orphan")
    recommendations = relationship("TrainingRecommendation", back_populates="run", cascade="all, delete-orphan")


class GroundTruthEvent(Base):
    __tablename__ = "ground_truth_events"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String(36), ForeignKey("simulation_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    
    simulation_time = Column(Float, nullable=False, index=True)  # in seconds from start
    entity_id = Column(String(50), nullable=False, index=True)
    event_type = Column(String(60), nullable=False)  # RADAR_SPOTTED, RF_INTERCEPT, ACOUSTIC_ALERT, OPTICAL_CONTACT, PERIMETER_INTRUSION, PAYLOAD_DROP
    
    # Absolute ground truth (evaluator only)
    is_hostile = Column(Boolean, nullable=False)
    threat_category = Column(String(60), nullable=False)  # Micro-Quadcopter, Fixed-Wing Loitering, Heavy Commercial, Friendly Civilian, Wildlife Clutter
    threat_level = Column(String(20), nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL, NONE
    
    # Kinematics & telemetry at this moment
    pos_x = Column(Float, nullable=False)  # meters
    pos_y = Column(Float, nullable=False)  # meters
    altitude = Column(Float, nullable=False)  # meters
    speed = Column(Float, nullable=False)  # m/s
    heading = Column(Float, nullable=False)  # degrees 0-360
    
    event_payload = Column(JSON, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("SimulationRun", back_populates="ground_truth_events")
    observations = relationship("Observation", back_populates="source_event")


class Observation(Base):
    __tablename__ = "observations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String(36), ForeignKey("simulation_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    source_event_id = Column(String(36), ForeignKey("ground_truth_events.id", ondelete="CASCADE"), nullable=True, index=True)
    
    created_at_sim_time = Column(Float, nullable=False)
    delivered_at_sim_time = Column(Float, nullable=False, index=True)
    sensor_type = Column(String(30), nullable=False)  # RADAR, RF_SCANNER, ACOUSTIC, EO_IR_OPTICAL
    
    # Degradation ledger
    delay_applied = Column(Float, default=0.0)
    is_lost = Column(Boolean, default=False)
    delivery_status = Column(String(20), default="DELIVERED")  # DELIVERED, DELAYED, LOST
    quality_score = Column(Float, default=1.0)  # 0.0 - 1.0 Signal-to-Noise / integrity
    noise_offset_x = Column(Float, default=0.0)
    noise_offset_y = Column(Float, default=0.0)
    
    # Trainee visible sensor payload (no hostile ground truth leaked!)
    trainee_payload = Column(JSON, nullable=False, default=dict)
    
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("SimulationRun", back_populates="observations")
    source_event = relationship("GroundTruthEvent", back_populates="observations")


class TraineeDecision(Base):
    __tablename__ = "trainee_decisions"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    run_id = Column(String(36), ForeignKey("simulation_runs.id", ondelete="CASCADE"), nullable=False, index=True)
    target_entity_id = Column(String(50), nullable=True, index=True)
    
    simulation_time = Column(Float, nullable=False, index=True)
    decision_type = Column(String(50), nullable=False)  # CLASSIFY, MARK_UNCERTAIN, REQUEST_PING, ENGAGE_COUNTERMEASURE, FLAG_FALSE_ALARM, IGNORE
    selected_classification = Column(String(60), nullable=True)  # Micro-Quadcopter, Fixed-Wing Loitering, Heavy Commercial, Friendly Civilian, Wildlife Clutter
    threat_assessment = Column(String(20), nullable=True)  # HOSTILE, SUSPICIOUS, FRIENDLY, CLUTTER
    confidence = Column(Float, default=1.0)  # 0.0 - 1.0
    rationale = Column(Text, nullable=True)
    
    # Evidence linkage at time of decision
    referenced_observation_ids = Column(JSON, default=list)
    available_observation_count = Column(Integer, default=0)
    evidence_status = Column(String(30), default="ADEQUATE")  # ADEQUATE, EVIDENCE_DELAYED, EVIDENCE_LOST, EVIDENCE_UNAVAILABLE
    
    created_at = Column(DateTime, default=datetime.utcnow)

    run = relationship("SimulationRun", back_populates="decisions")
