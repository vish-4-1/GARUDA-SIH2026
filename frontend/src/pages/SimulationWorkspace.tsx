import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Eye,
  EyeOff,
  Crosshair,
  Send,
  HelpCircle,
  FileText,
  Award,
  Layers,
  Clock,
  Sparkles,
  Square,
  Rewind,
  FastForward,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { api } from '../services/api';
import { SimulationWorkspaceView, Observation, TraineeDecision } from '../types';
import { TacticalRadarCanvas } from '../components/TacticalRadarCanvas';
import { Tactical3DScene } from '../components/3d/Tactical3DScene';

export const SimulationWorkspace: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const runId = searchParams.get('run_id');

  const [workspace, setWorkspace] = useState<SimulationWorkspaceView | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEvaluatorMode, setIsEvaluatorMode] = useState(false);
  const [selectedEntityId, setSelectedEntityId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'3D' | '2D'>('3D');

  // Environment and weather interactive overrides
  const [overrideEnv, setOverrideEnv] = useState<string | null>(null);
  const [overrideWeather, setOverrideWeather] = useState<string | null>(null);

  // Trainee Decision Form State
  const [decisionType, setDecisionType] = useState('CLASSIFY');
  const [selectedClassification, setSelectedClassification] = useState('Micro-Quadcopter');
  const [threatAssessment, setThreatAssessment] = useState('HOSTILE');
  const [confidence, setConfidence] = useState(0.85);
  const [rationale, setRationale] = useState('');
  const [submittingDecision, setSubmittingDecision] = useState(false);

  // Auto-step polling interval for running simulation
  const autoPlayRef = useRef<number | null>(null);

  useEffect(() => {
    if (!runId) {
      // If no run ID in URL, find or create default run
      initializeDefaultRun();
    } else {
      fetchWorkspace(runId, isEvaluatorMode);
    }

    return () => {
      if (autoPlayRef.current) clearInterval(autoPlayRef.current);
    };
  }, [runId, isEvaluatorMode]);

  // Handle continuous clock advance if run status is RUNNING
  useEffect(() => {
    if (workspace?.run_state.status === 'RUNNING') {
      if (!autoPlayRef.current) {
        autoPlayRef.current = window.setInterval(async () => {
          if (runId) {
            try {
              await api.stepRun(runId, 2.0);
              const updated = await api.getWorkspaceView(runId, isEvaluatorMode);
              setWorkspace(updated);
              if (updated.run_state.status === 'COMPLETED') {
                if (autoPlayRef.current) clearInterval(autoPlayRef.current);
                autoPlayRef.current = null;
              }
            } catch (err) {
              console.error('Error stepping simulation', err);
            }
          }
        }, 1200);
      }
    } else {
      if (autoPlayRef.current) {
        clearInterval(autoPlayRef.current);
        autoPlayRef.current = null;
      }
    }
  }, [workspace?.run_state.status, runId, isEvaluatorMode]);

  const initializeDefaultRun = async () => {
    try {
      setLoading(true);
      const runs = await api.getRuns();
      if (runs.length > 0) {
        setSearchParams({ run_id: runs[0].id });
      } else {
        const newRun = await api.createRun({
          scenario_id: 'scenario-demo-01-beginner',
          trainee_id: 'Trainee-Alpha',
        });
        setSearchParams({ run_id: newRun.id });
      }
    } catch (err) {
      console.error('Failed to init default run', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchWorkspace = async (id: string, evaluator: boolean) => {
    try {
      setLoading(true);
      const data = await api.getWorkspaceView(id, evaluator);
      setWorkspace(data);

      // Auto select first observed entity if none selected
      if (!selectedEntityId && data.visible_observations.length > 0) {
        setSelectedEntityId(data.visible_observations[0].trainee_payload.entity_id);
      }
    } catch (err) {
      console.error('Failed to load workspace', err);
    } finally {
      setLoading(false);
    }
  };

  // Simulation Controls
  const handleStart = async () => {
    if (!runId) return;
    await api.startRun(runId);
    fetchWorkspace(runId, isEvaluatorMode);
  };

  const handlePause = async () => {
    if (!runId) return;
    await api.pauseRun(runId);
    fetchWorkspace(runId, isEvaluatorMode);
  };

  const handleStop = async () => {
    if (!runId) return;
    await api.pauseRun(runId);
    fetchWorkspace(runId, isEvaluatorMode);
  };

  const handleStep = async (seconds: number = 5.0) => {
    if (!runId) return;
    await api.stepRun(runId, seconds);
    fetchWorkspace(runId, isEvaluatorMode);
  };

  const handleSeek = async (seconds: number) => {
    if (!runId) return;
    try {
      await api.seekRun(runId, seconds);
      await fetchWorkspace(runId, isEvaluatorMode);
    } catch (err) {
      console.error('Failed to seek simulation', err);
    }
  };

  const handleStepRelative = async (deltaSeconds: number) => {
    if (!runId || !workspace) return;
    const maxDur = workspace.run_state.duration_seconds || 120;
    const target = Math.max(0, Math.min(maxDur, (workspace.run_state.current_sim_time || 0) + deltaSeconds));
    await handleSeek(target);
  };

  const handleReset = async () => {
    if (!runId) return;
    if (confirm('Reset simulation clock to 0 and clear trainee decisions?')) {
      await api.resetRun(runId);
      fetchWorkspace(runId, isEvaluatorMode);
    }
  };

  // Trainee Decision Submission
  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!runId || !selectedEntityId) {
      alert('Please select a target contact first.');
      return;
    }

    try {
      setSubmittingDecision(true);
      await api.recordDecision(runId, {
        target_entity_id: selectedEntityId,
        simulation_time: workspace?.run_state.current_sim_time ?? 0,
        decision_type: decisionType,
        selected_classification: selectedClassification,
        threat_assessment: threatAssessment,
        confidence: Number(confidence),
        rationale: rationale.trim() || undefined,
      });

      // Clear input and refresh
      setRationale('');
      await fetchWorkspace(runId, isEvaluatorMode);
    } catch (err: any) {
      alert(`Error recording decision: ${err.message}`);
    } finally {
      setSubmittingDecision(false);
    }
  };

  if (loading && !workspace) {
    return (
      <div className="py-24 text-center text-[#A69EAC] font-mono text-sm animate-pulse">
        Initializing GARUDA tactical simulation environment...
      </div>
    );
  }

  const runState = workspace?.run_state;
  const currentSimTime = runState?.current_sim_time ?? 0;
  const duration = runState?.duration_seconds ?? 120;
  const progressPercent = Math.min(100, Math.round((currentSimTime / duration) * 100));

  // Extract unique active entities from visible observations
  const activeEntities = Array.from(
    new Set(workspace?.visible_observations.map((obs) => obs.trainee_payload.entity_id) || [])
  );

  const selectedObs = selectedEntityId
    ? workspace?.visible_observations.find(
        (obs) => obs.trainee_payload.entity_id === selectedEntityId
      )
    : null;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Simulation Workspace Header */}
      <div className="p-4 rounded-2xl bg-[#0D0B12]/85 backdrop-blur-xl border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-[0_4px_30px_rgba(0,0,0,0.6)]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#15121C] text-[#00E5FF] border border-[#00E5FF]/30 shadow-[0_0_12px_rgba(0,229,255,0.2)]">
            <Crosshair className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-[#F7F5FA] font-mono">
                {runState?.scenario_name || 'Active Simulation'}
              </h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                runState?.status === 'RUNNING' ? 'bg-[#241039] text-[#00E5FF] border border-[#3B0A6B] animate-pulse shadow-[0_0_10px_rgba(0,229,255,0.3)]' :
                runState?.status === 'COMPLETED' ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800' :
                'bg-[#15121C] text-[#AAA3B5] border border-white/10'
              }`}>
                {runState?.status}
              </span>
            </div>
            <p className="text-xs text-[#AAA3B5] font-mono mt-0.5">
              Run ID: {runState?.id.slice(0, 12)}... | Seed: {runState?.seed} | Trainee: {runState?.trainee_id}
            </p>
          </div>
        </div>

        {/* Simulation Controls & Evaluator Toggle */}
        <div className="flex flex-wrap items-center gap-2.5">
          {runState?.status === 'RUNNING' ? (
            <div className="flex items-center gap-1.5">
              <button
                onClick={handlePause}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#15121C] hover:bg-amber-950/60 text-amber-300 border border-amber-700/60 text-xs font-mono font-bold transition-all shadow-[0_0_10px_rgba(245,158,11,0.2)]"
              >
                <Pause className="w-4 h-4" /> Pause
              </button>
              <button
                onClick={handleStop}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#15121C] hover:bg-rose-950/60 text-rose-300 border border-rose-700/60 text-xs font-mono font-bold transition-all shadow-[0_0_10px_rgba(225,29,72,0.2)]"
                title="Stop Simulation"
              >
                <Square className="w-4 h-4" /> Stop
              </button>
            </div>
          ) : (
            <button
              onClick={handleStart}
              disabled={runState?.status === 'COMPLETED'}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00E5FF] hover:bg-[#00c8e0] text-[#050505] text-xs font-mono font-bold shadow-[0_0_20px_rgba(0,229,255,0.35)] transition-all disabled:opacity-50"
            >
              <Play className="w-4 h-4 fill-current" /> {runState?.status === 'PAUSED' ? 'Resume' : 'Start Clock'}
            </button>
          )}

          <button
            onClick={() => handleStepRelative(-5.0)}
            disabled={currentSimTime <= 0}
            className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-[#15121C] hover:bg-[#3B0A6B]/30 text-[#F7F5FA] border border-white/10 hover:border-[#00E5FF]/40 text-xs font-mono font-semibold transition-all disabled:opacity-40"
            title="Step Back -5s"
          >
            <Rewind className="w-3.5 h-3.5 text-[#00E5FF]" /> -5s
          </button>

          <button
            onClick={() => handleStep(5.0)}
            disabled={runState?.status === 'COMPLETED'}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-[#15121C] hover:bg-[#3B0A6B]/30 text-[#F7F5FA] border border-white/10 hover:border-[#00E5FF]/40 text-xs font-mono font-semibold transition-all disabled:opacity-40"
            title="Step Forward +5s"
          >
            <StepForward className="w-4 h-4 text-[#00E5FF]" /> +5s
          </button>

          <button
            onClick={handleReset}
            className="p-2 rounded-xl bg-[#15121C] hover:bg-white/10 text-[#AAA3B5] hover:text-[#F7F5FA] border border-white/10 transition-colors"
            title="Reset Simulation to 0s"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          {/* Replay Completed Session Button */}
          {runState?.status === 'COMPLETED' && (
            <button
              onClick={() => handleSeek(0)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#241039] hover:bg-[#3B0A6B] text-[#00E5FF] border border-[#3B0A6B] text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(59,10,107,0.3)]"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#00E5FF]" /> Replay Mission
            </button>
          )}

          {/* Evaluator Ground Truth Mode Toggle */}
          <button
            onClick={() => setIsEvaluatorMode(!isEvaluatorMode)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold border transition-all ${
              isEvaluatorMode
                ? 'bg-[#241039] text-[#00E5FF] border-[#3B0A6B] shadow-[0_0_15px_rgba(59,10,107,0.35)]'
                : 'bg-[#15121C] text-[#AAA3B5] border-white/10 hover:text-[#F7F5FA]'
            }`}
          >
            {isEvaluatorMode ? <Eye className="w-4 h-4 text-[#00E5FF]" /> : <EyeOff className="w-4 h-4" />}
            {isEvaluatorMode ? 'Evaluator Truth ON' : 'Trainee View'}
          </button>

          {/* Evaluate / Review Direct Link */}
          <Link
            to={`/review?run_id=${runId}`}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#15121C] hover:bg-[#3B0A6B]/40 text-[#00E5FF] border border-[#3B0A6B]/60 text-xs font-mono font-bold transition-all"
          >
            <Award className="w-4 h-4" /> Score & Review
          </Link>
        </div>
      </div>

      {/* Clock and Evidence Counters Bar (Glass Panels) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
        <div className="p-3 rounded-xl bg-[#0D0B12]/80 backdrop-blur-md border border-white/10 flex items-center justify-between">
          <span className="text-[#AAA3B5] flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-[#00E5FF]" /> SIM CLOCK
          </span>
          <span className="text-[#F7F5FA] font-bold text-sm">
            {currentSimTime.toFixed(1)}s / {duration}s
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#0D0B12]/80 backdrop-blur-md border border-white/10 flex items-center justify-between">
          <span className="text-[#AAA3B5]">DELIVERED</span>
          <span className="text-emerald-400 font-bold text-sm">
            {runState?.delivered_observations_count ?? 0}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#0D0B12]/80 backdrop-blur-md border border-white/10 flex items-center justify-between">
          <span className="text-[#AAA3B5]">DELAYED PENDING</span>
          <span className="text-amber-400 font-bold text-sm">
            {runState?.pending_delayed_count ?? 0}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#0D0B12]/80 backdrop-blur-md border border-white/10 flex items-center justify-between">
          <span className="text-[#AAA3B5]">PACKETS DROPPED</span>
          <span className="text-rose-400 font-bold text-sm">
            {runState?.lost_observations_count ?? 0}
          </span>
        </div>

        <div className="p-3 rounded-xl bg-[#0D0B12]/80 backdrop-blur-md border border-white/10 flex items-center justify-between">
          <span className="text-[#AAA3B5]">DECISIONS LOGGED</span>
          <span className="text-[#00E5FF] font-bold text-sm">
            {runState?.trainee_decisions_count ?? 0}
          </span>
        </div>
      </div>

      {/* Main Simulation Viewport (3D Scene / Radar Display + Trainee Decision Panel) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left / Center: Interactive 3D / 2D Canvas (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* View Mode Toggle: 3D Battlespace vs 2D Tactical Radar */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-[#0D0B12]/80 backdrop-blur-md border border-white/10 text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-[#AAA3B5] font-bold px-2">SIMULATION VIEWPORT:</span>
              <button
                type="button"
                onClick={() => setViewMode('3D')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  viewMode === '3D'
                    ? 'bg-[#3B0A6B] text-[#00E5FF] border border-[#00E5FF]/40 shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                    : 'text-[#AAA3B5] hover:text-[#F7F5FA]'
                }`}
              >
                3D Interactive Scene (Three.js)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('2D')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                  viewMode === '2D'
                    ? 'bg-[#3B0A6B] text-[#00E5FF] border border-[#00E5FF]/40 shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                    : 'text-[#AAA3B5] hover:text-[#F7F5FA]'
                }`}
              >
                2D Tactical Radar
              </button>
            </div>

            <Link
              to={`/telemetry?run_id=${runId}`}
              className="text-[11px] text-[#00E5FF] hover:underline flex items-center gap-1 px-2"
            >
              <Radio className="w-3.5 h-3.5" /> Live Telemetry Stream →
            </Link>
          </div>

          {viewMode === '3D' ? (
            <Tactical3DScene
              visibleObservations={workspace?.visible_observations || []}
              evaluatorGroundTruth={workspace?.evaluator_ground_truth}
              decisions={workspace?.trainee_decisions || []}
              selectedEntityId={selectedEntityId}
              onSelectEntity={(id) => setSelectedEntityId(id)}
              isEvaluatorMode={isEvaluatorMode}
              currentSimTime={currentSimTime}
              environmentType={
                overrideEnv ||
                runState?.environment ||
                (runState?.scenario_name?.toLowerCase().includes('coastal')
                  ? 'coastal'
                  : runState?.scenario_name?.toLowerCase().includes('border')
                  ? 'border'
                  : runState?.scenario_name?.toLowerCase().includes('rural')
                  ? 'rural'
                  : 'urban')
              }
              weatherCondition={
                overrideWeather ||
                runState?.weather ||
                (runState?.scenario_name?.toLowerCase().includes('jamming')
                  ? 'High RF Jamming'
                  : runState?.scenario_name?.toLowerCase().includes('rain')
                  ? 'Heavy Rain'
                  : 'Clear Day')
              }
              onEnvironmentChange={(env) => setOverrideEnv(env)}
              onWeatherChange={(w) => setOverrideWeather(w)}
            />
          ) : (
            <TacticalRadarCanvas
              visibleObservations={workspace?.visible_observations || []}
              evaluatorGroundTruth={workspace?.evaluator_ground_truth}
              decisions={workspace?.trainee_decisions || []}
              selectedEntityId={selectedEntityId}
              onSelectEntity={(id) => setSelectedEntityId(id)}
              isEvaluatorMode={isEvaluatorMode}
              currentSimTime={currentSimTime}
            />
          )}

          {/* Mission Replay & Interactive Timeline Scrubber (Bottom Glass Panel) */}
          <div className="p-3.5 rounded-2xl bg-[#0D0B12]/85 backdrop-blur-md border border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.6)] space-y-2 text-xs font-mono">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#00E5FF]" />
                <span className="font-bold text-[#F7F5FA]">MISSION REPLAY & TIMELINE SCRUBBER</span>
                <span className="text-[10px] text-[#AAA3B5]">
                  [{currentSimTime.toFixed(1)}s / {duration}s]
                </span>
              </div>

              {/* Scrubber Quick Step Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleStepRelative(-5.0)}
                  className="px-2 py-0.5 rounded bg-[#15121C] hover:bg-[#3B0A6B]/30 text-[#AAA3B5] hover:text-[#F7F5FA] border border-white/10 text-[10px] font-bold"
                >
                  -5s
                </button>
                <button
                  type="button"
                  onClick={() => handleStepRelative(-1.0)}
                  className="px-2 py-0.5 rounded bg-[#15121C] hover:bg-[#3B0A6B]/30 text-[#AAA3B5] hover:text-[#F7F5FA] border border-white/10 text-[10px] font-bold"
                >
                  -1s
                </button>
                <button
                  type="button"
                  onClick={() => handleStepRelative(1.0)}
                  className="px-2 py-0.5 rounded bg-[#15121C] hover:bg-[#3B0A6B]/30 text-[#AAA3B5] hover:text-[#F7F5FA] border border-white/10 text-[10px] font-bold"
                >
                  +1s
                </button>
                <button
                  type="button"
                  onClick={() => handleStepRelative(5.0)}
                  className="px-2 py-0.5 rounded bg-[#15121C] hover:bg-[#3B0A6B]/30 text-[#AAA3B5] hover:text-[#F7F5FA] border border-white/10 text-[10px] font-bold"
                >
                  +5s
                </button>
              </div>
            </div>

            {/* Interactive Timeline Range Slider */}
            <div className="relative flex items-center pt-1">
              <input
                type="range"
                min={0}
                max={duration || 120}
                step={0.5}
                value={currentSimTime}
                onChange={(e) => handleSeek(Number(e.target.value))}
                className="w-full accent-[#00E5FF] h-2 bg-[#15121C] rounded-lg cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-center text-[10px] text-[#AAA3B5]">
              <span>0.0s (Incursion Ingress)</span>
              <span className="text-[#00E5FF] font-semibold">
                {runState?.status === 'COMPLETED' ? 'Mission Concluded • Replay Active' : 'Live Interactive Mission Engine'}
              </span>
              <span>{duration}s (Mission Horizon)</span>
            </div>
          </div>

          {/* Quick Target Contact Selector Tabs */}
          <div className="p-3 rounded-xl bg-[#0D0B12]/80 backdrop-blur-md border border-white/10 flex items-center gap-2 overflow-x-auto text-xs font-mono">
            <span className="text-[#AAA3B5] shrink-0">Observed Contacts:</span>
            {activeEntities.length === 0 ? (
              <span className="text-[#AAA3B5]/60 italic">No sensor telemetry delivered yet. Advance simulation clock...</span>
            ) : (
              activeEntities.map((eid) => (
                <button
                  key={eid}
                  onClick={() => setSelectedEntityId(eid)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all shrink-0 ${
                    selectedEntityId === eid
                      ? 'bg-[#3B0A6B] text-[#00E5FF] border border-[#00E5FF]/40 shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                      : 'bg-[#15121C] text-[#F7F5FA] hover:bg-white/10 border border-white/10'
                  }`}
                >
                  {eid}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Trainee Decision & Action Console (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Selected Target Live Telemetry & Evidence Details Card */}
          {selectedEntityId && (
            <div className="p-4 rounded-2xl bg-[#0D0B12]/85 backdrop-blur-xl border border-white/10 shadow-[0_4px_25px_rgba(0,0,0,0.6)] space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-white/10 pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-[#00E5FF]" />
                  <span className="font-bold text-[#F7F5FA] tracking-wide text-xs">
                    CONTACT TELEMETRY: {selectedEntityId}
                  </span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#241039] text-[#00E5FF] border border-[#3B0A6B] font-bold">
                  {selectedObs ? selectedObs.trainee_payload.source_sensor : 'SYNTHETIC RADAR'}
                </span>
              </div>

              {selectedObs ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-3 gap-2 bg-[#050505] p-2.5 rounded-xl border border-white/10 text-[11px]">
                    <div>
                      <span className="text-[9px] text-[#AAA3B5] block">ALTITUDE (AGL)</span>
                      <strong className="text-[#F7F5FA] text-xs">{Math.round(selectedObs.trainee_payload.observed_altitude)}m</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#AAA3B5] block">SPEED (EST)</span>
                      <strong className="text-[#F7F5FA] text-xs">{selectedObs.trainee_payload.observed_speed.toFixed(1)} m/s</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-[#AAA3B5] block">BEARING</span>
                      <strong className="text-[#F7F5FA] text-xs">{Math.round(selectedObs.trainee_payload.estimated_bearing || 0)}°</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-[#15121C] p-2 rounded-lg border border-white/10">
                      <span className="text-[9px] text-[#AAA3B5] block">OBSERVED POSITION</span>
                      <span className="text-[#00E5FF] text-[10px]">
                        X: {Math.round(selectedObs.trainee_payload.observed_pos_x)}m, Y: {Math.round(selectedObs.trainee_payload.observed_pos_y)}m
                      </span>
                    </div>
                    <div className="bg-[#15121C] p-2 rounded-lg border border-white/10">
                      <span className="text-[9px] text-[#AAA3B5] block">SNR & QUALITY</span>
                      <span className="text-emerald-400 font-bold text-[10px]">
                        {selectedObs.trainee_payload.signal_to_noise_ratio_db.toFixed(1)} dB ({Math.round(selectedObs.quality_score * 100)}%)
                      </span>
                    </div>
                  </div>

                  {/* Sensor Cues & Weather Impact */}
                  {selectedObs.trainee_payload.sensor_cues && selectedObs.trainee_payload.sensor_cues.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                      <span className="text-[10px] text-[#AAA3B5]">Detected Cues:</span>
                      {selectedObs.trainee_payload.sensor_cues.map((cue, idx) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-white/80 border border-white/10">
                          {cue}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[10px] text-[#AAA3B5] pt-1 border-t border-white/10">
                    <span>Transmission Latency: <strong className="text-amber-400">+{selectedObs.delay_applied.toFixed(1)}s</strong></span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Ground Truth Isolated
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2 text-[#AAA3B5] text-[11px] italic">
                  Awaiting sensor telemetry delivery for contact {selectedEntityId}...
                </div>
              )}
            </div>
          )}

          <div className="p-5 rounded-2xl bg-[#0D0B12]/85 backdrop-blur-xl border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-[#00E5FF]">
                <Crosshair className="w-4 h-4" />
                <h3 className="font-bold text-sm uppercase font-mono tracking-wider text-[#F7F5FA]">
                  Trainee Action Terminal
                </h3>
              </div>
              <span className="text-xs font-mono text-[#AAA3B5]">
                Target: <span className="text-[#00E5FF] font-bold">{selectedEntityId || 'None'}</span>
              </span>
            </div>

            <form onSubmit={handleSubmitDecision} className="space-y-4 text-xs font-mono">
              {/* Decision Action Type */}
              <div>
                <label className="block text-[#AAA3B5] mb-1">Select Tactical Action</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'CLASSIFY', label: 'Classify Contact' },
                    { id: 'MARK_UNCERTAIN', label: 'Mark Uncertain' },
                    { id: 'REQUEST_PING', label: 'Request Sensor Ping' },
                    { id: 'FLAG_FALSE_ALARM', label: 'Flag False Alarm' },
                    { id: 'ENGAGE_COUNTERMEASURE', label: 'Engage EW Soft-Kill' },
                  ].map((action) => (
                    <button
                      type="button"
                      key={action.id}
                      onClick={() => setDecisionType(action.id)}
                      className={`p-2.5 rounded-xl border text-left font-semibold transition-all ${
                        decisionType === action.id
                          ? 'bg-[#241039] text-[#00E5FF] border-[#3B0A6B] shadow-[0_0_12px_rgba(59,10,107,0.3)]'
                          : 'bg-[#15121C] text-[#AAA3B5] border-white/10 hover:bg-white/[0.04]'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Classification & Threat Assessment */}
              {decisionType === 'CLASSIFY' && (
                <div className="space-y-3 p-3 rounded-xl bg-[#15121C] border border-white/10">
                  <div>
                    <label className="block text-[#AAA3B5] mb-1">Drone Category</label>
                    <select
                      value={selectedClassification}
                      onChange={(e) => setSelectedClassification(e.target.value)}
                      className="w-full px-3 py-2 bg-[#050505] border border-white/15 rounded-lg text-[#F7F5FA] focus:outline-none focus:border-[#00E5FF]"
                    >
                      <option value="Micro-Quadcopter">Micro-Quadcopter (Reconnaissance)</option>
                      <option value="Fixed-Wing Loitering">Fixed-Wing Loitering (Kamikaze munition)</option>
                      <option value="Heavy Commercial">Heavy Commercial (Improvised payload)</option>
                      <option value="Friendly Civilian">Friendly Civilian (Remote-ID beacon)</option>
                      <option value="Wildlife Clutter">Wildlife Clutter (Flock of birds)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[#AAA3B5] mb-1">Threat Assessment</label>
                    <div className="grid grid-cols-3 gap-2">
                      {['HOSTILE', 'SUSPICIOUS', 'FRIENDLY'].map((level) => (
                        <button
                          type="button"
                          key={level}
                          onClick={() => setThreatAssessment(level)}
                          className={`py-1.5 rounded-lg border font-bold text-center transition-all ${
                            threatAssessment === level
                              ? level === 'HOSTILE'
                                ? 'bg-rose-950/80 text-rose-300 border-rose-600'
                                : level === 'FRIENDLY'
                                ? 'bg-emerald-950/80 text-emerald-300 border-emerald-600'
                                : 'bg-amber-950/80 text-amber-300 border-amber-600'
                              : 'bg-[#050505] text-[#AAA3B5] border-white/10'
                          }`}
                        >
                          {level}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Confidence Slider */}
              <div>
                <div className="flex justify-between text-[#AAA3B5] mb-1">
                  <span>Decision Confidence:</span>
                  <span className="text-[#00E5FF] font-bold">{Math.round(confidence * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={1.0}
                  step={0.05}
                  value={confidence}
                  onChange={(e) => setConfidence(Number(e.target.value))}
                  className="w-full accent-[#00E5FF]"
                />
              </div>

              {/* Trainee Rationale */}
              <div>
                <label className="block text-[#AAA3B5] mb-1">Trainee Rationale (Optional)</label>
                <input
                  type="text"
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  placeholder="e.g. Ingress angle, high-speed loitering signature, no remote ID"
                  className="w-full px-3 py-2 bg-[#15121C] border border-white/15 rounded-lg text-[#F7F5FA] placeholder-[#AAA3B5]/40 focus:outline-none focus:border-[#00E5FF]"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submittingDecision || !selectedEntityId}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#00E5FF] hover:bg-[#00c8e0] text-[#050505] font-bold transition-all shadow-[0_0_20px_rgba(0,229,255,0.35)] disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                {submittingDecision ? 'Logging Decision...' : 'Commit Decision to Evidence Ledger'}
              </button>
            </form>
          </div>

          {/* Recent Decisions Recorded by Trainee */}
          <div className="p-4 rounded-2xl bg-[#0D0B12]/85 backdrop-blur-xl border border-white/10 shadow-[0_4px_30px_rgba(0,0,0,0.6)] space-y-3">
            <h4 className="text-xs font-mono font-bold text-[#F7F5FA] uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Recorded Decisions ({workspace?.trainee_decisions.length || 0})
            </h4>

            {workspace?.trainee_decisions && workspace.trainee_decisions.length > 0 ? (
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {workspace.trainee_decisions.map((dec) => (
                  <div
                    key={dec.id}
                    className="p-2.5 rounded-xl bg-[#15121C] border border-white/10 text-[11px] font-mono flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-[#F7F5FA]">{dec.target_entity_id}</span>
                      <span className="text-[#AAA3B5] ml-2">[{dec.decision_type}]</span>
                      <div className="text-[10px] text-[#AAA3B5]/60">
                        At {dec.simulation_time}s • Conf: {Math.round(dec.confidence * 100)}%
                      </div>
                    </div>

                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      dec.evidence_status === 'ADEQUATE' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                      dec.evidence_status === 'EVIDENCE_LIMITED' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
                      'bg-rose-950 text-rose-400 border border-rose-800'
                    }`}>
                      {dec.evidence_status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-[#AAA3B5] font-mono text-[11px]">
                No decisions recorded for this run yet. Select a contact blip and submit action.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

