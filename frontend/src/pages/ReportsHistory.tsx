import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  History,
  Search,
  Filter,
  Download,
  ExternalLink,
  Award,
  Clock,
  Play,
  FileText,
  GitCommit,
  Users,
  CheckCircle2,
  AlertTriangle,
  Shield
} from 'lucide-react';
import { api } from '../services/api';
import { SimulationRunState } from '../types';

export const ReportsHistory: React.FC = () => {
  const [runs, setRuns] = useState<SimulationRunState[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'sessions' | 'unit'>('sessions');
  const [unitSummary, setUnitSummary] = useState<any>(null);
  const [unitLoading, setUnitLoading] = useState(false);

  useEffect(() => {
    loadRuns();
  }, [statusFilter]);

  useEffect(() => {
    if (activeTab === 'unit') {
      loadUnitSummary();
    }
  }, [activeTab]);

  const loadRuns = async () => {
    try {
      setLoading(true);
      const data = await api.getRuns({
        status: statusFilter || undefined,
      });
      setRuns(data);
    } catch (err) {
      console.error('Failed to load runs', err);
    } finally {
      setLoading(false);
    }
  };

  const loadUnitSummary = async () => {
    try {
      setUnitLoading(true);
      const data = await api.getUnitAssessment();
      setUnitSummary(data);
    } catch (err) {
      console.error('Failed to load unit assessment', err);
    } finally {
      setUnitLoading(false);
    }
  };

  const filteredRuns = runs.filter((r) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      r.id.toLowerCase().includes(term) ||
      (r.scenario_name && r.scenario_name.toLowerCase().includes(term)) ||
      r.trainee_id.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#F7F5FA] flex items-center gap-3">
            <History className="w-7 h-7 text-[#00E5FF]" />
            Simulation Mission Reports & History
          </h1>
          <p className="text-[#AAA3B5] text-xs mt-1">
            Persisted simulation runs, evaluation records, individual histories, and unit-level assessments.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Tab Switcher */}
          <div className="p-1 rounded-xl bg-[#0D0B12] border border-white/10 flex items-center gap-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'sessions'
                  ? 'bg-[#3B0A6B] text-[#00E5FF] border border-[#00E5FF]/40 shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                  : 'text-[#AAA3B5] hover:text-[#F7F5FA]'
              }`}
            >
              Session Archive
            </button>
            <button
              onClick={() => setActiveTab('unit')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                activeTab === 'unit'
                  ? 'bg-[#3B0A6B] text-[#00E5FF] border border-[#00E5FF]/40 shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                  : 'text-[#AAA3B5] hover:text-[#F7F5FA]'
              }`}
            >
              Unit-Level Assessment
            </button>
          </div>

          <Link
            to="/scenarios"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-[#3B0A6B] to-[#241039] hover:brightness-125 text-[#F7F5FA] font-semibold text-xs border border-[#00E5FF]/40 shadow-[0_0_20px_rgba(0,229,255,0.18)] transition-all font-mono shrink-0"
          >
            <Play className="w-3.5 h-3.5 fill-current text-[#00E5FF]" />
            Launch Mission
          </Link>
        </div>
      </div>

      {activeTab === 'unit' ? (
        /* Unit-Level Assessment View */
        <div className="space-y-6">
          {unitLoading && !unitSummary ? (
            <div className="py-24 text-center text-[#AAA3B5] font-mono text-xs animate-pulse">
              Computing unit-level trainee aggregates and assessment records...
            </div>
          ) : !unitSummary ? (
            <div className="p-8 text-center glass-card rounded-2xl border border-rose-500/30 text-[#AAA3B5] font-mono text-xs">
              Unable to load unit assessment records.
            </div>
          ) : (
            <div className="space-y-6">
              {/* Unit Readiness Executive Banner */}
              <div className="p-6 rounded-2xl glass-card-elevated border border-[#3B0A6B]/40 shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
                  <div>
                    <span className="text-xs font-mono text-[#00E5FF] font-bold uppercase tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#00E5FF]" />
                      UNIT-LEVEL OPERATIONAL READINESS
                    </span>
                    <h2 className="text-2xl font-bold text-[#F7F5FA] mt-0.5">
                      Squadron Counter-Drone Proficiency Audit
                    </h2>
                    <p className="text-xs text-[#AAA3B5] font-mono mt-1">
                      SIH26247 Requirement 6 • Multi-Trainee Individual & Unit-Level Performance Ledger
                    </p>
                  </div>

                  <div className="flex items-center gap-4 bg-[#0D0B12]/90 p-4 rounded-xl border border-[#3B0A6B]/40 shadow-[0_0_20px_rgba(59,10,107,0.3)]">
                    <div className="text-right">
                      <span className="text-[10px] font-mono text-[#AAA3B5] uppercase block">Unit Readiness Score</span>
                      <span className={`text-3xl font-extrabold font-mono ${
                        unitSummary.has_sufficient_unit_data ? 'text-[#00E5FF]' : 'text-[#AAA3B5]'
                      }`}>
                        {unitSummary.unit_readiness_score}
                      </span>
                    </div>
                    <Award className="w-10 h-10 text-[#00E5FF]" />
                  </div>
                </div>

                {/* Data Integrity / Insufficient Data Notice */}
                {!unitSummary.has_sufficient_unit_data ? (
                  <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3 text-xs text-amber-200 font-mono">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-amber-300 font-bold mb-0.5">
                        SIH DATA INTEGRITY NOTICE: DISPLAYING N/A
                      </strong>
                      <span>
                        {unitSummary.notice} Evaluated missions exist for only {unitSummary.unique_trainees_count} trainee ({unitSummary.individual_trainees[0]?.trainee_id || 'Cadet'}). Per SIH evaluation guidelines, unit-level summaries are strictly computed only when multiple trainee records exist, avoiding fabricated statistics.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 flex items-start gap-3 text-xs text-emerald-200 font-mono">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-emerald-300 font-bold mb-0.5">
                        MULTI-TRAINEE AUDIT CONFIRMED
                      </strong>
                      <span>{unitSummary.notice}</span>
                    </div>
                  </div>
                )}

                {/* Aggregate KPI Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono pt-2">
                  <div className="p-3.5 rounded-xl bg-[#0D0B12]/80 border border-white/10">
                    <span className="text-[#AAA3B5] block text-[11px]">Distinct Trainees</span>
                    <span className="text-[#00E5FF] font-bold text-lg">
                      {unitSummary.unique_trainees_count}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0D0B12]/80 border border-emerald-500/20">
                    <span className="text-[#AAA3B5] block text-[11px]">Mean Detection Rate</span>
                    <span className="text-emerald-400 font-bold text-lg">
                      {unitSummary.unit_mean_detection_rate}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0D0B12]/80 border border-[#3B0A6B]/40">
                    <span className="text-[#AAA3B5] block text-[11px]">Classification Accuracy</span>
                    <span className="text-[#00E5FF] font-bold text-lg">
                      {unitSummary.unit_mean_classification_accuracy}
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#0D0B12]/80 border border-cyan-500/20">
                    <span className="text-[#AAA3B5] block text-[11px]">Mean Response Latency</span>
                    <span className="text-cyan-300 font-bold text-lg">
                      {unitSummary.unit_mean_latency_s}
                    </span>
                  </div>
                </div>
              </div>

              {/* Individual Trainees Breakdown Table */}
              <div className="p-6 rounded-2xl glass-card-elevated border border-[#3B0A6B]/40 shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2 text-[#00E5FF]">
                    <Shield className="w-5 h-5" />
                    <h3 className="font-bold text-base text-[#F7F5FA] font-mono">
                      Verified Individual Trainee Records
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-[#AAA3B5]">
                    Total Evaluated Missions: <strong className="text-[#F7F5FA]">{unitSummary.total_missions_evaluated}</strong>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono">
                    <thead className="text-[#AAA3B5] border-b border-white/10 pb-2">
                      <tr>
                        <th className="py-3">Trainee ID</th>
                        <th>Missions Completed</th>
                        <th>Mean Score</th>
                        <th>Personal Best</th>
                        <th>Record Status</th>
                        <th className="text-right">Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {unitSummary.individual_trainees.map((t: any) => (
                        <tr key={t.trainee_id} className="hover:bg-[#3B0A6B]/15 transition-colors">
                          <td className="py-3 text-[#00E5FF] font-bold flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-400" />
                            {t.trainee_id}
                          </td>
                          <td className="text-[#F7F5FA]">{t.runs_count} evaluated runs</td>
                          <td className="font-bold text-[#00E5FF]">{t.mean_score}%</td>
                          <td className="font-bold text-emerald-400">{t.best_score}%</td>
                          <td>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#241039] text-[#00E5FF] border border-[#00E5FF]/30">
                              {t.status}
                            </span>
                          </td>
                          <td className="text-right">
                            <Link
                              to={`/review?run_id=${t.latest_run_id}`}
                              className="px-2.5 py-1 rounded-lg bg-[#15121C] hover:bg-[#3B0A6B]/40 text-[#F7F5FA] border border-[#3B0A6B]/50 hover:border-[#00E5FF]/40 text-[11px] inline-flex items-center gap-1 transition-all"
                            >
                              <FileText className="w-3 h-3 text-[#00E5FF]" /> Latest AAR
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Session Archive View */
        <div className="space-y-6">
          {/* Filter and Search Bar */}
          <div className="p-4 rounded-2xl glass-card border border-white/10 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
            <div className="relative w-full md:w-96">
              <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#AAA3B5]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by Run ID, scenario, or trainee..."
                className="w-full pl-10 pr-4 py-2 bg-[#050505] border border-white/10 rounded-xl text-xs text-[#F7F5FA] placeholder-[#AAA3B5]/60 focus:outline-none focus:border-[#00E5FF] transition-all font-mono"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto">
              <span className="text-xs font-mono text-[#AAA3B5]">Status Filter:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="bg-[#050505] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-[#00E5FF] focus:outline-none focus:border-[#00E5FF] font-mono transition-all"
              >
                <option value="" className="bg-[#0D0B12] text-[#F7F5FA]">All Statuses</option>
                <option value="COMPLETED" className="bg-[#0D0B12] text-[#F7F5FA]">COMPLETED</option>
                <option value="RUNNING" className="bg-[#0D0B12] text-[#F7F5FA]">RUNNING</option>
                <option value="PAUSED" className="bg-[#0D0B12] text-[#F7F5FA]">PAUSED</option>
                <option value="INITIALIZED" className="bg-[#0D0B12] text-[#F7F5FA]">INITIALIZED</option>
              </select>
            </div>
          </div>

          {/* Runs Table */}
          <div className="p-6 rounded-2xl glass-card-elevated border border-[#3B0A6B]/40 shadow-[0_4px_30px_rgba(0,0,0,0.6)] overflow-hidden">
            {loading ? (
              <div className="py-20 text-center text-[#AAA3B5] font-mono text-xs animate-pulse">
                Fetching mission archives from database...
              </div>
            ) : filteredRuns.length === 0 ? (
              <div className="py-16 text-center space-y-2 text-[#AAA3B5] font-mono text-xs">
                <p>No simulation mission records found matching filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="text-[#AAA3B5] border-b border-white/10 pb-2">
                    <tr>
                      <th className="py-3">Run ID</th>
                      <th>Scenario</th>
                      <th>Trainee</th>
                      <th>Seed</th>
                      <th>Status</th>
                      <th>Sim Time</th>
                      <th>Decisions</th>
                      <th>Score</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredRuns.map((r) => (
                      <tr key={r.id} className="hover:bg-[#3B0A6B]/15 transition-colors">
                        <td className="py-3 text-[#00E5FF] font-bold">
                          <Link to={`/simulation?run_id=${r.id}`} className="hover:underline">
                            {r.id.slice(0, 8)}...
                          </Link>
                        </td>
                        <td className="text-[#F7F5FA] font-semibold">{r.scenario_name || 'Seeded Run'}</td>
                        <td className="text-[#AAA3B5]">{r.trainee_id}</td>
                        <td className="text-[#AAA3B5]">{r.seed}</td>
                        <td>
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            r.status === 'COMPLETED' ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/30' :
                            r.status === 'RUNNING' ? 'bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/50 animate-pulse' :
                            'bg-[#15121C] text-[#AAA3B5] border border-white/10'
                          }`}>
                            {r.status}
                          </span>
                        </td>
                        <td className="text-[#AAA3B5]">{r.current_sim_time}s / {r.duration_seconds}s</td>
                        <td className="text-[#00E5FF] font-bold">{r.trainee_decisions_count}</td>
                        <td className="font-bold text-[#F7F5FA]">
                          {r.overall_score !== null && r.overall_score !== undefined ? (
                            <span className="text-[#00E5FF]">{r.overall_score}%</span>
                          ) : (
                            <span className="text-[#AAA3B5]">Pending</span>
                          )}
                        </td>
                        <td className="text-right space-x-2">
                          <Link
                            to={`/review?run_id=${r.id}`}
                            className="px-2.5 py-1 rounded-lg bg-[#15121C] hover:bg-[#3B0A6B]/40 text-[#F7F5FA] border border-[#3B0A6B]/50 hover:border-[#00E5FF]/40 text-[11px] inline-flex items-center gap-1 transition-all"
                            title="View After-Action Review"
                          >
                            <FileText className="w-3 h-3 text-[#00E5FF]" /> Review
                          </Link>
                          <Link
                            to={`/timeline?run_id=${r.id}`}
                            className="px-2.5 py-1 rounded-lg bg-[#15121C] hover:bg-[#3B0A6B]/40 text-[#F7F5FA] border border-[#3B0A6B]/50 hover:border-[#00E5FF]/40 text-[11px] inline-flex items-center gap-1 transition-all"
                            title="Inspect Evidence Timeline"
                          >
                            <GitCommit className="w-3 h-3 text-[#00E5FF]" /> Timeline
                          </Link>
                          <a
                            href={api.getExportJsonUrl(r.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1.5 rounded-lg bg-[#15121C] hover:bg-[#00E5FF]/10 text-[#AAA3B5] hover:text-[#00E5FF] border border-white/10 text-[11px] inline-flex items-center transition-all"
                            title="Download JSON Export"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </a>
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

