import pytest
import uuid
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.core.database import SessionLocal, Base, engine
from app.models.simulation import SimulationRun, GroundTruthEvent, Observation, TraineeDecision
from app.scoring.evaluator import EvidenceAwareScoringEngine


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


def create_blank_run(db, trainee_id="Cadet-EvidenceQA") -> SimulationRun:
    run = SimulationRun(
        id=str(uuid.uuid4()),
        scenario_id="scenario-demo-01-beginner",
        trainee_id=trainee_id,
        status="RUNNING",
        current_sim_time=50.0,
        duration_seconds=90,
        seed=42,
        started_at=datetime.utcnow(),
        created_at=datetime.utcnow()
    )
    db.add(run)
    db.commit()
    db.refresh(run)
    return run


# =========================================================================
# PHASE SEVEN: 10 EVIDENCE-AWARE SCORING EDGE CASES
# =========================================================================

def test_case_1_correct_classification_with_delivered_evidence(db):
    """
    Case 1: Correctly classified observation delivered before the decision.
    Trainee receives >=2 observations, classifies correctly at t=20.0s.
    Expected: Assessable, ADEQUATE evidence, correct classification counted.
    """
    run = create_blank_run(db)
    eid = "DRONE-HOSTILE-01"

    # Ground truth: Hostile Micro-Quadcopter
    gt = GroundTruthEvent(
        id=str(uuid.uuid4()),
        run_id=run.id,
        simulation_time=5.0,
        entity_id=eid,
        event_type="RADAR_CONTACT",
        is_hostile=True,
        threat_category="Micro-Quadcopter",
        threat_level="HIGH",
        pos_x=100.0, pos_y=100.0, altitude=50.0, speed=15.0, heading=90.0,
        event_payload={},
        created_at=datetime.utcnow()
    )
    db.add(gt)

    # Delivered observation 1 at t=10.0s
    obs1 = Observation(
        id=str(uuid.uuid4()),
        run_id=run.id,
        source_event_id=gt.id,
        created_at_sim_time=5.0,
        delivered_at_sim_time=10.0,
        sensor_type="RADAR",
        delay_applied=5.0,
        is_lost=False,
        delivery_status="DELIVERED",
        quality_score=0.9,
        noise_offset_x=0.0, noise_offset_y=0.0,
        trainee_payload={"entity_id": eid, "category_hint": "Micro-Quadcopter"},
        created_at=datetime.utcnow()
    )
    # Delivered observation 2 at t=15.0s
    obs2 = Observation(
        id=str(uuid.uuid4()),
        run_id=run.id,
        source_event_id=gt.id,
        created_at_sim_time=8.0,
        delivered_at_sim_time=15.0,
        sensor_type="OPTICAL_EOIR",
        delay_applied=7.0,
        is_lost=False,
        delivery_status="DELIVERED",
        quality_score=0.95,
        noise_offset_x=0.0, noise_offset_y=0.0,
        trainee_payload={"entity_id": eid, "category_hint": "Micro-Quadcopter"},
        created_at=datetime.utcnow()
    )
    db.add_all([obs1, obs2])

    # Trainee decision at t=20.0s (after both observations delivered)
    dec = TraineeDecision(
        id=str(uuid.uuid4()),
        run_id=run.id,
        target_entity_id=eid,
        simulation_time=20.0,
        decision_type="CLASSIFY",
        selected_classification="Micro-Quadcopter",
        threat_assessment="HOSTILE",
        confidence=0.95,
        rationale="Corroborated by radar and EOIR feeds",
        referenced_observation_ids=[obs1.id, obs2.id],
        available_observation_count=2,
        evidence_status="ADEQUATE",
        created_at=datetime.utcnow()
    )
    db.add(dec)
    db.commit()

    evaluation = EvidenceAwareScoringEngine.evaluate_run(db, run.id)
    assert evaluation["overall_score"] > 80.0
    dec_eval = evaluation["decision_evaluations"][0]
    assert dec_eval["is_correct"] is True
    assert dec_eval["evidence_status"] == "ADEQUATE"
    assert dec_eval["delivered_evidence_count_at_decision"] == 2
    assert evaluation["summary_metrics"]["classification_accuracy"] == 100.0


def test_case_2_incorrect_classification_with_sufficient_evidence(db):
    """
    Case 2: Incorrect classification despite sufficient evidence available.
    Expected: Assessable, ADEQUATE evidence, marked incorrect (0% classification accuracy).
    """
    run = create_blank_run(db)
    eid = "DRONE-HOSTILE-02"

    gt = GroundTruthEvent(
        id=str(uuid.uuid4()), run_id=run.id, simulation_time=5.0, entity_id=eid,
        event_type="RADAR_CONTACT", is_hostile=True, threat_category="Fixed-Wing Loitering",
        threat_level="CRITICAL", pos_x=200.0, pos_y=200.0, altitude=300.0, speed=40.0, heading=45.0,
        event_payload={}, created_at=datetime.utcnow()
    )
    obs = Observation(
        id=str(uuid.uuid4()), run_id=run.id, source_event_id=gt.id,
        created_at_sim_time=5.0, delivered_at_sim_time=10.0, sensor_type="RADAR",
        delay_applied=5.0, is_lost=False, delivery_status="DELIVERED",
        quality_score=0.9, noise_offset_x=0.0, noise_offset_y=0.0,
        trainee_payload={"entity_id": eid, "category_hint": "Fixed-Wing Loitering"},
        created_at=datetime.utcnow()
    )
    obs2 = Observation(
        id=str(uuid.uuid4()), run_id=run.id, source_event_id=gt.id,
        created_at_sim_time=8.0, delivered_at_sim_time=12.0, sensor_type="RF_SCANNER",
        delay_applied=4.0, is_lost=False, delivery_status="DELIVERED",
        quality_score=0.9, noise_offset_x=0.0, noise_offset_y=0.0,
        trainee_payload={"entity_id": eid, "category_hint": "Fixed-Wing Loitering"},
        created_at=datetime.utcnow()
    )
    db.add_all([gt, obs, obs2])

    # Trainee incorrectly misclassifies as Friendly Civilian
    dec = TraineeDecision(
        id=str(uuid.uuid4()), run_id=run.id, target_entity_id=eid, simulation_time=15.0,
        decision_type="CLASSIFY", selected_classification="Friendly Civilian",
        threat_assessment="FRIENDLY", confidence=0.8, created_at=datetime.utcnow()
    )
    db.add(dec)
    db.commit()

    evaluation = EvidenceAwareScoringEngine.evaluate_run(db, run.id)
    dec_eval = evaluation["decision_evaluations"][0]
    assert dec_eval["is_correct"] is False
    assert evaluation["summary_metrics"]["classification_accuracy"] == 0.0


def test_case_3_observation_delayed_until_after_decision(db):
    """
    Case 3: Relevant observation delayed until AFTER the decision.
    Decision made at t=10.0s, but observation is delivered at t=15.0s.
    Expected: Trainee was acting blindly at t=10.0s -> UNASSESSABLE evidence status.
    """
    run = create_blank_run(db)
    eid = "DRONE-DELAYED-03"

    gt = GroundTruthEvent(
        id=str(uuid.uuid4()), run_id=run.id, simulation_time=5.0, entity_id=eid,
        event_type="RADAR_CONTACT", is_hostile=True, threat_category="Micro-Quadcopter",
        threat_level="HIGH", pos_x=100.0, pos_y=100.0, altitude=60.0, speed=12.0, heading=0.0,
        event_payload={}, created_at=datetime.utcnow()
    )
    # Observation arrives at t=15.0s (after trainee decision)
    obs = Observation(
        id=str(uuid.uuid4()), run_id=run.id, source_event_id=gt.id,
        created_at_sim_time=5.0, delivered_at_sim_time=15.0, sensor_type="RADAR",
        delay_applied=10.0, is_lost=False, delivery_status="DELIVERED",
        quality_score=0.9, noise_offset_x=0.0, noise_offset_y=0.0,
        trainee_payload={"entity_id": eid, "category_hint": "Micro-Quadcopter"},
        created_at=datetime.utcnow()
    )
    db.add_all([gt, obs])

    # Trainee guesses at t=10.0s
    dec = TraineeDecision(
        id=str(uuid.uuid4()), run_id=run.id, target_entity_id=eid, simulation_time=10.0,
        decision_type="CLASSIFY", selected_classification="Micro-Quadcopter",
        threat_assessment="HOSTILE", confidence=0.5, created_at=datetime.utcnow()
    )
    db.add(dec)
    db.commit()

    evaluation = EvidenceAwareScoringEngine.evaluate_run(db, run.id)
    dec_eval = evaluation["decision_evaluations"][0]
    assert dec_eval["evidence_status"] == "UNASSESSABLE"
    assert dec_eval["delivered_evidence_count_at_decision"] == 0
    assert evaluation["summary_metrics"]["unassessable_count"] >= 1


def test_case_4_permanently_lost_observation_excluded_from_missed_penalty(db):
    """
    Case 4: Relevant observation permanently lost (100% packet loss due to jamming).
    Expected: Trainee receives 0 observations. This threat MUST NOT penalize detection rate!
    Detection rate must remain 100% (unobservable threats excluded from denominator).
    """
    run = create_blank_run(db)
    eid = "DRONE-LOST-04"

    gt = GroundTruthEvent(
        id=str(uuid.uuid4()), run_id=run.id, simulation_time=5.0, entity_id=eid,
        event_type="RADAR_CONTACT", is_hostile=True, threat_category="Heavy Commercial",
        threat_level="HIGH", pos_x=100.0, pos_y=100.0, altitude=120.0, speed=18.0, heading=180.0,
        event_payload={}, created_at=datetime.utcnow()
    )
    # 100% lost observation
    obs = Observation(
        id=str(uuid.uuid4()), run_id=run.id, source_event_id=gt.id,
        created_at_sim_time=5.0, delivered_at_sim_time=999.0, sensor_type="RADAR",
        delay_applied=999.0, is_lost=True, delivery_status="DROPPED",
        quality_score=0.0, noise_offset_x=0.0, noise_offset_y=0.0,
        trainee_payload={"entity_id": eid},
        created_at=datetime.utcnow()
    )
    db.add_all([gt, obs])
    db.commit()

    evaluation = EvidenceAwareScoringEngine.evaluate_run(db, run.id)
    # Observable hostile count is 0 because the only hostile was unobservable
    assert evaluation["summary_metrics"]["observable_hostile_count"] == 0
    # Protected denominator gives 100.0% instead of 0% or ZeroDivisionError
    assert evaluation["summary_metrics"]["detection_rate"] == 100.0


def test_case_5_event_with_no_valid_observation_generated(db):
    """
    Case 5: Ground-truth entity with no observations generated at all.
    Expected: System handles gracefully without crashing; excluded from observable hostiles.
    """
    run = create_blank_run(db)
    eid = "DRONE-GHOST-05"

    gt = GroundTruthEvent(
        id=str(uuid.uuid4()), run_id=run.id, simulation_time=5.0, entity_id=eid,
        event_type="OPTICAL_SIGHTING", is_hostile=True, threat_category="Micro-Quadcopter",
        threat_level="HIGH", pos_x=50.0, pos_y=50.0, altitude=40.0, speed=10.0, heading=0.0,
        event_payload={}, created_at=datetime.utcnow()
    )
    db.add(gt)
    db.commit()

    evaluation = EvidenceAwareScoringEngine.evaluate_run(db, run.id)
    assert evaluation["summary_metrics"]["observable_hostile_count"] == 0
    assert evaluation["overall_score"] is not None


def test_case_6_false_alarm_on_benign_clutter(db):
    """
    Case 6: False Alarm. Trainee misidentifies Wildlife Clutter / Civilian as HOSTILE
    and engages countermeasure.
    Expected: false_alarms incremented, false_alarm_rate > 0, overall score penalized.
    """
    run = create_blank_run(db)
    eid = "CLUTTER-BIRD-06"

    # Ground truth: Non-hostile Wildlife Clutter
    gt = GroundTruthEvent(
        id=str(uuid.uuid4()), run_id=run.id, simulation_time=5.0, entity_id=eid,
        event_type="RADAR_CONTACT", is_hostile=False, threat_category="Wildlife Clutter",
        threat_level="NONE", pos_x=300.0, pos_y=300.0, altitude=80.0, speed=10.0, heading=270.0,
        event_payload={}, created_at=datetime.utcnow()
    )
    obs = Observation(
        id=str(uuid.uuid4()), run_id=run.id, source_event_id=gt.id,
        created_at_sim_time=5.0, delivered_at_sim_time=7.0, sensor_type="RADAR",
        delay_applied=2.0, is_lost=False, delivery_status="DELIVERED",
        quality_score=0.8, noise_offset_x=0.0, noise_offset_y=0.0,
        trainee_payload={"entity_id": eid, "category_hint": "Wildlife Clutter"},
        created_at=datetime.utcnow()
    )
    db.add_all([gt, obs])

    # Trainee engages with kinetic / jamming countermeasure falsely
    dec = TraineeDecision(
        id=str(uuid.uuid4()), run_id=run.id, target_entity_id=eid, simulation_time=10.0,
        decision_type="ENGAGE_COUNTERMEASURE", selected_classification="Micro-Quadcopter",
        threat_assessment="HOSTILE", confidence=0.9, created_at=datetime.utcnow()
    )
    db.add(dec)
    db.commit()

    evaluation = EvidenceAwareScoringEngine.evaluate_run(db, run.id)
    assert evaluation["summary_metrics"]["false_alarm_rate"] == 100.0
    dec_eval = evaluation["decision_evaluations"][0]
    assert dec_eval["is_correct"] is False
    assert "FALSE ALARM" in dec_eval["scoring_notes"]


def test_case_7_missed_detection_when_evidence_available(db):
    """
    Case 7: Missed detection when evidence was available.
    Hostile drone was observed clearly (delivered observation), but trainee took NO action.
    Expected: Detection rate = 0.0% (1 observable hostile, 0 detected).
    """
    run = create_blank_run(db)
    eid = "DRONE-IGNORED-07"

    gt = GroundTruthEvent(
        id=str(uuid.uuid4()), run_id=run.id, simulation_time=5.0, entity_id=eid,
        event_type="RADAR_CONTACT", is_hostile=True, threat_category="Micro-Quadcopter",
        threat_level="HIGH", pos_x=150.0, pos_y=150.0, altitude=75.0, speed=16.0, heading=120.0,
        event_payload={}, created_at=datetime.utcnow()
    )
    obs = Observation(
        id=str(uuid.uuid4()), run_id=run.id, source_event_id=gt.id,
        created_at_sim_time=5.0, delivered_at_sim_time=8.0, sensor_type="RADAR",
        delay_applied=3.0, is_lost=False, delivery_status="DELIVERED",
        quality_score=0.95, noise_offset_x=0.0, noise_offset_y=0.0,
        trainee_payload={"entity_id": eid, "category_hint": "Micro-Quadcopter"},
        created_at=datetime.utcnow()
    )
    db.add_all([gt, obs])
    db.commit()
    # Trainee took NO decision!

    evaluation = EvidenceAwareScoringEngine.evaluate_run(db, run.id)
    assert evaluation["summary_metrics"]["observable_hostile_count"] == 1
    assert evaluation["summary_metrics"]["detection_rate"] == 0.0


def test_case_8_decision_marked_uncertain(db):
    """
    Case 8: Decision marked uncertain under degraded evidence.
    Trainee selects MARK_UNCERTAIN or REQUEST_PING when evidence is limited (1 observation).
    Expected: Commendable caution acknowledged, credited as prudent action under uncertainty.
    """
    run = create_blank_run(db)
    eid = "DRONE-UNCERTAIN-08"

    gt = GroundTruthEvent(
        id=str(uuid.uuid4()), run_id=run.id, simulation_time=5.0, entity_id=eid,
        event_type="RADAR_CONTACT", is_hostile=True, threat_category="Fixed-Wing Loitering",
        threat_level="CRITICAL", pos_x=400.0, pos_y=400.0, altitude=350.0, speed=35.0, heading=45.0,
        event_payload={}, created_at=datetime.utcnow()
    )
    obs = Observation(
        id=str(uuid.uuid4()), run_id=run.id, source_event_id=gt.id,
        created_at_sim_time=5.0, delivered_at_sim_time=8.0, sensor_type="RADAR",
        delay_applied=3.0, is_lost=False, delivery_status="DELIVERED",
        quality_score=0.6, noise_offset_x=10.0, noise_offset_y=10.0,
        trainee_payload={"entity_id": eid, "category_hint": "Unknown Radar Track"},
        created_at=datetime.utcnow()
    )
    db.add_all([gt, obs])

    # Trainee marks uncertain and requests verification ping
    dec = TraineeDecision(
        id=str(uuid.uuid4()), run_id=run.id, target_entity_id=eid, simulation_time=12.0,
        decision_type="MARK_UNCERTAIN", selected_classification="Unknown",
        threat_assessment="MEDIUM", confidence=0.4, rationale="Single noisy radar echo",
        created_at=datetime.utcnow()
    )
    db.add(dec)
    db.commit()

    evaluation = EvidenceAwareScoringEngine.evaluate_run(db, run.id)
    dec_eval = evaluation["decision_evaluations"][0]
    assert dec_eval["is_correct"] is True
    assert "caution" in dec_eval["scoring_notes"].lower()


def test_case_9_run_with_no_scored_events(db):
    """
    Case 9: A run with zero decisions and zero events.
    Expected: Safe execution, zero-division protected, scores calculated cleanly without NaN or error.
    """
    run = create_blank_run(db)
    evaluation = EvidenceAwareScoringEngine.evaluate_run(db, run.id)
    assert evaluation["overall_score"] is not None
    assert evaluation["overall_score"] >= 0.0
    assert evaluation["summary_metrics"]["total_decisions"] == 0
    assert evaluation["summary_metrics"]["detection_rate"] == 100.0
    assert evaluation["summary_metrics"]["false_alarm_rate"] == 0.0


def test_case_10_zero_denominators_protected_no_nan_or_infinity(db):
    """
    Case 10: Run with zero denominators for each metric category:
    - 0 hostiles (detection_rate denominator = 0)
    - 0 non-hostiles (false_alarm_rate denominator = 0)
    - 0 decisions (classification_accuracy denominator = 0)
    - 0 response latencies (latency mean denominator = 0)
    Expected: No ZeroDivisionError, No NaN, No Inf, strictly float output.
    """
    run = create_blank_run(db)
    # No GT, no observations, no decisions
    evaluation = EvidenceAwareScoringEngine.evaluate_run(db, run.id)
    metrics = evaluation["summary_metrics"]

    import math
    for key, val in metrics.items():
        if isinstance(val, (int, float)):
            assert not math.isnan(val), f"Metric {key} produced NaN"
            assert not math.isinf(val), f"Metric {key} produced Infinity"
