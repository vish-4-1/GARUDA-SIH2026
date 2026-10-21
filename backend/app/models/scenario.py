import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, DateTime, Text, JSON, ForeignKey
from sqlalchemy.orm import relationship
from app.core.database import Base


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    name = Column(String(120), nullable=False)
    description = Column(Text, nullable=True)
    environment = Column(String(50), nullable=False, default="urban")  # urban, rural, coastal, border
    difficulty = Column(String(20), nullable=False, default="Intermediate")  # Beginner, Intermediate, Advanced
    duration_seconds = Column(Integer, nullable=False, default=120)
    seed = Column(Integer, nullable=False, default=42)
    status = Column(String(20), nullable=False, default="active")  # active, archived
    is_preset = Column(Integer, default=0)  # 1 if synthetic demonstration preset
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    configuration = relationship("ScenarioConfiguration", back_populates="scenario", uselist=False, cascade="all, delete-orphan")
    runs = relationship("SimulationRun", back_populates="scenario", cascade="all, delete-orphan")


class ScenarioConfiguration(Base):
    __tablename__ = "scenario_configurations"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    scenario_id = Column(String(36), ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False, unique=True)
    
    # Entity and threat parameters
    num_entities = Column(Integer, default=5)
    threat_density = Column(String(20), default="medium")  # low, medium, high, swarm
    
    # Sensor Degradation Parameters
    sensor_reliability = Column(Float, default=0.85)  # 0.0 - 1.0 (probability of accurate sensor packet)
    observation_delay_mean = Column(Float, default=2.5)  # mean latency in seconds
    observation_delay_jitter = Column(Float, default=1.0)  # latency variance in seconds
    observation_loss_rate = Column(Float, default=0.15)  # 0.0 - 1.0 (packet loss probability)
    noise_level = Column(Float, default=0.20)  # 0.0 - 1.0 (bearing/altitude measurement noise)
    
    # Environmental & Operational conditions
    weather = Column(String(50), default="Clear Day")  # Clear Day, Heavy Rain, Dense Fog, Night IR Only, High RF Jamming
    radar_coverage_percent = Column(Float, default=90.0)
    rf_scanner_enabled = Column(Integer, default=1)
    acoustic_sensor_enabled = Column(Integer, default=1)
    optical_eoir_enabled = Column(Integer, default=1)
    
    extra_params = Column(JSON, default=dict)

    scenario = relationship("Scenario", back_populates="configuration")
