import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  Award,
  HelpCircle,
  FileText,
  Sparkles,
  ArrowRight,
  Shield,
  Percent,
  Layers
} from 'lucide-react';
import { api } from '../services/api';
import { OverallScore, SimulationRunState } from '../types';

export const DecisionScoring: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const runId = searchParams.get('run_id');

  const [runs, setRuns] = useState<SimulationRunState[]>([]);
  const [scoreData, setScoreData] = useState<OverallScore | null>(null);
  const [loading, setLoading] = useState(true);

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
        setSearchParams({ run_id: data[0].id });
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
    } catch (err) {
      console.error('Failed to load score data', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#F7F5FA] flex items-center gap-3">
            <CheckCircle2 className="w-7 h-7 text-[#00E5FF]" />
            Evidence-Aware Decision Scoring
          </h1>
          <p className="text-[#AAA3B5] text-xs mt-1">
            Transparent scoring engine evaluating trainee decisions strictly against available evidence.
          </p>
        </div>

        {/* Run Selector Dropdown */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#AAA3B5]">Select Run:</span>
          <select
            value={runId || ''}
            onChange={(e) => setSearchParams({ run_id: e.target.value })}
            className="px-3 py-2 bg-[#050505] border border-white/10 rounded-xl text-xs font-mono text-[#00E5FF] focus:outline-none focus:border-[#00E5FF]"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id.slice(0, 8)}... - {r.scenario_name || 'Seeded'} ({r.status})
              </option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center text-[#AAA3B5] font-mono text-xs animate-pulse">
          Computing evidence-aware metric ledgers...
        </div>
      ) : !scoreData ? (
        <div className="p-8 text-center bg-[#0D0B12]/80 backdrop-blur-md rounded-2xl border border-white/10 text-[#AAA3B5] font-mono text-xs">
          No scoring data available. Run a simulation to generate evaluation metrics.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overall Score Card Banner */}
          <div className="p-6 rounded-2xl bg-[#0D0B12]/85 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
              <div className="relative flex items-center justify-center w-28 h-28 rounded-full bg-[#050505] border-4 border-[#00E5FF] shadow-[0_0_30px_rgba(0,229,255,0.3)]">
                <div className="text-center">
                  <div className="text-3xl font-extrabold font-mono text-[#F7F5FA]">
                    {scoreData.overall_score}
                  </div>
                  <div className="text-[10px] font-mono text-[#00E5FF] font-bold uppercase tracking-wider">
                    Score
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#241039] text-[#00E5FF] border border-[#3B0A6B]">
                  EVIDENCE-AWARE PROTOCOL
                </span>
                <h2 className="text-2xl font-bold text-[#F7F5FA]">
                  Trainee Performance Evaluation
                </h2>
                <p className="text-xs text-[#AAA3B5] max-w-xl">
                  {scoreData.evidence_aware_disclaimer}
                </p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link
                to={`/review?run_id=${runId}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#15121C] hover:bg-[#3B0A6B]/30 text-[#F7F5FA] font-mono text-xs font-semibold border border-white/10 hover:border-[#00E5FF]/40 transition-all"
              >
                <FileText className="w-4 h-4 text-[#00E5FF]" />
                After-Action Review
              </Link>
              <Link
                to={`/training?run_id=${runId}`}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#00c8e0] text-[#050505] font-mono text-xs font-bold shadow-[0_0_20px_rgba(0,229,255,0.35)] transition-all"
              >
                <Sparkles className="w-4 h-4" />
                Adaptive Drills
              </Link>
            </div>
          </div>

          {/* Evidence-Aware Exemption Ledger Banner (GARUDA Differentiator - SIH26247 Req 8) */}
          <div className="p-4 rounded-xl bg-[#241039]/50 border border-[#3B0A6B] shadow-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-mono font-bold text-[#00E5FF]">
                <Shield className="w-4 h-4" />
                SIH26247 REQ 8: EVIDENCE-AWARE EVALUATION PROTOCOL
              </div>
              <p className="text-xs text-[#F7F5FA]/90 max-w-2xl font-sans leading-relaxed">
                Trainees are evaluated <em>strictly against evidence delivered to their console prior to each action</em>. Any threat that was 100% unobservable due to RF jamming packet loss or sensor blackout is isolated into the unassessable ledger and <strong>strictly excluded from missed-detection penalties</strong>.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0 text-xs font-mono">
              <div className="px-3 py-1.5 rounded-lg bg-[#050505] border border-emerald-500/30 text-emerald-400 font-bold">
                ✓ Protected Denominator
              </div>
              <div className="px-3 py-1.5 rounded-lg bg-[#050505] border border-[#3B0A6B] text-[#00E5FF] font-bold">
                ✓ 3 Independent Ledgers
              </div>
            </div>
          </div>

          {/* Metric Breakdown Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {scoreData.metrics.map((rec) => (
              <div
                key={rec.id}
                className="p-5 rounded-2xl bg-[#0D0B12]/80 backdrop-blur-md border border-white/10 space-y-3 shadow-md flex flex-col justify-between hover:border-[#00E5FF]/40 hover:shadow-[0_0_20px_rgba(0,229,255,0.12)] transition-all"
              >
                <div>
                  <div className="flex justify-between items-start text-xs font-mono text-[#AAA3B5] mb-1">
                    <span className="font-semibold">{rec.metric_category}</span>
                    <span className="text-[10px] text-[#00E5FF]">Weight: {Math.round(rec.weight * 100)}%</span>
                  </div>

                  <h3 className="text-sm font-bold text-[#F7F5FA] mb-2">{rec.metric_name}</h3>

                  <div className="text-2xl font-bold font-mono text-[#00E5FF] mb-1">
                    {rec.score_value}%
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#15121C] border border-white/10 text-[10px] font-mono text-[#AAA3B5] space-y-1">
                    <div className="flex justify-between">
                      <span>Numerator:</span>
                      <span className="text-[#F7F5FA] font-bold">{rec.numerator}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Denominator:</span>
                      <span className="text-[#F7F5FA] font-bold">{rec.denominator}</span>
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-[#AAA3B5] font-sans leading-relaxed border-t border-white/10 pt-2">
                  {rec.formula_description}
                </p>
              </div>
            ))}
          </div>

          {/* Decision-by-Decision Audit Ledger */}
          <div className="p-6 rounded-2xl bg-[#0D0B12]/80 backdrop-blur-md border border-white/10 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-bold text-[#F7F5FA] font-mono flex items-center gap-2">
                  <Shield className="w-5 h-5 text-[#00E5FF]" />
                  Decision-by-Decision Evidence Audit Ledger
                </h3>
                <p className="text-xs text-[#AAA3B5]">
                  Every trainee decision audited against evidence available at the exact decision timestamp.
                </p>
              </div>
            </div>

            {scoreData.decision_evaluations.length === 0 ? (
              <div className="text-center py-8 text-[#AAA3B5]/60 font-mono text-xs">
                No decisions recorded for this run. Launch the simulation and commit classifications.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="text-[#AAA3B5] border-b border-white/10 pb-2">
                    <tr>
                      <th className="py-2.5">Sim Time</th>
                      <th>Target ID</th>
                      <th>Decision</th>
                      <th>Selected Category</th>
                      <th>Actual Ground Truth</th>
                      <th>Evidence Status</th>
                      <th>Packets</th>
                      <th>Result</th>
                      <th>Audit Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {scoreData.decision_evaluations.map((item) => (
                      <tr key={item.decision_id} className="hover:bg-white/[0.03] transition-colors">
                        <td className="py-3 text-[#00E5FF] font-bold">{item.simulation_time}s</td>
                        <td className="font-bold text-[#F7F5FA]">{item.target_entity_id}</td>
                        <td className="text-[#AAA3B5]">{item.decision_type}</td>
                        <td className="text-[#AAA3B5]">{item.selected_classification || 'N/A'}</td>
                        <td className="text-[#AAA3B5]">
                          {item.actual_ground_truth_category} ({item.actual_is_hostile ? 'Hostile' : 'Benign'})
                        </td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.evidence_status === 'ADEQUATE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                            item.evidence_status === 'EVIDENCE_LIMITED' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                            'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}>
                            {item.evidence_status}
                          </span>
                        </td>
                        <td className="text-[#F7F5FA] font-bold">{item.delivered_evidence_count_at_decision}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.is_correct ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                            'bg-rose-950 text-rose-300 border border-rose-800'
                          }`}>
                            {item.is_correct ? 'CORRECT' : 'INCORRECT'}
                          </span>
                        </td>
                        <td className="text-[#AAA3B5] max-w-xs truncate" title={item.scoring_notes}>
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

