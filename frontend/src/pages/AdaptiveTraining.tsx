import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Sparkles,
  Play,
  CheckCircle2,
  AlertTriangle,
  Award,
  ArrowRight,
  Shield,
  Layers,
  Cpu,
  Radio,
  Clock,
  Radar,
  ChevronDown,
  ChevronUp,
  Info,
  Check,
  X,
  ExternalLink,
  Target,
  Sliders,
  Filter,
  RefreshCw,
  Search,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { TrainingRecommendation, SimulationRunState } from '../types';

export const AdaptiveTraining: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const runId = searchParams.get('run_id');

  const [runs, setRuns] = useState<SimulationRunState[]>([]);
  const [recommendations, setRecommendations] = useState<TrainingRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [launchingId, setLaunchingId] = useState<string | null>(null);
  const [errorNotice, setErrorNotice] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  // Filters
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showArchExplainer, setShowArchExplainer] = useState(false);
  const [selectedDetailRec, setSelectedDetailRec] = useState<TrainingRecommendation | null>(null);

  useEffect(() => {
    loadRuns();
  }, []);

  useEffect(() => {
    loadRecommendations(runId || undefined);
  }, [runId]);

  const loadRuns = async () => {
    try {
      const data = await api.getRuns();
      setRuns(data);
    } catch (err) {
      console.error('Failed to load runs', err);
    }
  };

  const loadRecommendations = async (id?: string) => {
    try {
      setLoading(true);
      setErrorNotice(null);
      const data = await api.getRecommendations(id);
      setRecommendations(data);
    } catch (err) {
      console.error('Failed to load recommendations', err);
      setErrorNotice('Failed to connect to recommendation service.');
    } finally {
      setLoading(false);
    }
  };

  const handleLaunch = async (rec: TrainingRecommendation) => {
    if (launchingId !== null) return;
    try {
      setLaunchingId(rec.id);
      setErrorNotice(null);
      setSuccessNotice(`Synthesizing tailored adaptive drill: "${rec.target_skill}"...`);

      // 1. Launch recommendation (creates new scenario and run)
      const newRun = await api.launchTraining(rec.id);

      // 2. Start simulation clock
      try {
        await api.startRun(newRun.id);
      } catch (startErr) {
        console.warn('Clock start notice', startErr);
      }

      setSuccessNotice(`Drill initialized successfully! Redirecting to 3D Simulation Workspace...`);
      setTimeout(() => {
        navigate(`/simulation?run_id=${newRun.id}`);
      }, 700);
    } catch (err: any) {
      console.error('Launch failed', err);
      setErrorNotice(`Error launching adaptive exercise: ${err.message || 'Unknown network error'}`);
      setLaunchingId(null);
    }
  };

  const activeRun = runs.find((r) => r.id === runId);

  // Filter recommendations
  const filteredRecs = recommendations.filter((rec) => {
    if (priorityFilter !== 'all' && rec.priority !== priorityFilter) return false;
    if (difficultyFilter !== 'all' && rec.recommended_difficulty.toLowerCase() !== difficultyFilter.toLowerCase()) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchSkill = rec.target_skill.toLowerCase().includes(q);
      const matchReason = rec.reason.toLowerCase().includes(q);
      const matchGap = rec.gap_type.toLowerCase().includes(q);
      if (!matchSkill && !matchReason && !matchGap) return false;
    }
    return true;
  });

  // Calculate summary counts
  const totalAssessedRuns = runs.length;
  const uniqueGapsCount = recommendations.length;
  const recurringGapsCount = recommendations.filter((r) => (r.occurrence_count || 1) > 1).length;
  const launchedDrillsCount = recommendations.filter((r) => r.is_launched).length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-white/[0.08] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-[#7047C8]/15 border border-[#7047C8]/30">
              <Sparkles className="w-5 h-5 text-[#00CFE8]" />
            </div>
            <div>
              <span className="label-caps text-[#858B99] block mb-0.5">CURRICULUM SYNTHESIS</span>
              <h1 className="text-2xl md:text-3xl font-extrabold text-[#F4F5F7] tracking-tight">
                Adaptive Training Recommendations
              </h1>
              <p className="text-[#B3B7C2] text-xs mt-0.5">
                Deterministic algorithmic curriculum synthesizing tailored counter-drone drills from measured performance gaps.
              </p>
            </div>
          </div>
        </div>

        {/* Run Selector & Mode Indicator */}
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <div className="flex items-center gap-2 bg-[#191C23] p-1.5 rounded-lg border border-white/[0.12] grow lg:grow-0">
            <span className="text-[11px] font-mono text-[#858B99] pl-2 hidden sm:inline">SOURCE:</span>
            <select
              value={runId || ''}
              onChange={(e) => setSearchParams(e.target.value ? { run_id: e.target.value } : {})}
              className="bg-transparent text-xs font-mono text-[#00CFE8] px-2 py-1 outline-none cursor-pointer grow lg:grow-0"
              aria-label="Filter recommendations by simulation run"
            >
              <option value="" className="bg-[#111318] text-[#F4F5F7]">
                All Evaluated Runs (Aggregated Deficit View)
              </option>
              {runs.map((r) => (
                <option key={r.id} value={r.id} className="bg-[#111318] text-[#F4F5F7]">
                  {r.id.slice(0, 8)}... — {r.scenario_name || 'Seeded'} ({r.status})
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => loadRecommendations(runId || undefined)}
            className="btn-secondary text-xs p-2.5"
            title="Refresh recommendations"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00CFE8] ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Navigation Sub-bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs">
        <div className="flex items-center gap-2 text-[#858B99]">
          <span className="font-mono text-[#00CFE8]">Workflow:</span>
          <span>
            {runId ? (
              <>Showing targeted drills for selected run <strong className="text-[#F4F5F7] font-mono">{runId.slice(0, 8)}...</strong></>
            ) : (
              <>Aggregated Deficit Analysis across <strong className="text-[#F4F5F7] tabular-stat">{totalAssessedRuns} completed missions</strong></>
            )}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            to={`/review${runId ? `?run_id=${runId}` : ''}`}
            className="text-[#B3B7C2] hover:text-[#00CFE8] transition-colors flex items-center gap-1 font-mono text-[11px]"
          >
            <Award className="w-3.5 h-3.5 text-[#7047C8]" /> After-Action Review
          </Link>
          <span className="text-white/20">•</span>
          <Link
            to={`/scoring${runId ? `?run_id=${runId}` : ''}`}
            className="text-[#B3B7C2] hover:text-[#00CFE8] transition-colors flex items-center gap-1 font-mono text-[11px]"
          >
            <Shield className="w-3.5 h-3.5 text-[#00CFE8]" /> Decision Scoring
          </Link>
          <span className="text-white/20">•</span>
          <Link
            to="/scenarios/builder"
            className="text-[#B3B7C2] hover:text-[#00CFE8] transition-colors flex items-center gap-1 font-mono text-[11px]"
          >
            <Sliders className="w-3.5 h-3.5 text-[#E9A23B]" /> Scenario Builder
          </Link>
        </div>
      </div>

      {/* Feedback Banners */}
      {errorNotice && (
        <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-xs text-rose-300 font-mono">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorNotice}</span>
          </div>
          <button onClick={() => setErrorNotice(null)} className="p-1 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      {successNotice && (
        <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300 font-mono">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successNotice}</span>
          </div>
        </div>
      )}

      {/* Curriculum Summary & Rule-Engine Architecture Panel */}
      <div className="glass-card p-6 space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs font-mono text-[#00CFE8] font-bold uppercase tracking-wider">
              <Cpu className="w-4 h-4 text-[#00CFE8]" />
              <span>DETERMINISTIC RECOMMENDATION ENGINE & PROGRESSION ARCHITECTURE</span>
            </div>
            <p className="text-xs text-[#B3B7C2] max-w-3xl leading-relaxed">
              GARUDA uses a transparent, deterministic rule-based evaluator (no black-box AI model). Performance gaps in perimeter detection, classification accuracy, response latency, and degraded-evidence discipline directly map to tailored scenario configurations.
            </p>
          </div>

          <button
            onClick={() => setShowArchExplainer(!showArchExplainer)}
            className="btn-secondary text-xs flex items-center gap-1.5 shrink-0"
          >
            <Info className="w-3.5 h-3.5 text-[#00CFE8]" />
            <span>{showArchExplainer ? 'Hide Architecture' : 'View Rule Engine Details'}</span>
            {showArchExplainer ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Real Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 font-mono text-xs">
          <div className="surface-structural p-3 rounded-lg border border-white/[0.08]">
            <span className="label-caps text-[#858B99] block">Distinct Deficit Tracks</span>
            <span className="text-xl font-bold text-[#00CFE8] mt-0.5 block tabular-stat">{uniqueGapsCount}</span>
            <span className="text-[10px] text-[#858B99]">Deduplicated curricula</span>
          </div>

          <div className="surface-structural p-3 rounded-lg border border-white/[0.08]">
            <span className="label-caps text-[#858B99] block">Recurring Deficits</span>
            <span className="text-xl font-bold text-[#E9A23B] mt-0.5 block tabular-stat">{recurringGapsCount}</span>
            <span className="text-[10px] text-[#858B99]">Observed in multiple runs</span>
          </div>

          <div className="surface-structural p-3 rounded-lg border border-white/[0.08]">
            <span className="label-caps text-[#858B99] block">Assessed Missions</span>
            <span className="text-xl font-bold text-[#F4F5F7] mt-0.5 block tabular-stat">{totalAssessedRuns}</span>
            <span className="text-[10px] text-[#858B99]">In simulation ledger</span>
          </div>

          <div className="surface-structural p-3 rounded-lg border border-white/[0.08]">
            <span className="label-caps text-[#858B99] block">Launched Drills</span>
            <span className="text-xl font-bold text-emerald-400 mt-0.5 block tabular-stat">{launchedDrillsCount}</span>
            <span className="text-[10px] text-[#858B99]">Dispatched to workspace</span>
          </div>
        </div>

        {/* Collapsible Architecture Details */}
        {showArchExplainer && (
          <div className="pt-4 border-t border-white/[0.08] space-y-4 text-xs font-mono animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Rule 1 */}
              <div className="p-3.5 rounded-lg bg-[#191C23] border border-rose-500/20 space-y-1.5">
                <div className="flex items-center justify-between text-rose-400 font-bold">
                  <span>1. MISSED DETECTIONS</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10">HIGH</span>
                </div>
                <p className="text-[11px] text-[#B3B7C2] font-sans">
                  <strong>Trigger:</strong> Detection Rate &lt; 75.0% on observable threats.<br />
                  <strong>Tailored Drill:</strong> Low-RCS Rapid Threat Detection (Beginner, Border). Increases small-signature ingress frequency.
                </p>
              </div>

              {/* Rule 2 */}
              <div className="p-3.5 rounded-lg bg-[#191C23] border border-[#E9A23B]/20 space-y-1.5">
                <div className="flex items-center justify-between text-[#E9A23B] font-bold">
                  <span>2. FALSE ALARMS</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#E9A23B]/10">HIGH</span>
                </div>
                <p className="text-[11px] text-[#B3B7C2] font-sans">
                  <strong>Trigger:</strong> False Alarm Rate &ge; 15.0% on civilian/clutter.<br />
                  <strong>Tailored Drill:</strong> Clutter & Civilian Discrimination (Intermediate, Urban). Injects Remote-ID verification baselines.
                </p>
              </div>

              {/* Rule 3 */}
              <div className="p-3.5 rounded-lg bg-[#191C23] border border-[#00CFE8]/20 space-y-1.5">
                <div className="flex items-center justify-between text-[#00CFE8] font-bold">
                  <span>3. REACTION HESITATION</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#00CFE8]/10">MEDIUM</span>
                </div>
                <p className="text-[11px] text-[#B3B7C2] font-sans">
                  <strong>Trigger:</strong> Mean Engagement Latency &gt; 10.0 seconds.<br />
                  <strong>Tailored Drill:</strong> Rapid Threat Triaging & Timeliness (Intermediate, Coastal). Fast-loitering munitions with low latency margins.
                </p>
              </div>

              {/* Rule 4 */}
              <div className="p-3.5 rounded-lg bg-[#191C23] border border-[#7047C8]/30 space-y-1.5">
                <div className="flex items-center justify-between text-[#7047C8] font-bold">
                  <span>4. DEGRADED INFO PANIC</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#7047C8]/10">HIGH</span>
                </div>
                <p className="text-[11px] text-[#B3B7C2] font-sans">
                  <strong>Trigger:</strong> Actions taken with 0 delivered sensor evidence &ge; 2.<br />
                  <strong>Tailored Drill:</strong> Degraded Information Discipline & Ping Requests (Advanced). Heavy RF jamming requiring sensor pings.
                </p>
              </div>

              {/* Rule 5 */}
              <div className="p-3.5 rounded-lg bg-[#191C23] border border-white/[0.12] space-y-1.5">
                <div className="flex items-center justify-between text-[#B3B7C2] font-bold">
                  <span>5. INACTIVE AIRSPACE</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-white/[0.05]">PROVISIONAL</span>
                </div>
                <p className="text-[11px] text-[#B3B7C2] font-sans">
                  <strong>Trigger:</strong> Zero trainee engagement decisions logged.<br />
                  <strong>Tailored Drill:</strong> Foundational Ingress Intercept & Classification (Beginner). Baseline threat engagement practice.
                </p>
              </div>

              {/* Rule 6 */}
              <div className="p-3.5 rounded-lg bg-[#191C23] border border-emerald-500/20 space-y-1.5">
                <div className="flex items-center justify-between text-emerald-400 font-bold">
                  <span>6. MASTERY PROGRESSION</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10">LOW</span>
                </div>
                <p className="text-[11px] text-[#B3B7C2] font-sans">
                  <strong>Trigger:</strong> High baseline performance across all metrics.<br />
                  <strong>Tailored Drill:</strong> Advanced Multi-Threat Swarm Defense (Advanced, Urban). Synchronized multi-axis drone swarms.
                </p>
              </div>
            </div>

            <div className="p-3.5 rounded-lg bg-[#111318] border border-white/[0.12] text-xs text-[#B3B7C2] font-sans flex items-center justify-between">
              <span>
                <strong className="text-[#F4F5F7]">Closed-Loop Learning Cycle:</strong> When a trainee completes a recommended drill in the 3D workspace, the Decision Scoring engine recalculates performance metrics and dynamically clears resolved gaps.
              </span>
              <span className="text-[#00CFE8] font-mono text-[11px] shrink-0 ml-4 font-bold">
                GARUDA ADAPTIVE ENGINE
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Secondary Filter Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
        {/* Search */}
        <div className="relative grow max-w-md">
          <Search className="w-4 h-4 text-[#858B99] absolute left-3 top-1/2 transform -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by skill, deficit type, or keyword..."
            className="w-full pl-9 pr-3 py-2 rounded-lg bg-[#191C23] border border-white/[0.12] text-xs font-mono text-[#F4F5F7] placeholder-[#858B99] outline-none focus:border-[#00CFE8] transition-colors"
          />
        </div>

        {/* Priority & Difficulty Selectors */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Priority */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="bg-[#191C23] border border-white/[0.12] text-xs font-mono text-[#B3B7C2] px-3 py-2 rounded-lg outline-none cursor-pointer focus:border-[#00CFE8]"
          >
            <option value="all">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {/* Difficulty */}
          <select
            value={difficultyFilter}
            onChange={(e) => setDifficultyFilter(e.target.value)}
            className="bg-[#191C23] border border-white/[0.12] text-xs font-mono text-[#B3B7C2] px-3 py-2 rounded-lg outline-none cursor-pointer focus:border-[#00CFE8]"
          >
            <option value="all">All Difficulties</option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>

          {(priorityFilter !== 'all' || difficultyFilter !== 'all' || searchQuery.trim()) && (
            <button
              onClick={() => {
                setPriorityFilter('all');
                setDifficultyFilter('all');
                setSearchQuery('');
              }}
              className="text-xs font-mono text-[#00CFE8] hover:underline px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Recommendations Cards Grid */}
      {loading ? (
        <div className="glass-card py-24 text-center space-y-4">
          <div className="w-8 h-8 border-2 border-[#00CFE8] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[#858B99] font-mono text-xs">
            Querying simulation deficit logs and deduplicating adaptive curriculum tracks...
          </p>
        </div>
      ) : filteredRecs.length === 0 ? (
        <div className="glass-card p-12 text-center space-y-4">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-[#F4F5F7]">
            {recommendations.length === 0
              ? 'No Performance Deficits Logged'
              : 'No Recommendations Match Filters'}
          </h3>
          <p className="text-xs text-[#B3B7C2] max-w-md mx-auto">
            {recommendations.length === 0
              ? 'Complete a simulation run in the 3D Simulation Workspace to establish baseline operator metrics and trigger adaptive training diagnoses.'
              : 'Try clearing your search query or adjusting the priority and difficulty filters.'}
          </p>
          <div className="pt-2">
            {recommendations.length === 0 ? (
              <Link to="/simulation" className="btn-cyan text-xs inline-flex items-center gap-1.5 py-2.5 px-4">
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Open 3D Simulation Workspace</span>
              </Link>
            ) : (
              <button
                onClick={() => {
                  setPriorityFilter('all');
                  setDifficultyFilter('all');
                  setSearchQuery('');
                  setSearchParams({});
                }}
                className="btn-secondary text-xs"
              >
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredRecs.map((rec) => {
            const isHigh = rec.priority === 'HIGH';
            const isMed = rec.priority === 'MEDIUM';
            const cfg = rec.suggested_scenario_config || {};
            const isProvisional = rec.gap_type === 'NO_DECISIONS_RECORDED';
            const occurrenceCount = rec.occurrence_count || 1;

            return (
              <div
                key={rec.id}
                className="glass-card p-6 flex flex-col justify-between space-y-5 hover:border-[#00CFE8]/40 transition-colors"
              >
                {/* Card Header */}
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-mono uppercase px-2.5 py-0.5 rounded font-bold border ${
                          isHigh
                            ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                            : isMed
                            ? 'bg-[#E9A23B]/10 text-[#E9A23B] border-[#E9A23B]/30'
                            : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {rec.priority} Priority {isProvisional ? '(Provisional)' : 'Deficit'}
                      </span>

                      {occurrenceCount > 1 && (
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-[#E9A23B]/10 text-[#E9A23B] border border-[#E9A23B]/20 font-bold" title={`Observed across ${occurrenceCount} simulation runs`}>
                          Recurring ({occurrenceCount} runs)
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs font-mono">
                      <span className="text-[#858B99]">Level:</span>
                      <strong className="text-[#00CFE8] uppercase font-bold">
                        {rec.recommended_difficulty}
                      </strong>
                    </div>
                  </div>

                  {/* Title & Exercise Name */}
                  <div>
                    <h3 className="text-lg font-bold text-[#F4F5F7] tracking-tight">
                      {rec.target_skill}
                    </h3>
                    <div className="flex items-center gap-2 text-xs font-mono text-[#00CFE8] mt-1">
                      <Target className="w-3.5 h-3.5" />
                      <span>{cfg.name || `Exercise: ${rec.target_skill}`}</span>
                    </div>
                  </div>

                  {/* Diagnostic Rationale */}
                  <div className="surface-structural p-3.5 rounded-lg border border-white/[0.08] space-y-1">
                    <span className="label-caps text-[#858B99] block font-bold">
                      Diagnostic Deficit Findings
                    </span>
                    <p className="text-xs text-[#F4F5F7] leading-relaxed font-sans">
                      {rec.reason}
                    </p>
                  </div>

                  {/* Learning Objective */}
                  <div className="space-y-1">
                    <span className="label-caps text-[#00CFE8] block font-bold">
                      Tactical Learning Objective
                    </span>
                    <p className="text-xs text-[#B3B7C2] leading-relaxed font-sans">
                      {rec.learning_objective}
                    </p>
                  </div>

                  {/* Scenario Parameters Pill Grid */}
                  <div className="p-3.5 rounded-lg bg-[#111318] border border-white/[0.08] grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                    <div>
                      <span className="label-caps text-[#858B99] block">Entities</span>
                      <span className="text-[#F4F5F7] font-bold tabular-stat">{cfg.num_entities || 5} targets</span>
                    </div>

                    <div>
                      <span className="label-caps text-[#858B99] block">Sensor Latency</span>
                      <span className="text-[#00CFE8] font-bold tabular-stat">{cfg.observation_delay_mean || 1.5}s</span>
                    </div>

                    <div>
                      <span className="label-caps text-[#858B99] block">Packet Loss</span>
                      <span className="text-rose-400 font-bold tabular-stat">{Math.round((cfg.observation_loss_rate || 0.05) * 100)}%</span>
                    </div>

                    <div>
                      <span className="label-caps text-[#858B99] block">Environment</span>
                      <span className="text-[#F4F5F7] font-bold capitalize">{cfg.environment || 'urban'}</span>
                    </div>
                  </div>

                  {/* Progression & Launch Status Info */}
                  {rec.is_launched && (
                    <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2 text-emerald-300">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Drill launched in simulation run</span>
                      </div>
                      <Link
                        to={`/simulation?run_id=${rec.launched_run_id}`}
                        className="text-[#00CFE8] hover:underline flex items-center gap-1 font-bold"
                      >
                        <span>View Run</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-white/[0.08] flex flex-col sm:flex-row items-center gap-3">
                  <button
                    onClick={() => handleLaunch(rec)}
                    disabled={launchingId !== null}
                    className="btn-cyan w-full sm:grow justify-center py-2.5 text-xs flex items-center gap-2 disabled:opacity-50"
                  >
                    <Play className={`w-3.5 h-3.5 fill-current ${launchingId === rec.id ? 'animate-pulse' : ''}`} />
                    <span>
                      {launchingId === rec.id
                        ? 'Synthesizing Tailored Drill...'
                        : 'Launch Recommended Exercise'}
                    </span>
                  </button>

                  <button
                    onClick={() => setSelectedDetailRec(rec)}
                    className="btn-secondary w-full sm:w-auto text-xs px-3.5 py-2.5 shrink-0 flex items-center justify-center gap-1.5"
                    title="Inspect forensic evaluation rationale and scenario parameters"
                  >
                    <Info className="w-3.5 h-3.5 text-[#00CFE8]" />
                    <span>Diagnostics</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Forensic Diagnostics & Scenario Configuration Modal */}
      {selectedDetailRec && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="glass-overlay max-w-2xl w-full p-6 space-y-5 border-white/[0.15] max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-[#7047C8]/15 border border-[#7047C8]/30">
                  <Radar className="w-5 h-5 text-[#00CFE8]" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#F4F5F7]">
                    Curriculum Diagnostic Details
                  </h3>
                  <span className="text-[10px] font-mono text-[#858B99]">
                    DEFICIT ID: {selectedDetailRec.gap_type}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setSelectedDetailRec(null)}
                className="p-1.5 rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs font-mono">
              {/* Target Skill & Priority */}
              <div className="flex items-center justify-between surface-structural p-3 rounded-lg border border-white/[0.08]">
                <div>
                  <span className="label-caps text-[#858B99] block">Target Skill Track</span>
                  <span className="text-[#F4F5F7] font-bold text-sm">{selectedDetailRec.target_skill}</span>
                </div>
                <span
                  className={`text-[10px] uppercase px-2.5 py-0.5 rounded font-bold border ${
                    selectedDetailRec.priority === 'HIGH'
                      ? 'bg-rose-500/10 text-rose-300 border-rose-500/30'
                      : selectedDetailRec.priority === 'MEDIUM'
                      ? 'bg-[#E9A23B]/10 text-[#E9A23B] border-[#E9A23B]/30'
                      : 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                  }`}
                >
                  {selectedDetailRec.priority} Priority
                </span>
              </div>

              {/* Observed Deficit Finding */}
              <div className="space-y-1 font-sans">
                <span className="label-caps text-[#858B99] block font-bold">
                  Observed Trainee Performance Evidence
                </span>
                <p className="text-xs text-[#F4F5F7] surface-structural p-3 rounded-lg border border-white/[0.08] leading-relaxed">
                  {selectedDetailRec.reason}
                </p>
              </div>

              {/* Target Learning Objective */}
              <div className="space-y-1 font-sans">
                <span className="label-caps text-[#00CFE8] block font-bold">
                  Target Tactical Competency
                </span>
                <p className="text-xs text-[#00CFE8] bg-[#00CFE8]/5 p-3 rounded-lg border border-[#00CFE8]/20 leading-relaxed">
                  {selectedDetailRec.learning_objective}
                </p>
              </div>

              {/* Detailed Scenario Config */}
              <div className="space-y-2">
                <span className="label-caps text-[#858B99] block font-bold">
                  Tailored Synthetic Scenario Parameters
                </span>
                <div className="p-3.5 rounded-lg bg-[#111318] border border-white/[0.08] space-y-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-[11px]">
                    <div>
                      <span className="text-[#858B99] block text-[10px]">Scenario Name</span>
                      <strong className="text-[#F4F5F7]">{selectedDetailRec.suggested_scenario_config?.name || 'Adaptive Drill'}</strong>
                    </div>
                    <div>
                      <span className="text-[#858B99] block text-[10px]">Difficulty</span>
                      <strong className="text-[#00CFE8] uppercase">{selectedDetailRec.recommended_difficulty}</strong>
                    </div>
                    <div>
                      <span className="text-[#858B99] block text-[10px]">Environment</span>
                      <strong className="text-[#F4F5F7] capitalize">{selectedDetailRec.suggested_scenario_config?.environment || 'urban'}</strong>
                    </div>
                    <div>
                      <span className="text-[#858B99] block text-[10px]">Synthetic Targets</span>
                      <strong className="text-[#F4F5F7] tabular-stat">{selectedDetailRec.suggested_scenario_config?.num_entities || 5} Drones</strong>
                    </div>
                    <div>
                      <span className="text-[#858B99] block text-[10px]">Observation Delay Mean</span>
                      <strong className="text-[#00CFE8] tabular-stat">{selectedDetailRec.suggested_scenario_config?.observation_delay_mean || 1.5}s</strong>
                    </div>
                    <div>
                      <span className="text-[#858B99] block text-[10px]">Packet Loss Rate</span>
                      <strong className="text-rose-400 tabular-stat">{Math.round((selectedDetailRec.suggested_scenario_config?.observation_loss_rate || 0.05) * 100)}%</strong>
                    </div>
                  </div>
                </div>
              </div>

              {/* Source Runs List */}
              {selectedDetailRec.source_runs && selectedDetailRec.source_runs.length > 0 && (
                <div className="space-y-1">
                  <span className="label-caps text-[#858B99] block font-bold">
                    Demonstrated in Source Simulation Runs ({selectedDetailRec.source_runs.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                    {selectedDetailRec.source_runs.map((sRunId) => (
                      <Link
                        key={sRunId}
                        to={`/review?run_id=${sRunId}`}
                        className="px-2 py-0.5 rounded bg-white/[0.04] hover:bg-[#7047C8]/20 border border-white/[0.08] text-[10px] text-[#00CFE8] transition-colors"
                        title="View After-Action Review for this run"
                      >
                        {sRunId.slice(0, 8)}...
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-white/[0.08] flex justify-end gap-3">
              <button
                onClick={() => setSelectedDetailRec(null)}
                className="btn-secondary text-xs px-4"
              >
                Close
              </button>

              <button
                onClick={() => {
                  const rec = selectedDetailRec;
                  setSelectedDetailRec(null);
                  handleLaunch(rec);
                }}
                disabled={launchingId !== null}
                className="btn-cyan text-xs px-4 flex items-center gap-1.5"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Launch This Drill</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
