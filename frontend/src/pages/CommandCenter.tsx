import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Radio,
  Activity,
  Layers,
  Award,
  Play,
  ArrowRight,
  PlusCircle,
  HelpCircle,
  Cpu,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  History
} from 'lucide-react';
import { api } from '../services/api';
import { OverviewStats, Scenario } from '../types';
import { GarudaEagleLogo } from '../components/GarudaEagleLogo';

export const CommandCenter: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingRun, setStartingRun] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [statsData, scenariosData] = await Promise.all([
        api.getOverviewStats(),
        api.getScenarios(),
      ]);
      setStats(statsData);
      setScenarios(scenariosData);
    } catch (err) {
      console.error('Failed to load overview data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStart = async (scenarioId: string) => {
    try {
      setStartingRun(true);
      const run = await api.createRun({
        scenario_id: scenarioId,
        trainee_id: 'Trainee-Alpha',
      });
      // Start the run clock
      await api.startRun(run.id);
      navigate(`/simulation?run_id=${run.id}`);
    } catch (err: any) {
      alert(`Error starting simulation: ${err.message}`);
    } finally {
      setStartingRun(false);
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-2xl bg-[#0D0B12]/85 backdrop-blur-xl border border-white/10 p-6 md:p-8 shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
        <div className="absolute right-0 top-0 w-96 h-96 bg-[#3B0A6B]/25 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-md text-xs font-mono font-bold bg-[#241039] text-[#00E5FF] border border-[#3B0A6B] shadow-[0_0_10px_rgba(59,10,107,0.3)]">
                SIH 2026 • SIH26247
              </span>
              <span className="text-xs text-[#AAA3B5] font-mono">Team: DareDevils</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#3B0A6B] to-[#241039] border border-[#00E5FF]/40 flex items-center justify-center shadow-[0_0_25px_rgba(0,229,255,0.25)] shrink-0">
                <GarudaEagleLogo className="w-9 h-9" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-extrabold text-[#F7F5FA] tracking-tight">
                  GARUDA Command Center
                </h1>
                <p className="text-xs font-mono text-[#00E5FF] mt-0.5">
                  AI-Enabled Drone & Counter-Drone Threat Simulation Trainer
                </p>
              </div>
            </div>
            <p className="text-[#AAA3B5] max-w-2xl text-sm leading-relaxed">
              Generative AI for Realistic Unmanned-threat Detection and Assessment. A mission-grade synthetic simulation trainer evaluating counter-drone decision-making under degraded, delayed, and incomplete sensor intelligence.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link
              to="/scenarios/builder"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#15121C] hover:bg-[#3B0A6B]/30 text-[#F7F5FA] font-semibold text-sm border border-white/10 hover:border-[#00E5FF]/40 transition-all shadow-md"
            >
              <PlusCircle className="w-4 h-4 text-[#00E5FF]" />
              Build Scenario
            </Link>
            <Link
              to="/scenarios"
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#00c8e0] text-[#050505] font-bold text-sm shadow-[0_0_20px_rgba(0,229,255,0.35)] transition-all"
            >
              <Play className="w-4 h-4 fill-current" />
              Scenario Library
            </Link>
          </div>
        </div>
      </div>

      {/* KPI Statistic Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-[#0D0B12]/80 backdrop-blur-md border border-white/10 shadow-md hover:border-[#00E5FF]/40 hover:shadow-[0_0_20px_rgba(0,229,255,0.12)] transition-all">
          <div className="flex items-center justify-between text-[#AAA3B5] text-xs font-mono mb-2">
            <span>TOTAL SCENARIOS</span>
            <Layers className="w-4 h-4 text-[#00E5FF]" />
          </div>
          <div className="text-3xl font-bold font-mono text-[#F7F5FA]">
            {loading ? '...' : stats?.total_scenarios ?? 0}
          </div>
          <p className="text-[11px] text-[#AAA3B5]/60 mt-1">Configured synthetic training drills</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D0B12]/80 backdrop-blur-md border border-white/10 shadow-md hover:border-[#00E5FF]/40 hover:shadow-[0_0_20px_rgba(0,229,255,0.12)] transition-all">
          <div className="flex items-center justify-between text-[#AAA3B5] text-xs font-mono mb-2">
            <span>COMPLETED MISSIONS</span>
            <Activity className="w-4 h-4 text-[#00E5FF]" />
          </div>
          <div className="text-3xl font-bold font-mono text-[#F7F5FA]">
            {loading ? '...' : stats?.completed_runs ?? 0}
          </div>
          <p className="text-[11px] text-[#AAA3B5]/60 mt-1">
            Out of {stats?.total_simulation_runs ?? 0} total simulations
          </p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D0B12]/80 backdrop-blur-md border border-white/10 shadow-md hover:border-[#00E5FF]/40 hover:shadow-[0_0_20px_rgba(0,229,255,0.12)] transition-all">
          <div className="flex items-center justify-between text-[#AAA3B5] text-xs font-mono mb-2">
            <span>AVERAGE SCORE</span>
            <Award className="w-4 h-4 text-[#00E5FF]" />
          </div>
          <div className="text-3xl font-bold font-mono text-[#F7F5FA]">
            {loading ? '...' : `${stats?.average_score ?? 0}%`}
          </div>
          <p className="text-[11px] text-[#AAA3B5]/60 mt-1">Evidence-aware weighted scoring</p>
        </div>

        <div className="p-5 rounded-2xl bg-[#0D0B12]/80 backdrop-blur-md border border-white/10 shadow-md hover:border-[#00E5FF]/40 hover:shadow-[0_0_20px_rgba(0,229,255,0.12)] transition-all">
          <div className="flex items-center justify-between text-[#AAA3B5] text-xs font-mono mb-2">
            <span>CORE INNOVATION</span>
            <Radio className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl font-bold font-mono text-emerald-400">
            EVIDENCE-AWARE
          </div>
          <p className="text-[11px] text-[#AAA3B5]/60 mt-1">Zero penalty for missing unobservable data</p>
        </div>
      </div>

      {/* Core Innovation Concept Callout */}
      <div className="p-6 rounded-2xl bg-[#0D0B12]/85 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-[#15121C] text-[#00E5FF] border border-[#00E5FF]/30 shadow-[0_0_12px_rgba(0,229,255,0.2)]">
            <Radio className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-[#F7F5FA]">
              The GARUDA Innovation: Evidence-Driven Adaptive Training Under Degraded Information
            </h3>
            <p className="text-xs text-[#AAA3B5]">
              Solving the fundamental flaw in conventional defense trainers: separating ground truth from trainee perception.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
          <div className="p-4 rounded-xl bg-[#15121C] border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-[#00E5FF] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF]" />
              1. SIMULATED GROUND TRUTH
            </div>
            <p className="text-[#AAA3B5] font-sans leading-relaxed">
              What physically happens inside the synthetic simulation: true trajectories, hostile drone loitering munition ingress, civilian survey flights, and wildlife clutter. Strictly isolated from the trainee interface.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#15121C] border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-[#00E5FF] font-bold">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF]" />
              2. DELIVERED OBSERVATIONS
            </div>
            <p className="text-[#AAA3B5] font-sans leading-relaxed">
              What the trainee actually receives: subject to transmission latency (delay jitter), RF jamming packet loss (missing observations), and Gaussian sensor noise. Trainees only see what their sensors successfully delivered.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#15121C] border border-white/10 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              3. EVIDENCE-AWARE AUDIT
            </div>
            <p className="text-[#AAA3B5] font-sans leading-relaxed">
              Fair evaluation: Trainees are never penalized for failing to detect a drone whose sensor telemetry was dropped or delayed. Trainees are rewarded for prudent verification ("Mark Uncertain" / "Request Sensor Ping") under degraded intelligence.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Launch Demonstration Scenarios */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-[#F7F5FA]">Demonstration Scenarios</h2>
            <p className="text-xs text-[#AAA3B5]">Launch standard SIH 2026 evaluation test scenarios</p>
          </div>
          <Link to="/scenarios" className="text-xs font-mono text-[#00E5FF] hover:underline flex items-center gap-1">
            View All Scenarios <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {scenarios.slice(0, 3).map((sc) => {
            const diffColor =
              sc.difficulty === 'Beginner'
                ? 'text-emerald-400 border-emerald-800 bg-emerald-950/60'
                : sc.difficulty === 'Intermediate'
                ? 'text-amber-400 border-amber-800 bg-amber-950/60'
                : 'text-rose-400 border-rose-800 bg-rose-950/60';

            return (
              <div
                key={sc.id}
                className="p-5 rounded-2xl bg-[#0D0B12]/80 backdrop-blur-md border border-white/10 hover:border-[#00E5FF]/40 transition-all flex flex-col justify-between space-y-4 shadow-lg group hover:shadow-[0_0_25px_rgba(0,229,255,0.12)]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${diffColor}`}>
                      {sc.difficulty}
                    </span>
                    <span className="text-[11px] font-mono text-[#AAA3B5] capitalize">
                      {sc.environment}
                    </span>
                  </div>

                  <h3 className="text-base font-bold text-[#F7F5FA] group-hover:text-[#00E5FF] transition-colors">
                    {sc.name}
                  </h3>

                  <p className="text-xs text-[#AAA3B5] line-clamp-2 leading-relaxed">
                    {sc.description}
                  </p>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-[#AAA3B5] pt-2 border-t border-white/10">
                    <div>Duration: <span className="text-[#F7F5FA]">{sc.duration_seconds}s</span></div>
                    <div>Entities: <span className="text-[#F7F5FA]">{sc.configuration?.num_entities ?? 5}</span></div>
                    <div>Loss Rate: <span className="text-[#F7F5FA]">{Math.round((sc.configuration?.observation_loss_rate ?? 0.1) * 100)}%</span></div>
                    <div>Mean Delay: <span className="text-[#F7F5FA]">{sc.configuration?.observation_delay_mean ?? 2.5}s</span></div>
                  </div>
                </div>

                <button
                  onClick={() => handleQuickStart(sc.id)}
                  disabled={startingRun}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#241039] hover:bg-[#3B0A6B] border border-[#3B0A6B] text-[#00E5FF] font-mono text-xs font-semibold transition-all shadow-md hover:border-[#00E5FF]/50 hover:shadow-[0_0_15px_rgba(59,10,107,0.4)]"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  {startingRun ? 'Initializing...' : 'Start Training Mission'}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Recent Simulation Runs Table */}
      <div className="p-6 rounded-2xl bg-[#0D0B12]/85 backdrop-blur-md border border-white/10 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-[#00E5FF]" />
            <h3 className="text-lg font-bold text-[#F7F5FA]">Recent Simulation Runs</h3>
          </div>
          <Link to="/reports" className="text-xs font-mono text-[#00E5FF] hover:underline">
            View Full Run History →
          </Link>
        </div>

        {stats?.recent_runs && stats.recent_runs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[#AAA3B5] border-b border-white/10 pb-2">
                <tr>
                  <th className="py-2.5">Run ID</th>
                  <th>Scenario</th>
                  <th>Status</th>
                  <th>Sim Time</th>
                  <th>Trainee Decisions</th>
                  <th>Score</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {stats.recent_runs.map((r) => (
                  <tr key={r.id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-3 text-[#00E5FF] font-bold">{r.id.slice(0, 8)}...</td>
                    <td className="text-[#F7F5FA]">{r.scenario_name}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'COMPLETED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                        r.status === 'RUNNING' ? 'bg-[#241039] text-[#00E5FF] border border-[#3B0A6B] animate-pulse' :
                        'bg-[#15121C] text-[#AAA3B5] border border-white/10'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="text-[#AAA3B5]">{r.current_sim_time}s / {r.duration_seconds}s</td>
                    <td className="text-[#AAA3B5]">{r.trainee_decisions_count}</td>
                    <td className="font-bold text-[#F7F5FA]">
                      {r.overall_score !== null && r.overall_score !== undefined ? `${r.overall_score}%` : 'Pending'}
                    </td>
                    <td>
                      <Link
                        to={`/simulation?run_id=${r.id}`}
                        className="px-2.5 py-1 rounded bg-[#15121C] hover:bg-[#3B0A6B]/30 text-[#00E5FF] border border-white/10 hover:border-[#00E5FF]/40 text-[11px] transition-all"
                      >
                        Open Workspace
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-8 text-[#AAA3B5]/60 font-mono text-xs">
            No simulation runs yet. Click "Start Training Mission" above to initialize your first session.
          </div>
        )}
      </div>
    </div>
  );
};

