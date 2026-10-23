import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
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
  Shield,
  RotateCw,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  X,
  FileSpreadsheet,
  Layers,
  ChevronLeft,
  ChevronRight,
  Crosshair,
  Sliders,
  CheckCircle,
  Database
} from 'lucide-react';
import { api } from '../services/api';
import { SimulationRunState, Scenario } from '../types';

type SortField = 'created_at' | 'scenario_name' | 'trainee_id' | 'status' | 'duration' | 'decisions' | 'score';
type SortDirection = 'asc' | 'desc';

export const ReportsHistory: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // Tab state synchronized with URL query param ?tab=sessions | unit
  const activeTab = searchParams.get('tab') === 'unit' ? 'unit' : 'sessions';
  const setActiveTab = (tab: 'sessions' | 'unit') => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      if (tab === 'unit') {
        next.set('tab', 'unit');
      } else {
        next.delete('tab');
      }
      return next;
    });
  };

  // Primary data state
  const [runs, setRuns] = useState<SimulationRunState[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filter & Search state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [traineeFilter, setTraineeFilter] = useState('');

  // Sorting state
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(15);

  // Unit assessment state
  const [unitSummary, setUnitSummary] = useState<any>(null);
  const [unitLoading, setUnitLoading] = useState(false);

  // Launch modal state
  const [launchModalOpen, setLaunchModalOpen] = useState(false);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState('');
  const [launchTraineeId, setLaunchTraineeId] = useState('Trainee-Alpha');
  const [launchSeed, setLaunchSeed] = useState(42);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);

  // Export / copy notification toast
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [copiedRunId, setCopiedRunId] = useState<string | null>(null);
  const [exportingRunId, setExportingRunId] = useState<string | null>(null);

  // Fetch runs on mount
  useEffect(() => {
    loadRuns();
  }, []);

  // Fetch unit assessment when switching to unit tab
  useEffect(() => {
    if (activeTab === 'unit' && !unitSummary) {
      loadUnitSummary();
    }
  }, [activeTab]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  const loadRuns = async () => {
    try {
      setRefreshing(true);
      const data = await api.getRuns();
      setRuns(data);
    } catch (err: any) {
      console.error('Failed to load runs', err);
      setToast({ type: 'error', message: `Failed to load mission runs: ${err.message || 'Network error'}` });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const loadUnitSummary = async () => {
    try {
      setUnitLoading(true);
      const data = await api.getUnitAssessment();
      setUnitSummary(data);
    } catch (err: any) {
      console.error('Failed to load unit assessment', err);
      setToast({ type: 'error', message: `Unit assessment query failed: ${err.message || 'API error'}` });
    } finally {
      setUnitLoading(false);
    }
  };

  const openLaunchModal = async () => {
    setLaunchModalOpen(true);
    setLaunchError(null);
    try {
      const available = await api.getScenarios();
      setScenarios(available);
      if (available.length > 0 && !selectedScenarioId) {
        setSelectedScenarioId(available[0].id);
      }
    } catch (err: any) {
      console.error('Failed to load scenarios', err);
      setLaunchError('Could not fetch preset scenarios from server.');
    }
  };

  const handleLaunchMission = async () => {
    if (!selectedScenarioId) {
      setLaunchError('Please select a scenario.');
      return;
    }
    if (!launchTraineeId.trim()) {
      setLaunchError('Trainee call-sign is required.');
      return;
    }

    try {
      setIsLaunching(true);
      setLaunchError(null);
      const newRun = await api.createRun({
        scenario_id: selectedScenarioId,
        trainee_id: launchTraineeId.trim(),
        custom_seed: launchSeed
      });

      // Start the newly initialized simulation clock
      await api.startRun(newRun.id);

      setLaunchModalOpen(false);
      setToast({ type: 'success', message: `Mission ${newRun.id.slice(0, 8)} launched successfully!` });
      navigate(`/simulation?run_id=${newRun.id}`);
    } catch (err: any) {
      console.error('Mission launch failed', err);
      setLaunchError(err.message || 'Failed to initialize and dispatch simulation mission.');
    } finally {
      setIsLaunching(false);
    }
  };

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedRunId(id);
    setToast({ type: 'success', message: `Copied Run ID: ${id}` });
    setTimeout(() => setCopiedRunId(null), 2000);
  };

  const handleExportJson = async (runId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setExportingRunId(runId);
      const filename = await api.downloadExportJson(runId);
      setToast({ type: 'success', message: `Downloaded JSON report: ${filename}` });
    } catch (err: any) {
      console.error('Export JSON failed', err);
      setToast({ type: 'error', message: `Export JSON failed: ${err.message}` });
    } finally {
      setExportingRunId(null);
    }
  };

  const handleExportCsv = async (runId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setExportingRunId(runId);
      const filename = await api.downloadExportCsv(runId);
      setToast({ type: 'success', message: `Downloaded CSV audit: ${filename}` });
    } catch (err: any) {
      console.error('Export CSV failed', err);
      setToast({ type: 'error', message: `Export CSV failed: ${err.message}` });
    } finally {
      setExportingRunId(null);
    }
  };

  // Distinct trainees for filter dropdown
  const uniqueTrainees = useMemo(() => {
    const set = new Set<string>();
    runs.forEach(r => {
      if (r.trainee_id) set.add(r.trainee_id);
    });
    return Array.from(set).sort();
  }, [runs]);

  // Filtered & Sorted runs
  const processedRuns = useMemo(() => {
    let result = runs.filter((r) => {
      if (statusFilter && r.status !== statusFilter) return false;
      if (traineeFilter && r.trainee_id !== traineeFilter) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        const matchesId = r.id.toLowerCase().includes(term);
        const matchesScenario = r.scenario_name ? r.scenario_name.toLowerCase().includes(term) : false;
        const matchesTrainee = r.trainee_id.toLowerCase().includes(term);
        if (!matchesId && !matchesScenario && !matchesTrainee) return false;
      }
      return true;
    });

    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'scenario_name':
          comparison = (a.scenario_name || '').localeCompare(b.scenario_name || '');
          break;
        case 'trainee_id':
          comparison = a.trainee_id.localeCompare(b.trainee_id);
          break;
        case 'status':
          comparison = a.status.localeCompare(b.status);
          break;
        case 'duration':
          comparison = a.current_sim_time - b.current_sim_time;
          break;
        case 'decisions':
          comparison = a.trainee_decisions_count - b.trainee_decisions_count;
          break;
        case 'score': {
          const scoreA = a.overall_score ?? -1;
          const scoreB = b.overall_score ?? -1;
          comparison = scoreA - scoreB;
          break;
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [runs, statusFilter, traineeFilter, searchTerm, sortField, sortDirection]);

  // Pagination calculation
  const totalItems = processedRuns.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const paginatedRuns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return processedRuns.slice(start, start + pageSize);
  }, [processedRuns, currentPage, pageSize]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, traineeFilter, searchTerm, pageSize]);

  const handleSortToggle = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setTraineeFilter('');
  };

  const isFiltered = Boolean(searchTerm || statusFilter || traineeFilter);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Toast Notification */}
      {toast && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg border shadow-xl flex items-center gap-3 text-xs font-mono transition-all animate-fadeIn ${
            toast.type === 'success'
              ? 'bg-[#191C23] border-emerald-500/40 text-emerald-300'
              : 'bg-[#191C23] border-red-500/40 text-red-300'
          }`}
        >
          {toast.type === 'success' ? (
            <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
          )}
          <span>{toast.message}</span>
          <button
            onClick={() => setToast(null)}
            className="text-[#858B99] hover:text-[#F4F5F7] ml-2"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#7047C8]/15 border border-[#7047C8]/30">
              <History className="w-5 h-5 text-[#00CFE8]" />
            </div>
            <div>
              <span className="label-caps text-[#858B99] block mb-0.5">RECORDS ARCHIVE</span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#F4F5F7] tracking-tight">
                Simulation Mission Reports & History
              </h1>
              <p className="text-[#B3B7C2] text-xs mt-0.5">
                Persisted simulation ledger, evidence-aware scoring audits, individual trainee telemetry, and unit-level evaluations.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Tab Switcher */}
          <div className="bg-[#191C23] p-1 rounded-lg border border-white/[0.12] flex items-center gap-1 text-xs font-mono">
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-3 py-1.5 rounded font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'sessions'
                  ? 'bg-[#7047C8]/25 text-[#00CFE8] border border-[#00CFE8]/30'
                  : 'text-[#858B99] hover:text-[#F4F5F7]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              Session Archive
            </button>
            <button
              onClick={() => setActiveTab('unit')}
              className={`px-3 py-1.5 rounded font-bold transition-colors flex items-center gap-1.5 ${
                activeTab === 'unit'
                  ? 'bg-[#7047C8]/25 text-[#00CFE8] border border-[#00CFE8]/30'
                  : 'text-[#858B99] hover:text-[#F4F5F7]'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Unit-Level Assessment
            </button>
          </div>

          {/* Refresh Action */}
          <button
            onClick={activeTab === 'sessions' ? loadRuns : loadUnitSummary}
            disabled={refreshing || unitLoading}
            className="btn-secondary py-1.5 px-3 flex items-center gap-1.5 text-xs font-mono"
            title="Refresh Ledger"
          >
            <RotateCw className={`w-3.5 h-3.5 text-[#00CFE8] ${refreshing || unitLoading ? 'animate-spin' : ''}`} />
            Refresh
          </button>

          {/* Launch Mission Modal Trigger */}
          <button
            onClick={openLaunchModal}
            className="btn-cyan py-1.5 px-3.5 flex items-center gap-2 text-xs font-mono"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            Launch Mission
          </button>
        </div>
      </div>

      {activeTab === 'unit' ? (
        /* ================= Unit-Level Assessment View ================= */
        <div className="space-y-6">
          {unitLoading && !unitSummary ? (
            <div className="py-24 text-center text-[#858B99] font-mono text-xs">
              <div className="w-8 h-8 border-2 border-[#00CFE8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Computing unit-level trainee aggregates and assessment records...
            </div>
          ) : !unitSummary ? (
            <div className="glass-card p-8 text-center text-[#858B99] font-mono text-xs space-y-3">
              <p>Unable to load unit assessment records from backend service.</p>
              <button onClick={loadUnitSummary} className="btn-secondary text-xs px-3 py-1.5 font-mono">
                Retry Query
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Unit Readiness Executive Banner */}
              <div className="glass-card p-6 space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/[0.08] pb-4">
                  <div>
                    <span className="label-caps text-[#00CFE8] flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#00CFE8]" />
                      UNIT-LEVEL OPERATIONAL READINESS
                    </span>
                    <h2 className="text-xl md:text-2xl font-bold text-[#F4F5F7] mt-0.5">
                      Squadron Counter-Drone Proficiency Audit
                    </h2>
                    <p className="text-xs text-[#858B99] font-mono mt-1">
                      Multi-Trainee Individual & Unit-Level Performance Ledger
                    </p>
                  </div>

                  <div className="flex items-center gap-4 surface-structural p-4 rounded-lg border border-white/[0.08]">
                    <div className="text-right">
                      <span className="label-caps text-[#858B99] block">Unit Readiness Score</span>
                      <span className={`text-3xl font-extrabold font-mono tabular-stat ${
                        unitSummary.has_sufficient_unit_data ? 'text-[#00CFE8]' : 'text-[#858B99]'
                      }`}>
                        {unitSummary.unit_readiness_score}
                      </span>
                    </div>
                    <Award className="w-8 h-8 text-[#00CFE8]" />
                  </div>
                </div>

                {/* Honest Data Integrity Notice */}
                {!unitSummary.has_sufficient_unit_data ? (
                  <div className="p-4 rounded-lg bg-[#E9A23B]/10 border border-[#E9A23B]/30 flex items-start gap-3 text-xs text-[#E9A23B] font-mono">
                    <AlertTriangle className="w-4 h-4 text-[#E9A23B] shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-[#F4F5F7] font-bold mb-0.5">
                        DATA INTEGRITY NOTICE: DISPLAYING HONEST N/A
                      </strong>
                      <span className="text-[#B3B7C2]">
                        {unitSummary.notice} The database contains evaluated missions for only {unitSummary.unique_trainees_count} trainee ({unitSummary.individual_trainees[0]?.trainee_id || 'Cadet'}). Per operational evaluation guidelines, unit-level summaries are computed exclusively when records from multiple distinct trainees exist, preventing fabricated squadron readiness figures.
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-3 text-xs text-emerald-300 font-mono">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="block text-emerald-300 font-bold mb-0.5">
                        MULTI-TRAINEE AUDIT CONFIRMED
                      </strong>
                      <span>{unitSummary.notice}</span>
                    </div>
                  </div>
                )}

                {/* Aggregate KPI Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs font-mono pt-2">
                  <div className="surface-structural p-3.5 rounded-lg border border-white/[0.08]">
                    <span className="label-caps text-[#858B99] block">Distinct Trainees</span>
                    <span className="text-[#00CFE8] font-bold text-lg tabular-stat">
                      {unitSummary.unique_trainees_count}
                    </span>
                  </div>

                  <div className="surface-structural p-3.5 rounded-lg border border-white/[0.08]">
                    <span className="label-caps text-[#858B99] block">Mean Detection Rate</span>
                    <span className={`font-bold text-lg tabular-stat ${unitSummary.has_sufficient_unit_data ? 'text-emerald-400' : 'text-[#858B99]'}`}>
                      {unitSummary.unit_mean_detection_rate}
                    </span>
                  </div>

                  <div className="surface-structural p-3.5 rounded-lg border border-white/[0.08]">
                    <span className="label-caps text-[#858B99] block">Classification Accuracy</span>
                    <span className={`font-bold text-lg tabular-stat ${unitSummary.has_sufficient_unit_data ? 'text-[#00CFE8]' : 'text-[#858B99]'}`}>
                      {unitSummary.unit_mean_classification_accuracy}
                    </span>
                  </div>

                  <div className="surface-structural p-3.5 rounded-lg border border-white/[0.08]">
                    <span className="label-caps text-[#858B99] block">Mean Response Latency</span>
                    <span className={`font-bold text-lg tabular-stat ${unitSummary.has_sufficient_unit_data ? 'text-[#00CFE8]' : 'text-[#858B99]'}`}>
                      {unitSummary.unit_mean_latency_s}
                    </span>
                  </div>
                </div>
              </div>

              {/* Individual Trainees Breakdown Table */}
              <div className="surface-structural rounded-lg border border-white/[0.12] p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
                  <div className="flex items-center gap-2 text-[#00CFE8]">
                    <Shield className="w-4 h-4" />
                    <h3 className="font-bold text-sm text-[#F4F5F7] font-mono">
                      Verified Individual Trainee Records
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-[#858B99]">
                    Total Evaluated Missions: <strong className="text-[#F4F5F7] tabular-stat">{unitSummary.total_missions_evaluated}</strong>
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs font-mono min-w-[650px]">
                    <thead className="text-[#858B99] border-b border-white/[0.08] bg-[#111318]">
                      <tr>
                        <th className="py-2.5 px-3">Trainee ID</th>
                        <th className="py-2.5 px-3">Missions Completed</th>
                        <th className="py-2.5 px-3">Mean Score</th>
                        <th className="py-2.5 px-3">Personal Best</th>
                        <th className="py-2.5 px-3">Record Status</th>
                        <th className="py-2.5 px-3 text-right">Audit</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.05]">
                      {unitSummary.individual_trainees.map((t: any) => (
                        <tr key={t.trainee_id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-3 text-[#00CFE8] font-bold flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                            {t.trainee_id}
                          </td>
                          <td className="py-3 px-3 text-[#F4F5F7] tabular-stat">{t.runs_count} evaluated runs</td>
                          <td className="py-3 px-3 font-bold text-[#00CFE8] tabular-stat">{t.mean_score}%</td>
                          <td className="py-3 px-3 font-bold text-emerald-400 tabular-stat">{t.best_score}%</td>
                          <td className="py-3 px-3">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#7047C8]/15 text-[#00CFE8] border border-[#7047C8]/30">
                              {t.status}
                            </span>
                          </td>
                          <td className="py-3 px-3 text-right">
                            <Link
                              to={`/review?run_id=${t.latest_run_id}`}
                              className="btn-secondary text-[11px] py-1 px-2.5 inline-flex items-center gap-1.5"
                            >
                              <FileText className="w-3 h-3 text-[#00CFE8]" /> Latest AAR
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
        /* ================= Session Archive View ================= */
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="glass-card p-4 space-y-3">
            <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
              {/* Search Input */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#858B99]" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search by Run ID, scenario, or trainee..."
                  className="w-full pl-9 pr-8 py-2 rounded-lg bg-[#191C23] border border-white/[0.12] text-xs font-mono text-[#F4F5F7] placeholder-[#858B99] outline-none focus:border-[#00CFE8]"
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-3 top-2.5 text-[#858B99] hover:text-[#F4F5F7]"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Dropdown Filters */}
              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-[#858B99] hidden sm:inline">Status:</span>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="bg-[#191C23] border border-white/[0.12] rounded-lg text-xs font-mono text-[#00CFE8] cursor-pointer py-1.5 px-3 outline-none focus:border-[#00CFE8]"
                  >
                    <option value="" className="bg-[#111318] text-[#F4F5F7]">All Statuses</option>
                    <option value="COMPLETED" className="bg-[#111318] text-[#F4F5F7]">COMPLETED</option>
                    <option value="RUNNING" className="bg-[#111318] text-[#F4F5F7]">RUNNING</option>
                    <option value="PAUSED" className="bg-[#111318] text-[#F4F5F7]">PAUSED</option>
                    <option value="INITIALIZED" className="bg-[#111318] text-[#F4F5F7]">INITIALIZED</option>
                  </select>
                </div>

                {/* Trainee Filter */}
                {uniqueTrainees.length > 1 && (
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-mono text-[#858B99] hidden sm:inline">Trainee:</span>
                    <select
                      value={traineeFilter}
                      onChange={(e) => setTraineeFilter(e.target.value)}
                      className="bg-[#191C23] border border-white/[0.12] rounded-lg text-xs font-mono text-[#00CFE8] cursor-pointer py-1.5 px-3 max-w-[150px] outline-none focus:border-[#00CFE8]"
                    >
                      <option value="" className="bg-[#111318] text-[#F4F5F7]">All Trainees</option>
                      {uniqueTrainees.map(t => (
                        <option key={t} value={t} className="bg-[#111318] text-[#F4F5F7]">{t}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Clear Filter Button */}
                {isFiltered && (
                  <button
                    onClick={clearFilters}
                    className="btn-secondary text-[11px] font-mono py-1.5 px-2.5 flex items-center gap-1 text-[#858B99] hover:text-[#00CFE8]"
                  >
                    <X className="w-3 h-3" />
                    Reset
                  </button>
                )}
              </div>
            </div>

            {/* Results Counter Bar */}
            <div className="flex items-center justify-between text-[11px] font-mono text-[#858B99] pt-2 border-t border-white/[0.06]">
              <span>
                Showing <strong className="text-[#00CFE8] tabular-stat">{paginatedRuns.length}</strong> of{' '}
                <strong className="text-[#F4F5F7] tabular-stat">{totalItems}</strong> matching records
                {runs.length !== totalItems && ` (filtered from ${runs.length} total)`}
              </span>

              <div className="flex items-center gap-2">
                <span>Rows per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="bg-transparent border border-white/[0.12] rounded px-1.5 py-0.5 text-[#00CFE8] cursor-pointer"
                >
                  <option value={10} className="bg-[#111318] text-[#F4F5F7]">10</option>
                  <option value={15} className="bg-[#111318] text-[#F4F5F7]">15</option>
                  <option value={25} className="bg-[#111318] text-[#F4F5F7]">25</option>
                  <option value={50} className="bg-[#111318] text-[#F4F5F7]">50</option>
                </select>
              </div>
            </div>
          </div>

          {/* Runs Table Card */}
          <div className="surface-structural rounded-lg border border-white/[0.12] overflow-hidden">
            {loading ? (
              <div className="py-24 text-center text-[#858B99] font-mono text-xs">
                <div className="w-8 h-8 border-2 border-[#00CFE8] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                Fetching mission archives from database...
              </div>
            ) : processedRuns.length === 0 ? (
              <div className="py-20 text-center space-y-3 text-[#858B99] font-mono text-xs">
                <p>No simulation mission records found matching filters.</p>
                {isFiltered && (
                  <button onClick={clearFilters} className="btn-secondary py-1 px-3 text-xs font-mono">
                    Clear Active Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono min-w-[960px]">
                  <thead className="text-[#858B99] border-b border-white/[0.08] bg-[#111318]">
                    <tr>
                      {/* Run ID Column */}
                      <th className="py-3 px-3 w-36">
                        <button
                          onClick={() => handleSortToggle('created_at')}
                          className="flex items-center gap-1 hover:text-[#00CFE8] transition-colors"
                        >
                          <span>Run ID / Date</span>
                          {sortField === 'created_at' ? (
                            sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-[#00CFE8]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#00CFE8]" />
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </button>
                      </th>

                      {/* Scenario Column */}
                      <th className="py-3 px-3">
                        <button
                          onClick={() => handleSortToggle('scenario_name')}
                          className="flex items-center gap-1 hover:text-[#00CFE8] transition-colors"
                        >
                          <span>Scenario</span>
                          {sortField === 'scenario_name' ? (
                            sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-[#00CFE8]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#00CFE8]" />
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </button>
                      </th>

                      {/* Trainee Column */}
                      <th className="py-3 px-2.5 w-32">
                        <button
                          onClick={() => handleSortToggle('trainee_id')}
                          className="flex items-center gap-1 hover:text-[#00CFE8] transition-colors"
                        >
                          <span>Trainee</span>
                          {sortField === 'trainee_id' ? (
                            sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-[#00CFE8]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#00CFE8]" />
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </button>
                      </th>

                      {/* Seed Column */}
                      <th className="py-3 px-2 w-14">Seed</th>

                      {/* Status Column */}
                      <th className="py-3 px-2.5 w-24">
                        <button
                          onClick={() => handleSortToggle('status')}
                          className="flex items-center gap-1 hover:text-[#00CFE8] transition-colors"
                        >
                          <span>Status</span>
                          {sortField === 'status' ? (
                            sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-[#00CFE8]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#00CFE8]" />
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </button>
                      </th>

                      {/* Sim Time Column */}
                      <th className="py-3 px-2.5 w-24">
                        <button
                          onClick={() => handleSortToggle('duration')}
                          className="flex items-center gap-1 hover:text-[#00CFE8] transition-colors"
                        >
                          <span>Sim Time</span>
                          {sortField === 'duration' ? (
                            sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-[#00CFE8]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#00CFE8]" />
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </button>
                      </th>

                      {/* Decisions Column */}
                      <th className="py-3 px-2 w-20 text-center">
                        <button
                          onClick={() => handleSortToggle('decisions')}
                          className="flex items-center gap-1 justify-center hover:text-[#00CFE8] transition-colors w-full"
                        >
                          <span>Decisions</span>
                          {sortField === 'decisions' ? (
                            sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-[#00CFE8]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#00CFE8]" />
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </button>
                      </th>

                      {/* Score Column */}
                      <th className="py-3 px-2.5 w-24">
                        <button
                          onClick={() => handleSortToggle('score')}
                          className="flex items-center gap-1 hover:text-[#00CFE8] transition-colors"
                        >
                          <span>Score</span>
                          {sortField === 'score' ? (
                            sortDirection === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-[#00CFE8]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#00CFE8]" />
                          ) : (
                            <ChevronsUpDown className="w-3 h-3 opacity-40" />
                          )}
                        </button>
                      </th>

                      {/* Actions Column */}
                      <th className="py-3 px-3 text-right w-56">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.05]">
                    {paginatedRuns.map((r) => {
                      const isZeroScored = r.overall_score === 0;
                      const isUnevaluated = r.overall_score === null || r.overall_score === undefined;
                      const hasPositiveScore = typeof r.overall_score === 'number' && r.overall_score > 0;

                      return (
                        <tr key={r.id} className="hover:bg-white/[0.02] transition-colors group">
                          {/* Run ID & Date */}
                          <td className="py-2.5 px-3">
                            <div className="flex items-center gap-1.5">
                              <Link
                                to={`/simulation?run_id=${r.id}`}
                                className="text-[#00CFE8] font-bold hover:underline"
                                title={`Open Simulation Workspace for ${r.id}`}
                              >
                                {r.id.slice(0, 8)}...{r.id.slice(-4)}
                              </Link>
                              <button
                                onClick={(e) => handleCopyId(r.id, e)}
                                className="text-[#858B99] hover:text-[#00CFE8] transition-colors"
                                title="Copy Full Run ID"
                              >
                                {copiedRunId === r.id ? (
                                  <Check className="w-3 h-3 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                                )}
                              </button>
                            </div>
                            <span className="text-[10px] text-[#858B99] block mt-0.5">
                              {new Date(r.created_at).toLocaleDateString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                          </td>

                          {/* Scenario */}
                          <td className="py-2.5 px-3">
                            <span className="text-[#F4F5F7] font-semibold block line-clamp-1" title={r.scenario_name}>
                              {r.scenario_name || 'Custom Seeded Run'}
                            </span>
                            <span className="text-[10px] text-[#858B99] uppercase font-mono">
                              {r.environment || 'Urban'}
                            </span>
                          </td>

                          {/* Trainee */}
                          <td className="py-2.5 px-2.5 text-[#858B99] font-mono">
                            <span className="text-[#F4F5F7]">{r.trainee_id}</span>
                          </td>

                          {/* Seed */}
                          <td className="py-2.5 px-2 text-[#858B99] font-mono tabular-stat">{r.seed}</td>

                          {/* Status */}
                          <td className="py-2.5 px-2.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                                r.status === 'COMPLETED'
                                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                  : r.status === 'RUNNING'
                                  ? 'bg-[#00CFE8]/10 text-[#00CFE8] border border-[#00CFE8]/40'
                                  : r.status === 'PAUSED'
                                  ? 'bg-[#E9A23B]/10 text-[#E9A23B] border border-[#E9A23B]/30'
                                  : 'bg-white/[0.04] text-[#858B99] border border-white/[0.12]'
                              }`}
                            >
                              {r.status === 'RUNNING' && (
                                <span className="w-1.5 h-1.5 rounded-full bg-[#00CFE8] animate-ping" />
                              )}
                              {r.status}
                            </span>
                          </td>

                          {/* Sim Time */}
                          <td className="py-2.5 px-2.5 text-[#858B99] font-mono whitespace-nowrap">
                            <span className="text-[#F4F5F7] tabular-stat">{Math.round(r.current_sim_time)}s</span>
                            <span className="text-[#858B99]/60 tabular-stat"> / {r.duration_seconds}s</span>
                            <div className="w-14 h-1 bg-white/[0.08] rounded-full mt-1 overflow-hidden">
                              <div
                                className="h-full bg-[#00CFE8]"
                                style={{
                                  width: `${Math.min(100, Math.round((r.current_sim_time / Math.max(1, r.duration_seconds)) * 100))}%`
                                }}
                              />
                            </div>
                          </td>

                          {/* Decisions */}
                          <td className="py-2.5 px-2 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[11px] font-bold tabular-stat ${
                                r.trainee_decisions_count > 0
                                  ? 'text-[#00CFE8] bg-[#7047C8]/15 border border-[#7047C8]/30'
                                  : 'text-[#858B99] bg-white/[0.02]'
                              }`}
                            >
                              {r.trainee_decisions_count}
                            </span>
                          </td>

                          {/* Score */}
                          <td className="py-2.5 px-2.5 font-bold font-mono whitespace-nowrap">
                            {isUnevaluated ? (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] text-[#858B99] bg-white/[0.03] border border-white/[0.08]"
                                title="Mission has not yet been processed by Decision Scoring Engine"
                              >
                                Unevaluated
                              </span>
                            ) : isZeroScored ? (
                              <span
                                className="px-1.5 py-0.5 rounded text-[10px] font-bold text-[#E9A23B] bg-[#E9A23B]/10 border border-[#E9A23B]/30"
                                title="Evaluated: 0.0% score recorded due to deficit/inactivity"
                              >
                                0.0% Deficit
                              </span>
                            ) : hasPositiveScore ? (
                              <span
                                className={`px-1.5 py-0.5 rounded text-[11px] font-bold tabular-stat ${
                                  r.overall_score! >= 70
                                    ? 'text-emerald-400 bg-emerald-500/10 border border-emerald-500/30'
                                    : r.overall_score! >= 40
                                    ? 'text-[#00CFE8] bg-[#00CFE8]/10 border border-[#00CFE8]/30'
                                    : 'text-[#E9A23B] bg-[#E9A23B]/10 border border-[#E9A23B]/30'
                                }`}
                              >
                                {r.overall_score!.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-[#858B99]">N/A</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              {/* After-Action Review */}
                              <Link
                                to={`/review?run_id=${r.id}`}
                                className="btn-secondary text-[11px] py-1 px-2 inline-flex items-center gap-1"
                                title="Open After-Action Review"
                              >
                                <FileText className="w-3 h-3 text-[#00CFE8]" />
                                Review
                              </Link>

                              {/* Evidence Timeline */}
                              <Link
                                to={`/timeline?run_id=${r.id}`}
                                className="btn-secondary text-[11px] py-1 px-2 inline-flex items-center gap-1"
                                title="Inspect Evidence Timeline"
                              >
                                <GitCommit className="w-3 h-3 text-[#00CFE8]" />
                                Timeline
                              </Link>

                              {/* JSON Export */}
                              <button
                                onClick={(e) => handleExportJson(r.id, e)}
                                disabled={exportingRunId === r.id}
                                className="btn-secondary p-1"
                                title="Download Full JSON Evaluation Report"
                              >
                                <Download className="w-3 h-3 text-[#00CFE8]" />
                              </button>

                              {/* CSV Export */}
                              <button
                                onClick={(e) => handleExportCsv(r.id, e)}
                                disabled={exportingRunId === r.id}
                                className="btn-secondary p-1"
                                title="Download Decision-by-Decision CSV Audit"
                              >
                                <FileSpreadsheet className="w-3 h-3 text-emerald-400" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination Controls Footer */}
            {totalPages > 1 && (
              <div className="p-3.5 border-t border-white/[0.08] flex items-center justify-between text-xs font-mono bg-[#111318]">
                <span className="text-[#858B99]">
                  Page <strong className="text-[#00CFE8] tabular-stat">{currentPage}</strong> of{' '}
                  <strong className="text-[#F4F5F7] tabular-stat">{totalPages}</strong>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="btn-secondary px-2 py-1 disabled:opacity-40"
                    title="First Page"
                  >
                    «
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="btn-secondary px-2.5 py-1 disabled:opacity-40 flex items-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" /> Prev
                  </button>

                  <div className="hidden sm:flex items-center gap-1 px-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, idx) => {
                      let pageNum = currentPage;
                      if (totalPages <= 5) {
                        pageNum = idx + 1;
                      } else if (currentPage <= 3) {
                        pageNum = idx + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + idx;
                      } else {
                        pageNum = currentPage - 2 + idx;
                      }

                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`w-7 h-7 rounded text-xs font-bold transition-colors ${
                            currentPage === pageNum
                              ? 'bg-[#7047C8]/40 text-[#00CFE8] border border-[#00CFE8]/40'
                              : 'text-[#858B99] hover:text-[#F4F5F7]'
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="btn-secondary px-2.5 py-1 disabled:opacity-40 flex items-center gap-1"
                  >
                    Next <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    className="btn-secondary px-2 py-1 disabled:opacity-40"
                    title="Last Page"
                  >
                    »
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ================= Launch Mission Modal ================= */}
      {launchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-overlay max-w-lg w-full p-6 space-y-5 border border-white/[0.15]">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-[#00CFE8] fill-[#00CFE8]/20" />
                <h3 className="font-bold text-base text-[#F4F5F7] font-mono">
                  Dispatch New Simulation Mission
                </h3>
              </div>
              <button
                onClick={() => setLaunchModalOpen(false)}
                className="text-[#858B99] hover:text-[#F4F5F7]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {launchError && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/30 text-xs text-red-200 font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{launchError}</span>
              </div>
            )}

            <div className="space-y-4 font-mono text-xs">
              {/* Scenario Preset Selector */}
              <div>
                <label className="block text-[#858B99] mb-1">Select Scenario Preset</label>
                {scenarios.length === 0 ? (
                  <div className="py-2 text-[#858B99] animate-pulse">Loading scenarios from catalog...</div>
                ) : (
                  <select
                    value={selectedScenarioId}
                    onChange={(e) => setSelectedScenarioId(e.target.value)}
                    className="w-full bg-[#191C23] border border-white/[0.12] rounded-lg p-2 text-xs text-[#00CFE8] cursor-pointer outline-none focus:border-[#00CFE8]"
                  >
                    {scenarios.map((s) => (
                      <option key={s.id} value={s.id} className="bg-[#111318] text-[#F4F5F7]">
                        {s.name} ({s.difficulty} • {s.environment} • {s.duration_seconds}s)
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Trainee Call-Sign */}
              <div>
                <label className="block text-[#858B99] mb-1">Trainee Call-Sign</label>
                <input
                  type="text"
                  value={launchTraineeId}
                  onChange={(e) => setLaunchTraineeId(e.target.value)}
                  placeholder="e.g. Trainee-Alpha"
                  className="w-full bg-[#191C23] border border-white/[0.12] rounded-lg p-2 text-xs text-[#F4F5F7] outline-none focus:border-[#00CFE8]"
                />
              </div>

              {/* Seed */}
              <div>
                <label className="block text-[#858B99] mb-1">PRNG Deterministic Seed</label>
                <input
                  type="number"
                  value={launchSeed}
                  onChange={(e) => setLaunchSeed(Number(e.target.value))}
                  className="w-full bg-[#191C23] border border-white/[0.12] rounded-lg p-2 text-xs text-[#F4F5F7] outline-none focus:border-[#00CFE8]"
                />
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-white/[0.08]">
              <Link
                to="/scenarios/builder"
                className="text-[11px] font-mono text-[#00CFE8] hover:underline flex items-center gap-1"
                onClick={() => setLaunchModalOpen(false)}
              >
                <Sliders className="w-3 h-3" />
                Open Scenario Builder
              </Link>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setLaunchModalOpen(false)}
                  className="btn-secondary py-1.5 px-3 text-xs font-mono"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLaunchMission}
                  disabled={isLaunching || !selectedScenarioId}
                  className="btn-cyan py-1.5 px-4 text-xs font-mono flex items-center gap-1.5"
                >
                  {isLaunching ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      Initializing...
                    </>
                  ) : (
                    <>
                      <Play className="w-3.5 h-3.5 fill-current" />
                      Launch Mission
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
