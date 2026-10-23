import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_adaptive_training_deduplication():
    # Fetch aggregated recommendations across all runs
    response = client.get("/api/training/recommendations")
    assert response.status_code == 200
    recs = response.json()
    assert isinstance(recs, list)
    
    # Verify no duplicate (gap_type, target_skill, recommended_difficulty) combinations exist
    seen = set()
    for rec in recs:
        key = (rec["gap_type"], rec["target_skill"], rec["recommended_difficulty"])
        assert key not in seen, f"Duplicate recommendation found for key {key}"
        seen.add(key)
        assert "occurrence_count" in rec
        assert "source_runs" in rec
        assert rec["occurrence_count"] >= 1
        assert len(rec["source_runs"]) >= 1

def test_adaptive_training_single_run_filtering():
    # Get a list of runs
    runs_res = client.get("/api/runs")
    assert runs_res.status_code == 200
    runs = runs_res.json()
    if not runs:
        pytest.skip("No simulation runs available")
        
    run_id = runs[0]["id"]
    response = client.get(f"/api/training/recommendations?run_id={run_id}")
    assert response.status_code == 200
    recs = response.json()
    assert isinstance(recs, list)
    # Check deduplication within the single run
    seen_gaps = set()
    for rec in recs:
        assert rec["gap_type"] not in seen_gaps
        seen_gaps.add(rec["gap_type"])
        assert rec["run_id"] == run_id

def test_adaptive_training_launch_flow():
    # Fetch a recommendation
    res = client.get("/api/training/recommendations")
    assert res.status_code == 200
    recs = res.json()
    if not recs:
        pytest.skip("No recommendations available to launch")
        
    rec = recs[0]
    rec_id = rec["id"]
    
    # Launch drill
    launch_res = client.post(f"/api/training/recommendations/{rec_id}/launch")
    assert launch_res.status_code in (200, 201)
    new_run = launch_res.json()
    assert "id" in new_run
    assert "scenario_id" in new_run
    assert new_run["scenario_name"] is not None
