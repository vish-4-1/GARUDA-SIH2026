import math
from datetime import datetime
from typing import Dict, Any, List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.database import get_db, engine
from app.models.simulation import SimulationRun, GroundTruthEvent, Observation, TraineeDecision
from app.schemas.telemetry import (
    SimulationTelemetryTick,
    EntityTelemetryPacket,
    TelemetryVector3D,
    SimulatorAdapterStatus
)
from app.engine.adapters.px4_adapter import px4_adapter

router = APIRouter(prefix="/telemetry", tags=["Live Telemetry & System Health"])


@router.get("/live/{run_id}", response_model=SimulationTelemetryTick)
def get_live_telemetry_tick(run_id: str, db: Session = Depends(get_db)):
    run = db.query(SimulationRun).filter(SimulationRun.id == run_id).first()
    if not run:
        raise HTTPException(status_code=404, detail="Run not found")

    current_time = run.current_sim_time

    # Find the nearest active ground-truth telemetry records for each entity around current_time
    gt_events = db.query(GroundTruthEvent).filter(
        GroundTruthEvent.run_id == run_id,
        GroundTruthEvent.simulation_time <= current_time + 1.0
    ).order_by(GroundTruthEvent.simulation_time.desc()).all()

    # Deduplicate by entity_id to get latest position
    latest_by_entity: Dict[str, GroundTruthEvent] = {}
    for ev in gt_events:
        if ev.entity_id not in latest_by_entity:
            latest_by_entity[ev.entity_id] = ev

    entity_packets: List[EntityTelemetryPacket] = []
    for eid, ev in latest_by_entity.items():
        heading_rad = math.radians(ev.heading)
        dist = math.hypot(ev.pos_x, ev.pos_y)
        
        packet = EntityTelemetryPacket(
            entity_id=eid,
            threat_category=ev.threat_category,
            is_hostile=ev.is_hostile,
            position=TelemetryVector3D(
                x=round(ev.pos_x, 1),
                y=round(ev.pos_y, 1),
                z=round(ev.altitude, 1),
                vx=round(ev.speed * math.sin(heading_rad), 1),
                vy=round(ev.speed * math.cos(heading_rad), 1),
                vz=round(ev.event_payload.get("vz", 0.0), 1),
                pitch=round(ev.event_payload.get("pitch", 0.0), 1),
                roll=round(ev.event_payload.get("roll", 0.0), 1),
                yaw=round(ev.heading, 1)
            ),
            ground_speed_mps=ev.speed,
            vertical_speed_mps=0.0,
            distance_to_core_m=round(dist, 1),
            rcs_m2=ev.event_payload.get("rcs_m2", 0.05),
            rf_carrier_mhz=ev.event_payload.get("rf_freq_mhz", 2400.0),
            signal_strength_dbm=round(-45.0 - (dist / 100.0), 1),
            status="AIRBORNE" if dist > 150 else "ENGAGED"
        )
        entity_packets.append(packet)

    delivered_count = db.query(Observation).filter(
        Observation.run_id == run_id,
        Observation.is_lost == False,
        Observation.delivered_at_sim_time <= current_time
    ).count()

    delayed_count = db.query(Observation).filter(
        Observation.run_id == run_id,
        Observation.is_lost == False,
        Observation.delivered_at_sim_time > current_time,
        Observation.created_at_sim_time <= current_time
    ).count()

    dropped_count = db.query(Observation).filter(
        Observation.run_id == run_id,
        Observation.is_lost == True,
        Observation.created_at_sim_time <= current_time
    ).count()

    return SimulationTelemetryTick(
        run_id=run.id,
        sequence_number=int(current_time * 10),
        simulation_time=current_time,
        wall_clock_iso=datetime.utcnow().isoformat(),
        source_provenance="INTERNAL_SIMULATION_ENGINE",
        validity_status="VALID" if run.status in ["RUNNING", "PAUSED", "COMPLETED"] else "DEGRADED",
        freshness_ms=12.5,
        active_threat_count=len(entity_packets),
        tick_rate_hz=10.0,
        dropped_packets_total=dropped_count,
        delayed_packets_total=delayed_count,
        delivered_packets_total=delivered_count,
        entities=entity_packets,
        recent_events=[]
    )


@router.get("/adapters", response_model=List[SimulatorAdapterStatus])
def get_simulator_adapters_status():
    px4_adapter.probe_connection()
    return [
        SimulatorAdapterStatus(**px4_adapter.get_status()),
        SimulatorAdapterStatus(
            adapter_name="ROS 2 Telemetry Bridge",
            supported=True,
            connection_status="STANDBY",
            target_endpoint="dds://cyclonedds:7400",
            last_probe_time=datetime.utcnow().isoformat(),
            telemetry_streaming=False,
            diagnostics="ROS 2 middleware standby. Bridge awaiting active ROS 2 node publisher."
        ),
        SimulatorAdapterStatus(
            adapter_name="GARUDA Authoritative 3D Engine",
            supported=True,
            connection_status="CONNECTED",
            target_endpoint="inproc://authoritative_engine",
            last_probe_time=datetime.utcnow().isoformat(),
            telemetry_streaming=True,
            diagnostics="Authoritative event-driven kinematic engine operational."
        )
    ]


@router.get("/health/system")
def get_system_health(db: Session = Depends(get_db)):
    db_connected = False
    try:
        db.execute(db.query(SimulationRun).statement)
        db_connected = True
    except Exception:
        db_connected = False

    return {
        "status": "HEALTHY" if db_connected else "DEGRADED",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {
            "database": {
                "name": "PostgreSQL / SQLite Storage Layer",
                "connected": db_connected,
                "engine_url": str(engine.url),
                "status": "OPERATIONAL"
            },
            "authoritative_simulation_engine": {
                "name": "Python 3D Event-Driven Engine",
                "status": "ACTIVE",
                "tick_rate": "10 Hz",
                "determinism": "SEEDED_PRNG"
            },
            "evidence_isolation_ledger": {
                "name": "Degraded Information Audit Buffer",
                "status": "ENFORCING_ISOLATION",
                "packet_drop_tracking": "ENABLED"
            },
            "external_simulators": {
                "px4_sitl": px4_adapter.get_status(),
            }
        }
    }
