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
  Clock
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
      const data = await api.getRecommendations(id);
      setRecommendations(data);
    } catch (err) {
      console.error('Failed to load recommendations', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLaunch = async (recId: string) => {
    try {
      setLaunchingId(recId);
      const newRun = await api.launchTraining(recId);
      // Start clock immediately
      await api.startRun(newRun.id);
      navigate(`/simulation?run_id=${newRun.id}`);
    } catch (err: any) {
      alert(`Error launching adaptive drill: ${err.message}`);
    } finally {
      setLaunchingId(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#F7F5FA] flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-[#00E5FF]" />
            Adaptive Training Recommendations
          </h1>
          <p className="text-[#AAA3B5] text-xs mt-1">
            Rule-based algorithmic curriculum proposing targeted drills tailored to trainee performance gaps.
          </p>
        </div>

        {/* Filter by Run */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#AAA3B5]">Filter by Run:</span>
          <select
            value={runId || ''}
            onChange={(e) => setSearchParams(e.target.value ? { run_id: e.target.value } : {})}
            className="px-3.5 py-2 bg-[#050505] border border-white/10 rounded-xl text-xs font-mono text-[#00E5FF] focus:outline-none focus:border-[#00E5FF] transition-all"
          >
            <option value="" className="bg-[#050505] text-[#F7F5FA]">All Completed Runs</option>
            {runs.map((r) => (
              <option key={r.id} value={r.id} className="bg-[#050505] text-[#F7F5FA]">
                {r.id.slice(0, 8)}... - {r.scenario_name || 'Seeded'}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Adaptive Logic Explanation Card */}
      <div className="p-6 rounded-2xl bg-[#0D0B12]/85 backdrop-blur-xl border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-3">
        <div className="flex items-center gap-2 text-[#00E5FF] font-mono text-xs font-bold uppercase tracking-wider">
          <Shield className="w-4 h-4" />
          Rule-Based Curriculum Progression Architecture
        </div>
        <p className="text-xs text-[#F7F5FA]/85 leading-relaxed max-w-3xl font-sans">
          GARUDA continuously analyzes decision logs against delivered evidence. If an operator demonstrates high false-alarm rates, missed micro-UAVs, response hesitation, or premature action under sensor blackout, the recommender dynamically constructs tailored synthetic parameters to close that specific operational vulnerability.
        </p>
      </div>

      {/* Recommendations Grid */}
      {loading ? (
        <div className="py-24 text-center text-[#AAA3B5] font-mono text-xs animate-pulse">
          Synthesizing adaptive recommendations...
        </div>
      ) : recommendations.length === 0 ? (
        <div className="p-12 text-center bg-[#0D0B12]/80 backdrop-blur-md rounded-2xl border border-white/10 space-y-3">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
          <h3 className="text-base font-bold text-[#F7F5FA] font-mono">No Active Performance Deficits</h3>
          <p className="text-xs text-[#AAA3B5] max-w-md mx-auto">
            Complete a simulation mission in the Simulation Workspace to trigger automatic performance diagnosis and receive personalized drills.
          </p>
          <Link
            to="/simulation"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#15121C] text-[#00E5FF] border border-white/10 hover:border-[#00E5FF]/40 text-xs font-mono font-bold mt-2 transition-all shadow-[0_0_15px_rgba(0,229,255,0.15)]"
          >
            Open Simulation Workspace →
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {recommendations.map((rec) => {
            const prioColor =
              rec.priority === 'HIGH'
                ? 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                : rec.priority === 'MEDIUM'
                ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                : 'bg-[#241039] text-[#00E5FF] border border-[#3B0A6B]';

            return (
              <div
                key={rec.id}
                className="p-6 rounded-2xl bg-[#0D0B12]/80 backdrop-blur-md border border-white/10 hover:border-[#00E5FF]/40 transition-all flex flex-col justify-between space-y-4 shadow-[0_4px_30px_rgba(0,0,0,0.6)]"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${prioColor}`}>
                      {rec.priority} PRIORITY DEFICIT
                    </span>

                    <span className="text-xs font-mono text-[#AAA3B5]">
                      Target Level: <strong className="text-[#00E5FF] uppercase">{rec.recommended_difficulty}</strong>
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-[#F7F5FA] font-mono">{rec.target_skill}</h3>
                    <p className="text-xs text-[#AAA3B5] font-sans mt-1 leading-relaxed">{rec.reason}</p>
                  </div>

                  {/* Objective & Config Attributes */}
                  <div className="p-3.5 rounded-xl bg-[#15121C] border border-white/10 space-y-2 text-xs font-mono">
                    <div className="text-[11px] text-[#00E5FF] font-bold uppercase tracking-wider">
                      Learning Objective:
                    </div>
                    <p className="text-[#F7F5FA]/80 font-sans leading-relaxed text-xs">
                      {rec.learning_objective}
                    </p>

                    <div className="pt-2 border-t border-white/10 flex justify-between text-[11px] text-[#AAA3B5]">
                      <span>Entities: <strong className="text-[#F7F5FA]">{rec.suggested_scenario_config.num_entities || 5}</strong></span>
                      <span>Delay: <strong className="text-[#00E5FF]">{rec.suggested_scenario_config.observation_delay_mean || 2.0}s</strong></span>
                      <span>Loss Rate: <strong className="text-[#00E5FF]">{Math.round((rec.suggested_scenario_config.observation_loss_rate || 0.1) * 100)}%</strong></span>
                    </div>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    onClick={() => handleLaunch(rec.id)}
                    disabled={launchingId !== null}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#00E5FF] hover:bg-[#00c8e0] text-[#050505] font-mono text-xs font-bold transition-all shadow-[0_0_20px_rgba(0,229,255,0.35)] disabled:opacity-50"
                  >
                    <Play className="w-4 h-4 fill-current" />
                    {launchingId === rec.id ? 'Generating Tailored Drill...' : 'Launch Recommended Exercise'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
