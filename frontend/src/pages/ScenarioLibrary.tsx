import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Layers,
  Search,
  Filter,
  Play,
  Copy,
  Edit3,
  Sliders,
  PlusCircle,
  Wind,
  Clock,
  Radio,
  CheckCircle2,
  Cpu
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

  useEffect(() => {
    loadScenarios();
  }, [difficulty, environment]);

  const loadScenarios = async () => {
    try {
      setLoading(true);
      const data = await api.getScenarios({
        difficulty: difficulty || undefined,
        environment: environment || undefined,
        search: search || undefined,
      });
      setScenarios(data);
    } catch (err) {
      console.error('Failed to load scenarios', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadScenarios();
  };

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
      alert(`Error starting simulation: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDuplicate = async (scenarioId: string) => {
    try {
      setActionLoading(`dup-${scenarioId}`);
      await api.duplicateScenario(scenarioId);
      await loadScenarios();
    } catch (err: any) {
      alert(`Error duplicating scenario: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#F7F5FA] flex items-center gap-3">
            <Layers className="w-7 h-7 text-[#00E5FF]" />
            Scenario Library
          </h1>
          <p className="text-[#AAA3B5] text-xs mt-1">
            Browse, configure, duplicate, and launch synthetic drone-threat training environments.
          </p>
        </div>

        <Link
          to="/scenarios/builder"
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#00c8e0] text-[#050505] font-bold text-sm shadow-[0_0_20px_rgba(0,229,255,0.35)] transition-all"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Scenario
        </Link>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-[#0D0B12]/80 backdrop-blur-md border border-white/10 flex flex-col md:flex-row gap-4 justify-between items-center shadow-lg">
        <form onSubmit={handleSearchSubmit} className="relative w-full md:w-96">
          <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#AAA3B5]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search scenarios by title or threat type..."
            className="w-full pl-10 pr-4 py-2 bg-[#050505] border border-white/10 rounded-xl text-xs text-[#F7F5FA] placeholder-[#AAA3B5]/50 focus:outline-none focus:border-[#00E5FF]"
          />
        </form>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 text-xs font-mono text-[#AAA3B5]">
            <Filter className="w-3.5 h-3.5 text-[#00E5FF]" />
            <span>Difficulty:</span>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="bg-[#050505] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-[#F7F5FA] focus:outline-none focus:border-[#00E5FF]"
            >
              <option value="">All Difficulties</option>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
            </select>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-[#AAA3B5]">
            <span>Environment:</span>
            <select
              value={environment}
              onChange={(e) => setEnvironment(e.target.value)}
              className="bg-[#050505] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-[#F7F5FA] focus:outline-none focus:border-[#00E5FF]"
            >
              <option value="">All Environments</option>
              <option value="urban">Urban</option>
              <option value="coastal">Coastal</option>
              <option value="border">Border</option>
              <option value="rural">Rural</option>
            </select>
          </div>
        </div>
      </div>

      {/* Scenario Grid */}
      {loading ? (
        <div className="py-16 text-center text-[#AAA3B5] font-mono text-sm animate-pulse">
          Loading scenario library from GARUDA database...
        </div>
      ) : scenarios.length === 0 ? (
        <div className="py-16 text-center space-y-3 bg-[#0D0B12]/80 backdrop-blur-md rounded-2xl border border-white/10">
          <p className="text-[#AAA3B5] font-mono text-sm">No scenarios match your search filters.</p>
          <button
            onClick={() => { setSearch(''); setDifficulty(''); setEnvironment(''); }}
            className="px-4 py-2 rounded-xl bg-[#15121C] text-[#00E5FF] text-xs font-mono border border-white/10"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {scenarios.map((sc) => {
            const diffColor =
              sc.difficulty === 'Beginner'
                ? 'text-emerald-400 border-emerald-800 bg-emerald-950/60'
                : sc.difficulty === 'Intermediate'
                ? 'text-amber-400 border-amber-800 bg-amber-950/60'
                : 'text-rose-400 border-rose-800 bg-rose-950/60';

            return (
              <div
                key={sc.id}
                className="p-5 rounded-2xl bg-[#0D0B12]/80 backdrop-blur-md border border-white/10 hover:border-[#00E5FF]/40 transition-all flex flex-col justify-between space-y-4 shadow-lg group relative hover:shadow-[0_0_25px_rgba(0,229,255,0.12)]"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold border ${diffColor}`}>
                      {sc.difficulty}
                    </span>

                    <div className="flex items-center gap-2">
                      {sc.is_preset === 1 && (
                        <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold bg-[#241039] text-[#00E5FF] border border-[#3B0A6B]">
                          SEEDED PRESET
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-[#AAA3B5] capitalize">
                        {sc.environment}
                      </span>
                    </div>
                  </div>

                  <h3 className="text-lg font-bold text-[#F7F5FA] group-hover:text-[#00E5FF] transition-colors">
                    {sc.name}
                  </h3>

                  <p className="text-xs text-[#AAA3B5] leading-relaxed min-h-[40px]">
                    {sc.description || 'Configured deterministic synthetic training exercise.'}
                  </p>

                  {/* Telemetry and Degradation Attributes */}
                  <div className="p-3 rounded-xl bg-[#15121C] border border-white/10 space-y-2 text-xs font-mono">
                    <div className="flex justify-between text-[#AAA3B5]">
                      <span className="flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-[#00E5FF]" /> Duration
                      </span>
                      <span className="text-[#F7F5FA]">{sc.duration_seconds}s</span>
                    </div>

                    <div className="flex justify-between text-[#AAA3B5]">
                      <span className="flex items-center gap-1.5">
                        <Cpu className="w-3.5 h-3.5 text-[#00E5FF]" /> Drone Entities
                      </span>
                      <span className="text-[#F7F5FA]">{sc.configuration?.num_entities ?? 5}</span>
                    </div>

                    <div className="flex justify-between text-[#AAA3B5]">
                      <span className="flex items-center gap-1.5">
                        <Radio className="w-3.5 h-3.5 text-amber-400" /> Packet Loss Rate
                      </span>
                      <span className="text-[#F7F5FA]">{Math.round((sc.configuration?.observation_loss_rate ?? 0.15) * 100)}%</span>
                    </div>

                    <div className="flex justify-between text-[#AAA3B5]">
                      <span className="flex items-center gap-1.5">
                        <Wind className="w-3.5 h-3.5 text-emerald-400" /> Atmospheric Preset
                      </span>
                      <span className="text-[#F7F5FA]">{sc.configuration?.weather ?? 'Clear Day'}</span>
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                  <button
                    onClick={() => handleStartSimulation(sc.id)}
                    disabled={actionLoading !== null}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#241039] hover:bg-[#3B0A6B] border border-[#3B0A6B] text-[#00E5FF] font-mono text-xs font-semibold transition-all shadow-md hover:border-[#00E5FF]/50 hover:shadow-[0_0_15px_rgba(59,10,107,0.4)]"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    {actionLoading === `start-${sc.id}` ? 'Starting...' : 'Start Run'}
                  </button>

                  <button
                    onClick={() => handleDuplicate(sc.id)}
                    disabled={actionLoading !== null}
                    title="Duplicate Scenario"
                    className="p-2.5 rounded-xl bg-[#15121C] hover:bg-white/10 text-[#AAA3B5] hover:text-[#F7F5FA] transition-colors border border-white/10"
                  >
                    <Copy className="w-4 h-4" />
                  </button>

                  <Link
                    to={`/scenarios/builder?scenario_id=${sc.id}`}
                    title="Edit / Inspect Configuration"
                    className="p-2.5 rounded-xl bg-[#15121C] hover:bg-white/10 text-[#AAA3B5] hover:text-[#F7F5FA] transition-colors border border-white/10"
                  >
                    <Sliders className="w-4 h-4" />
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

