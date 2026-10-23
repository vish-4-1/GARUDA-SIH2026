import React, { useState, useEffect, useId } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sliders,
  Save,
  Play,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Activity,
  X
} from 'lucide-react';
import { api } from '../services/api';

interface FormErrors {
  name?: string;
  duration?: string;
  seed?: string;
  entities?: string;
}

export const ScenarioBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const scenarioIdParam = searchParams.get('scenario_id');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [startingSim, setStartingSim] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string; details?: string } | null>(null);

  // Form State
  const [name, setName] = useState('Custom Tactical Incursion');
  const [description, setDescription] = useState('Custom configured synthetic drone threat simulation scenario with multi-sensor degradation.');
  const [environment, setEnvironment] = useState('urban');
  const [difficulty, setDifficulty] = useState('Intermediate');
  const [durationSeconds, setDurationSeconds] = useState(120);
  const [seed, setSeed] = useState(42);

  // Degradation & Entity Configuration
  const [numEntities, setNumEntities] = useState(5);
  const [sensorReliability, setSensorReliability] = useState(0.85);
  const [delayMean, setDelayMean] = useState(2.5);
  const [delayJitter, setDelayJitter] = useState(1.0);
  const [lossRate, setLossRate] = useState(0.15);
  const [noiseLevel, setNoiseLevel] = useState(0.20);
  const [weather, setWeather] = useState('Clear Day');
  const [radarCoverage, setRadarCoverage] = useState(90);

  // Field validation errors
  const [errors, setErrors] = useState<FormErrors>({});

  // Unique accessible IDs for inputs
  const nameId = useId();
  const descId = useId();
  const envId = useId();
  const diffId = useId();
  const durationId = useId();
  const seedId = useId();
  const entitiesId = useId();
  const delayId = useId();
  const lossId = useId();
  const noiseId = useId();
  const weatherId = useId();
  const reliabilityId = useId();

  useEffect(() => {
    if (scenarioIdParam) {
      loadExistingScenario(scenarioIdParam);
    }
  }, [scenarioIdParam]);

  const loadExistingScenario = async (id: string) => {
    try {
      setLoading(true);
      setFeedback(null);
      const sc = await api.getScenario(id);
      setName(sc.name);
      setDescription(sc.description || '');
      setEnvironment(sc.environment);
      setDifficulty(sc.difficulty);
      setDurationSeconds(sc.duration_seconds);
      setSeed(sc.seed);

      if (sc.configuration) {
        setNumEntities(sc.configuration.num_entities);
        setSensorReliability(sc.configuration.sensor_reliability);
        setDelayMean(sc.configuration.observation_delay_mean);
        setDelayJitter(sc.configuration.observation_delay_jitter);
        setLossRate(sc.configuration.observation_loss_rate);
        setNoiseLevel(sc.configuration.noise_level);
        setWeather(sc.configuration.weather);
        setRadarCoverage(sc.configuration.radar_coverage_percent);
      }
    } catch (err: any) {
      console.error('Failed to load scenario', err);
      setFeedback({
        type: 'error',
        message: 'Unable to load specified scenario',
        details: err?.message || 'Scenario not found or database unavailable.'
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Scenario name is required';
    } else if (name.trim().length < 3) {
      newErrors.name = 'Scenario name must be at least 3 characters';
    }

    if (!durationSeconds || durationSeconds < 30 || durationSeconds > 600) {
      newErrors.duration = 'Duration must be between 30 and 600 seconds';
    }

    if (!seed || isNaN(seed) || seed < 1 || seed > 999999) {
      newErrors.seed = 'Seed must be a valid integer between 1 and 999,999';
    }

    if (!numEntities || numEntities < 2 || numEntities > 15) {
      newErrors.entities = 'Entity count must be between 2 and 15 UAVs';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleRandomizeSeed = () => {
    const newSeed = Math.floor(Math.random() * 90000) + 1000;
    setSeed(newSeed);
    if (errors.seed) {
      setErrors((prev) => ({ ...prev, seed: undefined }));
    }
  };

  const handleSaveScenario = async () => {
    if (!validateForm()) {
      setFeedback({
        type: 'error',
        message: 'Validation Failed',
        details: 'Please correct the highlighted fields before saving.'
      });
      return;
    }

    try {
      setSaving(true);
      setFeedback(null);

      const payload = {
        name: name.trim(),
        description: description.trim(),
        environment,
        difficulty,
        duration_seconds: Number(durationSeconds),
        seed: Number(seed),
        configuration: {
          num_entities: Number(numEntities),
          threat_density: numEntities > 6 ? 'high' : 'medium',
          sensor_reliability: Number(sensorReliability),
          observation_delay_mean: Number(delayMean),
          observation_delay_jitter: Number(delayJitter),
          observation_loss_rate: Number(lossRate),
          noise_level: Number(noiseLevel),
          weather,
          radar_coverage_percent: Number(radarCoverage),
          rf_scanner_enabled: 1,
          acoustic_sensor_enabled: 1,
          optical_eoir_enabled: 1,
        },
      };

      let savedScenario;
      if (scenarioIdParam) {
        // Update existing
        savedScenario = await api.updateScenario(scenarioIdParam, payload);
        setFeedback({
          type: 'success',
          message: 'Scenario Updated Successfully',
          details: `"${savedScenario.name}" was updated with current parameters (ID: ${savedScenario.id.slice(0, 8)}...).`
        });
      } else {
        // Create new
        savedScenario = await api.createScenario(payload);
        setSearchParams({ scenario_id: savedScenario.id });
        setFeedback({
          type: 'success',
          message: 'Scenario Created Successfully',
          details: `"${savedScenario.name}" was saved to the library with deterministic seed ${savedScenario.seed}.`
        });
      }
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: 'Failed to Save Scenario',
        details: err?.message || 'Server error occurred while persisting configuration.'
      });
    } finally {
      setSaving(false);
    }
  };

  const handleStartSimulation = async () => {
    if (!validateForm()) {
      setFeedback({
        type: 'error',
        message: 'Validation Failed',
        details: 'Please correct the highlighted fields before launching the simulation.'
      });
      return;
    }

    try {
      setStartingSim(true);
      setFeedback(null);

      const payload = {
        name: name.trim(),
        description: description.trim(),
        environment,
        difficulty,
        duration_seconds: Number(durationSeconds),
        seed: Number(seed),
        configuration: {
          num_entities: Number(numEntities),
          threat_density: numEntities > 6 ? 'high' : 'medium',
          sensor_reliability: Number(sensorReliability),
          observation_delay_mean: Number(delayMean),
          observation_delay_jitter: Number(delayJitter),
          observation_loss_rate: Number(lossRate),
          noise_level: Number(noiseLevel),
          weather,
          radar_coverage_percent: Number(radarCoverage),
          rf_scanner_enabled: 1,
          acoustic_sensor_enabled: 1,
          optical_eoir_enabled: 1,
        },
      };

      let targetScenarioId = scenarioIdParam;

      if (targetScenarioId) {
        await api.updateScenario(targetScenarioId, payload);
      } else {
        const sc = await api.createScenario(payload);
        targetScenarioId = sc.id;
      }

      // Create simulation run
      const run = await api.createRun({
        scenario_id: targetScenarioId,
        trainee_id: 'Trainee-Alpha',
        custom_seed: Number(seed),
      });

      // Start the simulation run clock
      await api.startRun(run.id);

      // Navigate to simulation page
      navigate(`/simulation?run_id=${run.id}`);
    } catch (err: any) {
      console.error('Launch failure:', err);
      setFeedback({
        type: 'error',
        message: 'Simulation Launch Failed',
        details: err?.message || 'Could not initialize simulation engine. Verify that the simulation service is online.'
      });
      setStartingSim(false);
    }
  };

  // Metric derivations
  const estimatedTotalObservations = Math.round((durationSeconds / 2.0) * numEntities);
  const estimatedDeliveryRate = Math.round((1 - lossRate) * 100);

  const getLossRiskBadge = (loss: number) => {
    if (loss <= 0.10) return { label: 'Low Loss', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (loss <= 0.25) return { label: 'Tactical Jamming', color: 'text-[#E9A23B] bg-[#E9A23B]/10 border-[#E9A23B]/20' };
    return { label: 'Severe Denial', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
  };

  const getLatencyRiskBadge = (delay: number) => {
    if (delay <= 1.0) return { label: 'Near Real-Time', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (delay <= 3.5) return { label: 'Moderate Lag', color: 'text-[#00CFE8] bg-[#00CFE8]/10 border-[#00CFE8]/20' };
    return { label: 'Heavy Satcom Delay', color: 'text-[#E9A23B] bg-[#E9A23B]/10 border-[#E9A23B]/20' };
  };

  const getNoiseRiskBadge = (noise: number) => {
    if (noise <= 0.10) return { label: 'High Precision', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' };
    if (noise <= 0.25) return { label: 'Moderate Scatter', color: 'text-[#00CFE8] bg-[#00CFE8]/10 border-[#00CFE8]/20' };
    return { label: 'Severe Blur', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' };
  };

  const lossBadge = getLossRiskBadge(lossRate);
  const latencyBadge = getLatencyRiskBadge(delayMean);
  const noiseBadge = getNoiseRiskBadge(noiseLevel);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Top Header & Navigation Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#7047C8]/20 border border-white/[0.12] text-[#00CFE8]">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-[#F4F5F7] tracking-tight">
                  Scenario Builder
                </h1>
                {scenarioIdParam && (
                  <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-[#7047C8]/25 text-[#00CFE8] border border-white/[0.12]">
                    Editing Mode
                  </span>
                )}
              </div>
              <p className="text-xs text-[#858B99] mt-0.5">
                Configure synthetic drone threat vectors, physical transmission latencies, and sensor degradation parameters.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          {scenarioIdParam && (
            <button
              type="button"
              onClick={() => {
                setSearchParams({});
                setName('Custom Tactical Incursion');
                setSeed(Math.floor(Math.random() * 90000) + 1000);
                setFeedback(null);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-mono text-[#858B99] hover:text-[#F4F5F7] hover:bg-white/5 border border-white/[0.12] transition-colors"
            >
              New Scenario
            </button>
          )}

          <button
            type="button"
            id="scenario-save-btn"
            onClick={handleSaveScenario}
            disabled={saving || startingSim || loading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg btn-secondary text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-3.5 h-3.5 text-[#00CFE8]" />
            {saving ? 'Saving...' : scenarioIdParam ? 'Update Scenario' : 'Save Scenario'}
          </button>

          <button
            type="button"
            id="scenario-start-sim-btn"
            onClick={handleStartSimulation}
            disabled={saving || startingSim || loading}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-1.5 rounded-lg btn-primary text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {startingSim ? 'Initializing...' : 'Start Simulation'}
          </button>
        </div>
      </div>

      {/* Feedback Banner */}
      {feedback && (
        <div
          role="alert"
          className={`p-3.5 rounded-lg border flex items-start justify-between gap-3 transition-all ${
            feedback.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="text-xs font-bold uppercase tracking-wider">{feedback.message}</div>
              {feedback.details && (
                <div className="text-xs text-[#858B99] mt-0.5 font-sans leading-relaxed">
                  {feedback.details}
                </div>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-[#858B99] hover:text-[#F4F5F7] p-1 transition-colors"
            aria-label="Dismiss message"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Two-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Main Configuration Area (~67% desktop width) */}
        <div className="lg:col-span-8 space-y-5">
          {/* SECTION 1: Mission Baseline Identity */}
          <section className="p-5 rounded-xl surface-structural space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00CFE8]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#F4F5F7]">
                  1. Mission Baseline Identity
                </h2>
              </div>
              <span className="text-[10.5px] font-mono text-[#858B99]">
                Tactical Parameters
              </span>
            </div>

            <div className="space-y-3.5">
              {/* Scenario Name */}
              <div>
                <label htmlFor={nameId} className="block text-xs font-mono text-[#858B99] mb-1">
                  Scenario Name <span className="text-rose-400">*</span>
                </label>
                <input
                  id={nameId}
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                  }}
                  className={`w-full px-3 py-2 bg-[#08090B] border rounded-lg text-xs text-[#F4F5F7] focus:outline-none transition-colors ${
                    errors.name ? 'border-rose-500/80 focus:border-rose-500' : 'border-white/[0.12] focus:border-[#00CFE8]'
                  }`}
                  placeholder="e.g. Operation Sentinel: High Altitude Swarm Ingress"
                />
                {errors.name && (
                  <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.name}
                  </p>
                )}
              </div>

              {/* Mission Description */}
              <div>
                <label htmlFor={descId} className="block text-xs font-mono text-[#858B99] mb-1">
                  Mission Description
                </label>
                <textarea
                  id={descId}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 bg-[#08090B] border border-white/[0.12] rounded-lg text-xs text-[#F4F5F7] focus:outline-none focus:border-[#00CFE8] leading-relaxed"
                  placeholder="Operational briefing, designated target perimeter, and scenario objectives..."
                />
              </div>

              {/* Environment, Difficulty, Duration Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                <div>
                  <label htmlFor={envId} className="block text-xs font-mono text-[#858B99] mb-1">
                    Environment
                  </label>
                  <select
                    id={envId}
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="w-full px-3 py-2 bg-[#08090B] border border-white/[0.12] rounded-lg text-xs text-[#F4F5F7] focus:outline-none focus:border-[#00CFE8]"
                  >
                    <option value="urban">Urban (Skyscrapers / Reflections)</option>
                    <option value="coastal">Coastal (Sea Clutter & Mist)</option>
                    <option value="border">Border (Remote Outposts / Hills)</option>
                    <option value="rural">Rural (Open Fields / Farmland)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor={diffId} className="block text-xs font-mono text-[#858B99] mb-1">
                    Difficulty Level
                  </label>
                  <select
                    id={diffId}
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 bg-[#08090B] border border-white/[0.12] rounded-lg text-xs text-[#F4F5F7] focus:outline-none focus:border-[#00CFE8]"
                  >
                    <option value="Beginner">Beginner (Prompt & Clear)</option>
                    <option value="Intermediate">Intermediate (Delayed & Noisy)</option>
                    <option value="Advanced">Advanced (Severe Degradation)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor={durationId} className="block text-xs font-mono text-[#858B99] mb-1">
                    Duration (Seconds)
                  </label>
                  <input
                    id={durationId}
                    type="number"
                    min={30}
                    max={600}
                    step={10}
                    value={durationSeconds}
                    onChange={(e) => {
                      setDurationSeconds(Number(e.target.value));
                      if (errors.duration) setErrors((prev) => ({ ...prev, duration: undefined }));
                    }}
                    className={`w-full px-3 py-2 bg-[#08090B] border rounded-lg text-xs text-[#F4F5F7] font-mono tabular-stat focus:outline-none transition-colors ${
                      errors.duration ? 'border-rose-500/80 focus:border-rose-500' : 'border-white/[0.12] focus:border-[#00CFE8]'
                    }`}
                  />
                  {errors.duration && (
                    <p className="text-[11px] text-rose-400 mt-1">{errors.duration}</p>
                  )}
                </div>
              </div>

              {/* Seed & Synthetic Threat Count Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-3 border-t border-white/[0.08]">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor={seedId} className="text-xs font-mono text-[#858B99]">
                      Deterministic Random Seed
                    </label>
                    <span className="text-[10px] font-mono text-[#00CFE8]">PRNG State</span>
                  </div>
                  <div className="flex gap-2">
                    <input
                      id={seedId}
                      type="number"
                      min={1}
                      max={999999}
                      value={seed}
                      onChange={(e) => {
                        setSeed(Number(e.target.value));
                        if (errors.seed) setErrors((prev) => ({ ...prev, seed: undefined }));
                      }}
                      className={`flex-1 px-3 py-2 bg-[#08090B] border rounded-lg text-xs text-[#F4F5F7] font-mono tabular-stat focus:outline-none ${
                        errors.seed ? 'border-rose-500/80' : 'border-white/[0.12] focus:border-[#00CFE8]'
                      }`}
                    />
                    <button
                      type="button"
                      onClick={handleRandomizeSeed}
                      className="px-3 py-2 rounded-lg btn-secondary text-xs font-mono text-[#00CFE8] flex items-center gap-1.5 transition-colors"
                      title="Generate new pseudo-random seed"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      Randomize
                    </button>
                  </div>
                  {errors.seed ? (
                    <p className="text-[11px] text-rose-400 mt-1">{errors.seed}</p>
                  ) : (
                    <p className="text-[10px] text-[#858B99]/70 mt-1 leading-normal">
                      Deterministic seed ensures identical drone flight vectors for reproducible testing.
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor={entitiesId} className="text-xs font-mono text-[#858B99]">
                      Synthetic Threat Entities Count
                    </label>
                    <span className="text-xs font-mono font-bold text-[#00CFE8] px-2 py-0.5 rounded bg-[#7047C8]/20 border border-white/[0.08]">
                      {numEntities} UAVs
                    </span>
                  </div>
                  <input
                    id={entitiesId}
                    type="range"
                    min={2}
                    max={15}
                    step={1}
                    value={numEntities}
                    onChange={(e) => {
                      setNumEntities(Number(e.target.value));
                      if (errors.entities) setErrors((prev) => ({ ...prev, entities: undefined }));
                    }}
                    className="w-full accent-[#00CFE8] bg-[#08090B] h-2 rounded-lg cursor-pointer mt-2"
                    aria-label="Threat entity count slider from 2 to 15"
                  />
                  <div className="flex justify-between text-[10px] text-[#858B99]/70 font-mono mt-1">
                    <span>2 (Single Target)</span>
                    <span>8 (Squadron)</span>
                    <span>15 (Swarm Defense)</span>
                  </div>
                  {errors.entities && (
                    <p className="text-[11px] text-rose-400 mt-1">{errors.entities}</p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: Sensor Degradation and Intelligence Quality */}
          <section className="p-5 rounded-xl surface-structural space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-[#E9A23B]" />
                <h2 className="text-xs font-bold uppercase tracking-wider text-[#F4F5F7]">
                  2. Sensor Degradation & Intelligence Quality
                </h2>
              </div>
              <span className="text-[10.5px] font-mono text-[#00CFE8] bg-[#7047C8]/20 px-2 py-0.5 rounded border border-white/[0.12]">
                Evidence-Aware Simulation Parameters
              </span>
            </div>

            <div className="space-y-4">
              {/* Observation Transmission Latency */}
              <div className="p-3.5 rounded-lg bg-[#08090B]/60 border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor={delayId} className="text-xs font-mono font-medium text-[#F4F5F7]">
                      Observation Transmission Latency (Mean Delay)
                    </label>
                    <p className="text-[11px] text-[#858B99] mt-0.5">
                      Delay before radar and RF packets reach the trainee terminal. Mimics network hops and satcom latency.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10.5px] font-mono px-2 py-0.5 rounded border ${latencyBadge.color}`}>
                      {latencyBadge.label}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#00CFE8] bg-[#111318] px-2.5 py-1 rounded border border-white/[0.12] tabular-stat">
                      {delayMean.toFixed(1)}s (±{delayJitter.toFixed(1)}s)
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-[#858B99] mb-1">
                      <span>Mean Delay: {delayMean.toFixed(1)}s</span>
                      <span>Range: 0.2s – 10.0s</span>
                    </div>
                    <input
                      id={delayId}
                      type="range"
                      min={0.2}
                      max={10.0}
                      step={0.2}
                      value={delayMean}
                      onChange={(e) => setDelayMean(Number(e.target.value))}
                      className="w-full accent-[#00CFE8] bg-[#111318] h-2 rounded-lg cursor-pointer"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between text-[10px] font-mono text-[#858B99] mb-1">
                      <span>Latency Jitter: ±{delayJitter.toFixed(1)}s</span>
                      <span>Range: 0.1s – 3.0s</span>
                    </div>
                    <input
                      type="range"
                      min={0.1}
                      max={3.0}
                      step={0.1}
                      value={delayJitter}
                      onChange={(e) => setDelayJitter(Number(e.target.value))}
                      className="w-full accent-[#00CFE8] bg-[#111318] h-2 rounded-lg cursor-pointer"
                      aria-label="Latency jitter slider"
                    />
                  </div>
                </div>
              </div>

              {/* Observation Loss Rate */}
              <div className="p-3.5 rounded-lg bg-[#08090B]/60 border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor={lossId} className="text-xs font-mono font-medium text-[#F4F5F7]">
                      Observation Loss Rate (Jamming & Drop Probability)
                    </label>
                    <p className="text-[11px] text-[#858B99] mt-0.5">
                      Percentage of sensor packets dropped due to electronic countermeasures or terrain masking.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10.5px] font-mono px-2 py-0.5 rounded border ${lossBadge.color}`}>
                      {lossBadge.label}
                    </span>
                    <span className="text-xs font-mono font-bold text-[#E9A23B] bg-[#111318] px-2.5 py-1 rounded border border-white/[0.12] tabular-stat">
                      {Math.round(lossRate * 100)}% Drop
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  <input
                    id={lossId}
                    type="range"
                    min={0.0}
                    max={0.50}
                    step={0.02}
                    value={lossRate}
                    onChange={(e) => setLossRate(Number(e.target.value))}
                    className="w-full accent-[#E9A23B] bg-[#111318] h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#858B99] mt-1">
                    <span>0% (Full Reliability)</span>
                    <span>25% (Tactical Jamming)</span>
                    <span>50% (Hostile EW Environment)</span>
                  </div>
                </div>
              </div>

              {/* Measurement Noise / Coordinate Uncertainty */}
              <div className="p-3.5 rounded-lg bg-[#08090B]/60 border border-white/[0.06] space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <label htmlFor={noiseId} className="text-xs font-mono font-medium text-[#F4F5F7]">
                      Measurement Noise / Coordinate Uncertainty
                    </label>
                    <p className="text-[11px] text-[#858B99] mt-0.5">
                      Gaussian coordinate jitter applied to observed radar blips and speed vectors.
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10.5px] font-mono px-2 py-0.5 rounded border ${noiseBadge.color}`}>
                      {noiseBadge.label}
                    </span>
                    <span className="text-xs font-mono font-bold text-rose-400 bg-[#111318] px-2.5 py-1 rounded border border-white/[0.12] tabular-stat">
                      {Math.round(noiseLevel * 100)}% Deviation
                    </span>
                  </div>
                </div>

                <div className="pt-1">
                  <input
                    id={noiseId}
                    type="range"
                    min={0.05}
                    max={0.50}
                    step={0.05}
                    value={noiseLevel}
                    onChange={(e) => setNoiseLevel(Number(e.target.value))}
                    className="w-full accent-rose-500 bg-[#111318] h-2 rounded-lg cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] font-mono text-[#858B99] mt-1">
                    <span>5% (Precise Sensor Locks)</span>
                    <span>25% (Atmospheric Scatter)</span>
                    <span>50% (High Coordinate Uncertainty)</span>
                  </div>
                </div>
              </div>

              {/* Atmospheric Conditions & Base Reliability Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-2 border-t border-white/[0.08]">
                <div>
                  <label htmlFor={weatherId} className="block text-xs font-mono text-[#858B99] mb-1">
                    Atmospheric Condition
                  </label>
                  <select
                    id={weatherId}
                    value={weather}
                    onChange={(e) => setWeather(e.target.value)}
                    className="w-full px-3 py-2 bg-[#08090B] border border-white/[0.12] rounded-lg text-xs text-[#F4F5F7] focus:outline-none focus:border-[#00CFE8]"
                  >
                    <option value="Clear Day">Clear Day (Nominal propagation)</option>
                    <option value="Heavy Rain">Heavy Rain (+10% Signal Loss)</option>
                    <option value="Dense Fog">Dense Fog (Optical / EOIR Degradation)</option>
                    <option value="High RF Jamming">High RF Jamming (Hostile EW Interference)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor={reliabilityId} className="text-xs font-mono text-[#858B99]">
                      Base Sensor Reliability
                    </label>
                    <span className="text-xs font-mono font-bold text-emerald-400 tabular-stat">
                      {Math.round(sensorReliability * 100)}%
                    </span>
                  </div>
                  <input
                    id={reliabilityId}
                    type="range"
                    min={0.50}
                    max={0.99}
                    step={0.01}
                    value={sensorReliability}
                    onChange={(e) => setSensorReliability(Number(e.target.value))}
                    className="w-full accent-emerald-500 bg-[#08090B] h-2 rounded-lg cursor-pointer mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-[#858B99]/70 font-mono mt-1">
                    <span>50% (Degraded Array)</span>
                    <span>99% (Mil-Spec Radar)</span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Live Configuration Summary Panel (~33% desktop width) */}
        <aside className="lg:col-span-4 space-y-4">
          <div className="p-5 rounded-xl glass-card space-y-3.5 sticky top-20 shadow-level2">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.08]">
              <div className="flex items-center gap-2 text-[#00CFE8]">
                <Activity className="w-4 h-4" />
                <h3 className="font-bold text-xs uppercase tracking-wider font-mono text-[#F4F5F7]">
                  Live Configuration Summary
                </h3>
              </div>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" title="Live reactive state" />
            </div>

            {/* Tactical Profile Card */}
            <div className="p-3 rounded-lg bg-[#111318]/90 border border-white/[0.08] space-y-1">
              <div className="text-[10px] font-mono text-[#858B99] uppercase tracking-wider">Tactical Profile</div>
              <div className="text-sm font-bold text-[#F4F5F7] tracking-tight">{name || 'Untitled Scenario'}</div>
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-[#7047C8]/20 text-[#00CFE8] border border-white/[0.08]">
                  {difficulty}
                </span>
                <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-[#858B99] border border-white/[0.08] capitalize">
                  {environment}
                </span>
                <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-white/[0.04] text-[#858B99] border border-white/[0.08] tabular-stat">
                  {durationSeconds}s
                </span>
              </div>
            </div>

            {/* Telemetry & Threat Metrics */}
            <div className="p-3 rounded-lg bg-[#111318]/90 border border-white/[0.08] space-y-2 text-xs font-mono">
              <div className="flex justify-between items-center">
                <span className="text-[#858B99]">Synthetic Threats:</span>
                <span className="text-[#F4F5F7] font-semibold tabular-stat">{numEntities} UAVs</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#858B99]">Deterministic Seed:</span>
                <span className="text-[#00CFE8] font-semibold tabular-stat">{seed}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#858B99]">Avg Packet Delay:</span>
                <span className="text-[#E9A23B] font-semibold tabular-stat">{delayMean.toFixed(1)}s (±{delayJitter.toFixed(1)}s)</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#858B99]">Packet Loss Risk:</span>
                <span className="text-rose-400 font-semibold tabular-stat">{Math.round(lossRate * 100)}%</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#858B99]">Coordinate Uncertainty:</span>
                <span className="text-rose-400 font-semibold tabular-stat">{Math.round(noiseLevel * 100)}%</span>
              </div>

              <div className="pt-2 border-t border-white/[0.06] flex justify-between items-center">
                <span className="text-[#858B99]">Delivered Rate (Est.):</span>
                <span className="text-emerald-400 font-semibold tabular-stat">~{estimatedDeliveryRate}%</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#858B99]">Total Packets (Est.):</span>
                <span className="text-[#F4F5F7] font-semibold tabular-stat">~{estimatedTotalObservations} frames</span>
              </div>
            </div>

            {/* Evaluation Integrity Assurance */}
            <div className="p-3 rounded-lg bg-[#7047C8]/15 border border-white/[0.12] text-xs space-y-1.5">
              <div className="font-semibold font-mono text-[#00CFE8] flex items-center gap-1.5 text-[10.5px] uppercase tracking-wider">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00CFE8]" />
                Evidence-Aware Evaluation Integrity
              </div>
              <p className="text-[11px] text-[#B3B7C2] leading-relaxed font-sans">
                The trainee is evaluated strictly against the <strong>delivered observations</strong> available at decision timestamp. Packets lost to the <strong>{Math.round(lossRate * 100)}% drop rate</strong> or delayed in transit are logged as <em>unassessable ground truth</em>, preventing unjust penalties.
              </p>
            </div>

            {/* Launch simulation direct action */}
            <div className="pt-1">
              <button
                type="button"
                id="scenario-summary-launch-btn"
                onClick={handleStartSimulation}
                disabled={saving || startingSim || loading}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg btn-primary font-mono text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                {startingSim ? 'Initializing Simulation...' : 'Launch Simulation With This Config'}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
