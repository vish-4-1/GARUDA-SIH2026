import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Sliders,
  Save,
  Play,
  RotateCcw,
  ShieldAlert,
  Radio,
  Wind,
  CheckCircle2,
  Info
} from 'lucide-react';
import { api } from '../services/api';

export const ScenarioBuilder: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const scenarioIdParam = searchParams.get('scenario_id');

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Form State
  const [name, setName] = useState('Custom Tactical Incursion');
  const [description, setDescription] = useState('Custom configured synthetic drone threat simulation scenario.');
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

  useEffect(() => {
    if (scenarioIdParam) {
      loadExistingScenario(scenarioIdParam);
    }
  }, [scenarioIdParam]);

  const loadExistingScenario = async (id: string) => {
    try {
      setLoading(true);
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
    } catch (err) {
      console.error('Failed to load scenario', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveScenario = async (startImmediately: boolean = false) => {
    if (!name.trim()) {
      alert('Please provide a scenario name');
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name,
        description,
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

      const sc = await api.createScenario(payload);

      if (startImmediately) {
        const run = await api.createRun({
          scenario_id: sc.id,
          trainee_id: 'Trainee-Alpha',
        });
        await api.startRun(run.id);
        navigate(`/simulation?run_id=${run.id}`);
      } else {
        alert('Scenario saved successfully!');
        navigate('/scenarios');
      }
    } catch (err: any) {
      alert(`Error saving scenario: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#F7F5FA] flex items-center gap-3">
            <Sliders className="w-7 h-7 text-[#00E5FF]" />
            Scenario Builder
          </h1>
          <p className="text-[#AAA3B5] text-xs mt-1">
            Configure synthetic drone threats, environment physics, transmission latencies, and sensor degradation.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSaveScenario(false)}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#15121C] hover:bg-[#3B0A6B]/30 text-[#F7F5FA] font-semibold text-sm border border-white/10 hover:border-[#00E5FF]/40 transition-all shadow-md"
          >
            <Save className="w-4 h-4 text-[#00E5FF]" />
            {saving ? 'Saving...' : 'Save Scenario'}
          </button>

          <button
            onClick={() => handleSaveScenario(true)}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00E5FF] hover:bg-[#00c8e0] text-[#050505] font-bold text-sm shadow-[0_0_20px_rgba(0,229,255,0.35)] transition-all"
          >
            <Play className="w-4 h-4 fill-current" />
            Start Simulation Directly
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Configuration Form (2 Columns) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Mission Parameters */}
          <div className="p-6 rounded-2xl bg-[#0D0B12]/85 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
            <h2 className="text-base font-bold text-[#F7F5FA] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF]" />
              1. Mission Baseline Identity
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-[#AAA3B5] mb-1">Scenario Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 bg-[#050505] border border-white/10 rounded-xl text-sm text-[#F7F5FA] focus:outline-none focus:border-[#00E5FF] font-mono"
                  placeholder="e.g. Charlie-4: Swarm Ingress in Heavy Fog"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-[#AAA3B5] mb-1">Mission Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3.5 py-2 bg-[#050505] border border-white/10 rounded-xl text-sm text-[#F7F5FA] focus:outline-none focus:border-[#00E5FF] leading-relaxed"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-mono text-[#AAA3B5] mb-1">Environment</label>
                  <select
                    value={environment}
                    onChange={(e) => setEnvironment(e.target.value)}
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-xl text-xs text-[#F7F5FA] focus:outline-none focus:border-[#00E5FF]"
                  >
                    <option value="urban">Urban (Skyscrapers / Reflections)</option>
                    <option value="coastal">Coastal (Sea Clutter & Mist)</option>
                    <option value="border">Border (Remote Outpost / Hills)</option>
                    <option value="rural">Rural (Open Fields / Farmland)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#AAA3B5] mb-1">Difficulty Level</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-xl text-xs text-[#F7F5FA] focus:outline-none focus:border-[#00E5FF]"
                  >
                    <option value="Beginner">Beginner (Prompt & Clear)</option>
                    <option value="Intermediate">Intermediate (Delayed & Noisy)</option>
                    <option value="Advanced">Advanced (Severe Degradation)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#AAA3B5] mb-1">Duration (Seconds)</label>
                  <input
                    type="number"
                    min={30}
                    max={600}
                    step={10}
                    value={durationSeconds}
                    onChange={(e) => setDurationSeconds(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-xl text-xs text-[#F7F5FA] focus:outline-none focus:border-[#00E5FF] font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-white/10">
                <div>
                  <label className="block text-xs font-mono text-[#AAA3B5] mb-1">
                    Deterministic Random Seed
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      value={seed}
                      onChange={(e) => setSeed(Number(e.target.value))}
                      className="flex-1 px-3 py-2 bg-[#050505] border border-white/10 rounded-xl text-xs text-[#F7F5FA] focus:outline-none focus:border-[#00E5FF] font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setSeed(Math.floor(Math.random() * 9000) + 100)}
                      className="px-3 py-2 rounded-xl bg-[#15121C] hover:bg-[#3B0A6B]/30 text-xs font-mono text-[#00E5FF] border border-white/10 hover:border-[#00E5FF]/40 transition-all"
                    >
                      Randomize
                    </button>
                  </div>
                  <p className="text-[10px] text-[#AAA3B5]/60 mt-1">
                    Same seed generates identical synthetic threat trajectories for SIH reproducibility.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#AAA3B5] mb-1">
                    Synthetic Threat Entities Count: <span className="text-[#00E5FF] font-bold">{numEntities}</span>
                  </label>
                  <input
                    type="range"
                    min={2}
                    max={15}
                    value={numEntities}
                    onChange={(e) => setNumEntities(Number(e.target.value))}
                    className="w-full accent-[#00E5FF] mt-2"
                  />
                  <div className="flex justify-between text-[10px] text-[#AAA3B5]/60 font-mono">
                    <span>2 (Single Target)</span>
                    <span>15 (Swarm Defense)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Sensor Degradation & Physical Interference Parameters */}
          <div className="p-6 rounded-2xl bg-[#0D0B12]/85 backdrop-blur-xl border border-white/10 shadow-xl space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#F7F5FA] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                2. Sensor Degradation & Intelligence Quality
              </h2>
              <span className="text-[11px] font-mono text-[#00E5FF] bg-[#241039] px-2 py-0.5 rounded border border-[#3B0A6B]">
                Core Innovation Parameters
              </span>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-[#AAA3B5]">Observation Transmission Latency (Mean Delay)</span>
                  <span className="text-[#00E5FF] font-bold">{delayMean.toFixed(1)}s (±{delayJitter.toFixed(1)}s jitter)</span>
                </div>
                <input
                  type="range"
                  min={0.2}
                  max={12.0}
                  step={0.2}
                  value={delayMean}
                  onChange={(e) => setDelayMean(Number(e.target.value))}
                  className="w-full accent-[#00E5FF]"
                />
                <p className="text-[10px] text-[#AAA3B5]/60">
                  Delay before radar/RF packets arrive at trainee terminal. Mimics network lag and satellite relay latency.
                </p>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-[#AAA3B5]">Observation Loss Rate (Jamming Packet Drop)</span>
                  <span className="text-amber-400 font-bold">{Math.round(lossRate * 100)}% Drop Probability</span>
                </div>
                <input
                  type="range"
                  min={0.0}
                  max={0.50}
                  step={0.02}
                  value={lossRate}
                  onChange={(e) => setLossRate(Number(e.target.value))}
                  className="w-full accent-amber-500"
                />
                <p className="text-[10px] text-[#AAA3B5]/60">
                  Observations dropped by counter-drone electronic warfare. The trainee will never receive these packets.
                </p>
              </div>

              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-[#AAA3B5]">Measurement Noise / Coordinate Uncertainty</span>
                  <span className="text-rose-400 font-bold">{Math.round(noiseLevel * 100)}% Deviation</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={0.50}
                  step={0.05}
                  value={noiseLevel}
                  onChange={(e) => setNoiseLevel(Number(e.target.value))}
                  className="w-full accent-rose-500"
                />
                <p className="text-[10px] text-[#AAA3B5]/60">
                  Gaussian jitter applied to observed radar blips and speed estimates.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-white/10">
                <div>
                  <label className="block text-xs font-mono text-[#AAA3B5] mb-1">Atmospheric Condition</label>
                  <select
                    value={weather}
                    onChange={(e) => setWeather(e.target.value)}
                    className="w-full px-3 py-2 bg-[#050505] border border-white/10 rounded-xl text-xs text-[#F7F5FA] focus:outline-none focus:border-[#00E5FF]"
                  >
                    <option value="Clear Day">Clear Day (Minimal Attenuation)</option>
                    <option value="Heavy Rain">Heavy Rain (+10% Signal Loss)</option>
                    <option value="Dense Fog">Dense Fog (Optical Degradation)</option>
                    <option value="High RF Jamming">High RF Jamming (EW Interference)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-[#AAA3B5] mb-1">Base Sensor Reliability</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={0.5}
                      max={0.99}
                      step={0.01}
                      value={sensorReliability}
                      onChange={(e) => setSensorReliability(Number(e.target.value))}
                      className="flex-1 accent-emerald-500"
                    />
                    <span className="text-xs font-mono text-emerald-400 font-bold">
                      {Math.round(sensorReliability * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Live Configuration Preview Card (1 Column) */}
        <div className="space-y-6">
          <div className="p-6 rounded-2xl bg-[#0D0B12]/85 backdrop-blur-xl border border-white/10 shadow-xl space-y-4 sticky top-24">
            <div className="flex items-center gap-2 text-[#00E5FF]">
              <Info className="w-5 h-5" />
              <h3 className="font-bold text-sm uppercase tracking-wider font-mono text-[#F7F5FA]">Live Configuration Summary</h3>
            </div>

            <div className="space-y-3 text-xs font-mono">
              <div className="p-3 rounded-xl bg-[#15121C] border border-white/10 space-y-1.5">
                <div className="text-[#AAA3B5]">Tactical Difficulty</div>
                <div className="text-base font-bold text-[#F7F5FA]">{difficulty}</div>
                <div className="text-[11px] text-[#AAA3B5]/60">{environment} • {durationSeconds} seconds</div>
              </div>

              <div className="p-3 rounded-xl bg-[#15121C] border border-white/10 space-y-2">
                <div className="flex justify-between">
                  <span className="text-[#AAA3B5]">Synthetic Entities:</span>
                  <span className="text-[#F7F5FA] font-bold">{numEntities} UAVs</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#AAA3B5]">Seed Determinism:</span>
                  <span className="text-[#00E5FF] font-bold">{seed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#AAA3B5]">Avg Packet Delay:</span>
                  <span className="text-amber-400 font-bold">{delayMean}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#AAA3B5]">Packet Loss Risk:</span>
                  <span className="text-rose-400 font-bold">{Math.round(lossRate * 100)}%</span>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#241039]/70 border border-[#3B0A6B] text-[11px] text-[#F7F5FA] font-sans leading-relaxed">
                <div className="font-bold font-mono text-[#00E5FF] mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  EVALUATION INTEGRITY ASSURED
                </div>
                Under these parameters, any observation packets lost to the {Math.round(lossRate * 100)}% drop rate will be automatically recorded in the evaluator's ledger as <strong>unassessable</strong>, protecting the trainee's score against unfair penalties.
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => handleSaveScenario(true)}
                disabled={saving}
                className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#00E5FF] hover:bg-[#00c8e0] text-[#050505] font-mono text-xs font-bold transition-all shadow-[0_0_20px_rgba(0,229,255,0.35)]"
              >
                <Play className="w-4 h-4 fill-current" />
                Launch Simulation With This Config
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

