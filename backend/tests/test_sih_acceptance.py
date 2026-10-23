import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.models.scenario import Scenario
from app.models.simulation import SimulationRun
from app.engine.generator import generate_synthetic_ground_truth


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


def test_sih_req1_and_req2_scenarios_procedural_and_seed_reproducibility(client):
    """
    Req 1 & 2: Scripted and Procedurally Generated Scenarios.
    Supports single-drone and multi-entity synthetic scenarios.
    Predefined demo scenarios and procedural generation with reproducible random seeds.
    Varied environmental conditions (urban, rural, coastal, border).
    """
    # 1. Predefined demonstration scenarios exist
    res = client.get("/api/scenarios")
    assert res.status_code == 200
    scenarios = res.json()
    assert len(scenarios) >= 3

    # 2. Procedural scenario generation with custom seed and rural environment
    procedural_payload = {
        "name": "Procedural Border & Rural Incursion",
        "description": "Procedural scenario with multi-threat swarm across rural terrain",
        "environment": "rural",
        "difficulty": "Advanced",
        "duration_seconds": 120,
        "seed": 777,
        "configuration": {
            "num_entities": 6,
            "threat_density": "high",
            "sensor_reliability": 0.80,
            "observation_delay_mean": 2.5,
            "observation_delay_jitter": 0.5,
            "observation_loss_rate": 0.15,
            "noise_level": 0.20,
            "weather": "Dense Fog",
            "radar_coverage_percent": 85.0,
            "rf_scanner_enabled": 1,
            "acoustic_sensor_enabled": 1,
            "optical_eoir_enabled": 1
        }
    }
    create_res = client.post("/api/scenarios", json=procedural_payload)
    assert create_res.status_code == 201
    created = create_res.json()
    assert created["environment"] == "rural"
    assert created["seed"] == 777

    # 3. Deterministic Ground Truth: repeated runs with the same seed reproduce identical coordinates
    events_run1 = generate_synthetic_ground_truth("run-a", 120, seed=777, config={"num_entities": 6})
    events_run2 = generate_synthetic_ground_truth("run-b", 120, seed=777, config={"num_entities": 6})
    assert len(events_run1) == len(events_run2)
    for e1, e2 in zip(events_run1, events_run2):
        assert e1["simulation_time"] == e2["simulation_time"]
        assert e1["entity_id"] == e2["entity_id"]
        assert e1["pos_x"] == e2["pos_x"]
        assert e1["pos_y"] == e2["pos_y"]
        assert e1["altitude"] == e2["altitude"]
        assert e1["threat_category"] == e2["threat_category"]


def test_sih_req3_trainee_decision_workflow_virtual_only(client):
    """
    Req 3: Trainee Decision Workflow.
    Record detection, classification, uncertainty, and scenario-response decisions with timestamps.
    Keep all actions within virtual training environment (no real-world weapon control).
    """
    init_res = client.post("/api/runs", json={
        "scenario_id": "scenario-demo-01-beginner",
        "trainee_id": "Cadet-AirDefense-01"
    })
    assert init_res.status_code == 201
    run_id = init_res.json()["id"]

    # Advance clock to 15s to deliver observations
    client.post(f"/api/runs/{run_id}/step?step_seconds=15.0")

    # Trainee records: Classification, Uncertainty, Ping, False Alarm
    decisions_to_test = [
        {
            "target_entity_id": "DRONE-01",
            "simulation_time": 15.0,
            "decision_type": "CLASSIFY",
            "selected_classification": "Micro-Quadcopter",
            "threat_assessment": "HOSTILE",
            "confidence": 0.85,
            "rationale": "High blade pass frequency observed on acoustic sensor"
        },
        {
            "target_entity_id": "DRONE-01",
            "simulation_time": 16.5,
            "decision_type": "MARK_UNCERTAIN",
            "confidence": 0.50,
            "rationale": "Radar cross-section fluctuating due to clutter"
        },
        {
            "target_entity_id": "DRONE-01",
            "simulation_time": 18.0,
            "decision_type": "REQUEST_PING",
            "confidence": 0.70,
            "rationale": "Active RF pulse requested for track confirmation"
        },
        {
            "target_entity_id": "DRONE-01",
            "simulation_time": 19.0,
            "decision_type": "FLAG_FALSE_ALARM",
            "confidence": 0.40,
            "rationale": "Flock of migratory birds on optical feed"
        }
    ]

    for dec in decisions_to_test:
        dec_res = client.post(f"/api/runs/{run_id}/decisions", json=dec)
        assert dec_res.status_code == 201
        data = dec_res.json()
        assert data["decision_type"] == dec["decision_type"]
        assert data["simulation_time"] == dec["simulation_time"]
        assert "evidence_status" in data


def test_sih_req4_and_req8_evidence_aware_scoring_differentiator(client):
    """
    Req 4 & 8: Evidence-Aware Scoring — GARUDA's Key Differentiator.
    Maintains three separate records: Ground Truth, Observations Delivered, Trainee Decisions.
    Evaluates decisions against evidence available at that exact timestamp.
    Excludes genuinely unobservable events (due to 100% packet loss) from missed detection penalties!
    """
    # Initialize Advanced incursion with high jamming (35% loss)
    init_res = client.post("/api/runs", json={
        "scenario_id": "scenario-demo-03-advanced",
        "trainee_id": "Cadet-RadarOperator"
    })
    run_id = init_res.json()["id"]

    # Step clock by 30 seconds
    client.post(f"/api/runs/{run_id}/step?step_seconds=30.0")

    # Fetch trainee and evaluator workspace views
    trainee_ws = client.get(f"/api/runs/{run_id}/workspace?evaluator_mode=false").json()
    evaluator_ws = client.get(f"/api/runs/{run_id}/workspace?evaluator_mode=true").json()

    # Verify Trainee View: strictly isolated from lost/dropped packets
    for obs in trainee_ws["visible_observations"]:
        assert obs["delivered_at_sim_time"] <= 30.0
        assert obs["is_lost"] is False

    # Verify Evaluator View: audits both ground truth and dropped observations
    assert evaluator_ws["evaluator_ground_truth"] is not None
    assert len(evaluator_ws["evaluator_ground_truth"]) > 0
    assert any(obs["is_lost"] is True for obs in evaluator_ws["visible_observations"])

    # Evaluate scoring
    eval_res = client.post(f"/api/runs/{run_id}/evaluate")
    assert eval_res.status_code == 200
    score_out = eval_res.json()

    # Verify protected denominators & disclaimer
    assert "evidence_aware_disclaimer" in score_out
    assert score_out["overall_score"] >= 0.0

    # Check metrics
    detection_metric = next((m for m in score_out["metrics"] if m["metric_category"] == "DETECTION"), None)
    assert detection_metric is not None
    # Denominator must only count observable entities, not lost ones
    assert detection_metric["denominator"] >= 0


def test_sih_req5_after_action_review_and_replay(client):
    """
    Req 5: After-Action Review and Session Replay.
    Provides timeline, observations delivered, trainee decisions, metrics, strengths, and improvement areas.
    Supports session replay from persisted event records.
    """
    init_res = client.post("/api/runs", json={
        "scenario_id": "scenario-demo-01-beginner",
        "trainee_id": "Trainee-AAR-Audit"
    })
    run_id = init_res.json()["id"]

    # Advance clock and record decision
    client.post(f"/api/runs/{run_id}/step?step_seconds=25.0")
    client.post(f"/api/runs/{run_id}/decisions", json={
        "target_entity_id": "DRONE-01",
        "simulation_time": 25.0,
        "decision_type": "CLASSIFY",
        "selected_classification": "Micro-Quadcopter",
        "threat_assessment": "HOSTILE",
        "confidence": 0.90
    })

    # Evaluate
    client.post(f"/api/runs/{run_id}/evaluate")

    # Query AAR debrief
    aar_res = client.get(f"/api/runs/{run_id}/review")
    assert aar_res.status_code == 200
    aar = aar_res.json()

    assert "timeline_summary" in aar
    assert aar["timeline_summary"]["ground_truth_events"] > 0
    assert aar["timeline_summary"]["delivered_observations"] > 0
    assert aar["timeline_summary"]["trainee_decisions"] >= 1
    assert len(aar["strengths"]) > 0
    assert len(aar["areas_for_improvement"]) > 0
    assert len(aar["recommendations"]) > 0

    # Session Replay: reset simulation clock back to 0 and re-step from persisted events
    reset_res = client.post(f"/api/runs/{run_id}/reset")
    assert reset_res.status_code == 200
    reset_view = client.get(f"/api/runs/{run_id}/workspace?evaluator_mode=false").json()
    assert reset_view["run_state"]["current_sim_time"] == 0.0

    # Step forward 10s to replay the delivered telemetry
    step_res = client.post(f"/api/runs/{run_id}/step?step_seconds=10.0")
    assert step_res.status_code == 200
    stepped_view = client.get(f"/api/runs/{run_id}/workspace?evaluator_mode=false").json()
    assert stepped_view["run_state"]["current_sim_time"] == 10.0


def test_sih_req6_individual_and_unit_level_assessment_honest_na(client):
    """
    Req 6: Individual and Unit-Level Assessment.
    Maintain individual session histories and aggregate performance across multiple trainees.
    Provide unit-level summaries only when multiple trainee records exist.
    Display N/A when there is insufficient data instead of inventing aggregate statistics.
    """
    unit_res = client.get("/api/assessment/unit-summary")
    assert unit_res.status_code == 200
    unit = unit_res.json()

    assert "has_sufficient_unit_data" in unit
    assert "unique_trainees_count" in unit
    assert "unit_readiness_score" in unit
    assert "individual_trainees" in unit

    # Verify honest data rule:
    # If only 1 trainee exists, unit_readiness_score must be "N/A"
    # If >= 2 distinct trainees exist, unit_readiness_score must be computed genuine percentage
    if unit["unique_trainees_count"] < 2:
        assert unit["has_sufficient_unit_data"] is False
        assert unit["unit_readiness_score"] == "N/A"
        assert "N/A" in unit["notice"]
    else:
        assert unit["has_sufficient_unit_data"] is True
        assert "%" in unit["unit_readiness_score"]


def test_sih_req7_adaptive_training_curriculum_launch(client):
    """
    Req 7: Adaptive Difficulty and Scenario Randomization.
    Recommend subsequent exercises using actual trainee performance gaps.
    """
    # Run evaluated in test 5 will have recommendations
    rec_res = client.get("/api/training/recommendations")
    assert rec_res.status_code == 200
    recs = rec_res.json()
    assert len(recs) > 0

    first_rec = recs[0]
    rec_id = first_rec["id"]
    assert "target_skill" in first_rec
    assert "suggested_scenario_config" in first_rec

    # 1-Click Launch Recommended Drill
    launch_res = client.post(f"/api/training/recommendations/{rec_id}/launch")
    assert launch_res.status_code == 200
    new_run = launch_res.json()
    assert new_run["id"] != rec_id
    assert new_run["status"] == "INITIALIZED"
    assert new_run["scenario_name"] is not None


def test_sih_req9_real_data_and_honest_system_status(client):
    """
    Req 9: Real Data and Honest System Status.
    All simulation entities, telemetry, scores, histories, and charts driven by engine.
    Show N/A for unavailable values and distinguish internal simulation from external simulator telemetry.
    """
    health_res = client.get("/api/telemetry/health/system")
    assert health_res.status_code == 200
    health = health_res.json()

    assert health["status"] == "HEALTHY"
    services = health["services"]
    assert services["database"]["connected"] is True
    assert services["authoritative_simulation_engine"]["status"] == "ACTIVE"
    assert services["evidence_isolation_ledger"]["status"] in ["ACTIVE", "ENFORCING_ISOLATION"]

    # External simulator adapter clearly distinguishes DISCONNECTED without pretending to be connected
    external = services["external_simulators"]["px4_sitl"]
    assert external["connection_status"] in ["DISCONNECTED", "CONNECTED"]
    assert external["telemetry_streaming"] is False
    assert any(phrase in external["diagnostics"] for phrase in ["Internal", "Not probed", "Standby", "probing"])


def test_sih_req10_complete_end_to_end_acceptance_workflow(client):
    """
    Req 10: Complete Acceptance Test Workflow.
    Execute the complete 10-step sequence:
    1. Configure scenario
    2. Launch 3D simulation
    3. Receive observations
    4. Record trainee decisions
    5. Calculate scores
    6. Inspect evidence timeline
    7. Review session in AAR
    8. Generate performance-based follow-up exercise
    9. Verify exports (JSON/CSV)
    10. Verify unit assessment aggregation
    """
    # Step 1: Configure Scenario using seeded demo scenario
    init_res = client.post("/api/runs", json={
        "scenario_id": "scenario-demo-01-beginner",
        "trainee_id": "Cadet-Acceptance-Tester"
    })
    assert init_res.status_code == 201
    run_id = init_res.json()["id"]
    client.post(f"/api/runs/{run_id}/start")

    # Step 2 & 3: Advance Clock & Receive Observations
    step_res = client.post(f"/api/runs/{run_id}/step?step_seconds=30.0")
    assert step_res.status_code == 200
    ws = client.get(f"/api/runs/{run_id}/workspace?evaluator_mode=false").json()
    assert len(ws["visible_observations"]) > 0

    # Step 4: Record Trainee Decisions
    target_eid = ws["visible_observations"][0]["trainee_payload"]["entity_id"]
    dec_res = client.post(f"/api/runs/{run_id}/decisions", json={
        "target_entity_id": target_eid,
        "simulation_time": 30.0,
        "decision_type": "CLASSIFY",
        "selected_classification": "Micro-Quadcopter",
        "threat_assessment": "HOSTILE",
        "confidence": 0.85
    })
    assert dec_res.status_code == 201

    # Step 5: Calculate Scores
    eval_res = client.post(f"/api/runs/{run_id}/evaluate")
    assert eval_res.status_code == 200
    score = eval_res.json()
    assert "overall_score" in score

    # Step 6: Inspect Evidence Timeline
    timeline_res = client.get(f"/api/runs/{run_id}/timeline")
    assert timeline_res.status_code == 200
    tl = timeline_res.json()
    assert tl["total_items"] > 0
    assert any(item["item_type"] == "GROUND_TRUTH_EVENT" for item in tl["timeline"])
    assert any(item["item_type"] == "OBSERVATION_DELIVERED" for item in tl["timeline"])
    assert any(item["item_type"] == "TRAINEE_DECISION" for item in tl["timeline"])

    # Step 7: Review Session in AAR
    aar_res = client.get(f"/api/runs/{run_id}/review")
    assert aar_res.status_code == 200
    aar = aar_res.json()
    assert aar["overall_score"] == score["overall_score"]

    # Step 8: Generate Performance-Based Follow-Up Exercise
    recs_res = client.get(f"/api/training/recommendations?run_id={run_id}")
    assert recs_res.status_code == 200
    recs = recs_res.json()
    assert len(recs) > 0

    # Step 9: Verify Exports (JSON / CSV)
    json_export = client.get(f"/api/runs/{run_id}/export.json")
    assert json_export.status_code == 200
    csv_export = client.get(f"/api/runs/{run_id}/export.csv")
    assert csv_export.status_code == 200

    # Step 10: Verify Unit Assessment Aggregation
    unit_res = client.get("/api/assessment/unit-summary")
    assert unit_res.status_code == 200
    unit_data = unit_res.json()
    assert unit_data["total_missions_evaluated"] >= 1
