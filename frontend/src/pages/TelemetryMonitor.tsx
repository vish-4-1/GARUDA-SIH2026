import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Activity,
  Radio,
  Clock,
  Cpu,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { api } from '../services/api';
import { SimulationRunState } from '../types';

interface TelemetryTick {
  run_id: string;
  sequence_number: number;
  simulation_time: number;
  wall_clock_iso: string;
  source_provenance: string;
  validity_status: string;
  freshness_ms: number;
  active_threat_count: number;
  tick_rate_hz: number;
  dropped_packets_total: number;
  delayed_packets_total: number;
  delivered_packets_total: number;
  entities: Array<{
    entity_id: string;
    threat_category: string;
    is_hostile: boolean;
    position: { x: number; y: number; z: number; vx: number; vy: number; vz: number; yaw: number };
    ground_speed_mps: number;
    distance_to_core_m: number;
    rcs_m2: number;
    rf_carrier_mhz: number;
    signal_strength_dbm: number;
    status: string;
  }>;
}

interface SimulatorAdapter {
  adapter_name: string;
  supported: boolean;
  connection_status: string;
  target_endpoint: string;
  last_probe_time: string;
  telemetry_streaming: boolean;
  diagnostics: string;
}

export const TelemetryMonitor: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const runId = searchParams.get('run_id');

  const [runs, setRuns] = useState<SimulationRunState[]>([]);
  const [telemetry, setTelemetry] = useState<TelemetryTick | null>(null);
  const [adapters, setAdapters] = useState<SimulatorAdapter[]>([]);
  const [socketStatus, setSocketStatus] = useState<'CONNECTED' | 'CONNECTING' | 'DISCONNECTED'>('DISCONNECTED');
  const [isOperating, setIsOperating] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number | null>(null);
  const isUnmountingRef = useRef<boolean>(false);
  const activeRunIdRef = useRef<string | null>(null);

  useEffect(() => {
    isUnmountingRef.current = false;
    loadRuns();
    loadAdapters();

    return () => {
      isUnmountingRef.current = true;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.close();
      }
    };
  }, []);

  useEffect(() => {
    activeRunIdRef.current = runId;
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }

    if (runId) {
      connectWebSocket(runId);
    } else {
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.close();
      }
      setTelemetry(null);
      setSocketStatus('DISCONNECTED');
    }

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }
      if (socketRef.current) {
        socketRef.current.onclose = null;
        socketRef.current.onerror = null;
        socketRef.current.close();
      }
    };
  }, [runId]);

  const loadRuns = async () => {
    try {
      const data = await api.getRuns();
      setRuns(data);
      if (!runId && data.length > 0) {
        setSearchParams({ run_id: data[0].id });
      }
    } catch (err) {
      console.error('Failed to load runs', err);
    }
  };

  const loadAdapters = async () => {
    try {
      const res = await fetch('/api/telemetry/adapters');
      if (res.ok) {
        const data = await res.json();
        setAdapters(data);
      }
    } catch (err) {
      console.error('Failed to load adapters', err);
    }
  };

  const connectWebSocket = (targetRunId: string) => {
    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.onerror = null;
      socketRef.current.close();
      socketRef.current = null;
    }

    setSocketStatus('CONNECTING');

    // Immediately fetch initial live telemetry snapshot for instant responsiveness
    fetch(`/api/telemetry/live/${targetRunId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && activeRunIdRef.current === targetRunId) {
          setTelemetry(data);
        }
      })
      .catch((err) => console.error('Error fetching initial live telemetry', err));

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws/simulation/${targetRunId}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        if (isUnmountingRef.current || activeRunIdRef.current !== targetRunId) {
          ws.close();
          return;
        }
        setSocketStatus('CONNECTED');
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'simulation_telemetry') {
            setTelemetry(msg.data);
          }
        } catch (err) {
          console.error('Error parsing telemetry frame', err);
        }
      };

      ws.onerror = (err) => {
        console.error('WebSocket error occurred on channel', targetRunId, err);
      };

      ws.onclose = () => {
        if (isUnmountingRef.current) return;
        setSocketStatus('DISCONNECTED');

        if (activeRunIdRef.current === targetRunId && !reconnectTimerRef.current) {
          reconnectTimerRef.current = window.setTimeout(() => {
            reconnectTimerRef.current = null;
            if (activeRunIdRef.current === targetRunId) {
              connectWebSocket(targetRunId);
            }
          }, 3000);
        }
      };

      socketRef.current = ws;
    } catch (err) {
      console.error('Failed to initialize WebSocket client', err);
      setSocketStatus('DISCONNECTED');
    }
  };

  const handleStartSim = async () => {
    if (!runId) return;
    setIsOperating(true);
    try {
      await api.startRun(runId);
      await loadRuns();
      const res = await fetch(`/api/telemetry/live/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch (err) {
      console.error('Failed to start simulation', err);
    } finally {
      setIsOperating(false);
    }
  };

  const handlePauseSim = async () => {
    if (!runId) return;
    setIsOperating(true);
    try {
      await api.pauseRun(runId);
      await loadRuns();
    } catch (err) {
      console.error('Failed to pause simulation', err);
    } finally {
      setIsOperating(false);
    }
  };

  const handleStepSim = async (seconds: number = 5.0) => {
    if (!runId) return;
    setIsOperating(true);
    try {
      await api.stepRun(runId, seconds);
      await loadRuns();
      const res = await fetch(`/api/telemetry/live/${runId}`);
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch (err) {
      console.error('Failed to step simulation', err);
    } finally {
      setIsOperating(false);
    }
  };

  const selectedRun = runs.find((r) => r.id === runId);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-[#F4F5F7] flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-[#0284C7] dark:text-[#00CFE8]" />
            Live Telemetry Pipeline Monitor
          </h1>
          <p className="text-slate-600 dark:text-[#858B99] text-xs mt-0.5">
            Authoritative stream verification, real-time packet provenance, and external simulator link status.
          </p>
        </div>

        {/* Run Selector & Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={runId || ''}
            onChange={(e) => setSearchParams({ run_id: e.target.value })}
            className="glass-input text-xs font-mono text-[#0284C7] dark:text-[#00CFE8] cursor-pointer py-1.5 px-2.5 bg-white dark:bg-[#111318] border border-slate-200 dark:border-white/[0.12]"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id} className="bg-white dark:bg-[#111318] text-slate-900 dark:text-[#F4F5F7]">
                {r.id.slice(0, 8)}... - {r.scenario_name || 'Seeded'} ({r.status})
              </option>
            ))}
          </select>

          {runId && (
            <div className="flex items-center gap-1.5">
              {selectedRun?.status === 'RUNNING' ? (
                <button
                  type="button"
                  onClick={handlePauseSim}
                  disabled={isOperating}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-50 dark:bg-[#7047C8]/25 border border-amber-200 dark:border-white/[0.12] text-amber-700 dark:text-[#E9A23B] font-mono text-xs font-semibold hover:bg-amber-100 dark:hover:bg-[#7047C8]/40 transition-colors"
                >
                  Pause
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartSim}
                  disabled={isOperating}
                  className="px-2.5 py-1.5 rounded-lg btn-primary font-mono text-xs font-semibold"
                >
                  Start Clock
                </button>
              )}
              <button
                type="button"
                onClick={() => handleStepSim(5.0)}
                disabled={isOperating}
                className="px-2 py-1.5 rounded-lg btn-secondary text-slate-800 dark:text-[#F4F5F7] font-mono text-xs"
                title="Step clock +5s"
              >
                +5s
              </button>
            </div>
          )}

          <Link
            to={`/simulation?run_id=${runId || ''}`}
            className="px-2.5 py-1.5 rounded-lg btn-secondary text-[#0284C7] dark:text-[#00CFE8] font-mono text-xs flex items-center gap-1"
            title="Switch to 3D Viewport"
          >
            <ExternalLink className="w-3.5 h-3.5" /> 3D Viewport
          </Link>

          <button
            type="button"
            onClick={() => {
              loadAdapters();
              if (runId) connectWebSocket(runId);
            }}
            className="btn-secondary p-2"
            title="Probe External Simulators & Reconnect WS"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#00CFE8]" />
          </button>
        </div>
      </div>

      {/* Telemetry Stream Status & Provenance Card */}
      <div className="p-5 rounded-xl glass-card space-y-4 shadow-sm dark:shadow-level1">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 dark:border-white/[0.08] pb-3.5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`w-2 h-2 rounded-full ${
                socketStatus === 'CONNECTED' ? 'bg-[#0284C7] dark:bg-[#00CFE8]' :
                socketStatus === 'CONNECTING' ? 'bg-amber-500 dark:bg-[#E9A23B]' : 'bg-rose-500'
              }`} />
              <span className="text-xs font-mono font-bold text-slate-900 dark:text-[#F4F5F7] uppercase tracking-wider">
                WEBSOCKET TRANSPORT: <span className={
                  socketStatus === 'CONNECTED' ? 'text-[#0284C7] dark:text-[#00CFE8]' :
                  socketStatus === 'CONNECTING' ? 'text-amber-600 dark:text-[#E9A23B]' : 'text-rose-500 dark:text-rose-400'
                }>{socketStatus}</span>
              </span>
              {socketStatus === 'DISCONNECTED' && runId && (
                <button
                  type="button"
                  onClick={() => connectWebSocket(runId)}
                  className="text-[10px] px-2 py-0.5 rounded bg-sky-50 dark:bg-[#7047C8]/20 text-[#0284C7] dark:text-[#00CFE8] border border-sky-200 dark:border-white/[0.12] hover:bg-sky-100 dark:hover:bg-[#7047C8]/40 transition-colors"
                >
                  Reconnect
                </button>
              )}
            </div>
            <p className="text-xs font-mono text-slate-500 dark:text-[#858B99]">
              Target Channel: <code className="text-[#0284C7] dark:text-[#00CFE8]">/api/ws/simulation/{runId ? runId.slice(0, 8) + '...' : 'NONE'}</code>
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#111318]/90 border border-slate-200 dark:border-white/[0.08] text-xs font-mono">
              <span className="text-slate-500 dark:text-[#858B99] block text-[9.5px] uppercase tracking-wider">Telemetry Provenance</span>
              <span className="text-[#0284C7] dark:text-[#00CFE8] font-bold">
                {telemetry ? telemetry.source_provenance : 'N/A — DISCONNECTED'}
              </span>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-[#111318]/90 border border-slate-200 dark:border-white/[0.08] text-xs font-mono">
              <span className="text-slate-500 dark:text-[#858B99] block text-[9.5px] uppercase tracking-wider">Validity Status</span>
              <span className={`font-bold ${
                telemetry?.validity_status === 'VALID' ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400 dark:text-[#858B99]'
              }`}>
                {telemetry ? telemetry.validity_status : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Packet Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
          <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#111318]/90 border border-slate-200 dark:border-white/[0.08]">
            <span className="text-slate-500 dark:text-[#858B99] block text-[10px]">SEQUENCE NO</span>
            <span className="text-slate-900 dark:text-[#F4F5F7] font-bold text-base tabular-stat">
              {telemetry ? `#${telemetry.sequence_number}` : 'N/A'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#111318]/90 border border-slate-200 dark:border-white/[0.08]">
            <span className="text-slate-500 dark:text-[#858B99] block text-[10px]">SIM TIME</span>
            <span className="text-[#0284C7] dark:text-[#00CFE8] font-bold text-base tabular-stat">
              {telemetry ? `${telemetry.simulation_time.toFixed(1)}s` : 'N/A'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#111318]/90 border border-slate-200 dark:border-white/[0.08]">
            <span className="text-slate-500 dark:text-[#858B99] block text-[10px]">STREAM FRESHNESS</span>
            <span className="text-emerald-600 dark:text-emerald-400 font-bold text-base tabular-stat">
              {telemetry ? `${telemetry.freshness_ms} ms` : 'N/A'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#111318]/90 border border-slate-200 dark:border-white/[0.08]">
            <span className="text-slate-500 dark:text-[#858B99] block text-[10px]">DELIVERED PACKETS</span>
            <span className="text-[#0284C7] dark:text-[#00CFE8] font-bold text-base tabular-stat">
              {telemetry ? telemetry.delivered_packets_total : 'N/A'}
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 dark:bg-[#111318]/90 border border-slate-200 dark:border-white/[0.08]">
            <span className="text-slate-500 dark:text-[#858B99] block text-[10px]">DROPPED (JAMMED)</span>
            <span className="text-rose-600 dark:text-rose-400 font-bold text-base tabular-stat">
              {telemetry ? telemetry.dropped_packets_total : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* External Simulator Probing Ledger */}
      <div className="p-5 rounded-xl glass-card space-y-3.5 shadow-sm dark:shadow-level1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-4 h-4 text-[#0284C7] dark:text-[#00CFE8]" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F5F7] font-mono">
              External Hardware & Simulation Adapters
            </h3>
          </div>
          <span className="text-[11px] font-mono text-slate-500 dark:text-[#858B99]">
            Strict Truthfulness Protocol: Stand-alone Internal Engine Primary
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
          {adapters.map((adapter, i) => (
            <div
              key={i}
              className="p-3.5 rounded-lg bg-slate-50 dark:bg-[#111318]/90 border border-slate-200 dark:border-white/[0.08] space-y-2 text-xs font-mono"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 dark:text-[#F4F5F7]">{adapter.adapter_name}</span>
                <span className={`px-2 py-0.5 rounded text-[9.5px] font-bold ${
                  adapter.connection_status === 'CONNECTED' ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/40' :
                  adapter.connection_status === 'STANDBY' ? 'bg-slate-100 text-[#0284C7] border border-slate-300 dark:bg-[#191C23] dark:text-[#00CFE8] dark:border-white/[0.12]' :
                  'bg-rose-50 text-rose-700 border border-rose-300 dark:bg-rose-950/60 dark:text-rose-400 dark:border-rose-800/40'
                }`}>
                  {adapter.connection_status}
                </span>
              </div>

              <div className="text-[11px] text-slate-600 dark:text-[#858B99]">
                Endpoint: <code className="text-slate-900 dark:text-[#F4F5F7]">{adapter.target_endpoint}</code>
              </div>

              <p className="text-[11px] text-slate-600 dark:text-[#858B99] font-sans leading-relaxed pt-1.5 border-t border-slate-200 dark:border-white/[0.08]">
                {adapter.diagnostics}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Live Entity Kinematic Feed (Level 1 Structural Surface) */}
      <div className="p-5 rounded-xl surface-structural space-y-3.5 shadow-sm dark:shadow-level1">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 dark:text-[#F4F5F7] font-mono flex items-center gap-2">
            <Radio className="w-4 h-4 text-[#0284C7] dark:text-[#00CFE8]" />
            Live Authoritative Drone Kinematic Frames ({telemetry?.entities.length || 0})
          </h3>
          <span className="text-[11px] font-mono text-slate-500 dark:text-[#858B99]">
            Updates via WebSocket broadcast
          </span>
        </div>

        {!telemetry || telemetry.entities.length === 0 ? (
          <div className="text-center py-10 text-slate-500 dark:text-[#858B99]/70 font-mono text-xs">
            No active drone telemetry stream. Select an active simulation run or start clock in Simulation Workspace.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-slate-500 dark:text-[#858B99] border-b border-slate-200 dark:border-white/[0.08] pb-2">
                <tr>
                  <th className="py-2.5 font-medium">Entity</th>
                  <th className="font-medium">Classification</th>
                  <th className="font-medium">Position (X, Y, Z)</th>
                  <th className="font-medium">Ground Speed</th>
                  <th className="font-medium">Heading</th>
                  <th className="font-medium">Core Range</th>
                  <th className="font-medium">Signal (SNR)</th>
                  <th className="font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-white/[0.05]">
                {telemetry.entities.map((e) => (
                  <tr key={e.entity_id} className="hover:bg-slate-50 dark:hover:bg-white/[0.03] transition-colors">
                    <td className="py-2.5 font-bold text-[#0284C7] dark:text-[#00CFE8]">{e.entity_id}</td>
                    <td className="text-slate-900 dark:text-[#F4F5F7]">{e.threat_category}</td>
                    <td className="text-slate-600 dark:text-[#858B99] tabular-stat">
                      ({e.position.x}m, {e.position.y}m, {e.position.z}m)
                    </td>
                    <td className="text-slate-600 dark:text-[#858B99] tabular-stat">{e.ground_speed_mps} m/s</td>
                    <td className="text-slate-600 dark:text-[#858B99] tabular-stat">{e.position.yaw}°</td>
                    <td className="text-slate-600 dark:text-[#858B99] tabular-stat">{e.distance_to_core_m} m</td>
                    <td className="text-slate-600 dark:text-[#858B99] tabular-stat">{e.signal_strength_dbm} dBm</td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-400 dark:border-emerald-800/40">
                        {e.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
