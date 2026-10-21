import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.models.scenario import Scenario
from app.models.simulation import SimulationRun
from app.seed import seed_demo_scenarios


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    seed_demo_scenarios(db)
    db.close()
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_telemetry_live_tick_endpoint(client):
    # 1. Start a simulation run
    init_res = client.post("/api/runs", json={
        "scenario_id": "scenario-demo-01-beginner",
        "trainee_id": "Telemetry-Tester"
    })
    assert init_res.status_code == 201
    run_id = init_res.json()["id"]

    # Step simulation clock forward by 10s
    client.post(f"/api/runs/{run_id}/step?step_seconds=10.0")

    # 2. Query live 3D telemetry tick
    tick_res = client.get(f"/api/telemetry/live/{run_id}")
    assert tick_res.status_code == 200
    tick_data = tick_res.json()
    assert tick_data["run_id"] == run_id
    assert tick_data["source_provenance"] == "INTERNAL_SIMULATION_ENGINE"
    assert tick_data["validity_status"] == "VALID"
    assert "entities" in tick_data
    assert isinstance(tick_data["entities"], list)
    assert tick_data["tick_rate_hz"] == 10.0


def test_external_simulator_adapters_status(client):
    res = client.get("/api/telemetry/adapters")
    assert res.status_code == 200
    adapters = res.json()
    assert len(adapters) >= 2
    names = [a["adapter_name"] for a in adapters]
    assert any("PX4" in n for n in names)
    
    # Verify truthfulness: no fake connection claim
    px4 = next(a for a in adapters if "PX4" in a["adapter_name"])
    assert px4["connection_status"] in ["DISCONNECTED", "STANDBY"]
    assert "udp://" in px4["target_endpoint"]


def test_system_health_infrastructure(client):
    res = client.get("/api/telemetry/health/system")
    assert res.status_code == 200
    data = res.json()
    assert data["status"] in ["HEALTHY", "DEGRADED"]
    assert "services" in data
    assert data["services"]["database"]["connected"] is True
    assert data["services"]["authoritative_simulation_engine"]["status"] == "ACTIVE"
    assert data["services"]["evidence_isolation_ledger"]["status"] == "ENFORCING_ISOLATION"


def test_websocket_simulation_endpoint_handshake(client):
    # Test WebSocket connection with client.websocket_connect
    init_res = client.post("/api/runs", json={
        "scenario_id": "scenario-demo-01-beginner",
        "trainee_id": "WS-Tester"
    })
    run_id = init_res.json()["id"]

    with client.websocket_connect(f"/api/ws/simulation/{run_id}") as websocket:
        data = websocket.receive_json()
        assert data["run_id"] == run_id
        assert data["source_provenance"] == "INTERNAL_SIMULATION_ENGINE"
        assert "entities" in data
