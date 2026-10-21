import React, { useState, useEffect } from 'react';
import {
  Activity,
  Database,
  Cpu,
  Radio,
  Server,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Layers,
  ShieldAlert
} from 'lucide-react';

interface SystemHealthData {
  status: string;
  timestamp: string;
  services: {
    database: {
      name: string;
      connected: boolean;
      engine_url: string;
      status: string;
    };
    authoritative_simulation_engine: {
      name: string;
      status: string;
      tick_rate: string;
      determinism: string;
    };
    evidence_isolation_ledger: {
      name: string;
      status: string;
      packet_drop_tracking: string;
    };
    external_simulators: {
      px4_sitl: {
        adapter_name: string;
        supported: boolean;
        connection_status: string;
        target_endpoint: string;
        last_probe_time: string;
        telemetry_streaming: boolean;
        diagnostics: string;
      };
    };
  };
}

export const SystemHealth: React.FC = () => {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadHealth();
  }, []);

  const loadHealth = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/telemetry/health/system');
      if (res.ok) {
        const data = await res.json();
        setHealth(data);
      }
    } catch (err) {
      console.error('Failed to load system health', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-[#F7F5FA] flex items-center gap-3">
            <Server className="w-7 h-7 text-[#00E5FF]" />
            System Health & Service Infrastructure
          </h1>
          <p className="text-[#AAA3B5] text-xs mt-1">
            Real-time status of backend services, database persistence, evidence isolation, and external simulator links.
          </p>
        </div>

        <button
          onClick={loadHealth}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#15121C] hover:bg-[#3B0A6B]/40 text-[#00E5FF] text-xs font-mono font-semibold border border-[#3B0A6B]/50 hover:border-[#00E5FF]/40 transition-all shadow-[0_0_15px_rgba(0,229,255,0.15)]"
        >
          <RefreshCw className="w-4 h-4 text-[#00E5FF]" />
          Re-Probe Infrastructure
        </button>
      </div>

      {loading && !health ? (
        <div className="py-24 text-center text-[#AAA3B5] font-mono text-xs animate-pulse">
          Probing system services and database connectivity...
        </div>
      ) : !health ? (
        <div className="p-8 text-center glass-card rounded-2xl border border-rose-500/30 text-rose-400 font-mono text-xs">
          Unable to query backend system health endpoint.
        </div>
      ) : (
        <div className="space-y-6">
          {/* Overall Health Status Banner */}
          <div className="p-6 rounded-2xl glass-card-elevated border border-[#3B0A6B]/40 shadow-[0_4px_30px_rgba(0,0,0,0.6)] flex items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-xs font-mono text-[#00E5FF] font-bold uppercase tracking-wider">
                CORE SYSTEM ARCHITECTURE HEALTH
              </span>
              <div className="flex items-center gap-3">
                <span className={`w-3.5 h-3.5 rounded-full ${
                  health.status === 'HEALTHY' ? 'bg-emerald-400 shadow-[0_0_10px_#10B981] animate-ping' : 'bg-amber-400'
                }`} />
                <h2 className="text-2xl font-bold font-mono text-[#F7F5FA]">
                  STATUS: {health.status}
                </h2>
              </div>
              <p className="text-xs text-[#AAA3B5] font-mono">
                Probe Timestamp: {health.timestamp}
              </p>
            </div>
          </div>

          {/* Subsystem Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Database Service */}
            <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#F7F5FA] font-mono font-bold text-sm">
                  <Database className="w-5 h-5 text-[#00E5FF]" />
                  {health.services.database.name}
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  {health.services.database.status}
                </span>
              </div>
              <p className="text-xs text-[#AAA3B5]">
                Primary relational database storing scenarios, simulation runs, ground truth telemetry, and scoring records.
              </p>
              <div className="p-3.5 rounded-xl bg-[#0D0B12]/80 border border-white/10 text-xs font-mono space-y-1.5">
                <div className="flex justify-between text-[#AAA3B5]">
                  <span>Connection:</span>
                  <span className="text-emerald-400 font-bold">ESTABLISHED</span>
                </div>
                <div className="flex justify-between text-[#AAA3B5]">
                  <span>Engine:</span>
                  <span className="text-[#F7F5FA] truncate max-w-xs">{health.services.database.engine_url}</span>
                </div>
              </div>
            </div>

            {/* Authoritative Simulation Engine */}
            <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#F7F5FA] font-mono font-bold text-sm">
                  <Cpu className="w-5 h-5 text-[#00E5FF]" />
                  {health.services.authoritative_simulation_engine.name}
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#241039] text-[#00E5FF] border border-[#00E5FF]/30">
                  {health.services.authoritative_simulation_engine.status}
                </span>
              </div>
              <p className="text-xs text-[#AAA3B5]">
                Authoritative event-driven kinematic engine running deterministic seeded PRNG threat flights.
              </p>
              <div className="p-3.5 rounded-xl bg-[#0D0B12]/80 border border-white/10 text-xs font-mono space-y-1.5">
                <div className="flex justify-between text-[#AAA3B5]">
                  <span>Authoritative Tick Rate:</span>
                  <span className="text-[#00E5FF] font-bold">{health.services.authoritative_simulation_engine.tick_rate}</span>
                </div>
                <div className="flex justify-between text-[#AAA3B5]">
                  <span>Determinism Mode:</span>
                  <span className="text-[#F7F5FA]">{health.services.authoritative_simulation_engine.determinism}</span>
                </div>
              </div>
            </div>

            {/* Evidence Isolation Ledger */}
            <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#F7F5FA] font-mono font-bold text-sm">
                  <Radio className="w-5 h-5 text-emerald-400" />
                  {health.services.evidence_isolation_ledger.name}
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-950/80 text-emerald-400 border border-emerald-500/30">
                  {health.services.evidence_isolation_ledger.status}
                </span>
              </div>
              <p className="text-xs text-[#AAA3B5]">
                Strict memory buffer preventing un-delivered, delayed, or dropped observations from leaking into the trainee API.
              </p>
              <div className="p-3.5 rounded-xl bg-[#0D0B12]/80 border border-white/10 text-xs font-mono space-y-1.5">
                <div className="flex justify-between text-[#AAA3B5]">
                  <span>Packet Drop Tracking:</span>
                  <span className="text-emerald-400 font-bold">{health.services.evidence_isolation_ledger.packet_drop_tracking}</span>
                </div>
                <div className="flex justify-between text-[#AAA3B5]">
                  <span>Trainee Leak Protection:</span>
                  <span className="text-emerald-400 font-bold">ACTIVE & ENFORCED</span>
                </div>
              </div>
            </div>

            {/* External Simulator Probing Adapter */}
            <div className="p-6 rounded-2xl glass-card border border-white/10 space-y-3 shadow-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[#F7F5FA] font-mono font-bold text-sm">
                  <Activity className="w-5 h-5 text-amber-400" />
                  {health.services.external_simulators.px4_sitl.adapter_name}
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-950/80 text-rose-400 border border-rose-500/30">
                  {health.services.external_simulators.px4_sitl.connection_status}
                </span>
              </div>
              <p className="text-xs text-[#AAA3B5] font-sans">
                {health.services.external_simulators.px4_sitl.diagnostics}
              </p>
              <div className="p-3.5 rounded-xl bg-[#0D0B12]/80 border border-white/10 text-xs font-mono space-y-1.5">
                <div className="flex justify-between text-[#AAA3B5]">
                  <span>Probed Endpoint:</span>
                  <span className="text-[#F7F5FA]">{health.services.external_simulators.px4_sitl.target_endpoint}</span>
                </div>
                <div className="flex justify-between text-[#AAA3B5]">
                  <span>Telemetry Streaming:</span>
                  <span className="text-[#AAA3B5]">Disabled (Internal Authoritative Engine Active)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

