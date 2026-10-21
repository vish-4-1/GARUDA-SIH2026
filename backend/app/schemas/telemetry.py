from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class TelemetryVector3D(BaseModel):
    x: float = Field(..., description="Tactical X position in meters (East-West)")
    y: float = Field(..., description="Tactical Y position in meters (North-South)")
    z: float = Field(..., description="Altitude in meters AGL")
    vx: float = Field(0.0, description="Velocity X in m/s")
    vy: float = Field(0.0, description="Velocity Y in m/s")
    vz: float = Field(0.0, description="Velocity Z in m/s")
    pitch: float = Field(0.0, description="Pitch angle in degrees")
    roll: float = Field(0.0, description="Roll angle in degrees")
    yaw: float = Field(0.0, description="Heading / Yaw angle in degrees 0-360")


class EntityTelemetryPacket(BaseModel):
    entity_id: str
    threat_category: str
    is_hostile: bool
    position: TelemetryVector3D
    ground_speed_mps: float
    vertical_speed_mps: float
    distance_to_core_m: float
    rcs_m2: float
    rf_carrier_mhz: float
    signal_strength_dbm: float
    status: str = "AIRBORNE"  # AIRBORNE, ENGAGED, LOST, EXITED


class SimulationTelemetryTick(BaseModel):
    run_id: str
    sequence_number: int
    simulation_time: float
    wall_clock_iso: str
    source_provenance: str = "INTERNAL_SIMULATION_ENGINE"  # INTERNAL_SIMULATION_ENGINE, EXTERNAL_PX4_SITL, PERSISTED_REPLAY
    validity_status: str = "VALID"  # VALID, DEGRADED, STALE, DISCONNECTED
    freshness_ms: float = 0.0
    active_threat_count: int
    tick_rate_hz: float = 10.0
    dropped_packets_total: int
    delayed_packets_total: int
    delivered_packets_total: int
    entities: List[EntityTelemetryPacket]
    recent_events: List[Dict[str, Any]] = []


class SimulatorAdapterStatus(BaseModel):
    adapter_name: str
    supported: bool
    connection_status: str  # CONNECTED, DISCONNECTED, STANDBY
    target_endpoint: str
    last_probe_time: str
    telemetry_streaming: bool
    diagnostics: str
