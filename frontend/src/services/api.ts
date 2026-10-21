import {
  Scenario,
  ScenarioConfiguration,
  SimulationRunState,
  SimulationWorkspaceView,
  OverallScore,
  AfterActionReview,
  TrainingRecommendation,
  OverviewStats,
  TraineeDecision,
  TimelineNode,
  Observation
} from '../types';

const BASE_URL = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorDetail = 'API request failed';
    try {
      const errJson = await res.json();
      errorDetail = errJson.detail || JSON.stringify(errJson);
    } catch {
      errorDetail = `HTTP ${res.status}: ${res.statusText}`;
    }
    throw new Error(errorDetail);
  }
  return res.json();
}

export const api = {
  // Overview
  getOverviewStats: async (): Promise<OverviewStats> => {
    const res = await fetch(`${BASE_URL}/overview/stats`);
    return handleResponse<OverviewStats>(res);
  },

  // Scenarios
  getScenarios: async (params?: { difficulty?: string; environment?: string; search?: string }): Promise<Scenario[]> => {
    const searchParams = new URLSearchParams();
    if (params?.difficulty) searchParams.append('difficulty', params.difficulty);
    if (params?.environment) searchParams.append('environment', params.environment);
    if (params?.search) searchParams.append('search', params.search);
    const res = await fetch(`${BASE_URL}/scenarios?${searchParams.toString()}`);
    return handleResponse<Scenario[]>(res);
  },

  getScenario: async (id: string): Promise<Scenario> => {
    const res = await fetch(`${BASE_URL}/scenarios/${id}`);
    return handleResponse<Scenario>(res);
  },

  createScenario: async (data: {
    name: string;
    description?: string;
    environment: string;
    difficulty: string;
    duration_seconds: number;
    seed: number;
    configuration?: Partial<ScenarioConfiguration>;
  }): Promise<Scenario> => {
    const res = await fetch(`${BASE_URL}/scenarios`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<Scenario>(res);
  },

  duplicateScenario: async (id: string): Promise<Scenario> => {
    const res = await fetch(`${BASE_URL}/scenarios/${id}/duplicate`, {
      method: 'POST',
    });
    return handleResponse<Scenario>(res);
  },

  // Simulation Runs
  createRun: async (data: {
    scenario_id?: string;
    trainee_id?: string;
    custom_seed?: number;
    override_configuration?: Partial<ScenarioConfiguration>;
  }): Promise<SimulationRunState> => {
    const res = await fetch(`${BASE_URL}/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse<SimulationRunState>(res);
  },

  getRuns: async (params?: { status?: string; trainee_id?: string }): Promise<SimulationRunState[]> => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.trainee_id) searchParams.append('trainee_id', params.trainee_id);
    const res = await fetch(`${BASE_URL}/runs?${searchParams.toString()}`);
    return handleResponse<SimulationRunState[]>(res);
  },

  getRun: async (runId: string): Promise<SimulationRunState> => {
    const res = await fetch(`${BASE_URL}/runs/${runId}`);
    return handleResponse<SimulationRunState>(res);
  },

  startRun: async (runId: string): Promise<SimulationRunState> => {
    const res = await fetch(`${BASE_URL}/runs/${runId}/start`, { method: 'POST' });
    return handleResponse<SimulationRunState>(res);
  },

  pauseRun: async (runId: string): Promise<SimulationRunState> => {
    const res = await fetch(`${BASE_URL}/runs/${runId}/pause`, { method: 'POST' });
    return handleResponse<SimulationRunState>(res);
  },

  resumeRun: async (runId: string): Promise<SimulationRunState> => {
    const res = await fetch(`${BASE_URL}/runs/${runId}/resume`, { method: 'POST' });
    return handleResponse<SimulationRunState>(res);
  },

  stepRun: async (runId: string, stepSeconds: number = 5.0): Promise<SimulationRunState> => {
    const res = await fetch(`${BASE_URL}/runs/${runId}/step?step_seconds=${stepSeconds}`, { method: 'POST' });
    return handleResponse<SimulationRunState>(res);
  },

  seekRun: async (runId: string, targetTime: number): Promise<SimulationRunState> => {
    const res = await fetch(`${BASE_URL}/runs/${runId}/seek?target_time=${targetTime}`, { method: 'POST' });
    return handleResponse<SimulationRunState>(res);
  },

  resetRun: async (runId: string): Promise<SimulationRunState> => {
    const res = await fetch(`${BASE_URL}/runs/${runId}/reset`, { method: 'POST' });
    return handleResponse<SimulationRunState>(res);
  },

  getWorkspaceView: async (runId: string, evaluatorMode: boolean = false): Promise<SimulationWorkspaceView> => {
    const res = await fetch(`${BASE_URL}/runs/${runId}/workspace?evaluator_mode=${evaluatorMode}`);
    return handleResponse<SimulationWorkspaceView>(res);
  },

  // Decisions
  recordDecision: async (
    runId: string,
    decision: {
      target_entity_id?: string;
      simulation_time: number;
      decision_type: string;
      selected_classification?: string;
      threat_assessment?: string;
      confidence: number;
      rationale?: string;
    }
  ): Promise<TraineeDecision> => {
    const res = await fetch(`${BASE_URL}/runs/${runId}/decisions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(decision),
    });
    return handleResponse<TraineeDecision>(res);
  },

  getDecisions: async (runId: string): Promise<TraineeDecision[]> => {
    const res = await fetch(`${BASE_URL}/runs/${runId}/decisions`);
    return handleResponse<TraineeDecision[]>(res);
  },

  // Observations & Timeline
  getObservations: async (runId: string, traineeVisibleOnly: boolean = false): Promise<Observation[]> => {
    const res = await fetch(`${BASE_URL}/runs/${runId}/observations?trainee_visible_only=${traineeVisibleOnly}`);
    return handleResponse<Observation[]>(res);
  },

  getTimeline: async (runId: string, filterType?: string): Promise<{ run_id: string; current_sim_time: number; total_items: number; timeline: TimelineNode[] }> => {
    const filterParam = filterType && filterType !== 'all' ? `?filter_type=${filterType}` : '';
    const res = await fetch(`${BASE_URL}/runs/${runId}/timeline${filterParam}`);
    return handleResponse<{ run_id: string; current_sim_time: number; total_items: number; timeline: TimelineNode[] }>(res);
  },

  // Evaluation & Review
  evaluateRun: async (runId: string): Promise<OverallScore> => {
    const res = await fetch(`${BASE_URL}/runs/${runId}/evaluate`, { method: 'POST' });
    return handleResponse<OverallScore>(res);
  },

  getScore: async (runId: string): Promise<OverallScore> => {
    const res = await fetch(`${BASE_URL}/runs/${runId}/score`);
    return handleResponse<OverallScore>(res);
  },

  getReview: async (runId: string): Promise<AfterActionReview> => {
    const res = await fetch(`${BASE_URL}/runs/${runId}/review`);
    return handleResponse<AfterActionReview>(res);
  },

  // Adaptive Training
  getRecommendations: async (runId?: string): Promise<TrainingRecommendation[]> => {
    const url = runId ? `${BASE_URL}/training/recommendations?run_id=${runId}` : `${BASE_URL}/training/recommendations`;
    const res = await fetch(url);
    return handleResponse<TrainingRecommendation[]>(res);
  },

  launchTraining: async (recommendationId: string): Promise<SimulationRunState> => {
    const res = await fetch(`${BASE_URL}/training/recommendations/${recommendationId}/launch`, { method: 'POST' });
    return handleResponse<SimulationRunState>(res);
  },

  // Unit Assessment
  getUnitAssessment: async (): Promise<{
    has_sufficient_unit_data: boolean;
    unique_trainees_count: number;
    total_missions_evaluated: number;
    unit_readiness_score: string;
    unit_mean_detection_rate: string;
    unit_mean_classification_accuracy: string;
    unit_mean_latency_s: string;
    notice: string;
    individual_trainees: Array<{
      trainee_id: string;
      runs_count: number;
      mean_score: number;
      best_score: number;
      latest_run_id: string;
      status: string;
    }>;
  }> => {
    const res = await fetch(`${BASE_URL}/assessment/unit-summary`);
    return handleResponse(res);
  },

  // Export URLs
  getExportJsonUrl: (runId: string) => `${BASE_URL}/runs/${runId}/export.json`,
  getExportCsvUrl: (runId: string) => `${BASE_URL}/runs/${runId}/export.csv`,
};
