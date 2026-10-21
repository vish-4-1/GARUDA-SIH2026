import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Activity,
  Radio,
  Wifi,
  WifiOff,
  Clock,
  Shield,
  Layers,
  Cpu,
  RefreshCw,
  ExternalLink,
  AlertTriangle,
  CheckCircle2
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
  const [loading, setLoading] = useState(true);

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    loadRuns();
    loadAdapters();
  }, []);

  useEffect(() => {
    if (runId) {
      connectWebSocket(runId);
    } else {
      if (socketRef.current) socketRef.current.close();
      setTelemetry(null);
      setSocketStatus('DISCONNECTED');
    }

    return () => {
      if (socketRef.current) socketRef.current.close();
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
    } finally {
      setLoading(false);
    }
  };

  const connectWebSocket = (id: string) => {
    if (socketRef.current) {
      socketRef.current.close();
    }

    setSocketStatus('CONNECTING');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/api/ws/simulation/${id}`;

    const ws = new WebSocket(wsUrl);
    socketRef.current = ws;

    ws.onopen = () => {
      setSocketStatus('CONNECTED');
    };

    ws.onmessage = (event) => {
      try {
        const tick = JSON.parse(event.data);
        setTelemetry(tick);
      } catch (err) {
        console.error('Error parsing telemetry tick', err);
      }
    };

    ws.onerror = () => {
      setSocketStatus('DISCONNECTED');
    };

    ws.onclose = () => {
      setSocketStatus('DISCONNECTED');
    };
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#F7F5FA] flex items-center gap-3">
            <Activity className="w-7 h-7 text-[#00E5FF]" />
            Live Telemetry Pipeline Monitor
          </h1>
          <p className="text-[#AAA3B5] text-xs mt-1">
            Authoritative stream verification, real-time packet provenance, and external simulator link status.
          </p>
        </div>

        {/* Run Selector & Refresh */}
        <div className="flex items-center gap-3">
          <select
            value={runId || ''}
            onChange={(e) => setSearchParams({ run_id: e.target.value })}
            className="px-3 py-2 bg-[#050505] border border-white/10 rounded-xl text-xs font-mono text-[#00E5FF] focus:outline-none focus:border-[#00E5FF]"
          >
            {runs.map((r) => (
              <option key={r.id} value={r.id}>
                {r.id.slice(0, 8)}... - {r.scenario_name || 'Seeded'} ({r.status})
              </option>
            ))}
          </select>

          <button
            onClick={loadAdapters}
            className="p-2.5 rounded-xl bg-[#15121C] hover:bg-[#3B0A6B]/30 text-[#00E5FF] border border-white/10 hover:border-[#00E5FF]/40 transition-colors"
            title="Probe External Simulators"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Telemetry Stream Status & Provenance Card */}
      <div className="p-6 rounded-2xl bg-[#0D0B12]/85 backdrop-blur-xl border border-white/10 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-white/10 pb-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                socketStatus === 'CONNECTED' ? 'bg-[#00E5FF] shadow-[0_0_8px_#00E5FF] animate-ping' :
                socketStatus === 'CONNECTING' ? 'bg-amber-400 animate-pulse' : 'bg-rose-500'
              }`} />
              <span className="text-xs font-mono font-bold text-[#F7F5FA] uppercase tracking-wider">
                WEBSOCKET TRANSPORT: <span className={
                  socketStatus === 'CONNECTED' ? 'text-[#00E5FF]' :
                  socketStatus === 'CONNECTING' ? 'text-amber-400' : 'text-rose-400'
                }>{socketStatus}</span>
              </span>
            </div>
            <p className="text-xs font-mono text-[#AAA3B5]">
              Target Channel: <code className="text-[#00E5FF]">/api/ws/simulation/{runId ? runId.slice(0, 8) + '...' : 'NONE'}</code>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-[#15121C] border border-white/10 text-xs font-mono">
              <span className="text-[#AAA3B5]/60 block text-[10px] uppercase">Telemetry Provenance</span>
              <span className="text-[#00E5FF] font-bold">
                {telemetry ? telemetry.source_provenance : 'N/A — DISCONNECTED'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-[#15121C] border border-white/10 text-xs font-mono">
              <span className="text-[#AAA3B5]/60 block text-[10px] uppercase">Validity Status</span>
              <span className={`font-bold ${
                telemetry?.validity_status === 'VALID' ? 'text-emerald-400' : 'text-[#AAA3B5]'
              }`}>
                {telemetry ? telemetry.validity_status : 'N/A'}
              </span>
            </div>
          </div>
        </div>

        {/* Live Packet Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs font-mono">
          <div className="p-3 rounded-xl bg-[#15121C] border border-white/10">
            <span className="text-[#AAA3B5]/60 block text-[10px]">SEQUENCE NO</span>
            <span className="text-[#F7F5FA] font-bold text-base">
              {telemetry ? `#${telemetry.sequence_number}` : 'N/A'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#15121C] border border-white/10">
            <span className="text-[#AAA3B5]/60 block text-[10px]">SIM TIME</span>
            <span className="text-[#00E5FF] font-bold text-base">
              {telemetry ? `${telemetry.simulation_time.toFixed(1)}s` : 'N/A'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#15121C] border border-white/10">
            <span className="text-[#AAA3B5]/60 block text-[10px]">STREAM FRESHNESS</span>
            <span className="text-emerald-400 font-bold text-base">
              {telemetry ? `${telemetry.freshness_ms} ms` : 'N/A'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#15121C] border border-white/10">
            <span className="text-[#AAA3B5]/60 block text-[10px]">DELIVERED PACKETS</span>
            <span className="text-[#00E5FF] font-bold text-base">
              {telemetry ? telemetry.delivered_packets_total : 'N/A'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-[#15121C] border border-white/10">
            <span className="text-[#AAA3B5]/60 block text-[10px]">DROPPED (JAMMED)</span>
            <span className="text-rose-400 font-bold text-base">
              {telemetry ? telemetry.dropped_packets_total : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* External Simulator Probing Ledger */}
      <div className="p-6 rounded-2xl bg-[#0D0B12]/85 backdrop-blur-md border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-[#00E5FF]" />
            <h3 className="text-base font-bold text-[#F7F5FA] font-mono">
              External Hardware & Simulation Adapters
            </h3>
          </div>
          <span className="text-xs font-mono text-[#AAA3B5]/70">
            Strict Truthfulness Protocol: No Fabricated External Connections
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {adapters.map((adapter, i) => (
            <div
              key={i}
              className="p-4 rounded-xl bg-[#15121C] border border-white/10 space-y-2 text-xs font-mono"
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#F7F5FA]">{adapter.adapter_name}</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  adapter.connection_status === 'CONNECTED' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
                  adapter.connection_status === 'STANDBY' ? 'bg-[#241039] text-[#00E5FF] border border-[#3B0A6B]' :
                  'bg-rose-950/60 text-rose-400 border border-rose-800'
                }`}>
                  {adapter.connection_status}
                </span>
              </div>

              <div className="text-[11px] text-[#AAA3B5]">
                Endpoint: <code className="text-[#F7F5FA]">{adapter.target_endpoint}</code>
              </div>

              <p className="text-[11px] text-[#AAA3B5] font-sans leading-relaxed pt-1 border-t border-white/10">
                {adapter.diagnostics}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Live Entity Kinematic Feed */}
      <div className="p-6 rounded-2xl bg-[#0D0B12]/85 backdrop-blur-md border border-white/10 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-[#F7F5FA] font-mono flex items-center gap-2">
            <Radio className="w-5 h-5 text-[#00E5FF]" />
            Live Authoritative Drone Kinematic Frames ({telemetry?.entities.length || 0})
          </h3>
          <span className="text-xs font-mono text-[#AAA3B5]">
            Updates via WebSocket 2Hz broadcast
          </span>
        </div>

        {!telemetry || telemetry.entities.length === 0 ? (
          <div className="text-center py-12 text-[#AAA3B5]/60 font-mono text-xs">
            No active drone telemetry stream. Select an active simulation run or start clock in Simulation Workspace.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs font-mono">
              <thead className="text-[#AAA3B5] border-b border-white/10 pb-2">
                <tr>
                  <th className="py-2.5">Entity</th>
                  <th>Classification</th>
                  <th>Position (X, Y, Z)</th>
                  <th>Ground Speed</th>
                  <th>Heading</th>
                  <th>Core Range</th>
                  <th>Signal (SNR)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {telemetry.entities.map((e) => (
                  <tr key={e.entity_id} className="hover:bg-white/[0.03] transition-colors">
                    <td className="py-2.5 font-bold text-[#00E5FF]">{e.entity_id}</td>
                    <td className="text-[#F7F5FA]">{e.threat_category}</td>
                    <td className="text-[#AAA3B5]">
                      ({e.position.x}m, {e.position.y}m, {e.position.z}m)
                    </td>
                    <td className="text-[#AAA3B5]">{e.ground_speed_mps} m/s</td>
                    <td className="text-[#AAA3B5]">{e.position.yaw}°</td>
                    <td className="text-[#AAA3B5]">{e.distance_to_core_m} m</td>
                    <td className="text-[#AAA3B5]">{e.signal_strength_dbm} dBm</td>
                    <td>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800">
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

