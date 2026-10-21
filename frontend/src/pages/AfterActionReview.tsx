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
  Layers,
  Radio,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import { api } from '../services/api';
import { AfterActionReview as AARType, SimulationRunState } from '../types';

export const AfterActionReview: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const runId = searchParams.get('run_id');

  const [runs, setRuns] = useState<SimulationRunState[]>([]);
  const [review, setReview] = useState<AARType | null>(null);
  const [loading, setLoading] = useState(true);

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
        setSearchParams({ run_id: data[0].id });
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
    } finally {
      setLoading(false);
    }
  };

  const handleExportJson = () => {
    if (runId) {
      window.open(api.getExportJsonUrl(runId), '_blank');
    }
  };

  const handleExportCsv = () => {
    if (runId) {
      window.open(api.getExportCsvUrl(runId), '_blank');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#F7F5FA] flex items-center gap-3">
            <FileText className="w-7 h-7 text-[#00E5FF]" />
            After-Action Review (AAR)
          </h1>
          <p className="text-[#AAA3B5] text-xs mt-1">
            Comprehensive post-mission audit, forensic telemetry timeline, and trainee debriefing report.
          </p>
        </div>

        {/* Run Selector & Exports */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={runId || ''}
            onChange={(e) => setSearchParams({ run_id: e.target.value })}
            className="px-3.5 py-2 bg-[#050505] border border-white/10 rounded-xl text-xs font-mono text-[#00E5FF] focus:outline-none focus:border-[#00E5FF] transition-all"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id} className="bg-[#050505] text-[#F7F5FA]">
                {r.id.slice(0, 8)}... - {r.scenario_name || 'Seeded'}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportJson}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#15121C] hover:bg-[#3B0A6B]/30 text-[#00E5FF] border border-white/10 hover:border-[#00E5FF]/40 text-xs font-mono font-semibold transition-all shadow-[0_0_12px_rgba(0,229,255,0.12)]"
          >
            <Download className="w-4 h-4 text-[#00E5FF]" /> Export JSON
          </button>

          <button
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#15121C] hover:bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-semibold transition-all shadow-[0_0_12px_rgba(16,185,129,0.12)]"
          >
            <Download className="w-4 h-4 text-emerald-400" /> Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-[#AAA3B5] font-mono text-xs animate-pulse">
          Compiling mission debrief and forensic After-Action Review...
        </div>
      ) : !review ? (
        <div className="p-8 text-center bg-[#0D0B12]/80 backdrop-blur-md rounded-2xl border border-white/10 text-[#AAA3B5] font-mono text-xs">
          No review data found for this run.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Mission Executive Summary */}
          <div className="p-6 rounded-2xl bg-[#0D0B12]/85 backdrop-blur-xl border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
              <div>
                <span className="text-xs font-mono text-[#00E5FF] font-bold uppercase tracking-wider">
                  MISSION EXECUTIVE DEBRIEF
                </span>
                <h2 className="text-2xl font-bold text-[#F7F5FA] mt-0.5">{review.scenario_name}</h2>
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-[#AAA3B5] mt-1">
                  <span>Trainee: <strong className="text-[#F7F5FA]">{review.trainee_id}</strong></span>
                  <span>•</span>
                  <span>Difficulty: <strong className="text-[#00E5FF] uppercase">{review.difficulty}</strong></span>
                  <span>•</span>
                  <span>Seed: <strong className="text-[#00E5FF]">{review.seed}</strong></span>
                  <span>•</span>
                  <span>Environment: <strong className="text-[#F7F5FA] capitalize">{review.environment}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-4 bg-[#15121C] p-4 rounded-xl border border-white/10 shadow-[0_0_20px_rgba(0,229,255,0.1)]">
                <div className="text-right">
                  <span className="text-[10px] font-mono text-[#AAA3B5] uppercase block">Overall Score</span>
                  <span className="text-3xl font-extrabold font-mono text-[#00E5FF]">
                    {review.overall_score}%
                  </span>
                </div>
                <Award className="w-10 h-10 text-[#00E5FF]" />
              </div>
            </div>

            {/* Timeline Breakdown Counts */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-2">
              <div className="p-3.5 rounded-xl bg-[#15121C] border border-[#3B0A6B]/60">
                <span className="text-[#AAA3B5] block text-[11px]">Ground Truth Events</span>
                <span className="text-[#00E5FF] font-bold text-lg">
                  {review.timeline_summary.ground_truth_events}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#15121C] border border-emerald-500/20">
                <span className="text-[#AAA3B5] block text-[11px]">Delivered Observations</span>
                <span className="text-emerald-400 font-bold text-lg">
                  {review.timeline_summary.delivered_observations}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#15121C] border border-rose-500/20">
                <span className="text-[#AAA3B5] block text-[11px]">Jammed / Lost Packets</span>
                <span className="text-rose-400 font-bold text-lg">
                  {review.timeline_summary.lost_observations}
                </span>
              </div>

              <div className="p-3.5 rounded-xl bg-[#15121C] border border-white/10">
                <span className="text-[#AAA3B5] block text-[11px]">Trainee Decisions</span>
                <span className="text-[#00E5FF] font-bold text-lg">
                  {review.timeline_summary.trainee_decisions}
                </span>
              </div>
            </div>
          </div>

          {/* Evaluator Diagnostic: Strengths & Improvement Areas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Strengths */}
            <div className="p-6 rounded-2xl bg-[#0D0B12]/80 backdrop-blur-md border border-emerald-500/25 shadow-lg space-y-3">
              <div className="flex items-center gap-2 text-emerald-400 font-mono font-bold text-sm">
                <CheckCircle2 className="w-5 h-5" />
                Performance Strengths
              </div>
              <ul className="space-y-2 text-xs text-[#F7F5FA] font-sans">
                {review.strengths.map((str, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-[#15121C] p-3 rounded-xl border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <span className="text-[#F7F5FA]">{str}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas for Improvement */}
            <div className="p-6 rounded-2xl bg-[#0D0B12]/80 backdrop-blur-md border border-amber-500/25 shadow-lg space-y-3">
              <div className="flex items-center gap-2 text-amber-400 font-mono font-bold text-sm">
                <AlertTriangle className="w-5 h-5" />
                Target Areas for Improvement
              </div>
              <ul className="space-y-2 text-xs text-[#F7F5FA] font-sans">
                {review.areas_for_improvement.map((area, idx) => (
                  <li key={idx} className="flex items-start gap-2 bg-[#15121C] p-3 rounded-xl border border-amber-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 mt-1.5 shrink-0" />
                    <span className="text-[#F7F5FA]">{area}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Follow-up Adaptive Drill Recommendation Banner */}
          {review.recommendations.length > 0 && (
            <div className="p-6 rounded-2xl bg-[#0D0B12]/90 backdrop-blur-xl border border-[#00E5FF]/30 shadow-[0_0_35px_rgba(0,229,255,0.15)] flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs font-mono text-[#00E5FF] font-bold">
                  <Sparkles className="w-4 h-4" />
                  RECOMMENDED ADAPTIVE TRAINING EXERCISE
                </div>
                <h3 className="text-xl font-bold text-[#F7F5FA]">
                  {review.recommendations[0].target_skill}
                </h3>
                <p className="text-xs text-[#AAA3B5] max-w-2xl leading-relaxed">
                  {review.recommendations[0].reason}
                </p>
              </div>

              <Link
                to={`/training?run_id=${runId}`}
                className="flex items-center gap-2 px-5 py-3 rounded-xl bg-[#00E5FF] hover:bg-[#00c8e0] text-[#050505] font-mono text-xs font-bold transition-all shadow-[0_0_20px_rgba(0,229,255,0.35)] shrink-0"
              >
                Inspect Adaptive Recommendations <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
