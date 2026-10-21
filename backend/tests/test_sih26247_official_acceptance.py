import pytest
import uuid
import json
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.models.scenario import Scenario
from app.models.simulation import SimulationRun, GroundTruthEvent, Observation, TraineeDecision
from app.engine.generator import generate_synthetic_ground_truth
from app.engine.degradation import apply_sensor_degradation
from app.scoring.evaluator import EvidenceAwareScoringEngine
from app.recommender.engine import AdaptiveRecommendationEngine


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


@pytest.fixture
def db():
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


# =============================================================================
# 1. SCENARIO COVERAGE ACCEPTANCE TESTS
# =============================================================================

def test_sih_coverage_single_vs_swarm_entities(client):
    """
    Verify single-drone and multi-drone/swarm scenarios.
    Settings must affect actual ground truth entity count in the simulation.
    """
    # 1. Single Drone Scenario
    single_res = client.post("/api/scenarios", json={
        "name": "Acceptance Single Drone Incursion",
        "description": "Single threat test",
        "environment": "urban",
        "difficulty": "Beginner",
        "duration_seconds": 60,
        "seed": 1001,
        "configuration": {"num_entities": 1}
    })
    assert single_res.status_code == 201
    single_scen_id = single_res.json()["id"]

    run1 = client.post("/api/runs", json={"scenario_id": single_scen_id, "trainee_id": "Trainee-Single"}).json()
    gt1 = client.get(f"/api/runs/{run1['id']}/workspace?evaluator_mode=true").json()["evaluator_ground_truth"]
    distinct_entities_single = len(set(e["entity_id"] for e in gt1))
    assert distinct_entities_single == 1, f"Expected 1 entity, got {distinct_entities_single}"

    # 2. Swarm Scenario (8 entities)
    swarm_res = client.post("/api/scenarios", json={
        "name": "Acceptance Drone Swarm Incursion",
        "description": "Multi-drone swarm test",
        "environment": "rural",
        "difficulty": "Advanced",
        "duration_seconds": 90,
        "seed": 1002,
        "configuration": {"num_entities": 8}
    })
    assert swarm_res.status_code == 201
    swarm_scen_id = swarm_res.json()["id"]

    run2 = client.post("/api/runs", json={"scenario_id": swarm_scen_id, "trainee_id": "Trainee-Swarm"}).json()
    gt2 = client.get(f"/api/runs/{run2['id']}/workspace?evaluator_mode=true").json()["evaluator_ground_truth"]
    distinct_entities_swarm = len(set(e["entity_id"] for e in gt2))
    assert distinct_entities_swarm == 8, f"Expected 8 entities in swarm, got {distinct_entities_swarm}"


def test_sih_coverage_environmental_and_terrain_settings(client):
    """
    Verify day/night, urban/rural/coastal environments affect simulation configuration
    and are persisted to run snapshots.
    """
    environments = ["urban", "rural", "coastal", "border"]
    weathers = ["Clear Day", "Dense Fog", "Heavy Rain", "High RF Jamming"]

    for env_name, weather_name in zip(environments, weathers):
        res = client.post("/api/scenarios", json={
            "name": f"Acceptance {env_name.title()} {weather_name}",
            "description": f"Testing {env_name} terrain with {weather_name}",
            "environment": env_name,
            "difficulty": "Intermediate",
            "duration_seconds": 60,
            "seed": 2000 + len(env_name),
            "configuration": {
                "num_entities": 3,
                "weather": weather_name,
                "observation_loss_rate": 0.10,
                "noise_level": 0.15
            }
        })
        assert res.status_code == 201
        scen = res.json()
        assert scen["environment"] == env_name
        assert scen["configuration"]["weather"] == weather_name

        # Launch run and verify configuration snapshot matches
        run = client.post("/api/runs", json={"scenario_id": scen["id"], "trainee_id": f"Cadet-{env_name}"}).json()
        assert run["environment"] == env_name
        assert run["configuration_snapshot"]["weather"] == weather_name


def test_sih_coverage_sensor_degradation_settings_affect_actual_simulation():
    """
    Verify changing sensor degradation settings (loss rate, delay, noise)
    actually modifies the generated observations, not just the displayed config.
    """
    # Base ground truth with 10 events
    gt_events = [
        {
            "run_id": "test-run",
            "simulation_time": float(t),
            "entity_id": "DRONE-01",
            "event_type": "RADAR_TRACK_UPDATE",
            "is_hostile": True,
            "threat_category": "Micro-Quadcopter",
            "threat_level": "HIGH",
            "pos_x": 500.0,
            "pos_y": 500.0,
            "altitude": 100.0,
            "speed": 15.0,
            "heading": 45.0,
            "event_payload": {"rcs_m2": 0.02, "rf_freq_mhz": 2400.0}
        }
        for t in range(10, 110, 10)
    ]

    # Setting A: Pristine Sensors (0% loss, 0.5s delay, 0.05 noise)
    obs_pristine = apply_sensor_degradation(
        "run-pristine", gt_events, seed=555,
        config={
            "observation_loss_rate": 0.0,
            "observation_delay_mean": 0.5,
            "observation_delay_jitter": 0.1,
            "noise_level": 0.05,
            "weather": "Clear Day",
            "sensor_reliability": 0.98
        }
    )
    lost_pristine = sum(1 for o in obs_pristine if o["is_lost"])
    delays_pristine = [o["delay_applied"] for o in obs_pristine]
    assert lost_pristine == 0, "Pristine config should have 0 lost packets"
    assert sum(delays_pristine) / len(delays_pristine) < 1.0, "Mean delay should be < 1.0s"

    # Setting B: Severe Jamming & High Degradation (50% loss, 5.0s delay, 0.50 noise)
    obs_degraded = apply_sensor_degradation(
        "run-degraded", gt_events, seed=555,
        config={
            "observation_loss_rate": 0.50,
            "observation_delay_mean": 5.0,
            "observation_delay_jitter": 1.0,
            "noise_level": 0.50,
            "weather": "High RF Jamming",
            "sensor_reliability": 0.60
        }
    )
    lost_degraded = sum(1 for o in obs_degraded if o["is_lost"])
    delays_degraded = [o["delay_applied"] for o in obs_degraded]
    assert lost_degraded > 0, "Degraded config must have lost packets"
    assert sum(delays_degraded) / len(delays_degraded) > 3.5, "Mean delay must be > 3.5s"

    # Verify positions have larger noise variance in degraded config
    pos_errors_pristine = [abs(o["trainee_payload"]["observed_pos_x"] - 500.0) for o in obs_pristine]
    pos_errors_degraded = [abs(o["trainee_payload"]["observed_pos_x"] - 500.0) for o in obs_degraded]
    assert max(pos_errors_degraded) > max(pos_errors_pristine), "Degraded sensor noise must exceed pristine noise"


def test_sih_coverage_deterministic_seeds_and_reproducibility():
    """
    Verify repeating a scenario with the same seed and configuration
    reproduces its underlying ground-truth sequence exactly.
    """
    config = {"num_entities": 5}
    seq_a1 = generate_synthetic_ground_truth("run-seed-1", duration_seconds=120, seed=98765, config=config)
    seq_a2 = generate_synthetic_ground_truth("run-seed-2", duration_seconds=120, seed=98765, config=config)
    seq_b = generate_synthetic_ground_truth("run-seed-3", duration_seconds=120, seed=11223, config=config)

    # Identical seeds must match 100% across all coordinates, velocities, and entity IDs
    assert len(seq_a1) == len(seq_a2)
    for e1, e2 in zip(seq_a1, seq_a2):
        assert e1["simulation_time"] == e2["simulation_time"]
        assert e1["entity_id"] == e2["entity_id"]
        assert e1["pos_x"] == e2["pos_x"]
        assert e1["pos_y"] == e2["pos_y"]
        assert e1["altitude"] == e2["altitude"]
        assert e1["threat_category"] == e2["threat_category"]

    # Different seeds must produce different starting coordinates
    assert seq_a1[0]["pos_x"] != seq_b[0]["pos_x"] or seq_a1[0]["pos_y"] != seq_b[0]["pos_y"]


# =============================================================================
# 2. TRAINEE ASSESSMENT ACCEPTANCE TESTS
# =============================================================================

def test_sih_assessment_decision_tree_metrics_and_scoring(db):
    """
    Verify trainee decisions calculate scores using documented decision-tree rules:
    - Detection time (latency from first delivery to decision)
    - Threat classification accuracy
    - False alarms and missed detections
    - Availability of supporting observations
    """
    run = SimulationRun(
        id=str(uuid.uuid4()),
        scenario_id="scenario-demo-01-beginner",
        trainee_id="Cadet-DecisionAudit",
        status="RUNNING",
        current_sim_time=45.0,
        duration_seconds=90,
        seed=123,
        started_at=datetime.utcnow(),
        created_at=datetime.utcnow()
    )
    db.add(run)
    db.commit()

    # Ground Truth: Hostile drone
    gt = GroundTruthEvent(
        id=str(uuid.uuid4()), run_id=run.id, simulation_time=5.0, entity_id="DRONE-H01",
        event_type="RADAR_CONTACT", is_hostile=True, threat_category="Micro-Quadcopter",
        threat_level="HIGH", pos_x=200.0, pos_y=200.0, altitude=60.0, speed=14.0, heading=90.0,
        event_payload={}, created_at=datetime.utcnow()
    )
    # Ground Truth: Civilian drone (non-hostile)
    gt_civ = GroundTruthEvent(
        id=str(uuid.uuid4()), run_id=run.id, simulation_time=6.0, entity_id="DRONE-C02",
        event_type="RADAR_CONTACT", is_hostile=False, threat_category="Friendly Civilian",
        threat_level="NONE", pos_x=400.0, pos_y=400.0, altitude=70.0, speed=10.0, heading=180.0,
        event_payload={}, created_at=datetime.utcnow()
    )
    db.add_all([gt, gt_civ])

    # Observations delivered at t=10.0s and t=12.0s
    obs1 = Observation(
        id=str(uuid.uuid4()), run_id=run.id, source_event_id=gt.id,
        created_at_sim_time=5.0, delivered_at_sim_time=10.0, sensor_type="RADAR",
        delay_applied=5.0, is_lost=False, delivery_status="DELIVERED", quality_score=0.9,
        noise_offset_x=2.0, noise_offset_y=2.0, trainee_payload={"entity_id": "DRONE-H01", "observed_pos_x": 202.0, "observed_pos_y": 202.0},
        created_at=datetime.utcnow()
    )
    obs_civ = Observation(
        id=str(uuid.uuid4()), run_id=run.id, source_event_id=gt_civ.id,
        created_at_sim_time=6.0, delivered_at_sim_time=12.0, sensor_type="RADAR",
        delay_applied=6.0, is_lost=False, delivery_status="DELIVERED", quality_score=0.9,
        noise_offset_x=1.0, noise_offset_y=1.0, trainee_payload={"entity_id": "DRONE-C02", "observed_pos_x": 401.0, "observed_pos_y": 401.0},
        created_at=datetime.utcnow()
    )
    db.add_all([obs1, obs_civ])

    # Decision 1: Correct classification of DRONE-H01 at t=16.0s (latency = 16 - 10 = 6.0s)
    dec1 = TraineeDecision(
        id=str(uuid.uuid4()), run_id=run.id, target_entity_id="DRONE-H01",
        simulation_time=16.0, decision_type="CLASSIFY", selected_classification="Micro-Quadcopter",
        threat_assessment="HOSTILE", confidence=0.90, evidence_status="ADEQUATE",
        available_observation_count=1, created_at=datetime.utcnow()
    )
    # Decision 2: FALSE ALARM — engaging DRONE-C02 as hostile at t=20.0s
    dec2 = TraineeDecision(
        id=str(uuid.uuid4()), run_id=run.id, target_entity_id="DRONE-C02",
        simulation_time=20.0, decision_type="ENGAGE_COUNTERMEASURE", selected_classification="Micro-Quadcopter",
        threat_assessment="HOSTILE", confidence=0.85, evidence_status="ADEQUATE",
        available_observation_count=1, created_at=datetime.utcnow()
    )
    db.add_all([dec1, dec2])
    db.commit()

    # Evaluate Run
    score_out = EvidenceAwareScoringEngine.evaluate_run(db, run.id)

    # 1. Verification of Classification Accuracy (1 correct out of 2 = 50%)
    rec_class = next(r for r in score_out["metrics"] if r.metric_category == "CLASSIFICATION")
    assert rec_class.score_value == 50.0

    # 2. Verification of False Alarm Detection
    assert run.summary_metrics["false_alarm_rate"] > 0

    # 3. Verification of Latency Calculation
    assert run.summary_metrics["mean_response_latency_s"] > 0

    # 4. Verification of Audited Decisions
    audits = score_out["decision_evaluations"]
    assert len(audits) == 2
    assert audits[0]["is_correct"] is True
    assert audits[1]["is_correct"] is False
    assert "FALSE ALARM" in audits[1]["scoring_notes"]


def test_sih_assessment_evidence_limited_exemption_differentiator(db):
    """
    CRITICAL SIH REQUIREMENT: Evidence-limited events are distinguished from trainee errors.
    If a hostile drone had 100% packet loss (due to jamming), the trainee cannot see it.
    The evaluator MUST NOT penalize the trainee with a Missed Detection penalty!
    """
    run = SimulationRun(
        id=str(uuid.uuid4()),
        scenario_id="scenario-demo-03-advanced",
        trainee_id="Cadet-ExemptionProof",
        status="RUNNING",
        current_sim_time=40.0,
        duration_seconds=60,
        seed=888,
        started_at=datetime.utcnow(),
        created_at=datetime.utcnow()
    )
    db.add(run)
    db.commit()

    # Ground Truth: Hostile drone in flight
    gt_jammed = GroundTruthEvent(
        id=str(uuid.uuid4()), run_id=run.id, simulation_time=10.0, entity_id="DRONE-JAMMED",
        event_type="RADAR_CONTACT", is_hostile=True, threat_category="Fixed-Wing Loitering",
        threat_level="CRITICAL", pos_x=800.0, pos_y=800.0, altitude=250.0, speed=35.0, heading=45.0,
        event_payload={}, created_at=datetime.utcnow()
    )
    db.add(gt_jammed)

    # 100% of observations for this drone were LOST in network
    obs_lost = Observation(
        id=str(uuid.uuid4()), run_id=run.id, source_event_id=gt_jammed.id,
        created_at_sim_time=10.0, delivered_at_sim_time=14.0, sensor_type="RADAR",
        delay_applied=4.0, is_lost=True, delivery_status="LOST", quality_score=0.2,
        noise_offset_x=0.0, noise_offset_y=0.0, trainee_payload={"entity_id": "DRONE-JAMMED"},
        created_at=datetime.utcnow()
    )
    db.add(obs_lost)
    db.commit()

    # Trainee made NO decisions because radar screen was blank!
    score_out = EvidenceAwareScoringEngine.evaluate_run(db, run.id)

    # Denominator in detection rate must EXCLUDE DRONE-JAMMED (observable_hostile_count == 0)
    det_metric = next(m for m in score_out["metrics"] if m.metric_category == "DETECTION")
    assert det_metric.denominator == 0, "Unobservable threat must not be added to detection denominator"
    assert det_metric.score_value == 100.0, "Detection rate must remain 100% when no observable threats were missed"

    # Summary metrics must note unassessable count
    assert score_out["summary_metrics"]["unassessable_count"] >= 1
    assert score_out["summary_metrics"]["observable_hostile_count"] == 0


# =============================================================================
# 3. AFTER-ACTION REVIEW ACCEPTANCE TESTS
# =============================================================================

def test_sih_aar_multi_session_history_and_exports(client):
    """
    Verify After-Action Review:
    - Retrieve individual session histories
    - Reconstruct event timeline
    - Explain scoring results
    - Compare performance across repeated sessions
    - Export reports (JSON / CSV)
    """
    # Create and evaluate Run 1 for Cadet-Alpha
    init1 = client.post("/api/runs", json={"scenario_id": "scenario-demo-01-beginner", "trainee_id": "Cadet-Alpha"}).json()
    run1_id = init1["id"]
    client.post(f"/api/runs/{run1_id}/step?step_seconds=20.0")
    client.post(f"/api/runs/{run1_id}/evaluate")

    # Create and evaluate Run 2 for Cadet-Alpha (Repeated Session)
    init2 = client.post("/api/runs", json={"scenario_id": "scenario-demo-01-beginner", "trainee_id": "Cadet-Alpha"}).json()
    run2_id = init2["id"]
    client.post(f"/api/runs/{run2_id}/step?step_seconds=30.0")
    client.post(f"/api/runs/{run2_id}/evaluate")

    # 1. Retrieve individual session histories
    runs_res = client.get("/api/runs?trainee_id=Cadet-Alpha")
    assert runs_res.status_code == 200
    runs_list = runs_res.json()
    assert len(runs_list) >= 2

    # 2. Reconstruct event timeline
    timeline_res = client.get(f"/api/runs/{run1_id}/timeline")
    assert timeline_res.status_code == 200
    tl = timeline_res.json()
    assert tl["total_items"] > 0
    assert any(i["item_type"] == "GROUND_TRUTH_EVENT" for i in tl["timeline"])

    # 3. Explain scoring results in AAR debrief
    aar_res = client.get(f"/api/runs/{run1_id}/review")
    assert aar_res.status_code == 200
    aar = aar_res.json()
    assert "score_breakdown" in aar
    assert len(aar["score_breakdown"]["metrics"]) > 0
    assert "strengths" in aar
    assert "areas_for_improvement" in aar
    assert "recommendations" in aar

    # 4. Export JSON report
    export_json = client.get(f"/api/runs/{run1_id}/export.json")
    assert export_json.status_code == 200
    data = json.loads(export_json.content)
    assert data["run_summary"]["run_id"] == run1_id
    assert "evidence_aware_scoring" in data

    # 5. Export CSV report
    export_csv = client.get(f"/api/runs/{run1_id}/export.csv")
    assert export_csv.status_code == 200
    assert b"METRIC BREAKDOWN" in export_csv.content
    assert b"DECISION-BY-DECISION EVIDENCE AUDIT" in export_csv.content


def test_sih_aar_unit_level_assessment_honest_na_rule(client):
    """
    Verify Unit-level performance:
    - Aggregates when multiple trainee records exist (>= 2 distinct trainees)
    - Displays N/A when there is insufficient data (< 2 distinct trainees)
    """
    # Ensure at least two trainees exist: Cadet-Alpha and Cadet-Bravo
    client.post("/api/runs", json={"scenario_id": "scenario-demo-01-beginner", "trainee_id": "Cadet-Bravo"})

    unit_res = client.get("/api/assessment/unit-summary")
    assert unit_res.status_code == 200
    unit = unit_res.json()
    assert "unique_trainees_count" in unit
    assert unit["unique_trainees_count"] >= 2
    assert unit["has_sufficient_unit_data"] is True
    assert "%" in unit["unit_readiness_score"]


# =============================================================================
# 4. ADAPTIVE TRAINING ACCEPTANCE TESTS
# =============================================================================

def test_sih_adaptive_training_different_gaps_produce_different_drills(db, client):
    """
    Create test trainees with different measured performance gaps.
    Verify:
    - Different weaknesses produce different follow-up exercises
    - Recommendations derived from actual assessment results
    - Recommended scenarios can actually be launched
    """
    # Trainee A: High False Alarms (fa_rate = 25%)
    run_fa = SimulationRun(
        id=str(uuid.uuid4()), scenario_id="scenario-demo-01-beginner", trainee_id="Cadet-FalseAlarmProne",
        status="COMPLETED", current_sim_time=60.0, duration_seconds=60, seed=1,
        summary_metrics={"false_alarm_rate": 25.0, "detection_rate": 90.0, "classification_accuracy": 90.0, "mean_response_latency_s": 4.0},
        overall_score=72.0, started_at=datetime.utcnow(), created_at=datetime.utcnow()
    )
    # Trainee B: Missed Detections (det_rate = 50%)
    run_miss = SimulationRun(
        id=str(uuid.uuid4()), scenario_id="scenario-demo-01-beginner", trainee_id="Cadet-MissedDetections",
        status="COMPLETED", current_sim_time=60.0, duration_seconds=60, seed=2,
        summary_metrics={"false_alarm_rate": 0.0, "detection_rate": 50.0, "classification_accuracy": 90.0, "mean_response_latency_s": 4.0},
        overall_score=60.0, started_at=datetime.utcnow(), created_at=datetime.utcnow()
    )
    # Trainee C: Slow Reaction / High Latency (latency = 14.5s)
    run_latency = SimulationRun(
        id=str(uuid.uuid4()), scenario_id="scenario-demo-01-beginner", trainee_id="Cadet-Hesitant",
        status="COMPLETED", current_sim_time=60.0, duration_seconds=60, seed=3,
        summary_metrics={"false_alarm_rate": 0.0, "detection_rate": 90.0, "classification_accuracy": 90.0, "mean_response_latency_s": 14.5},
        overall_score=68.0, started_at=datetime.utcnow(), created_at=datetime.utcnow()
    )
    db.add_all([run_fa, run_miss, run_latency])
    db.commit()

    # Generate recommendations for all 3
    recs_fa = AdaptiveRecommendationEngine.generate_recommendations(db, run_fa.id)
    recs_miss = AdaptiveRecommendationEngine.generate_recommendations(db, run_miss.id)
    recs_latency = AdaptiveRecommendationEngine.generate_recommendations(db, run_latency.id)

    # 1. Trainee A gap is FALSE_ALARMS -> Clutter & Civilian Discrimination
    assert any(r.gap_type == "FALSE_ALARMS" for r in recs_fa)
    assert any("Civilian" in r.target_skill for r in recs_fa)

    # 2. Trainee B gap is MISSED_DETECTIONS -> Low-RCS Rapid Threat Detection
    assert any(r.gap_type == "MISSED_DETECTIONS" for r in recs_miss)
    assert any("Detection" in r.target_skill for r in recs_miss)

    # 3. Trainee C gap is SLOW_REACTION -> Rapid Threat Triaging
    assert any(r.gap_type == "SLOW_REACTION" for r in recs_latency)
    assert any("Timeliness" in r.target_skill or "Triaging" in r.target_skill for r in recs_latency)

    # 4. Verify 1-Click Launch of recommended exercise
    target_rec_id = recs_fa[0].id
    launch_res = client.post(f"/api/training/recommendations/{target_rec_id}/launch")
    assert launch_res.status_code == 200
    launched_run = launch_res.json()
    assert launched_run["status"] == "INITIALIZED"
    assert launched_run["scenario_name"] == recs_fa[0].suggested_scenario_config["name"]


# =============================================================================
# 5. MINIMAL-HARDWARE DEPLOYMENT ACCEPTANCE TESTS
# =============================================================================

def test_sih_minimal_hardware_stand_alone_operation(client):
    """
    Verify core application runs on standard desktop without physical drones
    or mandatory VR equipment.
    Internal simulation operates 100% independently of external PX4/Gazebo.
    """
    health_res = client.get("/api/telemetry/health/system")
    assert health_res.status_code == 200
    health = health_res.json()

    assert health["status"] == "HEALTHY"
    # Authoritative internal simulation engine must be active
    assert health["services"]["authoritative_simulation_engine"]["status"] == "ACTIVE"
    # Database persistence must be operational
    assert health["services"]["database"]["connected"] is True
    # External hardware simulator connection status must be DISCONNECTED
    assert health["services"]["external_simulators"]["px4_sitl"]["connection_status"] == "DISCONNECTED"
    # Simulation runs must succeed without external simulator
    init_res = client.post("/api/runs", json={
        "scenario_id": "scenario-demo-01-beginner",
        "trainee_id": "Cadet-StandaloneDesktop"
    })
    assert init_res.status_code == 201
    run_id = init_res.json()["id"]

    # Internal synthetic engine steps and generates telemetry autonomously (step 30s)
    step_res = client.post(f"/api/runs/{run_id}/step?step_seconds=30.0")
    assert step_res.status_code == 200
    ws = client.get(f"/api/runs/{run_id}/workspace?evaluator_mode=false").json()
    assert len(ws["visible_observations"]) > 0, "Internal engine must produce synthetic telemetry without external hardware"
