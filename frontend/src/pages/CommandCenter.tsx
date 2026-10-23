import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Radio,
  Activity,
  Layers,
  Award,
  Play,
  ArrowRight,
  Sliders,
  History,
  Shield,
  Eye,
  Radar,
  FileCheck,
  ChevronRight,
  Crosshair,
  WifiOff,
  Zap,
  Target,
  AlertTriangle,
  Lock,
  Compass
} from 'lucide-react';
import { api } from '../services/api';
import { OverviewStats, Scenario } from '../types';
import { GarudaEagleLogo } from '../components/GarudaEagleLogo';

export const CommandCenter: React.FC = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState<OverviewStats | null>(null);
  const [scenarios, setScenarios] = useState<Scenario[]>([]);
  const [loading, setLoading] = useState(true);
  const [startingRunId, setStartingRunId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [statsData, scenariosData] = await Promise.all([
        api.getOverviewStats(),
        api.getScenarios(),
      ]);
      setStats(statsData);
      setScenarios(scenariosData);
    } catch (err: any) {
      console.error('Failed to load overview data', err);
      setErrorMsg('Unable to synchronize telemetry metrics with backend services.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickStart = async (scenarioId: string) => {
    try {
      setStartingRunId(scenarioId);
      const run = await api.createRun({
        scenario_id: scenarioId,
        trainee_id: 'Trainee-Alpha',
      });
      await api.startRun(run.id);
      navigate(`/simulation?run_id=${run.id}`);
    } catch (err: any) {
      alert(`Error initializing simulation mission: ${err.message}`);
    } finally {
      setStartingRunId(null);
    }
  };

  const getScenarioCompletionCount = (scenarioId: string, scenarioName: string): number => {
    if (!stats?.recent_runs) return 0;
    return stats.recent_runs.filter(
      (r) =>
        (r.scenario_id === scenarioId || r.scenario_name === scenarioName) &&
        r.status === 'COMPLETED'
    ).length;
  };

  // Primary scenario for instant scramble
  const primaryScenario = scenarios.length > 0 ? scenarios[0] : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 transition-colors duration-200">
      {/* Error Banner if API Fails */}
      {errorMsg && (
        <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 dark:bg-rose-950/60 dark:border-rose-500/40 flex items-center justify-between text-xs font-mono text-rose-700 dark:text-rose-300 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 dark:text-rose-400" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={loadData} className="underline hover:text-slate-900 dark:hover:text-white font-bold">
            Retry Sync
          </button>
        </div>
      )}

      {/* =========================================================================
         SECTION 1: TACTICAL C2 HERO & LIVE AIRSPACE RADAR SCOPE
         ========================================================================= */}
      <div className="relative overflow-hidden rounded-xl bg-white dark:bg-[#0F1117] border border-slate-200 dark:border-white/[0.14] shadow-md dark:shadow-[0_8px_32px_rgba(0,0,0,0.8)] bracket-card">
        {/* Subtle Ambient Radial Backlight */}
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-sky-200/40 dark:bg-[#00CFE8]/12 blur-[100px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-violet-200/40 dark:bg-[#7047C8]/18 blur-[100px] pointer-events-none" />

        <div className="relative z-10 p-5 sm:p-7 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Left Column: Mission Control Briefing */}
          <div className="lg:col-span-7 space-y-4">
            {/* Sector Metadata Tags */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono font-bold bg-sky-100 dark:bg-[#7047C8]/30 text-[#0284C7] dark:text-[#00CFE8] border border-sky-200 dark:border-[#00CFE8]/40 shadow-sm flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7] dark:bg-[#00CFE8] animate-ping" />
                TACTICAL C2 // ADIZ SECTOR 04
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-700 dark:text-[#F4F5F7] bg-slate-100 dark:bg-white/[0.06] border border-slate-200 dark:border-white/[0.12] hidden sm:inline-flex items-center gap-1">
                <Compass className="w-3 h-3 text-[#0284C7] dark:text-[#00CFE8]" /> 28°36'12"N 77°12'19"E | ELEV 214M
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30">
                EVIDENCE QUARANTINE: LOCKED
              </span>
            </div>

            {/* Title & Identity */}
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-[#08090B] border border-slate-200 dark:border-white/[0.18] shadow-sm shrink-0 mt-1">
                <GarudaEagleLogo className="w-10 h-10 text-slate-800 dark:text-[#F4F5F7] transition-transform duration-200 hover:scale-105" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-[#F4F5F7] tracking-tight font-mono uppercase">
                  GARUDA Command Center
                </h1>
                <p className="text-xs sm:text-sm font-mono text-[#0284C7] dark:text-[#00CFE8] font-semibold mt-0.5 flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5" />
                  Autonomous Counter-UAS C2 Simulation & Evidence-Aware Platform
                </p>
              </div>
            </div>

            {/* Platform Operational Directive */}
            <p className="text-slate-600 dark:text-[#B3B7C2] text-xs sm:text-[13px] leading-relaxed font-sans max-w-2xl">
              High-fidelity synthetic airspace simulator evaluating counter-drone operational decision-making under severe RF jamming, multi-axis drone swarm ingress, and asymmetric sensor degradation with mathematical evidence-isolation.
            </p>

            {/* Live Tactical Threat Matrix Pills */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[10.5px]">
              <div className="p-2 rounded bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
                <div className="text-slate-500 dark:text-[#858B99] text-[9.5px]">AIR THREATS</div>
                <div className="text-rose-600 dark:text-rose-400 font-bold flex items-center gap-1 mt-0.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  3 HOSTILE INGRESS
                </div>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
                <div className="text-slate-500 dark:text-[#858B99] text-[9.5px]">RF ENVIRONMENT</div>
                <div className="text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                  <WifiOff className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                  35% EW JAMMING
                </div>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
                <div className="text-slate-500 dark:text-[#858B99] text-[9.5px]">SENSOR LATENCY</div>
                <div className="text-[#0284C7] dark:text-[#00CFE8] font-bold mt-0.5">
                  2.5s JITTER INJECTED
                </div>
              </div>
              <div className="p-2 rounded bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.08]">
                <div className="text-slate-500 dark:text-[#858B99] text-[9.5px]">AUDIT INTEGRITY</div>
                <div className="text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                  <Lock className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                  ZERO FALSE PENALTY
                </div>
              </div>
            </div>

            {/* Tactical Action Controls */}
            <div className="flex flex-wrap items-center gap-3 pt-2">
              {primaryScenario ? (
                <button
                  onClick={() => handleQuickStart(primaryScenario.id)}
                  disabled={startingRunId !== null}
                  className="btn-cyan flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold font-mono tracking-wider shadow-sm dark:shadow-[0_0_20px_rgba(0,207,232,0.4)] cursor-pointer"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>{startingRunId ? 'INITIALIZING SORTIE...' : 'SCRAMBLE INTERCEPT SIMULATION'}</span>
                </button>
              ) : (
                <Link
                  to="/scenarios"
                  className="btn-primary flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold font-mono"
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>LAUNCH TRAINING MISSION</span>
                </Link>
              )}

              <Link
                to="/scenarios"
                className="btn-secondary flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold font-mono hover:border-[#0284C7]/50 dark:hover:border-[#00CFE8]/50"
              >
                <Layers className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#00CFE8]" />
                Scenario Library
              </Link>

              <Link
                to="/scenarios/builder"
                className="btn-secondary flex items-center justify-center gap-2 px-4 py-2.5 text-xs font-semibold font-mono hover:border-[#0284C7]/50 dark:hover:border-[#00CFE8]/50"
              >
                <Sliders className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#00CFE8]" />
                Custom Threat Builder
              </Link>
            </div>
          </div>

          {/* Right Column: Live Interactive Airspace Tactical Radar Scope HUD */}
          <div className="lg:col-span-5 flex justify-center">
            <div className="relative w-72 h-72 sm:w-80 sm:h-80 rounded-full bg-[#0B1120] dark:bg-[#08090B] border-2 border-[#0284C7]/60 dark:border-[#00CFE8]/40 shadow-lg dark:shadow-[0_0_35px_rgba(0,207,232,0.25)] flex items-center justify-center overflow-hidden bracket-card-4c select-none">
              {/* Concentric Range Rings */}
              <div className="absolute inset-4 rounded-full border border-[#00CFE8]/20 pointer-events-none" />
              <div className="absolute inset-12 rounded-full border border-[#00CFE8]/25 border-dashed pointer-events-none" />
              <div className="absolute inset-20 rounded-full border border-[#00CFE8]/30 pointer-events-none" />
              <div className="absolute inset-28 rounded-full border border-[#00CFE8]/35 pointer-events-none" />

              {/* Crosshairs & Azimuth Axes */}
              <div className="absolute w-full h-px bg-[#00CFE8]/30 pointer-events-none" />
              <div className="absolute h-full w-px bg-[#00CFE8]/30 pointer-events-none" />
              <div className="absolute w-full h-px bg-[#00CFE8]/15 rotate-45 pointer-events-none" />
              <div className="absolute w-full h-px bg-[#00CFE8]/15 -rotate-45 pointer-events-none" />

              {/* Range Ring Distance Labels */}
              <span className="absolute top-2 text-[8px] font-mono text-[#00CFE8]/80 font-bold">000° N</span>
              <span className="absolute bottom-2 text-[8px] font-mono text-[#00CFE8]/80 font-bold">180° S</span>
              <span className="absolute right-2 text-[8px] font-mono text-[#00CFE8]/80 font-bold">090° E</span>
              <span className="absolute left-2 text-[8px] font-mono text-[#00CFE8]/80 font-bold">270° W</span>
              <span className="absolute top-14 text-[7px] font-mono text-slate-400 dark:text-[#858B99]">1500M</span>
              <span className="absolute top-22 text-[7px] font-mono text-slate-400 dark:text-[#858B99]">1000M</span>
              <span className="absolute top-30 text-[7px] font-mono text-slate-400 dark:text-[#858B99]">500M</span>

              {/* 360° Rotating Radar Sweep Line */}
              <div className="absolute inset-0 pointer-events-none radar-sweep-beam">
                <div
                  className="w-1/2 h-full absolute right-0"
                  style={{
                    background: 'conic-gradient(from 0deg at 0% 50%, rgba(0, 207, 232, 0.45) 0deg, rgba(0, 207, 232, 0.05) 45deg, transparent 90deg)',
                  }}
                />
                <div className="w-1/2 h-0.5 bg-[#00CFE8] absolute right-0 top-1/2 shadow-[0_0_10px_#00CFE8]" />
              </div>

              {/* Center Origin Dot */}
              <div className="absolute w-3 h-3 rounded-full bg-[#00CFE8] border-2 border-[#0B1120] dark:border-[#08090B] shadow-[0_0_10px_#00CFE8] z-10 flex items-center justify-center">
                <div className="w-1 h-1 rounded-full bg-white" />
              </div>

              {/* Target 01: Hostile FPV Loitering Munition */}
              <div className="absolute top-16 right-20 z-10 flex items-center gap-1.5 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 border border-white shadow-[0_0_10px_#EF4444]" />
                <div className="bg-[#0B1120]/90 dark:bg-[#08090B]/90 border border-rose-500/60 rounded px-1.5 py-0.5 text-[8px] font-mono text-rose-300 font-bold whitespace-nowrap shadow-md">
                  TGT-01 // KAMIKAZE [32m/s]
                </div>
              </div>

              {/* Target 02: Hostile Quadcopter Ingress */}
              <div className="absolute bottom-18 right-16 z-10 flex items-center gap-1.5 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rose-500 border border-white shadow-[0_0_8px_#EF4444]" />
                <div className="bg-[#0B1120]/90 dark:bg-[#08090B]/90 border border-rose-500/60 rounded px-1.5 py-0.5 text-[8px] font-mono text-rose-300 font-bold whitespace-nowrap shadow-md">
                  TGT-02 // QUAD-INGRESS
                </div>
              </div>

              {/* Target 03: EW Jammer Platform */}
              <div className="absolute top-24 left-14 z-10 flex items-center gap-1.5 animate-pulse">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 border border-white shadow-[0_0_10px_#F59E0B]" />
                <div className="bg-[#0B1120]/90 dark:bg-[#08090B]/90 border border-amber-500/60 rounded px-1.5 py-0.5 text-[8px] font-mono text-amber-300 font-bold whitespace-nowrap shadow-md">
                  TGT-03 // EW-JAMMER [35%]
                </div>
              </div>

              {/* Friendly Interceptor Drone */}
              <div className="absolute bottom-20 left-22 z-10 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 border border-white shadow-[0_0_8px_#10B981]" />
                <div className="bg-[#0B1120]/90 dark:bg-[#08090B]/90 border border-emerald-500/60 rounded px-1.5 py-0.5 text-[8px] font-mono text-emerald-300 font-bold whitespace-nowrap shadow-md">
                  PATROL-01 // FRIENDLY
                </div>
              </div>

              {/* Scope Status HUD Overlay Bottom */}
              <div className="absolute bottom-3 text-center pointer-events-none">
                <div className="text-[8.5px] font-mono text-[#00CFE8] font-bold tracking-widest bg-[#0B1120]/90 dark:bg-[#08090B]/90 px-2 py-0.5 rounded border border-[#00CFE8]/30">
                  X-BAND 9.4 GHz // ACTIVE TWS
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
         SECTION 2: AEROSPACE TELEMETRY GAUGES (INSTRUMENT CLUSTERS)
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Instrument 1: Scenario Configuration Matrix */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#111318]/90 border border-slate-200 dark:border-white/[0.14] hover:border-[#0284C7]/60 dark:hover:border-[#00CFE8]/60 transition-all duration-200 flex flex-col justify-between shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] bracket-card">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold tracking-wider text-[#0284C7] dark:text-[#00CFE8] uppercase">
                SCENARIO MATRIX
              </span>
              <Layers className="w-4 h-4 text-[#0284C7] dark:text-[#00CFE8]" />
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono tabular-stat text-slate-900 dark:text-[#F4F5F7] tracking-tight">
              {loading ? (
                <span className="inline-block w-14 h-8 rounded bg-slate-200 dark:bg-white/[0.08] animate-pulse" />
              ) : (
                stats?.total_scenarios ?? 0
              )}
            </div>
            {/* Segmented Threat Distribution Meter */}
            <div className="mt-3 space-y-1">
              <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-slate-100 dark:bg-white/[0.08]">
                <div className="bg-rose-500 w-[45%]" title="45% Swarm Ingress" />
                <div className="bg-amber-400 w-[30%]" title="30% EW Jamming" />
                <div className="bg-[#0284C7] dark:bg-[#00CFE8] w-[25%]" title="25% Reconnaissance" />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-500 dark:text-[#858B99]">
                <span>Swarm: 45%</span>
                <span>EW: 30%</span>
                <span>Recon: 25%</span>
              </div>
            </div>
          </div>
          <p className="text-[10.5px] text-slate-500 dark:text-[#858B99] mt-3 font-mono flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#0284C7] dark:bg-[#00CFE8]" />
            Deterministic Synthetic Tactical Drills
          </p>
        </div>

        {/* Instrument 2: Operational Sorties Completed */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#111318]/90 border border-slate-200 dark:border-white/[0.14] hover:border-[#0284C7]/60 dark:hover:border-[#00CFE8]/60 transition-all duration-200 flex flex-col justify-between shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] bracket-card">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold tracking-wider text-[#0284C7] dark:text-[#00CFE8] uppercase">
                SORTIES EXECUTED
              </span>
              <Activity className="w-4 h-4 text-[#0284C7] dark:text-[#00CFE8]" />
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono tabular-stat text-slate-900 dark:text-[#F4F5F7] tracking-tight">
              {loading ? (
                <span className="inline-block w-14 h-8 rounded bg-slate-200 dark:bg-white/[0.08] animate-pulse" />
              ) : (
                stats?.completed_runs ?? 0
              )}
            </div>
            <div className="mt-3 space-y-1">
              <div className="w-full bg-slate-100 dark:bg-white/[0.08] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-emerald-500 dark:bg-emerald-400 h-full rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      stats?.total_simulation_runs
                        ? Math.min(100, Math.round((stats.completed_runs / stats.total_simulation_runs) * 100))
                        : 85
                    }%`,
                  }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-500 dark:text-[#858B99]">
                <span>Total Runs: {stats?.total_simulation_runs ?? 0}</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">Readiness: 94.2%</span>
              </div>
            </div>
          </div>
          <p className="text-[10.5px] text-slate-500 dark:text-[#858B99] mt-3 font-mono flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            Audited Against Ground-Truth Kinematics
          </p>
        </div>

        {/* Instrument 3: Evidence-Aware Composite Score */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#111318]/90 border border-slate-200 dark:border-white/[0.14] hover:border-[#0284C7]/60 dark:hover:border-[#00CFE8]/60 transition-all duration-200 flex flex-col justify-between shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] bracket-card">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold tracking-wider text-[#0284C7] dark:text-[#00CFE8] uppercase">
                COMPOSITE SCORE
              </span>
              <Award className="w-4 h-4 text-[#0284C7] dark:text-[#00CFE8]" />
            </div>
            <div className="text-3xl sm:text-4xl font-black font-mono tabular-stat text-slate-900 dark:text-[#F4F5F7] tracking-tight">
              {loading ? (
                <span className="inline-block w-16 h-8 rounded bg-slate-200 dark:bg-white/[0.08] animate-pulse" />
              ) : (
                `${stats?.average_score ?? 0}%`
              )}
            </div>
            <div className="mt-3 space-y-1">
              <div className="w-full bg-slate-100 dark:bg-white/[0.08] h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-violet-600 dark:bg-[#7047C8] h-full rounded-full"
                  style={{ width: `${Math.min(100, stats?.average_score ?? 35)}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] font-mono text-slate-500 dark:text-[#858B99]">
                <span>Threshold: &gt;70%</span>
                <span className="text-[#0284C7] dark:text-[#00CFE8] font-bold">Fairness Wt: 1.00</span>
              </div>
            </div>
          </div>
          <p className="text-[10.5px] text-slate-500 dark:text-[#858B99] mt-3 font-mono flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-600 dark:bg-[#7047C8]" />
            Adjusted for Jamming & Packet Loss
          </p>
        </div>

        {/* Instrument 4: Cryptographic Protected Audit */}
        <div className="p-5 rounded-xl bg-white dark:bg-[#111318]/90 border border-slate-200 dark:border-white/[0.14] hover:border-emerald-500/60 transition-all duration-200 flex flex-col justify-between shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] bracket-card">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
                INTEGRITY ENGINE
              </span>
              <Shield className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <div className="text-xl sm:text-2xl font-black font-mono text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5 mt-1 tracking-wide">
              <span>PROTECTED AUDIT</span>
            </div>
            <div className="mt-3 space-y-1">
              <div className="p-1.5 rounded bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-500/30 text-[9px] font-mono text-emerald-700 dark:text-emerald-300 flex items-center justify-between font-semibold">
                <span>SHA-256 HASH VERIFIED</span>
                <span className="font-bold">ACTIVE</span>
              </div>
            </div>
          </div>
          <p className="text-[10.5px] text-slate-500 dark:text-[#858B99] mt-3 font-mono flex items-center gap-1.5 pt-2 border-t border-slate-100 dark:border-white/[0.06]">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400" />
            Zero Penalty for Unobservable Targets
          </p>
        </div>
      </div>

      {/* =========================================================================
         SECTION 3: THREE-STAGE TACTICAL EVIDENCE SEPARATION PIPELINE
         ========================================================================= */}
      <div className="p-5 md:p-6 rounded-xl bg-white dark:bg-[#0F1117] border border-slate-200 dark:border-white/[0.14] shadow-sm dark:shadow-[0_4px_24px_rgba(0,0,0,0.6)] space-y-5 bracket-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 dark:border-white/[0.10] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-sky-100 dark:bg-[#7047C8]/25 text-[#0284C7] dark:text-[#00CFE8] border border-sky-200 dark:border-white/[0.14] shrink-0">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-[#F4F5F7] font-mono uppercase tracking-wide">
                Tactical Evidence Isolation & Signal Pipeline
              </h2>
              <p className="text-xs text-slate-600 dark:text-[#858B99] mt-0.5">
                Strict mathematical decoupling of physical 3D ground truth from delivered trainee perception under asymmetric warfare.
              </p>
            </div>
          </div>
          <span className="text-[10px] font-mono text-[#0284C7] dark:text-[#00CFE8] px-3 py-1 rounded-full bg-sky-50 dark:bg-[#7047C8]/20 border border-sky-200 dark:border-[#00CFE8]/30 shrink-0 self-start sm:self-auto font-bold tracking-widest">
            CORE MATHEMATICAL AXIOM
          </span>
        </div>

        {/* 3-Stage Process Diagram with Data Flow Connectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono relative">
          {/* Stage 1: Physical Ground Truth */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-white/[0.12] space-y-3 relative flex flex-col justify-between hover:border-[#0284C7]/40 dark:hover:border-[#00CFE8]/40 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#0284C7] dark:text-[#00CFE8] bg-sky-100 dark:bg-white/[0.05] px-2 py-0.5 rounded border border-sky-200 dark:border-white/[0.10]">
                  STAGE 01 // KERNEL
                </span>
                <span className="text-[9.5px] text-slate-500 dark:text-[#858B99] uppercase">Physical Reality</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-[#F4F5F7] text-sm flex items-center gap-2">
                <Eye className="w-4 h-4 text-[#0284C7] dark:text-[#00CFE8]" />
                Authoritative Ground Truth
              </h3>
              <p className="text-slate-600 dark:text-[#B3B7C2] font-sans leading-relaxed text-xs">
                True 6-DoF kinematics, hostile swarm ingress vectors, loitering munition trajectories, and ambient clutter physically computed in memory.
              </p>
            </div>
            <div className="pt-2.5 border-t border-slate-200 dark:border-white/[0.08] text-[10px] text-emerald-600 dark:text-emerald-400 font-mono font-semibold flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              100% Memory-Quarantined from Trainee
            </div>
          </div>

          {/* Stage 2: EW & Sensor Degradation */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-white/[0.12] space-y-3 relative flex flex-col justify-between hover:border-amber-500/40 dark:hover:border-amber-400/40 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-white/[0.05] px-2 py-0.5 rounded border border-amber-200 dark:border-white/[0.10]">
                  STAGE 02 // SENSOR BUS
                </span>
                <span className="text-[9.5px] text-slate-500 dark:text-[#858B99] uppercase">RF Degradation</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-[#F4F5F7] text-sm flex items-center gap-2">
                <Radar className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                Delivered Observations
              </h3>
              <p className="text-slate-600 dark:text-[#B3B7C2] font-sans leading-relaxed text-xs">
                Observation stream corrupted by electronic jamming: 10–30% packet loss, 2–5s network transmission jitter, and noisy radar sensor coordinates.
              </p>
            </div>
            <div className="pt-2.5 border-t border-slate-200 dark:border-white/[0.08] text-[10px] text-amber-600 dark:text-amber-300 font-mono font-semibold flex items-center gap-1.5">
              <Zap className="w-3 h-3" />
              Trainee acts strictly on delivered data
            </div>
          </div>

          {/* Stage 3: Evidence-Aware Audit */}
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-[#141720] border border-slate-200 dark:border-white/[0.12] space-y-3 relative flex flex-col justify-between hover:border-emerald-500/40 dark:hover:border-emerald-400/40 transition-colors">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-white/[0.05] px-2 py-0.5 rounded border border-emerald-200 dark:border-white/[0.10]">
                  STAGE 03 // AUDIT
                </span>
                <span className="text-[9.5px] text-slate-500 dark:text-[#858B99] uppercase">Mathematical Fairness</span>
              </div>
              <h3 className="font-bold text-slate-900 dark:text-[#F4F5F7] text-sm flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
                Evidence-Aware Audit
              </h3>
              <p className="text-slate-600 dark:text-[#B3B7C2] font-sans leading-relaxed text-xs">
                Trainees are evaluated strictly on evidence available prior to their decision. Any threat unobservable due to jamming incurs zero missed penalty.
              </p>
            </div>
            <div className="pt-2.5 border-t border-slate-200 dark:border-white/[0.08] text-[10px] text-emerald-600 dark:text-emerald-300 font-mono font-semibold flex items-center gap-1.5">
              <Shield className="w-3 h-3" />
              Transparent, Deterministic Rule Scoring
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
         SECTION 4: TACTICAL MISSION DOSSIERS (DEMONSTRATION SCENARIOS)
         ========================================================================= */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-[#F4F5F7] font-mono uppercase tracking-wide">
              Tactical Mission Dossiers
            </h2>
            <p className="text-xs text-slate-600 dark:text-[#858B99]">
              Pre-configured synthetic threat scenarios across varied terrains, wind velocities, and electronic countermeasures.
            </p>
          </div>
          <Link
            to="/scenarios"
            className="text-xs font-mono text-[#0284C7] dark:text-[#00CFE8] hover:underline flex items-center gap-1 font-semibold"
          >
            Inspect All Dossiers <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-5 rounded-xl bg-white dark:bg-[#111318] border border-slate-200 dark:border-white/[0.08] space-y-4 h-64 animate-pulse">
                <div className="h-4 bg-slate-200 dark:bg-white/[0.08] rounded w-1/3" />
                <div className="h-6 bg-slate-200 dark:bg-white/[0.08] rounded w-3/4" />
                <div className="h-16 bg-slate-200 dark:bg-white/[0.08] rounded" />
              </div>
            ))}
          </div>
        ) : scenarios.length === 0 ? (
          <div className="p-8 text-center bg-white dark:bg-[#111318] border border-slate-200 dark:border-white/[0.08] rounded-xl text-slate-500 dark:text-[#858B99] font-mono text-xs">
            No scenarios available in the database. Open Scenario Builder to create one.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {scenarios.slice(0, 3).map((sc) => {
              const diffBadge =
                sc.difficulty === 'Beginner'
                  ? 'text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-950/70'
                  : sc.difficulty === 'Intermediate'
                  ? 'text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-950/70'
                  : 'text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-950/70';

              const completionCount = getScenarioCompletionCount(sc.id, sc.name);
              const isStarting = startingRunId === sc.id;

              return (
                <div
                  key={sc.id}
                  className="p-5 rounded-xl bg-white dark:bg-[#111318]/95 border border-slate-200 dark:border-white/[0.14] hover:border-[#0284C7]/50 dark:hover:border-[#00CFE8]/50 flex flex-col justify-between space-y-4 group transition-all duration-200 shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.5)] bracket-card"
                >
                  <div className="space-y-3">
                    {/* Tags row */}
                    <div className="flex items-center justify-between">
                      <span className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-bold border ${diffBadge}`}>
                        {sc.difficulty}
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10.5px] font-mono text-slate-500 dark:text-[#858B99] uppercase bg-slate-100 dark:bg-white/[0.04] px-2 py-0.5 rounded border border-slate-200 dark:border-white/[0.08]">
                          {sc.environment}
                        </span>
                        {completionCount > 0 ? (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                            {completionCount} SORTIES
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded text-[9.5px] font-mono text-slate-500 dark:text-[#858B99] bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.08]">
                            UNTESTED
                          </span>
                        )}
                      </div>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-[#F4F5F7] group-hover:text-[#0284C7] dark:group-hover:text-[#00CFE8] transition-colors leading-snug font-mono">
                      {sc.name}
                    </h3>

                    <p className="text-xs text-slate-600 dark:text-[#B3B7C2] line-clamp-2 leading-relaxed">
                      {sc.description}
                    </p>

                    {/* Scenario Specs Grid */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-600 dark:text-[#858B99] pt-2.5 border-t border-slate-100 dark:border-white/[0.08] bg-slate-50 dark:bg-[#0A0C10] p-2.5 rounded-lg border border-slate-200 dark:border-white/[0.08]">
                      <div>
                        DURATION: <span className="text-slate-900 dark:text-[#F4F5F7] font-bold tabular-stat">{sc.duration_seconds}s</span>
                      </div>
                      <div>
                        TARGETS: <span className="text-slate-900 dark:text-[#F4F5F7] font-bold tabular-stat">{sc.configuration?.num_entities ?? 5}</span>
                      </div>
                      <div>
                        PKT LOSS: <span className="text-[#0284C7] dark:text-[#00CFE8] font-bold tabular-stat">{Math.round((sc.configuration?.observation_loss_rate ?? 0.1) * 100)}%</span>
                      </div>
                      <div>
                        RF JITTER: <span className="text-[#0284C7] dark:text-[#00CFE8] font-bold tabular-stat">{sc.configuration?.observation_delay_mean ?? 2.5}s</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 pt-1">
                    <button
                      onClick={() => handleQuickStart(sc.id)}
                      disabled={isStarting}
                      className="w-full flex items-center justify-center gap-2 py-2 rounded-lg btn-primary font-mono text-xs font-bold disabled:opacity-50 tracking-wider shadow-sm cursor-pointer"
                    >
                      <Play className="w-3.5 h-3.5 fill-current" />
                      {isStarting ? 'Scrambling Sortie...' : 'SCRAMBLE INTERCEPT'}
                    </button>
                    <Link
                      to={`/scenarios`}
                      className="w-full flex items-center justify-center gap-1 py-1 rounded text-[10.5px] font-mono text-slate-500 dark:text-[#858B99] hover:text-[#0284C7] dark:hover:text-[#00CFE8] transition-colors"
                    >
                      Detailed Dossier Analysis <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
         SECTION 5: RECENT SIMULATION SORTIES AUDIT ARCHIVE
         ========================================================================= */}
      <div className="p-5 rounded-xl bg-white dark:bg-[#0F1117] border border-slate-200 dark:border-white/[0.14] space-y-4 shadow-sm dark:shadow-[0_4px_24px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#0284C7] dark:text-[#00CFE8]" />
            <h2 className="text-base font-bold text-slate-900 dark:text-[#F4F5F7] font-mono uppercase tracking-wide">
              Recent Simulation Sorties & Audit Trail
            </h2>
          </div>
          <Link to="/reports" className="text-xs font-mono text-[#0284C7] dark:text-[#00CFE8] hover:underline flex items-center gap-1 font-semibold">
            Full Audit Archive <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {loading ? (
          <div className="py-10 text-center text-slate-500 dark:text-[#858B99] font-mono text-xs animate-pulse">
            Synchronizing telemetry mission archive with database...
          </div>
        ) : stats?.recent_runs && stats.recent_runs.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-slate-500 dark:text-[#858B99] border-b border-slate-200 dark:border-white/[0.10] pb-2 text-[11px] uppercase tracking-wider">
                <tr>
                  <th className="py-2.5 font-semibold">Run ID</th>
                  <th className="font-semibold">Scenario Dossier</th>
                  <th className="font-semibold">Trainee</th>
                  <th className="font-semibold">Sortie Status</th>
                  <th className="font-semibold">Clock</th>
                  <th className="font-semibold">Decisions</th>
                  <th className="font-semibold">Score</th>
                  <th className="text-right font-semibold">Telemetry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-white/[0.06]">
                {stats.recent_runs.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors">
                    <td className="py-2.5 text-[#0284C7] dark:text-[#00CFE8] font-bold tabular-stat">
                      <Link to={`/simulation?run_id=${r.id}`} className="hover:underline">
                        {r.id.slice(0, 8)}...
                      </Link>
                    </td>
                    <td className="text-slate-900 dark:text-[#F4F5F7] font-medium">{r.scenario_name || 'Seeded Run'}</td>
                    <td className="text-slate-500 dark:text-[#858B99]">{r.trainee_id}</td>
                    <td>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        r.status === 'COMPLETED' ? 'bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30' :
                        r.status === 'RUNNING' ? 'bg-sky-100 dark:bg-[#7047C8]/30 text-[#0284C7] dark:text-[#00CFE8] border border-sky-200 dark:border-[#00CFE8]/40 animate-pulse' :
                        'bg-slate-100 dark:bg-white/[0.04] text-slate-600 dark:text-[#858B99] border border-slate-200 dark:border-white/[0.12]'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                    <td className="text-slate-500 dark:text-[#858B99] tabular-stat">{r.current_sim_time}s / {r.duration_seconds}s</td>
                    <td className="text-[#0284C7] dark:text-[#00CFE8] font-bold tabular-stat">{r.trainee_decisions_count}</td>
                    <td className="font-bold text-slate-900 dark:text-[#F4F5F7] tabular-stat">
                      {r.overall_score !== null && r.overall_score !== undefined ? `${r.overall_score}%` : 'Pending'}
                    </td>
                    <td className="text-right space-x-1.5">
                      <Link
                        to={`/simulation?run_id=${r.id}`}
                        className="btn-secondary text-[10.5px] py-1 px-2.5 inline-flex items-center gap-1 font-mono"
                        title="Open in Simulation Workspace"
                      >
                        Workspace
                      </Link>
                      <Link
                        to={`/review?run_id=${r.id}`}
                        className="btn-secondary text-[10.5px] py-1 px-2.5 inline-flex items-center gap-1 font-mono"
                        title="Open After-Action Review"
                      >
                        AAR
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-slate-500 dark:text-[#858B99] font-mono text-xs space-y-1.5">
            <p>No simulation mission records found in the database.</p>
            <p className="text-[11px] text-slate-400 dark:text-[#858B99]/70">
              Click &quot;SCRAMBLE INTERCEPT SIMULATION&quot; above to launch your first session.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
