import uuid
from datetime import datetime
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import SessionLocal
from app.models.simulation import SimulationRun, GroundTruthEvent, Observation, TraineeDecision
from app.models.evaluation import TrainingRecommendation

client = TestClient(app)


def test_aar_zero_decisions_behavior():
    """
    Test that a run with 0 decisions returns honest, safe metrics:
    - evaluation_status is PENDING_DECISIONS
    - classification accuracy is 0.0 with 0/0 denominator
    - strengths explain that 0 operational engagements were logged
    - weaknesses explain that threat airspace remained unengaged
    - recommendation is flagged provisional with NO_DECISIONS_RECORDED gap
    """
    db = SessionLocal()
    try:
        run_id = str(uuid.uuid4())
        run = SimulationRun(
            id=run_id,
            scenario_id="scenario-demo-01-beginner",
            trainee_id="Trainee-Observer-Only",
            status="COMPLETED",
            current_sim_time=90.0,
            duration_seconds=90,
            seed=101,
            started_at=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        db.add(run)

        # Add ground truth events and delivered observations
        gt1 = GroundTruthEvent(
            id=str(uuid.uuid4()), run_id=run_id, simulation_time=10.0, entity_id="DRONE-01",
            event_type="INTRUSION", is_hostile=True, threat_category="Micro-Quadcopter", threat_level="HIGH",
            pos_x=10.0, pos_y=20.0, altitude=50.0, speed=12.0, heading=90.0
        )
        obs1 = Observation(
            id=str(uuid.uuid4()), run_id=run_id, source_event_id=gt1.id,
            created_at_sim_time=10.0, delivered_at_sim_time=11.5,
            sensor_type="radar", delay_applied=1.5, is_lost=False,
            delivery_status="DELIVERED", quality_score=0.9,
            trainee_payload={"entity_id": "DRONE-01", "estimated_pos": [10.0, 20.0, 50.0]}
        )
        db.add_all([gt1, obs1])
        db.commit()

        # GET /runs/{run_id}/review
        res = client.get(f"/api/runs/{run_id}/review")
        assert res.status_code == 200
        data = res.json()

        assert data["run_id"] == run_id
        assert data["evaluation_status"] == "PENDING_DECISIONS"
        assert data["overall_score"] == 0.0
        assert data["timeline_summary"]["trainee_decisions"] == 0
        assert data["timeline_summary"]["ground_truth_events"] == 1
        assert data["timeline_summary"]["delivered_observations"] == 1

        # Strengths & weaknesses honesty
        assert any("No operational engagements" in s for s in data["strengths"])
        assert any("Unengaged Threat Airspace" in w for w in data["areas_for_improvement"])

        # Provisional recommendation
        assert len(data["recommendations"]) > 0
        rec = data["recommendations"][0]
        assert rec["gap_type"] == "NO_DECISIONS_RECORDED"
        assert "Provisional" in rec["reason"]
    finally:
        db.close()


def test_aar_with_active_decisions_and_exports():
    """
    Test that a run with active decisions returns:
    - Evidence-backed strengths & improvement areas with exact numbers
    - Real decision evaluations list
    - Valid JSON export
    - Valid CSV export
    """
    db = SessionLocal()
    try:
        run_id = str(uuid.uuid4())
        run = SimulationRun(
            id=run_id,
            scenario_id="scenario-demo-01-beginner",
            trainee_id="Trainee-Combat-Ready",
            status="COMPLETED",
            current_sim_time=60.0,
            duration_seconds=60,
            seed=42,
            started_at=datetime.utcnow(),
            created_at=datetime.utcnow()
        )
        db.add(run)

        gt1 = GroundTruthEvent(
            id=str(uuid.uuid4()), run_id=run_id, simulation_time=5.0, entity_id="DRONE-01",
            event_type="INTRUSION", is_hostile=True, threat_category="Micro-Quadcopter", threat_level="HIGH",
            pos_x=10.0, pos_y=20.0, altitude=50.0, speed=12.0, heading=90.0
        )
        obs1 = Observation(
            id=str(uuid.uuid4()), run_id=run_id, source_event_id=gt1.id,
            created_at_sim_time=5.0, delivered_at_sim_time=6.0,
            sensor_type="radar", delay_applied=1.0, is_lost=False,
            delivery_status="DELIVERED", quality_score=0.95,
            trainee_payload={"entity_id": "DRONE-01", "estimated_pos": [10.0, 20.0, 50.0]}
        )
        dec1 = TraineeDecision(
            id=str(uuid.uuid4()), run_id=run_id, simulation_time=8.0,
            target_entity_id="DRONE-01", decision_type="CLASSIFY",
            selected_classification="Micro-Quadcopter", threat_assessment="HOSTILE",
            confidence=0.92, evidence_status="ADEQUATE", available_observation_count=1
        )
        db.add_all([gt1, obs1, dec1])
        db.commit()

        # GET /runs/{run_id}/review
        res = client.get(f"/api/runs/{run_id}/review")
        assert res.status_code == 200
        data = res.json()

        assert data["evaluation_status"] == "EVALUATED"
        assert data["overall_score"] > 0.0
        assert data["timeline_summary"]["trainee_decisions"] == 1
        assert len(data["score_breakdown"]["decision_evaluations"]) == 1

        dec_eval = data["score_breakdown"]["decision_evaluations"][0]
        assert dec_eval["target_entity_id"] == "DRONE-01"
        assert dec_eval["is_correct"] is True
        assert dec_eval["delivered_evidence_count_at_decision"] == 1

        # Verify JSON export
        res_json = client.get(f"/api/runs/{run_id}/export.json")
        assert res_json.status_code == 200
        assert "attachment; filename=" in res_json.headers.get("content-disposition", "")
        report_json = res_json.json()
        assert report_json["run_summary"]["run_id"] == run_id
        assert len(report_json["trainee_decisions"]) == 1
        assert len(report_json["ground_truth_events"]) == 1
        assert len(report_json["sensor_observations"]) == 1

        # Verify CSV export
        res_csv = client.get(f"/api/runs/{run_id}/export.csv")
        assert res_csv.status_code == 200
        assert "attachment; filename=" in res_csv.headers.get("content-disposition", "")
        csv_text = res_csv.text
        assert "GARUDA Threat Simulation Trainer" in csv_text
        assert "DECISION-BY-DECISION EVIDENCE AUDIT" in csv_text
        assert "DRONE-01" in csv_text
    finally:
        db.close()
