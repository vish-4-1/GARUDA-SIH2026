import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Award,
  FileText,
  Sparkles,
  ArrowRight,
  Shield,
  Cpu,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Target
} from 'lucide-react';
import { api } from '../services/api';
import { OverallScore, SimulationRunState, DecisionEvaluationItem } from '../types';

export const DecisionScoring: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const runId = searchParams.get('run_id');

  const [runs, setRuns] = useState<SimulationRunState[]>([]);
  const [scoreData, setScoreData] = useState<OverallScore | null>(null);
  const [loading, setLoading] = useState(true);
  const [evaluating, setEvaluating] = useState(false);
  const [showModelDetails, setShowModelDetails] = useState(false);
  const [decisionFilter, setDecisionFilter] = useState<string>('all');
  const [resultFilter, setResultFilter] = useState<string>('all');
  const [selectedDecision, setSelectedDecision] = useState<DecisionEvaluationItem | null>(null);

  useEffect(() => {
    loadRuns();
  }, []);

  useEffect(() => {
    if (runId) {
      loadScore(runId);
    }
  }, [runId]);

  const loadRuns = async () => {
    try {
      const data = await api.getRuns();
      setRuns(data);
      if (!runId && data.length > 0) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('run_id', data[0].id);
        setSearchParams(nextParams);
      }
    } catch (err) {
      console.error('Failed to load runs', err);
    }
  };

  const loadScore = async (id: string) => {
    try {
      setLoading(true);
      const data = await api.getScore(id);
      setScoreData(data);
      if (data.decision_evaluations && data.decision_evaluations.length > 0) {
        setSelectedDecision(data.decision_evaluations[0]);
      } else {
        setSelectedDecision(null);
      }
    } catch (err) {
      console.error('Failed to load score data', err);
      setScoreData(null);
      setSelectedDecision(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRunChange = (newRunId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('run_id', newRunId);
    setSearchParams(nextParams);
  };

  const handleReevaluate = async () => {
    if (!runId) return;
    try {
      setEvaluating(true);
      const updated = await api.evaluateRun(runId);
      setScoreData(updated);
      if (updated.decision_evaluations && updated.decision_evaluations.length > 0) {
        setSelectedDecision(updated.decision_evaluations[0]);
      }
    } catch (err) {
      console.error('Failed to re-evaluate run', err);
    } finally {
      setEvaluating(false);
    }
  };

  const activeRun = runs.find((r) => r.id === runId);

  // Filter decision audit evaluations
  const filteredDecisions = (scoreData?.decision_evaluations || []).filter((item) => {
    // Action type filter
    if (decisionFilter !== 'all') {
      if (decisionFilter === 'CLASSIFY' && item.decision_type !== 'CLASSIFY') return false;
      if (decisionFilter === 'ENGAGE' && item.decision_type !== 'ENGAGE_COUNTERMEASURE') return false;
      if (decisionFilter === 'VERIFY' && !['MARK_UNCERTAIN', 'REQUEST_PING'].includes(item.decision_type)) return false;
      if (decisionFilter === 'FALSE_ALARM' && item.decision_type !== 'FLAG_FALSE_ALARM') return false;
    }
    // Result filter
    if (resultFilter === 'correct' && !item.is_correct) return false;
    if (resultFilter === 'incorrect' && item.is_correct) return false;
    return true;
  });

  const totalDecisionsCount = scoreData?.decision_evaluations?.length || 0;
  const hasDecisions = totalDecisionsCount > 0;

  // Determine score color and status label
  const getScoreBadge = (score: number, hasData: boolean) => {
    if (!hasData) {
      return { label: 'PENDING DECISIONS', color: 'text-[#E9A23B]', border: 'border-[#E9A23B]/50', ring: 'stroke-[#E9A23B]' };
    }
    if (score >= 85) {
      return { label: 'EXCELLENT', color: 'text-emerald-400', border: 'border-emerald-500/50', ring: 'stroke-emerald-400' };
    }
    if (score >= 70) {
      return { label: 'PROFICIENT', color: 'text-[#00CFE8]', border: 'border-[#00CFE8]/50', ring: 'stroke-[#00CFE8]' };
    }
    return { label: 'NEEDS IMPROVEMENT', color: 'text-rose-400', border: 'border-rose-500/50', ring: 'stroke-rose-400' };
  };

  const scoreBadge = getScoreBadge(scoreData?.overall_score ?? 0, hasDecisions);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header & Run Switcher */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#7047C8]/20 border border-white/[0.12] text-[#00CFE8]">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#F4F5F7] tracking-tight">
                Evidence-Aware Decision Scoring
              </h1>
              <p className="text-xs text-[#858B99] mt-0.5">
                Evaluator audit engine, performance breakdown, and decision-level evidence ledger.
              </p>
            </div>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 flex-wrap w-full sm:w-auto">
          <select
            value={runId || ''}
            onChange={(e) => handleRunChange(e.target.value)}
            className="glass-input text-xs font-mono text-[#00CFE8] cursor-pointer min-w-[220px] py-1.5 px-2.5 bg-[#111318]"
            aria-label="Select Simulation Run"
          >
            {runs.length === 0 ? (
              <option value="">No simulation runs available</option>
            ) : (
              runs.map((r) => (
                <option key={r.id} value={r.id} className="bg-[#111318] text-[#F4F5F7]">
                  {r.id.slice(0, 8)}... — {r.scenario_name || 'Seeded'} ({r.status})
                </option>
              ))
            )}
          </select>

          <button
            onClick={handleReevaluate}
            disabled={evaluating || !runId}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-secondary text-xs font-mono font-medium disabled:opacity-50"
            title="Recalculate evidence-aware scoring audit"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00CFE8] ${evaluating ? 'animate-spin' : ''}`} />
            {evaluating ? 'Auditing...' : 'Re-Evaluate'}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-[#858B99] font-mono text-xs space-y-2 glass-card rounded-xl">
          <div className="w-6 h-6 rounded-full border-2 border-[#00CFE8] border-t-transparent animate-spin mx-auto" />
          <p>Auditing trainee decisions against delivered evidence records...</p>
        </div>
      ) : !scoreData ? (
        <div className="p-10 text-center text-[#858B99] font-mono text-xs glass-card rounded-xl">
          No evaluation score found for this simulation run. Launch the simulation and record decisions.
        </div>
      ) : (
        <div className="space-y-5">
          {/* Section 1: Top Status & Overall Score Panel (Level 2 Translucent Work Surface) */}
          <div className="p-6 rounded-xl glass-card flex flex-col md:flex-row items-center justify-between gap-6 shadow-level2">
            <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
              {/* Circular Gauge */}
              <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    className="stroke-[#191C23]"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="50"
                    cy="50"
                    r="46"
                    className={`${scoreBadge.ring} transition-all duration-700 ease-out`}
                    strokeWidth="8"
                    strokeDasharray={289}
                    strokeDashoffset={hasDecisions ? 289 - (289 * scoreData.overall_score) / 100 : 289}
                    strokeLinecap="round"
                    fill="transparent"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold font-mono text-[#F4F5F7] tabular-stat">
                    {hasDecisions ? scoreData.overall_score : '—'}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#858B99] uppercase">
                    / 100
                  </span>
                </div>
              </div>

              {/* Score Meta Details */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase tracking-wider bg-white/[0.04] border ${scoreBadge.border} ${scoreBadge.color}`}>
                    {scoreBadge.label}
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#7047C8]/20 text-[#00CFE8] border border-white/[0.12]">
                    CORE EVALUATION PROTOCOL
                  </span>
                  {activeRun && (
                    <span className="text-[10px] font-mono text-[#858B99] bg-white/[0.04] px-2 py-0.5 rounded border border-white/[0.08]">
                      Run: <span className="tabular-stat">{activeRun.id.slice(0, 8)}</span> ({activeRun.status})
                    </span>
                  )}
                </div>

                <h2 className="text-lg sm:text-xl font-bold text-[#F4F5F7]">
                  Trainee Performance Assessment
                </h2>

                <p className="text-xs text-[#B3B7C2] max-w-xl font-sans leading-relaxed">
                  {hasDecisions
                    ? scoreData.evidence_aware_disclaimer
                    : 'No operational decisions have been logged yet for this simulation run. Score will calculate as trainee submits threat classifications and countermeasure commands.'}
                </p>
              </div>
            </div>

            {/* Direct Workflow Navigation */}
            <div className="flex flex-wrap sm:flex-nowrap gap-2 w-full md:w-auto shrink-0">
              <Link
                to={`/review?run_id=${runId}`}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg btn-secondary text-xs font-mono font-bold text-[#00CFE8] flex-1 sm:flex-none"
              >
                <FileText className="w-3.5 h-3.5" />
                AAR Debrief
              </Link>
              <Link
                to={`/training?run_id=${runId}`}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg btn-primary text-xs font-mono font-bold flex-1 sm:flex-none"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Adaptive Drills
              </Link>
            </div>
          </div>

          {/* Section 2: Model & Evaluation Engine Transparency Panel */}
          <div className="p-4 rounded-xl glass-card space-y-3.5 border border-white/[0.12] shadow-level1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/[0.08] pb-2.5">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-[#7047C8]/20 border border-white/[0.12] flex items-center justify-center">
                  <Cpu className="w-4 h-4 text-[#00CFE8]" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-[#F4F5F7] font-mono flex items-center gap-2">
                    Model & Evaluation Engine Transparency
                    <span className="px-2 py-0.2 rounded text-[9.5px] font-mono bg-emerald-950/70 text-emerald-400 border border-emerald-800/40 font-normal">
                      Deterministic Ruleset (Zero-Weight AI)
                    </span>
                  </h3>
                  <p className="text-[10.5px] text-[#858B99]">
                    Architectural disclosure of decision scoring mechanics and runtime components.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowModelDetails(!showModelDetails)}
                className="flex items-center gap-1 text-xs font-mono text-[#00CFE8] hover:underline shrink-0"
              >
                {showModelDetails ? (
                  <>Hide Engine Diagnostics <ChevronUp className="w-3.5 h-3.5" /></>
                ) : (
                  <>View Engine Diagnostics <ChevronDown className="w-3.5 h-3.5" /></>
                )}
              </button>
            </div>

            {/* Summary Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs font-mono">
              <div className="p-2.5 rounded-lg bg-[#111318]/90 border border-white/[0.06]">
                <span className="text-[#858B99] block text-[9.5px]">Engine Name</span>
                <span className="text-[#F4F5F7] font-bold text-xs truncate block">
                  {scoreData.engine_metadata?.engine_name || 'GARUDA Evaluator'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#111318]/90 border border-white/[0.06]">
                <span className="text-[#858B99] block text-[9.5px]">Model Type</span>
                <span className="text-[#00CFE8] font-bold text-xs truncate block">
                  {scoreData.engine_metadata?.engine_type || 'Deterministic Rule Engine'}
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#111318]/90 border border-white/[0.06]">
                <span className="text-[#858B99] block text-[9.5px]">Framework</span>
                <span className="text-[#F4F5F7] font-bold text-xs truncate block">
                  FastAPI / Pydantic V2
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#111318]/90 border border-white/[0.06]">
                <span className="text-[#858B99] block text-[9.5px]">Inference Execution</span>
                <span className="text-slate-200 font-bold text-xs truncate block">
                  Local Backend Worker
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#111318]/90 border border-white/[0.06]">
                <span className="text-[#858B99] block text-[9.5px]">Runtime Status</span>
                <span className="text-emerald-400 font-bold text-xs flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  OPERATIONAL
                </span>
              </div>
              <div className="p-2.5 rounded-lg bg-[#111318]/90 border border-white/[0.06]">
                <span className="text-[#858B99] block text-[9.5px]">Trained ML Model</span>
                <span className="text-[#E9A23B] font-bold text-xs truncate block">
                  Not Implemented (Rule-Based)
                </span>
              </div>
            </div>

            {/* Expandable Technical Diagnostics View */}
            {showModelDetails && (
              <div className="p-3.5 rounded-lg bg-[#08090B] border border-white/[0.08] space-y-2 text-xs font-mono">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                  <div className="space-y-1">
                    <span className="text-[#00CFE8] font-bold block text-[10.5px]">
                      Input / Output Contract:
                    </span>
                    <p className="text-[#B3B7C2] text-[11px] font-sans">
                      <strong>Inputs:</strong> Raw ground-truth state, delivered observations filtered strictly by delivery timestamp, and trainee decision ledger.
                    </p>
                    <p className="text-[#B3B7C2] text-[11px] font-sans">
                      <strong>Outputs:</strong> Detection Rate, Classification Accuracy, Response Latency, Evidence Awareness Discipline, and Overall Weighted Score.
                    </p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[#00CFE8] font-bold block text-[10.5px]">
                      Model vs Rule Engine Architecture:
                    </span>
                    <p className="text-[#B3B7C2] text-[11px] font-sans">
                      <strong>Why Deterministic?</strong> Objective evaluation requires 100% reproducible, explainable, and legally defensible audit ledgers without hallucination or non-deterministic inference variance.
                    </p>
                    <p className="text-[#B3B7C2] text-[11px] font-sans">
                      <strong>Trained AI Model Status:</strong> Deep neural network inference is not currently part of the evaluation scoring path.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Section 3: Evidence-Aware Protocol Panel */}
          <div className="p-4 rounded-xl bg-[#7047C8]/15 border border-white/[0.12] flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-level1">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#00CFE8]">
                <Shield className="w-4 h-4 text-[#00CFE8]" />
                EVIDENCE-AWARE EVALUATION PROTOCOL
              </div>
              <p className="text-xs text-[#B3B7C2] max-w-2xl font-sans leading-relaxed">
                Trainees are evaluated <em>strictly against evidence delivered to their console prior to each action</em>. Any threat that was 100% unobservable due to RF jamming packet loss or sensor blackout is isolated into the unassessable ledger and <strong>strictly excluded from missed-detection penalties</strong>.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 text-xs font-mono">
              <div className="px-2.5 py-1 rounded-md bg-[#08090B] border border-emerald-500/30 text-emerald-400 font-bold text-[11px]">
                ✓ Protected Denominator
              </div>
              <div className="px-2.5 py-1 rounded-md bg-[#08090B] border border-white/[0.12] text-[#00CFE8] font-bold text-[11px]">
                ✓ 3 Independent Ledgers
              </div>
            </div>
          </div>

          {/* Section 4: Four Core Scorecards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {scoreData.metrics.map((rec) => (
              <div
                key={rec.id}
                className="p-4 rounded-xl glass-card glass-card-interactive space-y-2.5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start text-xs font-mono text-[#858B99] mb-1">
                    <span className="font-semibold text-[11px]">{rec.metric_category.replace('_', ' ')}</span>
                    <span className="text-[10px] text-[#00CFE8] font-bold tabular-stat">Weight: {Math.round(rec.weight * 100)}%</span>
                  </div>

                  <h3 className="text-xs sm:text-sm font-bold text-[#F4F5F7] mb-1.5">{rec.metric_name}</h3>

                  <div className="flex items-baseline gap-2 mb-2">
                    <span className="text-2xl font-bold font-mono text-[#00CFE8] tabular-stat">
                      {hasDecisions ? `${rec.score_value}%` : '—'}
                    </span>
                    {!hasDecisions && (
                      <span className="text-[10px] font-mono text-[#E9A23B]">
                        Insufficient Data
                      </span>
                    )}
                  </div>

                  {/* Numerator / Denominator Box */}
                  <div className="p-2 rounded-lg bg-[#111318]/90 border border-white/[0.08] text-[10px] font-mono text-[#858B99] space-y-1">
                    <div className="flex justify-between">
                      <span>Numerator:</span>
                      <span className="text-[#F4F5F7] font-bold tabular-stat">
                        {hasDecisions ? rec.numerator : '0'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Denominator:</span>
                      <span className="text-[#F4F5F7] font-bold tabular-stat">
                        {hasDecisions ? rec.denominator : '0'}
                      </span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-[#858B99] font-sans leading-relaxed border-t border-white/[0.08] pt-2">
                  {rec.formula_description}
                </p>
              </div>
            ))}
          </div>

          {/* Section 5: Decision-by-Decision Evidence Audit Ledger (Level 1 Structural Surface) */}
          <div className="p-5 rounded-xl surface-structural space-y-3.5 shadow-level1">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-[#F4F5F7] font-mono flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#00CFE8]" />
                  Decision-by-Decision Evidence Audit Ledger
                </h3>
                <p className="text-xs text-[#858B99]">
                  Every trainee decision reconciled with evidence received prior to action timestamp.
                </p>
              </div>

              {/* Filters */}
              {hasDecisions && (
                <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
                  {/* Action Filter */}
                  <select
                    value={decisionFilter}
                    onChange={(e) => setDecisionFilter(e.target.value)}
                    className="glass-input py-1 px-2.5 text-xs text-[#F4F5F7] cursor-pointer bg-[#111318]"
                  >
                    <option value="all">All Action Types</option>
                    <option value="CLASSIFY">Classification</option>
                    <option value="ENGAGE">Countermeasure</option>
                    <option value="VERIFY">Verification Requests</option>
                    <option value="FALSE_ALARM">False Alarm Flags</option>
                  </select>

                  {/* Result Filter */}
                  <select
                    value={resultFilter}
                    onChange={(e) => setResultFilter(e.target.value)}
                    className="glass-input py-1 px-2.5 text-xs text-[#00CFE8] cursor-pointer bg-[#111318]"
                  >
                    <option value="all">All Results</option>
                    <option value="correct">Correct Only</option>
                    <option value="incorrect">Incorrect Only</option>
                  </select>
                </div>
              )}
            </div>

            {!hasDecisions ? (
              <div className="p-8 text-center text-[#858B99] font-mono text-xs space-y-2.5 glass-card rounded-xl">
                <Target className="w-6 h-6 text-white/20 mx-auto" />
                <h4 className="text-xs font-bold text-[#F4F5F7]">No Trainee Decisions Logged</h4>
                <p className="max-w-md mx-auto">
                  Launch the 3D tactical simulation to detect, classify, and deploy electronic/kinetic countermeasures.
                </p>
                <Link
                  to={`/simulation?run_id=${runId}`}
                  className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg btn-primary text-xs"
                >
                  Go to 3D Simulation
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            ) : filteredDecisions.length === 0 ? (
              <div className="p-6 text-center text-[#858B99] font-mono text-xs">
                No decisions match current action/result filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="text-[#858B99] border-b border-white/[0.08] pb-2">
                    <tr>
                      <th className="py-2.5 pl-2 font-medium">Sim Time</th>
                      <th className="font-medium">Target ID</th>
                      <th className="font-medium">Action</th>
                      <th className="font-medium">Selected Category</th>
                      <th className="font-medium">Actual Ground Truth</th>
                      <th className="font-medium">Evidence Status</th>
                      <th className="font-medium">Packets</th>
                      <th className="font-medium">Result</th>
                      <th className="pr-2 font-medium">Audit Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {filteredDecisions.map((item) => (
                      <tr
                        key={item.decision_id}
                        onClick={() => setSelectedDecision(item)}
                        className={`hover:bg-white/[0.04] transition-colors cursor-pointer ${
                          selectedDecision?.decision_id === item.decision_id
                            ? 'bg-white/[0.06] border-l-2 border-[#00CFE8]'
                            : ''
                        }`}
                      >
                        <td className="py-2.5 pl-2 text-[#00CFE8] font-bold tabular-stat">
                          T + {item.simulation_time.toFixed(1)}s
                        </td>
                        <td className="font-bold text-[#F4F5F7]">{item.target_entity_id}</td>
                        <td className="text-[#858B99]">{item.decision_type}</td>
                        <td className="text-[#858B99]">{item.selected_classification || 'N/A'}</td>
                        <td className="text-[#858B99]">
                          {item.actual_ground_truth_category} ({item.actual_is_hostile ? 'Hostile' : 'Benign'})
                        </td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                            item.evidence_status === 'ADEQUATE' ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800/40' :
                            item.evidence_status === 'EVIDENCE_LIMITED' ? 'bg-amber-950/70 text-amber-400 border border-amber-800/40' :
                            'bg-rose-950/70 text-rose-400 border border-rose-800/40'
                          }`}>
                            {item.evidence_status}
                          </span>
                        </td>
                        <td className="text-[#F4F5F7] font-bold tabular-stat">{item.delivered_evidence_count_at_decision}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                            item.is_correct ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/40' :
                            'bg-rose-950/70 text-rose-300 border border-rose-800/40'
                          }`}>
                            {item.is_correct ? 'CORRECT' : 'INCORRECT'}
                          </span>
                        </td>
                        <td className="text-[#858B99] max-w-xs truncate pr-2" title={item.scoring_notes}>
                          {item.scoring_notes}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DecisionScoring;
