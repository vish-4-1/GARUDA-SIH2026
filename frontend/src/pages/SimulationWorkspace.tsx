import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useParams, Link } from 'react-router-dom';
import {
  Play,
  Pause,
  RotateCcw,
  StepForward,
  CheckCircle2,
  Radio,
  Eye,
  EyeOff,
  Crosshair,
  Send,
  Award,
  Clock,
  Square,
  Rewind,
  ShieldCheck,
  Activity
} from 'lucide-react';
import { api } from '../services/api';
import { SimulationWorkspaceView, Observation, TraineeDecision } from '../types';
import { TacticalRadarCanvas } from '../components/TacticalRadarCanvas';
import { Tactical3DScene } from '../components/3d/Tactical3DScene';

export const SimulationWorkspace: React.FC = () => {
  const { runId: routeRunId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const runId = routeRunId || searchParams.get('run_id');

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

      // Auto select first observed entity or evaluator ground truth entity if none selected
      if (!selectedEntityId) {
        if (data.visible_observations && data.visible_observations.length > 0) {
          setSelectedEntityId(data.visible_observations[0].trainee_payload.entity_id);
        } else if (data.evaluator_ground_truth && data.evaluator_ground_truth.length > 0) {
          setSelectedEntityId(data.evaluator_ground_truth[0].entity_id);
        }
      }
    } catch (err) {
      console.error('Failed to load workspace', err);
    } finally {
      setLoading(false);
    }
  };

  const handleStart = async () => {
    if (!runId) return;
    try {
      await api.startRun(runId);
      await fetchWorkspace(runId, isEvaluatorMode);
    } catch (err: any) {
      alert(`Failed to start clock: ${err.message}`);
    }
  };

  const handlePause = async () => {
    if (!runId) return;
    try {
      await api.pauseRun(runId);
      await fetchWorkspace(runId, isEvaluatorMode);
    } catch (err: any) {
      alert(`Failed to pause clock: ${err.message}`);
    }
  };

  const handleStop = async () => {
    if (!runId) return;
    try {
      await api.pauseRun(runId);
      await fetchWorkspace(runId, isEvaluatorMode);
    } catch (err: any) {
      alert(`Failed to stop clock: ${err.message}`);
    }
  };

  const handleStep = async (stepSeconds: number = 5.0) => {
    if (!runId) return;
    try {
      await api.stepRun(runId, stepSeconds);
      await fetchWorkspace(runId, isEvaluatorMode);
    } catch (err: any) {
      alert(`Failed to step simulation: ${err.message}`);
    }
  };

  const handleStepRelative = async (stepSeconds: number) => {
    if (!runId) return;
    try {
      await api.stepRun(runId, stepSeconds);
      await fetchWorkspace(runId, isEvaluatorMode);
    } catch (err: any) {
      alert(`Failed to seek simulation: ${err.message}`);
    }
  };

  const handleReset = async () => {
    if (!runId) return;
    try {
      await api.resetRun(runId);
      await fetchWorkspace(runId, isEvaluatorMode);
    } catch (err: any) {
      alert(`Failed to reset simulation: ${err.message}`);
    }
  };

  const handleSeek = async (targetSimTime: number) => {
    if (!runId || !workspace) return;
    const current = workspace.run_state.current_sim_time;
    const diff = targetSimTime - current;
    if (Math.abs(diff) > 0.1) {
      await handleStepRelative(diff);
    }
  };

  const handleSubmitDecision = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!runId || !selectedEntityId) return;

    try {
      setSubmittingDecision(true);
      await api.recordDecision(runId, {
        target_entity_id: selectedEntityId,
        simulation_time: currentSimTime,
        decision_type: decisionType,
        selected_classification: selectedClassification,
        threat_assessment: threatAssessment,
        confidence: Number(confidence),
        rationale: rationale.trim() || undefined,
      });

      // Clear rationale and refresh workspace to show newly recorded decision
      setRationale('');
      await fetchWorkspace(runId, isEvaluatorMode);
    } catch (err: any) {
      alert(`Failed to log decision: ${err.message}`);
    } finally {
      setSubmittingDecision(false);
    }
  };

  const runState = workspace?.run_state;
  const currentSimTime = runState?.current_sim_time ?? 0;
  const duration = runState?.duration_seconds ?? 120;

  // Active unique entities observed so far
  const activeEntities = Array.from(
    new Set(
      workspace?.visible_observations.map((obs) => obs.trainee_payload.entity_id) || []
    )
  );

  // Selected Observation metadata details
  const selectedObs = selectedEntityId
    ? workspace?.visible_observations.find(
        (obs) => obs.trainee_payload.entity_id === selectedEntityId
      )
    : null;

  return (
    <div className="space-y-4 max-w-7xl mx-auto pb-8">
      {/* Simulation Workspace Header (Level 2 Translucent Work Surface) */}
      <div className="p-3 sm:p-3.5 rounded-xl glass-card flex flex-col md:flex-row items-start md:items-center justify-between gap-3 shadow-level1">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#7047C8]/20 text-[#00CFE8] border border-white/[0.12]">
            <Crosshair className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-lg font-bold text-[#F4F5F7] font-mono tracking-tight">
                {runState?.scenario_name || 'Active Simulation'}
              </h1>
              <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                runState?.status === 'RUNNING' ? 'bg-[#7047C8]/25 text-[#00CFE8] border border-white/[0.12]' :
                runState?.status === 'COMPLETED' ? 'bg-emerald-950/70 text-emerald-400 border border-emerald-800' :
                'bg-[#191C23] text-[#858B99] border border-white/[0.12]'
              }`}>
                {runState?.status}
              </span>
            </div>
            <p className="text-[11px] text-[#858B99] font-mono mt-0.5">
              Run ID: <span className="tabular-stat">{runState?.id.slice(0, 8)}</span>... | Seed: <span className="tabular-stat">{runState?.seed}</span> | Trainee: {runState?.trainee_id}
            </p>
          </div>
        </div>

        {/* Simulation Controls & Evaluator Toggle */}
        <div className="flex flex-wrap items-center gap-1.5">
          {runState?.status === 'RUNNING' ? (
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handlePause}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#191C23] hover:bg-amber-950/40 text-amber-300 border border-amber-700/50 text-xs font-mono font-semibold transition-colors"
              >
                <Pause className="w-3.5 h-3.5" /> Pause
              </button>
              <button
                type="button"
                onClick={handleStop}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#191C23] hover:bg-rose-950/40 text-rose-300 border border-rose-700/50 text-xs font-mono font-semibold transition-colors"
                title="Stop Simulation"
              >
                <Square className="w-3.5 h-3.5" /> Stop
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleStart}
              disabled={runState?.status === 'COMPLETED'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-primary text-xs font-mono font-semibold disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5 fill-current" /> {runState?.status === 'PAUSED' ? 'Resume' : 'Start Clock'}
            </button>
          )}

          <button
            type="button"
            onClick={() => handleStepRelative(-5.0)}
            disabled={currentSimTime <= 0}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg btn-secondary text-xs font-mono font-medium disabled:opacity-40"
            title="Step Back -5s"
          >
            <Rewind className="w-3 h-3 text-[#00CFE8]" /> -5s
          </button>

          <button
            type="button"
            onClick={() => handleStep(5.0)}
            disabled={runState?.status === 'COMPLETED'}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg btn-secondary text-xs font-mono font-medium disabled:opacity-40"
            title="Step Forward +5s"
          >
            <StepForward className="w-3.5 h-3.5 text-[#00CFE8]" /> +5s
          </button>

          <button
            type="button"
            onClick={handleReset}
            className="p-1.5 rounded-lg btn-secondary text-[#858B99] hover:text-[#F4F5F7] transition-colors"
            title="Reset Simulation to 0s"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          {/* Evaluator Ground Truth Mode Toggle */}
          <button
            type="button"
            onClick={() => setIsEvaluatorMode(!isEvaluatorMode)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-colors ${
              isEvaluatorMode
                ? 'bg-[#7047C8]/25 text-[#00CFE8] border-white/[0.12]'
                : 'bg-[#191C23] text-[#858B99] border-white/[0.12] hover:text-[#F4F5F7]'
            }`}
          >
            {isEvaluatorMode ? <Eye className="w-3.5 h-3.5 text-[#00CFE8]" /> : <EyeOff className="w-3.5 h-3.5" />}
            {isEvaluatorMode ? 'Truth ON' : 'Trainee View'}
          </button>

          {/* Evaluate / Review Direct Link */}
          <Link
            to={`/review?run_id=${runId}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg btn-secondary text-[#00CFE8] text-xs font-mono font-semibold"
          >
            <Award className="w-3.5 h-3.5" /> Score & Review
          </Link>
        </div>
      </div>

      {/* Clock and Evidence Counters Bar */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2 text-xs font-mono">
        <div className="p-2.5 rounded-lg surface-structural flex flex-col sm:flex-row sm:items-center justify-between gap-1 min-w-0">
          <span className="text-[#858B99] flex items-center gap-1.5 text-[10.5px] shrink-0 font-medium">
            <Clock className="w-3 h-3 text-[#00CFE8]" /> CLOCK
          </span>
          <span className="text-[#F4F5F7] font-bold text-xs truncate tabular-stat">
            {currentSimTime.toFixed(1)}s / {duration}s
          </span>
        </div>

        <div className="p-2.5 rounded-lg surface-structural flex flex-col sm:flex-row sm:items-center justify-between gap-1 min-w-0">
          <span className="text-[#858B99] text-[10.5px] shrink-0 font-medium">DELIVERED</span>
          <span className="text-emerald-400 font-bold text-xs tabular-stat">
            {runState?.delivered_observations_count ?? 0}
          </span>
        </div>

        <div className="p-2.5 rounded-lg surface-structural flex flex-col sm:flex-row sm:items-center justify-between gap-1 min-w-0">
          <span className="text-[#858B99] text-[10.5px] shrink-0 font-medium">DELAYED PENDING</span>
          <span className="text-[#E9A23B] font-bold text-xs tabular-stat">
            {runState?.pending_delayed_count ?? 0}
          </span>
        </div>

        <div className="p-2.5 rounded-lg surface-structural flex flex-col sm:flex-row sm:items-center justify-between gap-1 min-w-0">
          <span className="text-[#858B99] text-[10.5px] shrink-0 font-medium">PACKETS DROPPED</span>
          <span className="text-rose-400 font-bold text-xs tabular-stat">
            {runState?.lost_observations_count ?? 0}
          </span>
        </div>

        <div className="p-2.5 rounded-lg surface-structural flex flex-col sm:flex-row sm:items-center justify-between gap-1 min-w-0 col-span-2 md:col-span-1">
          <span className="text-[#858B99] text-[10.5px] shrink-0 font-medium">DECISIONS</span>
          <span className="text-[#00CFE8] font-bold text-xs tabular-stat">
            {runState?.trainee_decisions_count ?? 0}
          </span>
        </div>
      </div>

      {/* Main Simulation Viewport (3D Scene / Radar Display + Trainee Decision Panel) */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* Left / Center: Interactive 3D / 2D Canvas (8 Cols on xl) */}
        <div className="xl:col-span-8 space-y-3.5 min-w-0">
          {/* View Mode Toggle: 3D Battlespace vs 2D Tactical Radar */}
          <div className="flex items-center justify-between p-2 rounded-lg glass-card text-xs font-mono">
            <div className="flex items-center gap-1.5">
              <span className="text-[#858B99] font-semibold px-2 text-[11px]">VIEWPORT:</span>
              <button
                type="button"
                onClick={() => setViewMode('3D')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === '3D'
                    ? 'bg-[#7047C8] text-[#F4F5F7] border border-white/[0.14]'
                    : 'text-[#858B99] hover:text-[#F4F5F7]'
                }`}
              >
                3D Interactive Scene (Three.js)
              </button>
              <button
                type="button"
                onClick={() => setViewMode('2D')}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                  viewMode === '2D'
                    ? 'bg-[#7047C8] text-[#F4F5F7] border border-white/[0.14]'
                    : 'text-[#858B99] hover:text-[#F4F5F7]'
                }`}
              >
                2D Tactical Radar
              </button>
            </div>

            <Link
              to={`/telemetry?run_id=${runId}`}
              className="text-[11px] text-[#00CFE8] hover:underline flex items-center gap-1 px-2"
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
          <div className="p-3.5 rounded-xl glass-card space-y-2 text-xs font-mono shadow-level1">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
              <div className="flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-[#00CFE8]" />
                <span className="font-bold text-[#F4F5F7]">MISSION REPLAY & TIMELINE SCRUBBER</span>
                <span className="text-[10px] text-[#858B99] tabular-stat">
                  [{currentSimTime.toFixed(1)}s / {duration}s]
                </span>
              </div>

              {/* Scrubber Quick Step Buttons */}
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleStepRelative(-5.0)}
                  className="px-2 py-0.5 rounded btn-secondary text-[#858B99] hover:text-[#F4F5F7] text-[10px] font-semibold"
                >
                  -5s
                </button>
                <button
                  type="button"
                  onClick={() => handleStepRelative(-1.0)}
                  className="px-2 py-0.5 rounded btn-secondary text-[#858B99] hover:text-[#F4F5F7] text-[10px] font-semibold"
                >
                  -1s
                </button>
                <button
                  type="button"
                  onClick={() => handleStepRelative(1.0)}
                  className="px-2 py-0.5 rounded btn-secondary text-[#858B99] hover:text-[#F4F5F7] text-[10px] font-semibold"
                >
                  +1s
                </button>
                <button
                  type="button"
                  onClick={() => handleStepRelative(5.0)}
                  className="px-2 py-0.5 rounded btn-secondary text-[#858B99] hover:text-[#F4F5F7] text-[10px] font-semibold"
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
                className="w-full accent-[#00CFE8] h-1.5 bg-[#111318] rounded-lg cursor-pointer"
              />
            </div>

            <div className="flex justify-between items-center text-[10px] text-[#858B99]">
              <span>0.0s (Incursion Ingress)</span>
              <span className="text-[#00CFE8] font-medium">
                {runState?.status === 'COMPLETED' ? 'Mission Concluded • Replay Active' : 'Live Interactive Mission Engine'}
              </span>
              <span className="tabular-stat">{duration}s (Mission Horizon)</span>
            </div>
          </div>

          {/* Quick Target Contact Selector Tabs */}
          <div className="p-2.5 rounded-lg surface-structural flex items-center gap-2 overflow-x-auto text-xs font-mono">
            <span className="text-slate-500 dark:text-[#858B99] text-[11px] shrink-0 font-medium">Observed Contacts:</span>
            {activeEntities.length === 0 ? (
              <span className="text-slate-400 dark:text-[#858B99]/60 italic text-[11px]">No sensor telemetry delivered yet. Advance simulation clock...</span>
            ) : (
              activeEntities.map((eid) => (
                <button
                  key={eid}
                  onClick={() => setSelectedEntityId(eid)}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors shrink-0 ${
                    selectedEntityId === eid
                      ? 'bg-[#0284C7] dark:bg-[#7047C8] text-white dark:text-[#F4F5F7] border border-sky-300 dark:border-white/[0.14]'
                      : 'bg-slate-100 dark:bg-[#191C23] text-slate-700 dark:text-[#F4F5F7] hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/[0.12]'
                  }`}
                >
                  {eid}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Right: Trainee Decision & Action Console (4 Cols on xl) */}
        <div className="xl:col-span-4 space-y-4 min-w-0">
          {/* Selected Target Live Telemetry & Evidence Details Card */}
          {selectedEntityId && (
            <div className="p-4 rounded-xl glass-card space-y-3 font-mono text-xs shadow-sm dark:shadow-level1">
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.10] pb-2">
                <div className="flex items-center gap-2">
                  <Activity className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#00CFE8]" />
                  <span className="font-bold text-slate-900 dark:text-[#F4F5F7] tracking-wide text-xs">
                    CONTACT TELEMETRY: {selectedEntityId}
                  </span>
                </div>
                <span className="text-[9.5px] px-1.5 py-0.5 rounded bg-sky-50 dark:bg-[#7047C8]/20 text-[#0284C7] dark:text-[#00CFE8] border border-sky-200 dark:border-white/[0.12] font-semibold">
                  {selectedObs ? selectedObs.trainee_payload.source_sensor : 'SYNTHETIC RADAR'}
                </span>
              </div>

              {selectedObs ? (
                <div className="space-y-2.5">
                  <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-[#08090B] p-2.5 rounded-lg border border-slate-200 dark:border-white/10 text-[11px]">
                    <div>
                      <span className="text-[9px] text-slate-500 dark:text-[#858B99] block font-mono">ALTITUDE</span>
                      <strong className="text-slate-900 dark:text-[#F4F5F7] text-xs tabular-stat">{Math.round(selectedObs.trainee_payload.observed_altitude)}m</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 dark:text-[#858B99] block font-mono">SPEED (EST)</span>
                      <strong className="text-slate-900 dark:text-[#F4F5F7] text-xs tabular-stat">{selectedObs.trainee_payload.observed_speed.toFixed(1)} m/s</strong>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-500 dark:text-[#858B99] block font-mono">BEARING</span>
                      <strong className="text-slate-900 dark:text-[#F4F5F7] text-xs tabular-stat">{Math.round(selectedObs.trainee_payload.estimated_bearing || 0)}°</strong>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div className="bg-slate-50 dark:bg-[#111318] p-2 rounded-lg border border-slate-200 dark:border-white/10">
                      <span className="text-[9px] text-slate-500 dark:text-[#858B99] block font-mono">POSITION</span>
                      <span className="text-[#0284C7] dark:text-[#00CFE8] text-[10px] tabular-stat">
                        X: {Math.round(selectedObs.trainee_payload.observed_pos_x)}m, Y: {Math.round(selectedObs.trainee_payload.observed_pos_y)}m
                      </span>
                    </div>
                    <div className="bg-slate-50 dark:bg-[#111318] p-2 rounded-lg border border-slate-200 dark:border-white/10">
                      <span className="text-[9px] text-slate-500 dark:text-[#858B99] block font-mono">SNR & QUALITY</span>
                      <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[10px] tabular-stat">
                        {selectedObs.trainee_payload.signal_to_noise_ratio_db.toFixed(1)} dB ({Math.round(selectedObs.quality_score * 100)}%)
                      </span>
                    </div>
                  </div>

                  {/* Sensor Cues & Weather Impact */}
                  {selectedObs.trainee_payload.sensor_cues && selectedObs.trainee_payload.sensor_cues.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1 pt-0.5">
                      <span className="text-[10px] text-slate-500 dark:text-[#858B99]">Cues:</span>
                      {selectedObs.trainee_payload.sensor_cues.map((cue, idx) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/[0.06] text-slate-700 dark:text-[#B3B7C2] border border-slate-200 dark:border-white/10">
                          {cue}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center text-[10px] text-slate-500 dark:text-[#858B99] pt-1.5 border-t border-slate-200 dark:border-white/10">
                    <span>Latency: <strong className="text-amber-600 dark:text-[#E9A23B] tabular-stat">+{selectedObs.delay_applied.toFixed(1)}s</strong></span>
                    <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> Isolated
                    </span>
                  </div>
                </div>
              ) : (
                <div className="text-center py-2 text-slate-400 dark:text-[#858B99] text-[11px] italic">
                  Awaiting sensor telemetry delivery for contact {selectedEntityId}...
                </div>
              )}
            </div>
          )}

          <div className="p-4 rounded-xl glass-card space-y-3.5 shadow-sm dark:shadow-level1">
            <div className="flex items-center justify-between border-b border-slate-200 dark:border-white/[0.10] pb-2.5">
              <div className="flex items-center gap-2 text-[#0284C7] dark:text-[#00CFE8]">
                <Crosshair className="w-4 h-4" />
                <h3 className="font-bold text-xs uppercase font-mono tracking-wider text-slate-900 dark:text-[#F4F5F7]">
                  Trainee Action Terminal
                </h3>
              </div>
              <span className="text-xs font-mono text-slate-500 dark:text-[#858B99]">
                Target: <span className="text-[#0284C7] dark:text-[#00CFE8] font-semibold">{selectedEntityId || 'None'}</span>
              </span>
            </div>

            <form onSubmit={handleSubmitDecision} className="space-y-3.5 text-xs font-mono">
              {/* Decision Action Type */}
              <div>
                <label className="block text-slate-600 dark:text-[#858B99] text-[11px] mb-1">Select Tactical Action</label>
                <div className="grid grid-cols-2 gap-1.5">
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
                      className={`p-2 rounded-lg border text-left text-[11px] font-semibold transition-colors ${
                        decisionType === action.id
                          ? 'bg-sky-50 dark:bg-[#7047C8]/20 text-[#0284C7] dark:text-[#00CFE8] border-sky-300 dark:border-white/[0.14]'
                          : 'bg-slate-50 dark:bg-[#111318] text-slate-700 dark:text-[#858B99] border-slate-200 dark:border-white/[0.10] hover:bg-slate-100 dark:hover:bg-white/[0.04]'
                      }`}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Classification & Threat Assessment */}
              {decisionType === 'CLASSIFY' && (
                <div className="space-y-2.5 p-2.5 rounded-lg bg-slate-50 dark:bg-[#08090B]/60 border border-slate-200 dark:border-white/[0.10]">
                  <div>
                    <label className="block text-slate-600 dark:text-[#858B99] text-[11px] mb-1">Drone Category</label>
                    <select
                      value={selectedClassification}
                      onChange={(e) => setSelectedClassification(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white dark:bg-[#111318] border border-slate-200 dark:border-white/[0.12] rounded-lg text-slate-900 dark:text-[#F4F5F7] text-xs focus:outline-none focus:border-[#0284C7] dark:focus:border-[#00CFE8]"
                    >
                      <option value="Micro-Quadcopter">Micro-Quadcopter (Reconnaissance)</option>
                      <option value="Fixed-Wing Loitering">Fixed-Wing Loitering (Kamikaze munition)</option>
                      <option value="Heavy Commercial">Heavy Commercial (Improvised payload)</option>
                      <option value="Friendly Civilian">Friendly Civilian (Remote-ID beacon)</option>
                      <option value="Wildlife Clutter">Wildlife Clutter (Flock of birds)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 dark:text-[#858B99] text-[11px] mb-1">Threat Assessment</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {['HOSTILE', 'SUSPICIOUS', 'FRIENDLY'].map((level) => (
                        <button
                          type="button"
                          key={level}
                          onClick={() => setThreatAssessment(level)}
                          className={`py-1.5 rounded-lg border text-[11px] font-semibold text-center transition-colors ${
                            threatAssessment === level
                              ? level === 'HOSTILE'
                                ? 'bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-300 border-rose-300 dark:border-rose-600'
                                : level === 'FRIENDLY'
                                ? 'bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-600'
                                : 'bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-600'
                              : 'bg-white dark:bg-[#111318] text-slate-600 dark:text-[#858B99] border-slate-200 dark:border-white/[0.10]'
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
                <div className="flex justify-between text-slate-600 dark:text-[#858B99] text-[11px] mb-1">
                  <span>Decision Confidence:</span>
                  <span className="text-[#0284C7] dark:text-[#00CFE8] font-semibold tabular-stat">{Math.round(confidence * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={1.0}
                  step={0.05}
                  value={confidence}
                  onChange={(e) => setConfidence(Number(e.target.value))}
                  className="w-full accent-[#0284C7] dark:accent-[#00CFE8] bg-slate-200 dark:bg-[#111318] h-1.5 rounded-lg cursor-pointer"
                />
              </div>

              {/* Trainee Rationale */}
              <div>
                <label className="block text-slate-600 dark:text-[#858B99] text-[11px] mb-1">Trainee Rationale (Optional)</label>
                <input
                  type="text"
                  value={rationale}
                  onChange={(e) => setRationale(e.target.value)}
                  placeholder="e.g. Ingress angle, high-speed signature, no remote ID"
                  className="w-full px-2.5 py-1.5 bg-white dark:bg-[#111318] border border-slate-200 dark:border-white/[0.12] rounded-lg text-slate-900 dark:text-[#F4F5F7] placeholder-slate-400 dark:placeholder-[#858B99]/40 focus:outline-none focus:border-[#0284C7] dark:focus:border-[#00CFE8]"
                />
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submittingDecision || !selectedEntityId}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg btn-primary font-mono text-xs font-semibold disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {submittingDecision ? 'Logging Decision...' : 'Commit Decision to Evidence Ledger'}
              </button>
            </form>
          </div>

          {/* Recent Decisions Recorded by Trainee */}
          <div className="p-4 rounded-xl surface-structural space-y-2.5">
            <h4 className="text-xs font-mono font-bold text-slate-900 dark:text-[#F4F5F7] uppercase tracking-wider flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Recorded Decisions ({workspace?.trainee_decisions.length || 0})
            </h4>

            {workspace?.trainee_decisions && workspace.trainee_decisions.length > 0 ? (
              <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                {workspace.trainee_decisions.map((dec) => (
                  <div
                    key={dec.id}
                    className="p-2 rounded-lg bg-slate-50 dark:bg-[#191C23] border border-slate-200 dark:border-white/10 text-[11px] font-mono flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-slate-900 dark:text-[#F4F5F7]">{dec.target_entity_id}</span>
                      <span className="text-slate-500 dark:text-[#858B99] ml-1.5">[{dec.decision_type}]</span>
                      <div className="text-[10px] text-slate-400 dark:text-[#858B99]/70 tabular-stat">
                        At {dec.simulation_time}s • Conf: {Math.round(dec.confidence * 100)}%
                      </div>
                    </div>

                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                      dec.evidence_status === 'ADEQUATE' ? 'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800' :
                      dec.evidence_status === 'EVIDENCE_LIMITED' ? 'bg-amber-50 dark:bg-amber-950 text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-800' :
                      'bg-rose-50 dark:bg-rose-950 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800'
                    }`}>
                      {dec.evidence_status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-3 text-slate-500 dark:text-[#858B99] font-mono text-[11px]">
                No decisions recorded for this run yet. Select a contact blip and submit action.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
