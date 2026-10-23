import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Layers,
  Search,
  Filter,
  Play,
  Copy,
  Sliders,
  PlusCircle,
  Wind,
  Clock,
  Radio,
  Cpu,
  RotateCcw,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { api } from '../services/api';
import { Scenario } from '../types';

export const ScenarioLibrary: React.FC = () => {
  const navigate = useNavigate();
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [difficulty, setDifficulty] = useState<string>('');
  const [environment, setEnvironment] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Load scenarios whenever difficulty or environment changes
  useEffect(() => {
    loadScenarios();
  }, [difficulty, environment]);

  // Debounced live search
  useEffect(() => {
    const timer = setTimeout(() => {
      loadScenarios();
    }, 280);
    return () => clearTimeout(timer);
  }, [search]);

  const loadScenarios = async () => {
    try {
      setLoading(true);
      const data = await api.getScenarios({
        difficulty: difficulty || undefined,
        environment: environment || undefined,
        search: search.trim() || undefined,
      });
      setScenarios(data);
    } catch (err: any) {
      console.error('Failed to load scenarios', err);
      setFeedbackMsg({
        type: 'error',
        text: 'Failed to synchronize with scenario database.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadScenarios();
  };

  const handleResetFilters = () => {
    setSearch('');
    setDifficulty('');
    setEnvironment('');
  };

  const hasActiveFilters = Boolean(search || difficulty || environment);

  const handleStartSimulation = async (scenarioId: string) => {
    try {
      setActionLoading(`start-${scenarioId}`);
      const run = await api.createRun({
        scenario_id: scenarioId,
        trainee_id: 'Trainee-Alpha',
      });
      await api.startRun(run.id);
      navigate(`/simulation?run_id=${run.id}`);
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: `Error initializing simulation run: ${err.message}`,
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (scenarioId: string, scenarioName: string) => {
    try {
      setActionLoading(`dup-${scenarioId}`);
      const cloned = await api.duplicateScenario(scenarioId);
      setFeedbackMsg({
        type: 'success',
        text: `Scenario successfully cloned as "${cloned.name}".`,
      });
      await loadScenarios();
    } catch (err: any) {
      setFeedbackMsg({
        type: 'error',
        text: `Failed to duplicate scenario: ${err.message}`,
      });
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Toast Feedback Notification */}
      {feedbackMsg && (
        <div
          className={`p-3.5 rounded-lg border flex items-center justify-between text-xs font-mono transition-all duration-160 ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-950/70 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-950/70 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            onClick={() => setFeedbackMsg(null)}
            className="p-1 hover:bg-white/10 rounded transition-colors text-white/70"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-sky-100 dark:bg-[#7047C8]/20 border border-sky-200 dark:border-white/[0.12] text-[#0284C7] dark:text-[#00CFE8] shrink-0">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F4F5F7] tracking-tight font-sans">
                Scenario Library
              </h1>
              <p className="text-slate-600 dark:text-[#858B99] text-xs font-sans mt-0.5">
                Browse, configure, duplicate, and launch synthetic counter-drone training scenarios.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/scenarios/builder"
            className="btn-primary flex items-center gap-2 px-3.5 py-2 text-xs font-semibold font-mono tracking-wide shrink-0"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            Create New Scenario
          </Link>
        </div>
      </div>

      {/* Search and Filters Toolbar (Level 2 Translucent Work Surface) */}
      <div className="p-4 rounded-xl bg-white dark:bg-[#111318] border border-slate-200 dark:border-white/[0.12] shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row gap-3 justify-between items-stretch md:items-center">
          {/* Search Input */}
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-lg">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400 dark:text-[#858B99]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search scenarios by title, threat description, or seed..."
              className="glass-input pl-9 pr-8 text-xs font-mono text-slate-900 dark:text-[#F4F5F7] w-full py-1.5"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-700 dark:text-[#858B99] dark:hover:text-[#F4F5F7]"
                title="Clear search text"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </form>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Difficulty Filter */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600 dark:text-[#858B99]">
              <Filter className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#00CFE8] shrink-0" />
              <span className="text-[11px]">Difficulty:</span>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="glass-input text-xs font-mono text-slate-900 dark:text-[#F4F5F7] cursor-pointer py-1 px-2.5 bg-white dark:bg-[#111318]"
              >
                <option value="">All Difficulties</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            {/* Environment Filter */}
            <div className="flex items-center gap-1.5 text-xs font-mono text-slate-600 dark:text-[#858B99]">
              <span className="text-[11px]">Environment:</span>
              <select
                value={environment}
                onChange={(e) => setEnvironment(e.target.value)}
                className="glass-input text-xs font-mono text-slate-900 dark:text-[#F4F5F7] cursor-pointer py-1 px-2.5 bg-white dark:bg-[#111318]"
              >
                <option value="">All Environments</option>
                <option value="urban">Urban</option>
                <option value="coastal">Coastal</option>
                <option value="border">Border</option>
                <option value="rural">Rural</option>
              </select>
            </div>

            {/* Reset Filters Button */}
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="btn-secondary text-xs font-mono py-1 px-2.5 flex items-center gap-1 text-amber-600 dark:text-[#E9A23B] hover:opacity-80"
                title="Reset all search and filter parameters"
              >
                <RotateCcw className="w-3 h-3" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Active Filter Chips Bar */}
        {hasActiveFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200 dark:border-white/[0.08] text-[11px] font-mono text-slate-600 dark:text-[#858B99]">
            <span>Active filters:</span>
            {search && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-[#7047C8]/20 text-[#0284C7] dark:text-[#00CFE8] border border-sky-200 dark:border-white/[0.12]">
                Query: &quot;{search}&quot;
                <button onClick={() => setSearch('')} className="hover:text-slate-900 dark:hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {difficulty && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-[#7047C8]/20 text-[#0284C7] dark:text-[#00CFE8] border border-sky-200 dark:border-white/[0.12]">
                Level: {difficulty}
                <button onClick={() => setDifficulty('')} className="hover:text-slate-900 dark:hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            {environment && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 dark:bg-[#7047C8]/20 text-[#0284C7] dark:text-[#00CFE8] border border-sky-200 dark:border-white/[0.12] capitalize">
                Env: {environment}
                <button onClick={() => setEnvironment('')} className="hover:text-slate-900 dark:hover:text-white">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
            <span className="ml-auto text-[11px] text-slate-400 dark:text-[#858B99]/80">
              Showing {scenarios.length} matching result{scenarios.length === 1 ? '' : 's'}
            </span>
          </div>
        )}
      </div>

      {/* Scenario Cards Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="p-5 rounded-xl glass-card space-y-3.5 h-64 animate-pulse">
              <div className="flex justify-between">
                <div className="h-4 bg-slate-200 dark:bg-white/[0.08] rounded w-20" />
                <div className="h-4 bg-slate-200 dark:bg-white/[0.08] rounded w-24" />
              </div>
              <div className="h-5 bg-slate-200 dark:bg-white/[0.08] rounded w-3/4" />
              <div className="h-10 bg-slate-200 dark:bg-white/[0.08] rounded" />
              <div className="h-16 bg-slate-200 dark:bg-white/[0.08] rounded" />
            </div>
          ))}
        </div>
      ) : scenarios.length === 0 ? (
        /* Empty State */
        <div className="p-10 text-center space-y-3.5 glass-card rounded-xl">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.10] flex items-center justify-center mx-auto text-slate-500 dark:text-[#858B99]">
            <Search className="w-5 h-5" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F5F7] font-mono">
              No Scenarios Match Your Search Criteria
            </h3>
            <p className="text-xs text-slate-500 dark:text-[#858B99] max-w-md mx-auto">
              No training scenario records matched your query. Try adjusting your search term, changing difficulty, or resetting filters.
            </p>
          </div>
          <div className="flex justify-center gap-2.5 pt-2">
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="btn-secondary text-xs font-mono py-1.5 px-3"
              >
                Clear All Filters
              </button>
            )}
            <Link
              to="/scenarios/builder"
              className="btn-primary text-xs font-mono py-1.5 px-3"
            >
              Build Custom Scenario
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map((sc) => {
            const diffColor =
              sc.difficulty === 'Beginner'
                ? 'text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/60'
                : sc.difficulty === 'Intermediate'
                ? 'text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/60'
                : 'text-rose-700 dark:text-rose-400 border-rose-300 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/60';

            const isStarting = actionLoading === `start-${sc.id}`;
            const isCloning = actionLoading === `dup-${sc.id}`;

            return (
              <div
                key={sc.id}
                className="p-5 rounded-xl bg-white dark:bg-[#111318]/95 border border-slate-200 dark:border-white/[0.14] hover:border-[#0284C7] dark:hover:border-[#00CFE8]/50 flex flex-col justify-between space-y-3.5 group relative shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] bracket-card transition-all duration-200"
              >
                {/* Top Section */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${diffColor}`}>
                      {sc.difficulty}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {sc.is_preset === 1 && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-[#7047C8]/10 dark:bg-[#7047C8]/20 text-[#6D28D9] dark:text-[#00CFE8] border border-purple-200 dark:border-white/[0.12]">
                          SEEDED TEMPLATE
                        </span>
                      )}
                      <span className="text-[10.5px] font-mono text-slate-600 dark:text-[#858B99] capitalize bg-slate-100 dark:bg-white/[0.03] px-2 py-0.5 rounded border border-slate-200 dark:border-white/[0.08]">
                        {sc.environment}
                      </span>
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#F4F5F7] group-hover:text-[#0284C7] dark:group-hover:text-[#00CFE8] transition-colors leading-snug">
                      {sc.name}
                    </h3>
                    <p className="text-xs text-slate-600 dark:text-[#B3B7C2] leading-relaxed mt-1 line-clamp-3 min-h-[44px]">
                      {sc.description || 'Configured deterministic synthetic counter-drone training scenario.'}
                    </p>
                  </div>

                  {/* Metadata Section: Telemetry & Degradation Attributes */}
                  <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#111318]/90 border border-slate-200 dark:border-white/[0.08] space-y-1.5 text-xs font-mono">
                    <div className="flex justify-between items-center text-slate-500 dark:text-[#858B99]">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#00CFE8]" /> Duration
                      </span>
                      <span className="text-slate-900 dark:text-[#F4F5F7] font-semibold tabular-stat">{sc.duration_seconds}s</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-500 dark:text-[#858B99]">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#00CFE8]" /> Drone Targets
                      </span>
                      <span className="text-slate-900 dark:text-[#F4F5F7] font-semibold tabular-stat">{sc.configuration?.num_entities ?? 5} entities</span>
                    </div>

                    <div className="flex justify-between items-center text-slate-500 dark:text-[#858B99]">
                      <span className="flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-amber-500 dark:text-[#E9A23B]" /> RF Packet Loss
                      </span>
                      <span className="text-[#0284C7] dark:text-[#00CFE8] font-semibold tabular-stat">
                        {Math.round((sc.configuration?.observation_loss_rate ?? 0.15) * 100)}%
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-slate-500 dark:text-[#858B99]">
                      <span className="flex items-center gap-1.5">
                        <Wind className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" /> Atmosphere
                      </span>
                      <span className="text-slate-900 dark:text-[#F4F5F7] truncate max-w-[130px]" title={sc.configuration?.weather || 'Clear Day'}>
                        {sc.configuration?.weather || 'Clear Day'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Section */}
                <div className="pt-2.5 border-t border-slate-200 dark:border-white/[0.08] flex items-center gap-2">
                  <button
                    onClick={() => handleStartSimulation(sc.id)}
                    disabled={actionLoading !== null}
                    className="flex-1 btn-primary flex items-center justify-center gap-2 py-2 text-xs font-mono font-semibold tracking-wide disabled:opacity-50"
                  >
                    {isStarting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Starting...</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Start Run</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => handleDuplicate(sc.id, sc.name)}
                    disabled={actionLoading !== null}
                    title="Duplicate scenario as editable copy"
                    aria-label="Duplicate scenario"
                    className="btn-secondary p-2 disabled:opacity-50"
                  >
                    {isCloning ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#0284C7] dark:text-[#00CFE8]" />
                    ) : (
                      <Copy className="w-4 h-4 text-slate-400 dark:text-[#858B99] hover:text-slate-900 dark:hover:text-[#F4F5F7]" />
                    )}
                  </button>

                  <Link
                    to={`/scenarios/builder?scenario_id=${sc.id}`}
                    title="Edit and configure scenario parameters"
                    aria-label="Edit scenario parameters"
                    className="btn-secondary p-2"
                  >
                    <Sliders className="w-4 h-4 text-[#0284C7] dark:text-[#00CFE8]" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
