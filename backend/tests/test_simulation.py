import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.models.scenario import Scenario
from app.models.simulation import SimulationRun
from app.engine.generator import generate_synthetic_ground_truth
from app.engine.degradation import apply_sensor_degradation


@pytest.fixture(scope="session", autouse=True)
def setup_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    from app.seed import seed_demo_scenarios
    seed_demo_scenarios(db)
    db.close()
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_health_check(client):
    response = client.get("/api/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"


def test_seeded_scenarios_exist(client):
    response = client.get("/api/scenarios")
    assert response.status_code == 200
    scenarios = response.json()
    assert len(scenarios) >= 3
    names = [s["name"] for s in scenarios]
    assert any("Alpha-1" in name for name in names)
    assert any("Bravo-2" in name for name in names)
    assert any("Charlie-3" in name for name in names)


def test_scenario_creation_and_duplication(client):
    new_scenario_payload = {
        "name": "Test Perimeter Incursion",
        "description": "Validation test scenario",
        "environment": "coastal",
        "difficulty": "Intermediate",
        "duration_seconds": 100,
        "seed": 999,
        "configuration": {
            "num_entities": 4,
            "threat_density": "medium",
            "sensor_reliability": 0.85,
            "observation_delay_mean": 2.0,
            "observation_delay_jitter": 0.5,
            "observation_loss_rate": 0.10,
            "noise_level": 0.15,
            "weather": "Clear Day",
            "radar_coverage_percent": 90.0,
            "rf_scanner_enabled": 1,
            "acoustic_sensor_enabled": 1,
            "optical_eoir_enabled": 1
        }
    }
    create_res = client.post("/api/scenarios", json=new_scenario_payload)
    assert create_res.status_code == 201
    created_id = create_res.json()["id"]

    # Duplicate scenario
    dup_res = client.post(f"/api/scenarios/{created_id}/duplicate")
    assert dup_res.status_code == 200
    dup_data = dup_res.json()
    assert dup_data["name"] == "Test Perimeter Incursion (Copy)"
    assert dup_data["id"] != created_id


def test_deterministic_ground_truth_reproducibility():
    config = {"num_entities": 5}
    events_1 = generate_synthetic_ground_truth("run-1", 120, seed=42, config=config)
    events_2 = generate_synthetic_ground_truth("run-2", 120, seed=42, config=config)
    
    assert len(events_1) == len(events_2)
    for e1, e2 in zip(events_1, events_2):
        assert e1["simulation_time"] == e2["simulation_time"]
        assert e1["entity_id"] == e2["entity_id"]
        assert e1["pos_x"] == e2["pos_x"]
        assert e1["pos_y"] == e2["pos_y"]
        assert e1["threat_category"] == e2["threat_category"]
        assert e1["is_hostile"] == e2["is_hostile"]


def test_end_to_end_simulation_flow(client):
    # 1. Start simulation run from Beginner demo
    init_res = client.post("/api/runs", json={
        "scenario_id": "scenario-demo-01-beginner",
        "trainee_id": "Cadet-007"
    })
    assert init_res.status_code == 201
    run_data = init_res.json()
    run_id = run_data["id"]
    assert run_data["status"] == "INITIALIZED"

    # 2. Advance / step the simulation clock
    step_res = client.post(f"/api/runs/{run_id}/step?step_seconds=20.0")
    assert step_res.status_code == 200
    stepped_run = step_res.json()
    assert stepped_run["current_sim_time"] == 20.0

    # 3. Fetch trainee workspace view
    ws_res = client.get(f"/api/runs/{run_id}/workspace?evaluator_mode=false")
    assert ws_res.status_code == 200
    ws = ws_res.json()
    # Trainee must not see evaluator ground truth
    assert ws["evaluator_ground_truth"] is None
    # All visible observations must be <= current_sim_time and not lost
    for obs in ws["visible_observations"]:
        assert obs["delivered_at_sim_time"] <= 20.0
        assert obs["is_lost"] is False
        assert "is_hostile" not in obs["trainee_payload"]

    # 4. Fetch evaluator workspace view
    eval_ws_res = client.get(f"/api/runs/{run_id}/workspace?evaluator_mode=true")
    assert eval_ws_res.status_code == 200
    eval_ws = eval_ws_res.json()
    assert eval_ws["evaluator_ground_truth"] is not None
    assert len(eval_ws["evaluator_ground_truth"]) > 0

    # 5. Record trainee decision
    decision_payload = {
        "target_entity_id": "DRONE-01",
        "simulation_time": 20.0,
        "decision_type": "CLASSIFY",
        "selected_classification": "Micro-Quadcopter",
        "threat_assessment": "HOSTILE",
        "confidence": 0.9,
        "rationale": "High-frequency RF detection and radar kinematic match"
    }
    dec_res = client.post(f"/api/runs/{run_id}/decisions", json=decision_payload)
    assert dec_res.status_code == 201
    dec_out = dec_res.json()
    assert dec_out["target_entity_id"] == "DRONE-01"
    assert dec_out["evidence_status"] in ["ADEQUATE", "EVIDENCE_LIMITED", "EVIDENCE_DELAYED", "UNASSESSABLE"]

    # 6. Evaluate run
    eval_res = client.post(f"/api/runs/{run_id}/evaluate")
    assert eval_res.status_code == 200
    eval_data = eval_res.json()
    assert "overall_score" in eval_data
    assert len(eval_data["metrics"]) >= 4

    # 7. Check After-Action Review
    review_res = client.get(f"/api/runs/{run_id}/review")
    assert review_res.status_code == 200
    review_data = review_res.json()
    assert review_data["run_id"] == run_id
    assert len(review_data["recommendations"]) > 0

    # 8. Test Reports Export
    json_export = client.get(f"/api/runs/{run_id}/export.json")
    assert json_export.status_code == 200
    assert "export_metadata" in json_export.json()

    csv_export = client.get(f"/api/runs/{run_id}/export.csv")
    assert csv_export.status_code == 200
    assert "GARUDA Threat Simulation Trainer" in csv_export.text


def test_observation_degradation_and_isolation(client):
    # Test Charlie-3 (Advanced severe jamming: 35% packet loss, 5.5s delay)
    init_res = client.post("/api/runs", json={
        "scenario_id": "scenario-demo-03-advanced",
        "trainee_id": "Trainee-EOD"
    })
    run_id = init_res.json()["id"]

    # Step by 10 seconds
    client.post(f"/api/runs/{run_id}/step?step_seconds=10.0")

    # Fetch trainee view
    trainee_view = client.get(f"/api/runs/{run_id}/workspace?evaluator_mode=false").json()
    evaluator_view = client.get(f"/api/runs/{run_id}/workspace?evaluator_mode=true").json()

    # Trainee must only have delivered observations <= 10.0s
    for obs in trainee_view["visible_observations"]:
        assert obs["is_lost"] is False
        assert obs["delivered_at_sim_time"] <= 10.0

    # Evaluator view must contain ground truth entities and lost packets
    assert evaluator_view["evaluator_ground_truth"] is not None
    assert len(evaluator_view["evaluator_ground_truth"]) > 0


def test_zero_decisions_scoring_safe_denominator(client):
    # Evaluate a run that has 0 decisions - must NOT raise DivideByZero or return NaN
    init_res = client.post("/api/runs", json={
        "scenario_id": "scenario-demo-01-beginner",
        "trainee_id": "Observer-Only"
    })
    run_id = init_res.json()["id"]

    eval_res = client.post(f"/api/runs/{run_id}/evaluate")
    assert eval_res.status_code == 200
    score_data = eval_res.json()
    assert isinstance(score_data["overall_score"], (int, float))
    assert score_data["overall_score"] >= 0.0
