# GARUDA — REST API Guide

All endpoints are prefixed with `/api` and return standardized JSON responses.

### 1. Scenarios
- `GET /api/scenarios`: List all active scenarios with optional `difficulty`, `environment`, and `search` query filters.
- `POST /api/scenarios`: Create a new scenario with physical degradation parameters.
- `GET /api/scenarios/{id}`: Fetch scenario details.
- `PATCH /api/scenarios/{id}`: Update scenario configuration.
- `POST /api/scenarios/{id}/duplicate`: Duplicate an existing scenario with a new seed.

### 2. Simulation Runs
- `POST /api/runs`: Initialize a simulation run with a scenario or custom configuration snapshot.
- `GET /api/runs`: List historical simulation runs with status and scores.
- `GET /api/runs/{id}`: Get run state.
- `POST /api/runs/{id}/start`: Start simulation clock.
- `POST /api/runs/{id}/pause`: Pause clock.
- `POST /api/runs/{id}/resume`: Resume clock.
- `POST /api/runs/{id}/step?step_seconds=5.0`: Advance clock by specified seconds.
- `POST /api/runs/{id}/reset`: Reset clock to 0 and clear trainee decisions.
- `GET /api/runs/{id}/workspace?evaluator_mode=false`: Fetch real-time workspace data. When `evaluator_mode=true`, reveals ground truth positions and un-delivered telemetry.

### 3. Decisions & Observations
- `POST /api/runs/{id}/decisions`: Commit a trainee decision (`CLASSIFY`, `MARK_UNCERTAIN`, `REQUEST_PING`, `FLAG_FALSE_ALARM`, `ENGAGE_COUNTERMEASURE`). Automatically computes evidence availability status at decision timestamp.
- `GET /api/runs/{id}/decisions`: List decisions for this run.
- `GET /api/runs/{id}/observations`: List observations with filters (`status`, `sensor_type`, `trainee_visible_only`).
- `GET /api/runs/{id}/timeline`: Unified chronological audit ledger connecting ground truth events, delayed/lost packets, and trainee decisions.

### 4. Evaluation & Review
- `POST /api/runs/{id}/evaluate`: Run evidence-aware scoring engine and trigger adaptive drill generator.
- `GET /api/runs/{id}/score`: Retrieve overall score and metric calculation breakdown.
- `GET /api/runs/{id}/review`: Retrieve comprehensive After-Action Review (AAR) report.

### 5. Adaptive Training
- `GET /api/training/recommendations`: List rule-based training drill recommendations.
- `POST /api/training/recommendations/{id}/launch`: 1-Click launch of recommended exercise.

### 6. Reports & Exports
- `GET /api/runs/{id}/export.json`: Download complete mission report in JSON format.
- `GET /api/runs/{id}/export.csv`: Download decision-by-decision evidence audit ledger in CSV format.
