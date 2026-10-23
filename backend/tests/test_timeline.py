import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.engine.service import SimulationService
from app.core.database import SessionLocal

client = TestClient(app)

def test_evidence_timeline_integrity_and_role_access():
    db = SessionLocal()
    try:
        # Create a simulation run
        run = SimulationService.initialize_run(
            db=db,
            scenario_id="SCN-001",
            trainee_id="TEST-TIMELINE-AUDIT"
        )
        run_id = run.id
        
        # 1. Evaluator Role Test
        eval_res = client.get(f"/api/runs/{run_id}/timeline?role=evaluator")
        assert eval_res.status_code == 200
        eval_data = eval_res.json()
        assert eval_data["role"] == "evaluator"
        assert "counts" in eval_data
        counts = eval_data["counts"]
        assert counts["all"] > 0
        assert counts["ground_truth"] > 0
        
        # Verify ground truth items exist in evaluator view
        eval_items = eval_data["timeline"]
        gt_items = [x for x in eval_items if x["item_type"] == "GROUND_TRUTH_EVENT"]
        assert len(gt_items) > 0
        assert all(x["is_evaluator_only"] is True for x in gt_items)
        
        # 2. Trainee Role Access Restriction Test
        trainee_res = client.get(f"/api/runs/{run_id}/timeline?role=trainee")
        assert trainee_res.status_code == 200
        trainee_data = trainee_res.json()
        assert trainee_data["role"] == "trainee"
        trainee_counts = trainee_data["counts"]
        assert trainee_counts["ground_truth"] == 0
        assert trainee_counts["lost"] == 0
        
        # CRITICAL: Verify NO ground truth events or lost observations leak over the wire to trainee
        trainee_items = trainee_data["timeline"]
        assert not any(x["item_type"] == "GROUND_TRUTH_EVENT" for x in trainee_items)
        assert not any(x["item_type"] == "OBSERVATION_LOST" for x in trainee_items)
        
        # 3. Filter tests
        deliv_res = client.get(f"/api/runs/{run_id}/timeline?filter_type=delivered&role=evaluator")
        assert deliv_res.status_code == 200
        deliv_items = deliv_res.json()["timeline"]
        assert all(x["item_type"] == "OBSERVATION_DELIVERED" for x in deliv_items)
        
        lost_res = client.get(f"/api/runs/{run_id}/timeline?filter_type=lost&role=evaluator")
        assert lost_res.status_code == 200
        lost_items = lost_res.json()["timeline"]
        assert all(x["item_type"] == "OBSERVATION_LOST" for x in lost_items)
    finally:
        db.close()
