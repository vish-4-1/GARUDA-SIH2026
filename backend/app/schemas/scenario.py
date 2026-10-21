from pydantic import BaseModel, Field
from typing import Optional, Dict, Any
from datetime import datetime


class ScenarioConfigurationBase(BaseModel):
    num_entities: int = Field(5, ge=1, le=30, description="Total synthetic drone entities")
    threat_density: str = Field("medium", description="low, medium, high, swarm")
    sensor_reliability: float = Field(0.85, ge=0.0, le=1.0, description="Probability of accurate sensor observation")
    observation_delay_mean: float = Field(2.5, ge=0.0, le=30.0, description="Mean delay before trainee receives observation (seconds)")
    observation_delay_jitter: float = Field(1.0, ge=0.0, le=10.0, description="Delay variation jitter (seconds)")
    observation_loss_rate: float = Field(0.15, ge=0.0, le=1.0, description="Probability observation is dropped due to RF interference/loss")
    noise_level: float = Field(0.20, ge=0.0, le=1.0, description="Noise added to position/kinematics")
    weather: str = Field("Clear Day", description="Weather condition")
    radar_coverage_percent: float = Field(90.0, ge=10.0, le=100.0)
    rf_scanner_enabled: int = Field(1, ge=0, le=1)
    acoustic_sensor_enabled: int = Field(1, ge=0, le=1)
    optical_eoir_enabled: int = Field(1, ge=0, le=1)
    extra_params: Optional[Dict[str, Any]] = None


class ScenarioConfigurationCreate(ScenarioConfigurationBase):
    pass


class ScenarioConfigurationOut(ScenarioConfigurationBase):
    id: str
    scenario_id: str

    class Config:
        from_attributes = True


class ScenarioBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    description: Optional[str] = None
    environment: str = Field("urban", description="urban, rural, coastal, border")
    difficulty: str = Field("Intermediate", description="Beginner, Intermediate, Advanced")
    duration_seconds: int = Field(120, ge=30, le=900)
    seed: int = Field(42, ge=0)


class ScenarioCreate(ScenarioBase):
    configuration: Optional[ScenarioConfigurationCreate] = None


class ScenarioUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    environment: Optional[str] = None
    difficulty: Optional[str] = None
    duration_seconds: Optional[int] = None
    seed: Optional[int] = None
    configuration: Optional[ScenarioConfigurationCreate] = None


class ScenarioOut(ScenarioBase):
    id: str
    status: str
    is_preset: int
    created_at: datetime
    updated_at: datetime
    configuration: Optional[ScenarioConfigurationOut] = None

    class Config:
        from_attributes = True
