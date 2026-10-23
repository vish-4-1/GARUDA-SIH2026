import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  FileText,
  Download,
  Award,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Radio,
  ChevronRight,
  Shield,
  ShieldAlert,
  Check,
  X,
  Target,
  Radar,
  ArrowRight,
  FileSpreadsheet,
  AlertCircle,
  Play
} from 'lucide-react';
import { api } from '../services/api';
import { AfterActionReview as AARType, SimulationRunState } from '../types';

export const AfterActionReview: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const runId = searchParams.get('run_id');

  const [runs, setRuns] = useState<SimulationRunState[]>([]);
  const [review, setReview] = useState<AARType | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<'json' | 'csv' | null>(null);
  const [exportNotice, setExportNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [decisionFilter, setDecisionFilter] = useState<'all' | 'correct' | 'inaccurate' | 'unassessable'>('all');

  useEffect(() => {
    loadRuns();
  }, []);

  useEffect(() => {
    if (runId) {
      loadReview(runId);
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

  const loadReview = async (id: string) => {
    try {
      setLoading(true);
      const data = await api.getReview(id);
      setReview(data);
    } catch (err) {
      console.error('Failed to load review', err);
      setReview(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRunChange = (newRunId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('run_id', newRunId);
    setSearchParams(nextParams);
  };

  const handleExportJson = async () => {
    if (!runId) return;
    try {
      setExporting('json');
      setExportNotice(null);
      const filename = await api.downloadExportJson(runId);
      setExportNotice({
        type: 'success',
        message: `Successfully exported forensic JSON report: ${filename}`
      });
      setTimeout(() => setExportNotice(null), 6000);
    } catch (err: any) {
      console.error('Export JSON failed', err);
      setExportNotice({
        type: 'error',
        message: `Export JSON failed: ${err.message || 'Unknown network error'}`
      });
    } finally {
      setExporting(null);
    }
  };

  const handleExportCsv = async () => {
    if (!runId) return;
    try {
      setExporting('csv');
      setExportNotice(null);
      const filename = await api.downloadExportCsv(runId);
      setExportNotice({
        type: 'success',
        message: `Successfully exported evidence audit CSV ledger: ${filename}`
      });
      setTimeout(() => setExportNotice(null), 6000);
    } catch (err: any) {
      console.error('Export CSV failed', err);
      setExportNotice({
        type: 'error',
        message: `Export CSV failed: ${err.message || 'Unknown network error'}`
      });
    } finally {
      setExporting(null);
    }
  };

  const activeRun = runs.find((r) => r.id === runId);

  // Compute decisions evaluations and filter
  const allDecisions = review?.score_breakdown?.decision_evaluations || [];
  const correctDecisionsCount = allDecisions.filter((d) => d.is_correct && d.evidence_status !== 'UNASSESSABLE').length;
  const inaccurateDecisionsCount = allDecisions.filter((d) => !d.is_correct && d.evidence_status !== 'UNASSESSABLE').length;
  const unassessableDecisionsCount = allDecisions.filter((d) => d.evidence_status === 'UNASSESSABLE').length;

  const filteredDecisions = allDecisions.filter((d) => {
    if (decisionFilter === 'correct') return d.is_correct && d.evidence_status !== 'UNASSESSABLE';
    if (decisionFilter === 'inaccurate') return !d.is_correct && d.evidence_status !== 'UNASSESSABLE';
    if (decisionFilter === 'unassessable') return d.evidence_status === 'UNASSESSABLE';
    return true;
  });

  const hasDecisions = (review?.timeline_summary?.trainee_decisions ?? 0) > 0;
  const isPendingDecisions = review?.evaluation_status === 'PENDING_DECISIONS' || !hasDecisions;

  // Format sim time MM:SS.S
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = (secs % 60).toFixed(1);
    return `${m.toString().padStart(2, '0')}:${parseFloat(s) < 10 ? '0' : ''}${s}s`;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#7047C8]/20 border border-white/[0.12] text-[#00CFE8]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#F4F5F7] tracking-tight">
                After-Action Review (AAR)
              </h1>
              <p className="text-[#858B99] text-xs mt-0.5">
                Comprehensive post-mission forensic debrief, evidence-aware audit ledger, and targeted adaptive training recommendations.
              </p>
            </div>
          </div>
        </div>

        {/* Run Selector & Export Actions */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-[#111318]/90 p-1.5 rounded-lg border border-white/[0.12] grow lg:grow-0">
            <span className="text-[11px] font-mono text-[#858B99] pl-1.5 hidden sm:inline font-medium">RUN:</span>
            <select
              value={runId || ''}
              onChange={(e) => handleRunChange(e.target.value)}
              className="bg-transparent text-xs font-mono text-[#00CFE8] px-2 py-0.5 outline-none cursor-pointer grow lg:grow-0"
              aria-label="Select simulation run"
            >
              {runs.map((r) => (
                <option key={r.id} value={r.id} className="bg-[#111318] text-[#F4F5F7]">
                  {r.id.slice(0, 8)}... — {r.scenario_name || 'Seeded'} ({r.status})
                </option>
              ))}
            </select>
            {activeRun && (
              <span
                className={`text-[9.5px] font-mono uppercase px-2 py-0.5 rounded font-bold border ${
                  activeRun.status === 'COMPLETED'
                    ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                    : activeRun.status === 'RUNNING'
                    ? 'bg-[#00CFE8]/10 text-[#00CFE8] border-[#00CFE8]/30'
                    : 'bg-zinc-800 text-zinc-400 border-zinc-700'
                }`}
              >
                {activeRun.status}
              </span>
            )}
          </div>

          {/* Export JSON Button */}
          <button
            onClick={handleExportJson}
            disabled={!runId || exporting !== null}
            className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 disabled:opacity-50"
            title="Download complete run report including ground truth, delivered observations, and decisions in JSON format"
          >
            <Download className={`w-3.5 h-3.5 text-[#00CFE8] ${exporting === 'json' ? 'animate-bounce' : ''}`} />
            <span>{exporting === 'json' ? 'Exporting...' : 'Export JSON'}</span>
          </button>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            disabled={!runId || exporting !== null}
            className="btn-secondary text-xs flex items-center gap-1.5 py-1.5 px-3 text-emerald-400 hover:text-emerald-300 disabled:opacity-50"
            title="Download decision-by-decision evidence audit ledger in CSV format"
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 text-emerald-400 ${exporting === 'csv' ? 'animate-bounce' : ''}`} />
            <span>{exporting === 'csv' ? 'Exporting...' : 'Export CSV'}</span>
          </button>
        </div>
      </div>

      {/* Export Notification Toast */}
      {exportNotice && (
        <div
          className={`p-3 rounded-lg border flex items-center justify-between gap-3 text-xs font-mono transition-all duration-200 ${
            exportNotice.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {exportNotice.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{exportNotice.message}</span>
          </div>
          <button
            onClick={() => setExportNotice(null)}
            className="text-white/60 hover:text-white p-1"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Navigation Sub-bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-2 text-[#858B99]">
          <span className="font-mono text-[#00CFE8]">Workflow:</span>
          <span>Post-Mission Debriefing & Evidence Forensic Review</span>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            to={`/scoring?run_id=${runId}`}
            className="text-[#858B99] hover:text-[#00CFE8] transition-colors flex items-center gap-1 font-mono text-[11px]"
          >
            <Award className="w-3.5 h-3.5" /> Decision Scoring Page
          </Link>
          <span className="text-white/20">•</span>
          <Link
            to={`/timeline?run_id=${runId}`}
            className="text-[#858B99] hover:text-[#00CFE8] transition-colors flex items-center gap-1 font-mono text-[11px]"
          >
            <Radio className="w-3.5 h-3.5" /> Evidence Timeline
          </Link>
          <span className="text-white/20">•</span>
          <Link
            to={`/simulation?run_id=${runId}`}
            className="text-[#858B99] hover:text-[#00CFE8] transition-colors flex items-center gap-1 font-mono text-[11px]"
          >
            <Radar className="w-3.5 h-3.5" /> 3D Workspace
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="p-16 text-center space-y-3 glass-card rounded-xl">
          <div className="w-8 h-8 border-2 border-[#00CFE8] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#858B99] font-mono text-xs animate-pulse">
            Compiling forensic mission records, verifying delivered evidence packets, and structuring After-Action Review...
          </p>
        </div>
      ) : !review ? (
        <div className="p-10 text-center space-y-3 glass-card rounded-xl">
          <AlertCircle className="w-10 h-10 text-[#E9A23B] mx-auto" />
          <h3 className="text-base font-bold text-[#F4F5F7]">No Review Records Found for Run</h3>
          <p className="text-xs text-[#858B99] max-w-md mx-auto">
            The selected simulation run could not be retrieved from the database. Select another run or launch a new scenario drill.
          </p>
          <div className="flex justify-center gap-2.5 pt-2">
            <Link to="/scenarios" className="btn-primary text-xs py-1.5 px-3">
              Go to Scenario Library
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Mission Executive Summary (Level 2 Translucent Work Surface) */}
          <div className="p-6 rounded-xl glass-card space-y-4 shadow-level2">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-5">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-[9.5px] font-mono text-[#00CFE8] bg-[#00CFE8]/10 px-2 py-0.5 rounded font-bold uppercase tracking-wider border border-[#00CFE8]/20">
                    MISSION EXECUTIVE DEBRIEF
                  </span>
                  <span className="text-xs font-mono text-[#858B99]">
                    RUN ID: <span className="text-[#F4F5F7] tabular-stat">{review.run_id.slice(0, 12)}</span>...
                  </span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-[#F4F5F7] tracking-tight">
                  {review.scenario_name}
                </h2>
                <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono text-[#858B99]">
                  <span>
                    Trainee: <strong className="text-[#F4F5F7]">{review.trainee_id}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Difficulty:{' '}
                    <strong className="text-[#00CFE8] uppercase">{review.difficulty}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Seed: <strong className="text-[#00CFE8] tabular-stat">{review.seed}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Environment: <strong className="text-[#F4F5F7] capitalize">{review.environment}</strong>
                  </span>
                  <span>•</span>
                  <span>
                    Duration:{' '}
                    <strong className="text-[#F4F5F7] tabular-stat">{review.duration_seconds}s</strong> (Sim Time: <span className="tabular-stat">{formatTime(review.current_sim_time)}</span>)
                  </span>
                </div>
              </div>

              {/* Overall Score Meter */}
              <div className="flex items-center gap-4 bg-[#111318]/90 p-3.5 rounded-xl border border-white/[0.08] shrink-0 w-full lg:w-auto justify-between lg:justify-start">
                <div className="text-left">
                  <span className="text-[9.5px] font-mono text-[#858B99] uppercase block tracking-wider font-semibold">
                    Overall Performance Score
                  </span>
                  {isPendingDecisions ? (
                    <div>
                      <span className="text-xl font-bold font-mono text-[#E9A23B]">
                        PENDING
                      </span>
                      <span className="text-[10px] font-mono text-[#858B99] block mt-0.5">
                        0 Evaluated Decisions
                      </span>
                    </div>
                  ) : (
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-3xl font-bold font-mono text-[#00CFE8] tabular-stat">
                          {review.overall_score}%
                        </span>
                        <span className="text-xs font-mono text-[#858B99]">/ 100</span>
                      </div>
                      <span
                        className={`text-[9.5px] font-mono uppercase block font-semibold mt-0.5 ${
                          review.overall_score >= 80
                            ? 'text-emerald-400'
                            : review.overall_score >= 60
                            ? 'text-[#00CFE8]'
                            : 'text-[#E9A23B]'
                        }`}
                      >
                        {review.overall_score >= 80
                          ? 'Optimal Performance'
                          : review.overall_score >= 60
                          ? 'Standard Operational'
                          : 'Remediation Required'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Score Gauge Ring */}
                <div className="relative w-14 h-14 shrink-0 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      className="text-[#191C23]"
                      strokeWidth="3.5"
                      stroke="currentColor"
                      fill="none"
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    />
                    {!isPendingDecisions && (
                      <path
                        className="text-[#00CFE8] transition-all duration-700 ease-out"
                        strokeDasharray={`${review.overall_score}, 100`}
                        strokeWidth="3.5"
                        strokeLinecap="round"
                        stroke="currentColor"
                        fill="none"
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      />
                    )}
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    {isPendingDecisions ? (
                      <Clock className="w-5 h-5 text-[#E9A23B]" />
                    ) : (
                      <Award className="w-5 h-5 text-[#00CFE8]" />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Incomplete / Zero decisions note */}
            {isPendingDecisions && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-start gap-2.5 text-xs text-amber-200">
                <AlertTriangle className="w-4 h-4 text-[#E9A23B] shrink-0 mt-0.5" />
                <div>
                  <strong className="font-semibold text-amber-300">Assessment Note — Insufficient Trainee Decisions:</strong>{' '}
                  This run contains zero recorded trainee decisions (engagements, classifications, or verification pings). Under the GARUDA Evidence-Aware Evaluation Protocol, component scores (Classification Accuracy, Timeliness, Evidence Discipline) are not fabricated or falsely credited as 100%. Resume or launch an active mission to establish measurable performance metrics.
                </div>
              </div>
            )}
          </div>

          {/* Mission Statistics Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
            {/* Ground Truth Events */}
            <div className="p-4 rounded-xl glass-card space-y-1.5 border-white/[0.10]">
              <div className="flex items-center justify-between text-xs text-[#858B99]">
                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10.5px]">
                  <Radar className="w-3.5 h-3.5 text-[#00CFE8]" /> Ground Truth
                </span>
                <span className="text-[10px] text-[#858B99]">Isolated</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[#F4F5F7] tabular-stat">
                  {review.timeline_summary.ground_truth_events}
                </span>
                <span className="text-[11px] text-[#858B99]">events</span>
              </div>
              <p className="text-[11px] text-[#858B99] font-sans leading-relaxed">
                Total synthetic physical trajectories in airspace. Evaluator-isolated ground truth.
              </p>
            </div>

            {/* Delivered Observations */}
            <div className="p-4 rounded-xl glass-card space-y-1.5 border-emerald-500/20">
              <div className="flex items-center justify-between text-xs text-emerald-400">
                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10.5px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> Delivered
                </span>
                <span className="text-[10px] text-emerald-500/80">Delivered</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-emerald-400 tabular-stat">
                  {review.timeline_summary.delivered_observations}
                </span>
                <span className="text-[11px] text-[#858B99]">packets</span>
              </div>
              <p className="text-[11px] text-[#858B99] font-sans leading-relaxed">
                Sensor packets delivered to trainee console after latency jitter and environmental noise.
              </p>
            </div>

            {/* Jammed / Lost Packets */}
            <div className="p-4 rounded-xl glass-card space-y-1.5 border-rose-500/20">
              <div className="flex items-center justify-between text-xs text-rose-400">
                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10.5px]">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Jammed / Lost
                </span>
                <span className="text-[10px] text-rose-500/80">Excluded</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-rose-400 tabular-stat">
                  {review.timeline_summary.lost_observations}
                </span>
                <span className="text-[11px] text-[#858B99]">dropped</span>
              </div>
              <p className="text-[11px] text-[#858B99] font-sans leading-relaxed">
                Packets lost to RF jamming or sensor failure. Excluded from miss penalties under evidence rules.
              </p>
            </div>

            {/* Trainee Decisions */}
            <div className="p-4 rounded-xl glass-card space-y-1.5 border-white/[0.10]">
              <div className="flex items-center justify-between text-xs text-[#00CFE8]">
                <span className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[10.5px]">
                  <Target className="w-3.5 h-3.5 text-[#00CFE8]" /> Decisions
                </span>
                <span className="text-[10px] text-[#00CFE8]/80">Evaluated</span>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-[#00CFE8] tabular-stat">
                  {review.timeline_summary.trainee_decisions}
                </span>
                <span className="text-[11px] text-[#858B99]">actions</span>
              </div>
              <p className="text-[11px] text-[#858B99] font-sans leading-relaxed">
                Tactical interventions enacted: classifications, engagements, and verification requests.
              </p>
            </div>
          </div>

          {/* Evaluator Diagnostic: Balanced Strengths & Improvement Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Performance Strengths */}
            <div className="p-5 rounded-xl glass-card border-emerald-500/30 space-y-3.5">
              <div className="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
                <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-xs">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>Performance Strengths</span>
                </div>
                <span className="text-[9.5px] font-mono text-emerald-400/80 uppercase px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                  Evidence-Supported
                </span>
              </div>

              <ul className="space-y-2.5">
                {review.strengths && review.strengths.length > 0 ? (
                  review.strengths.map((str, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 bg-white/[0.02] p-3 rounded-lg border border-emerald-500/15"
                    >
                      <div className="p-1 rounded-full bg-emerald-500/20 mt-0.5 shrink-0">
                        <Check className="w-3 h-3 text-emerald-400" />
                      </div>
                      <span className="text-xs text-[#F4F5F7] leading-relaxed">{str}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-[#858B99] font-mono p-4 text-center">
                    No positive performance benchmarks recorded.
                  </li>
                )}
              </ul>
            </div>

            {/* Target Areas for Improvement */}
            <div className="p-5 rounded-xl glass-card border-amber-500/30 space-y-3.5">
              <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
                <div className="flex items-center gap-2 text-[#E9A23B] font-mono font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Target Areas for Improvement</span>
                </div>
                <span className="text-[9.5px] font-mono text-[#E9A23B]/80 uppercase px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  Deficit Analysis
                </span>
              </div>

              <ul className="space-y-2.5">
                {review.areas_for_improvement && review.areas_for_improvement.length > 0 ? (
                  review.areas_for_improvement.map((area, idx) => (
                    <li
                      key={idx}
                      className="flex items-start gap-2.5 bg-white/[0.02] p-3 rounded-lg border border-amber-500/15"
                    >
                      <div className="p-1 rounded-full bg-amber-500/20 mt-0.5 shrink-0">
                        <AlertTriangle className="w-3 h-3 text-[#E9A23B]" />
                      </div>
                      <span className="text-xs text-[#F4F5F7] leading-relaxed">{area}</span>
                    </li>
                  ))
                ) : (
                  <li className="text-xs text-[#858B99] font-mono p-4 text-center">
                    No significant operational deficits detected.
                  </li>
                )}
              </ul>
            </div>
          </div>

          {/* Follow-up Adaptive Drill Recommendation Banner */}
          {review.recommendations && review.recommendations.length > 0 && (
            <div className="p-5 rounded-xl glass-card space-y-3.5 border-white/[0.12] shadow-level2">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b border-white/[0.08] pb-3.5">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-mono text-[#00CFE8] font-bold">
                    <Sparkles className="w-4 h-4 text-[#00CFE8]" />
                    <span>RECOMMENDED ADAPTIVE TRAINING EXERCISE</span>
                    <span
                      className={`text-[9.5px] px-2 py-0.5 rounded font-mono uppercase font-bold border ${
                        review.recommendations[0].priority === 'HIGH'
                          ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          : review.recommendations[0].priority === 'MEDIUM'
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {review.recommendations[0].priority} Priority
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-[#F4F5F7]">
                    {review.recommendations[0].target_skill}
                  </h3>
                </div>

                <Link
                  to={`/training?run_id=${runId}&rec_id=${review.recommendations[0].id}`}
                  className="btn-primary text-xs shrink-0 flex items-center gap-1.5 py-2 px-3.5"
                >
                  <span>Launch Adaptive Drill</span>
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 text-xs">
                <div className="space-y-1 bg-[#111318]/90 p-3 rounded-lg border border-white/[0.06]">
                  <span className="text-[10px] font-mono text-[#858B99] uppercase block font-medium">
                    Diagnostic Rationale
                  </span>
                  <p className="text-[#F4F5F7] leading-relaxed">
                    {review.recommendations[0].reason}
                  </p>
                </div>

                <div className="space-y-1 bg-[#111318]/90 p-3 rounded-lg border border-white/[0.06]">
                  <span className="text-[10px] font-mono text-[#858B99] uppercase block font-medium">
                    Target Learning Objective
                  </span>
                  <p className="text-[#00CFE8] leading-relaxed">
                    {review.recommendations[0].learning_objective}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Decision-by-Decision Forensic Evidence Audit Ledger (Level 1 Structural Surface) */}
          <div className="p-5 rounded-xl surface-structural space-y-4 shadow-level1">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/[0.08] pb-3.5">
              <div>
                <h3 className="text-base font-bold text-[#F4F5F7] flex items-center gap-2">
                  <Target className="w-4 h-4 text-[#00CFE8]" />
                  Decision-by-Decision Forensic Evidence Ledger
                </h3>
                <p className="text-xs text-[#858B99] mt-0.5">
                  Chronological audit of trainee interventions, pre-decision evidence corroboration, and evaluator scoring results.
                </p>
              </div>

              {/* Filter Tabs */}
              {allDecisions.length > 0 && (
                <div className="flex flex-wrap items-center gap-1 bg-[#08090B] p-1 rounded-lg border border-white/[0.12]">
                  <button
                    onClick={() => setDecisionFilter('all')}
                    className={`px-2 py-0.5 text-xs font-mono rounded transition-all ${
                      decisionFilter === 'all'
                        ? 'bg-[#7047C8] text-[#F4F5F7] font-bold'
                        : 'text-[#858B99] hover:text-[#F4F5F7]'
                    }`}
                  >
                    All ({allDecisions.length})
                  </button>
                  <button
                    onClick={() => setDecisionFilter('correct')}
                    className={`px-2 py-0.5 text-xs font-mono rounded transition-all ${
                      decisionFilter === 'correct'
                        ? 'bg-emerald-600/70 text-emerald-200 font-bold'
                        : 'text-[#858B99] hover:text-emerald-400'
                    }`}
                  >
                    Correct ({correctDecisionsCount})
                  </button>
                  <button
                    onClick={() => setDecisionFilter('inaccurate')}
                    className={`px-2 py-0.5 text-xs font-mono rounded transition-all ${
                      decisionFilter === 'inaccurate'
                        ? 'bg-rose-600/70 text-rose-200 font-bold'
                        : 'text-[#858B99] hover:text-rose-400'
                    }`}
                  >
                    Inaccurate ({inaccurateDecisionsCount})
                  </button>
                  <button
                    onClick={() => setDecisionFilter('unassessable')}
                    className={`px-2 py-0.5 text-xs font-mono rounded transition-all ${
                      decisionFilter === 'unassessable'
                        ? 'bg-amber-600/70 text-amber-200 font-bold'
                        : 'text-[#858B99] hover:text-[#E9A23B]'
                    }`}
                  >
                    Unassessable ({unassessableDecisionsCount})
                  </button>
                </div>
              )}
            </div>

            {/* Decision Table or Empty State */}
            {allDecisions.length === 0 ? (
              <div className="py-10 px-4 text-center space-y-3 bg-white/[0.01] rounded-xl border border-dashed border-white/[0.10]">
                <Clock className="w-8 h-8 text-amber-400/80 mx-auto" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-[#F4F5F7]">
                    No Decision Audit Records for this Run
                  </h4>
                  <p className="text-xs text-[#858B99] max-w-lg mx-auto">
                    The trainee did not record any tactical decisions during this simulation run. Launch an active simulation to record trainee decisions.
                  </p>
                </div>
                <div className="pt-1">
                  <Link
                    to={`/simulation?run_id=${runId}`}
                    className="btn-primary text-xs inline-flex items-center gap-1.5 py-1.5 px-3.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>Open 3D Simulation Workspace</span>
                  </Link>
                </div>
              </div>
            ) : filteredDecisions.length === 0 ? (
              <div className="py-6 text-center text-[#858B99] font-mono text-xs">
                No decisions match the selected filter criteria ({decisionFilter}).
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.08] text-[10px] font-mono text-[#858B99] uppercase">
                      <th className="py-2.5 px-3 font-medium">Sim Time</th>
                      <th className="py-2.5 px-3 font-medium">Target Entity</th>
                      <th className="py-2.5 px-3 font-medium">Trainee Action</th>
                      <th className="py-2.5 px-3 font-medium">Delivered Evidence</th>
                      <th className="py-2.5 px-3 font-medium">Evaluator Result</th>
                      <th className="py-2.5 px-3 font-medium">Scoring & Protocol Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredDecisions.map((dec) => {
                      const isUnassessable = dec.evidence_status === 'UNASSESSABLE';
                      const isLimited = dec.evidence_status === 'EVIDENCE_LIMITED';

                      return (
                        <tr
                          key={dec.decision_id}
                          className="hover:bg-white/[0.02] transition-colors"
                        >
                          {/* Sim Time */}
                          <td className="py-2.5 px-3 font-mono text-[#00CFE8] whitespace-nowrap tabular-stat">
                            {formatTime(dec.simulation_time)}
                          </td>

                          {/* Target Entity */}
                          <td className="py-2.5 px-3 font-mono whitespace-nowrap">
                            <span className="text-[#F4F5F7] font-bold">
                              {dec.target_entity_id || 'GENERAL_AIRSPACE'}
                            </span>
                            {dec.actual_ground_truth_category && (
                              <span className="block text-[10px] text-[#858B99]">
                                Truth: {dec.actual_ground_truth_category}
                              </span>
                            )}
                          </td>

                          {/* Trainee Action */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`text-[9.5px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${
                                dec.decision_type === 'ENGAGE_COUNTERMEASURE'
                                  ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                                  : dec.decision_type === 'CLASSIFY'
                                  ? 'bg-[#00CFE8]/10 text-[#00CFE8] border-[#00CFE8]/30'
                                  : dec.decision_type === 'FLAG_FALSE_ALARM'
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              {dec.decision_type}
                            </span>
                            {dec.selected_classification && (
                              <span className="block text-[11px] text-[#858B99] mt-0.5">
                                {dec.selected_classification}
                              </span>
                            )}
                          </td>

                          {/* Delivered Evidence */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span
                              className={`text-[9.5px] font-mono px-2 py-0.5 rounded font-bold uppercase border ${
                                isUnassessable
                                  ? 'bg-purple-500/10 text-purple-300 border-purple-500/30'
                                  : isLimited
                                  ? 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                                  : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                              }`}
                            >
                              {dec.evidence_status}
                            </span>
                            <span className="block text-[10px] font-mono text-[#858B99] mt-0.5 tabular-stat">
                              {dec.delivered_evidence_count_at_decision} packets
                            </span>
                          </td>

                          {/* Evaluator Result */}
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            {isUnassessable ? (
                              <span className="text-[11px] font-mono font-bold text-[#E9A23B] flex items-center gap-1">
                                <AlertTriangle className="w-3.5 h-3.5" /> UNASSESSABLE
                              </span>
                            ) : dec.is_correct ? (
                              <span className="text-[11px] font-mono font-bold text-emerald-400 flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" /> VERIFIED
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono font-bold text-rose-400 flex items-center gap-1">
                                <X className="w-3.5 h-3.5" /> INACCURATE
                              </span>
                            )}
                          </td>

                          {/* Scoring Notes */}
                          <td className="py-2.5 px-3 text-[#858B99] text-[11px] max-w-md leading-relaxed">
                            {dec.scoring_notes || 'Evaluated deterministically according to delivered observations at timestamp.'}
                          </td>
                        </tr>
                      );
                    })}
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
