export interface ScenarioConfiguration {
  num_entities: number;
  threat_density: string;
  sensor_reliability: number;
  observation_delay_mean: number;
  observation_delay_jitter: number;
  observation_loss_rate: number;
  noise_level: number;
  weather: string;
  radar_coverage_percent: number;
  rf_scanner_enabled: number;
  acoustic_sensor_enabled: number;
  optical_eoir_enabled: number;
  extra_params?: Record<string, any>;
}

export interface Scenario {
  id: string;
  name: string;
  description: string;
  environment: string;
  difficulty: string;
  duration_seconds: number;
  seed: number;
  status: string;
  is_preset: number;
  created_at: string;
  updated_at: string;
  configuration?: ScenarioConfiguration;
}

export interface GroundTruthEvent {
  id: string;
  run_id: string;
  simulation_time: number;
  entity_id: string;
  event_type: string;
  is_hostile: boolean;
  threat_category: string;
  threat_level: string;
  pos_x: number;
  pos_y: number;
  altitude: number;
  speed: number;
  heading: number;
  event_payload: Record<string, any>;
}

export interface TraineePayload {
  entity_id: string;
  sensor_type: string;
  observed_pos_x: number;
  observed_pos_y: number;
  observed_altitude: number;
  observed_speed: number;
  estimated_bearing: number;
  signal_to_noise_ratio_db: number;
  confidence_estimate: number;
  sensor_cues: string[];
  source_sensor: string;
  ambient_weather_impact: string;
}

export interface Observation {
  id: string;
  run_id: string;
  source_event_id?: string;
  created_at_sim_time: number;
  delivered_at_sim_time: number;
  sensor_type: string;
  delay_applied: number;
  is_lost: boolean;
  delivery_status: 'DELIVERED' | 'DELAYED' | 'LOST';
  quality_score: number;
  trainee_payload: TraineePayload;
}

export interface TraineeDecision {
  id: string;
  run_id: string;
  target_entity_id?: string;
  simulation_time: number;
  decision_type: string;
  selected_classification?: string;
  threat_assessment?: string;
  confidence: number;
  rationale?: string;
  referenced_observation_ids: string[];
  available_observation_count: number;
  evidence_status: string;
  created_at: string;
}

export interface SimulationRunState {
  id: string;
  scenario_id?: string;
  scenario_name?: string;
  trainee_id: string;
  status: 'INITIALIZED' | 'RUNNING' | 'PAUSED' | 'COMPLETED' | 'RESET';
  current_sim_time: number;
  duration_seconds: number;
  seed: number;
  active_threat_count: number;
  delivered_observations_count: number;
  pending_delayed_count: number;
  lost_observations_count: number;
  trainee_decisions_count: number;
  environment?: string;
  weather?: string;
  configuration_snapshot?: Record<string, any>;
  overall_score?: number;
  created_at: string;
  started_at?: string;
  completed_at?: string;
}

export interface SimulationWorkspaceView {
  run_state: SimulationRunState;
  visible_observations: Observation[];
  trainee_decisions: TraineeDecision[];
  evaluator_ground_truth?: GroundTruthEvent[] | null;
}

export interface ScoringRecord {
  id: string;
  run_id: string;
  metric_category: string;
  metric_name: string;
  score_value: number;
  weight: number;
  numerator: number;
  denominator: number;
  formula_description: string;
  evidence_limited_count: number;
  unassessable_count: number;
  calculation_details: Record<string, any>;
}

export interface DecisionEvaluationItem {
  decision_id: string;
  target_entity_id?: string;
  simulation_time: number;
  decision_type: string;
  selected_classification?: string;
  actual_ground_truth_category?: string;
  actual_is_hostile?: boolean;
  confidence: number;
  is_correct: boolean;
  evidence_status: string;
  delivered_evidence_count_at_decision: number;
  scoring_notes: string;
}

export interface OverallScore {
  run_id: string;
  trainee_id: string;
  overall_score: number;
  detection_score: number;
  classification_score: number;
  timeliness_score: number;
  evidence_awareness_score: number;
  summary_metrics?: Record<string, any>;
  engine_metadata?: {
    engine_name: string;
    engine_version: string;
    engine_type: string;
    runtime_framework: string;
    inference_location: string;
    runtime_status: string;
    artifact_id: string;
    ai_ml_model_present: boolean;
    ai_ml_inference_used: boolean;
    input_schema: string;
    output_schema: string;
    limitations_and_fallbacks: string;
    evaluation_timestamp: string;
  };
  evaluation_status?: string;
  metrics: ScoringRecord[];
  decision_evaluations: DecisionEvaluationItem[];
  evidence_aware_disclaimer: string;
}

export interface TrainingRecommendation {
  id: string;
  run_id: string;
  target_skill: string;
  gap_type: string;
  priority: string;
  reason: string;
  recommended_difficulty: string;
  learning_objective: string;
  suggested_scenario_config: Record<string, any>;
  is_launched: boolean;
  launched_run_id?: string;
  launched_run_score?: number;
  launched_run_status?: string;
  occurrence_count?: number;
  source_runs?: string[];
  created_at?: string;
}

export interface AfterActionReview {
  run_id: string;
  scenario_id?: string;
  scenario_name: string;
  difficulty: string;
  environment: string;
  seed: number;
  trainee_id: string;
  status: string;
  duration_seconds: number;
  current_sim_time: number;
  overall_score: number;
  evaluation_status?: string;
  score_breakdown: OverallScore;
  recommendations: TrainingRecommendation[];
  timeline_summary: {
    ground_truth_events: number;
    delivered_observations: number;
    lost_observations: number;
    trainee_decisions: number;
  };
  strengths: string[];
  areas_for_improvement: string[];
  configuration_snapshot: Record<string, any>;
}

export interface OverviewStats {
  total_scenarios: number;
  total_simulation_runs: number;
  completed_runs: number;
  average_score: number;
  difficulty_distribution: Record<string, number>;
  environment_distribution: Record<string, number>;
  recent_runs: SimulationRunState[];
  system_status: string;
  evidence_engine_status: string;
}

export interface TimelineNode {
  timeline_id: string;
  item_type: string;
  timestamp: number;
  created_at_sim_time?: number;
  delay_applied?: number;
  entity_id?: string;
  title: string;
  description: string;
  is_evaluator_only: boolean;
  is_trainee_visible?: boolean;
  metadata: Record<string, any>;
}
