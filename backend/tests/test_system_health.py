import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_system_health_get_endpoint():
    res = client.get("/api/telemetry/health/system")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert data["overall_status"] == "HEALTHY"
    assert "probe_duration_ms" in data
    assert data["required_healthy_count"] == 4
    assert data["required_total_count"] == 4
    assert data["optional_total_count"] == 2
    assert "services" in data

    # Verify Database details
    db_service = data["services"]["database"]
    assert db_service["connected"] is True
    assert db_service["status"] == "OPERATIONAL"
    assert "query_latency_ms" in db_service
    assert db_service["query_latency_ms"] >= 0.0
    assert db_service["is_required"] is True

    # Verify Authoritative Simulation Engine details
    sim_engine = data["services"]["authoritative_simulation_engine"]
    assert sim_engine["status"] == "ACTIVE"
    assert "10.0 Hz" in sim_engine["tick_rate"]
    assert sim_engine["is_required"] is True

    # Verify Audit Buffer & Evidence Isolation
    audit_buf = data["services"]["evidence_isolation_ledger"]
    assert audit_buf["status"] == "ENFORCING_ISOLATION"
    assert audit_buf["packet_drop_tracking"] == "ENABLED"
    assert audit_buf["isolation_integrity"] == "VERIFIED_ACTIVE"
    assert audit_buf["is_required"] is True

    # Verify Telemetry Pipeline
    telemetry_pipe = data["services"]["telemetry_pipeline"]
    assert telemetry_pipe["status"] == "OPERATIONAL"
    assert "ws" in telemetry_pipe["endpoint"]
    assert telemetry_pipe["is_required"] is True

    # Verify Optional Adapters
    ext = data["services"]["external_simulators"]
    assert "px4_sitl" in ext
    assert ext["px4_sitl"]["is_required"] is False
    assert ext["px4_sitl"]["connection_status"] in ["DISCONNECTED", "STANDBY"]
    assert "ros2_bridge" in ext
    assert ext["ros2_bridge"]["is_required"] is False

def test_system_health_post_probe_endpoint():
    res = client.post("/api/telemetry/probe")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] == "HEALTHY"
    assert data["readiness_state"] == "READY_FOR_TRAINING"
    assert "last_probe_timestamp" in data
    assert data["probe_duration_ms"] > 0
    assert "docker_environment" in data
    assert "garuda-backend" in data["docker_environment"]["backend_service"]
