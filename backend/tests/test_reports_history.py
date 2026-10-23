import pytest
import json
import csv
import io
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_runs_list_and_filtering():
    # Fetch runs
    response = client.get("/api/runs")
    assert response.status_code == 200
    runs = response.json()
    assert isinstance(runs, list)
    assert len(runs) > 0

    first_run = runs[0]
    required_keys = [
        "id", "trainee_id", "status", "current_sim_time",
        "duration_seconds", "seed", "trainee_decisions_count",
        "created_at"
    ]
    for key in required_keys:
        assert key in first_run, f"Missing key {key} in run object"

    # Filter by status
    status_filter = first_run["status"]
    filtered_res = client.get(f"/api/runs?status={status_filter}")
    assert filtered_res.status_code == 200
    for r in filtered_res.json():
        assert r["status"] == status_filter

def test_unit_level_assessment_endpoint():
    response = client.get("/api/assessment/unit-summary")
    assert response.status_code == 200
    data = response.json()
    
    assert "has_sufficient_unit_data" in data
    assert "unique_trainees_count" in data
    assert "total_missions_evaluated" in data
    assert "unit_readiness_score" in data
    assert "unit_mean_detection_rate" in data
    assert "unit_mean_classification_accuracy" in data
    assert "unit_mean_latency_s" in data
    assert "individual_trainees" in data
    assert "notice" in data

    if data["has_sufficient_unit_data"]:
        assert data["unique_trainees_count"] >= 2
        assert len(data["individual_trainees"]) >= 2
    else:
        assert data["unit_readiness_score"] == "N/A"

def test_run_json_export():
    runs_res = client.get("/api/runs")
    assert runs_res.status_code == 200
    runs = runs_res.json()
    assert len(runs) > 0
    run_id = runs[0]["id"]

    export_res = client.get(f"/api/runs/{run_id}/export.json")
    assert export_res.status_code == 200
    assert "application/json" in export_res.headers.get("content-type", "")
    assert "attachment;" in export_res.headers.get("content-disposition", "")

    data = export_res.json()
    assert "export_metadata" in data
    assert "run_summary" in data
    assert "evidence_aware_scoring" in data
    assert "ground_truth_events" in data
    assert "sensor_observations" in data
    assert "trainee_decisions" in data
    assert data["run_summary"]["run_id"] == run_id

def test_run_csv_export():
    runs_res = client.get("/api/runs")
    assert runs_res.status_code == 200
    runs = runs_res.json()
    assert len(runs) > 0
    run_id = runs[0]["id"]

    export_res = client.get(f"/api/runs/{run_id}/export.csv")
    assert export_res.status_code == 200
    assert "text/csv" in export_res.headers.get("content-type", "")
    assert "attachment;" in export_res.headers.get("content-disposition", "")

    content = export_res.text
    assert "GARUDA Threat Simulation Trainer - Mission Evaluation Report" in content
    assert f"Run ID,{run_id}" in content
    assert "METRIC BREAKDOWN" in content
    assert "DECISION-BY-DECISION EVIDENCE AUDIT" in content

def test_launch_mission_endpoint_flow():
    # 1. Fetch available scenarios
    scenarios_res = client.get("/api/scenarios")
    assert scenarios_res.status_code == 200
    scenarios = scenarios_res.json()
    assert len(scenarios) > 0
    scenario_id = scenarios[0]["id"]

    # 2. Initialize run
    init_res = client.post("/api/runs", json={
        "scenario_id": scenario_id,
        "trainee_id": "Cadet-ReportsQA",
        "custom_seed": 77
    })
    assert init_res.status_code == 201
    run_data = init_res.json()
    new_run_id = run_data["id"]
    assert new_run_id is not None
    assert run_data["status"] == "INITIALIZED"

    # 3. Start run
    start_res = client.post(f"/api/runs/{new_run_id}/start")
    assert start_res.status_code == 200
    started_data = start_res.json()
    assert started_data["status"] == "RUNNING"
