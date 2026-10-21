import React, { useState, useEffect } from 'react';
import { Radio, Activity, Database, Cpu, Layers, CheckCircle2, AlertTriangle, Wifi, WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArchitectureModal } from './ArchitectureModal';
import { GarudaEagleLogo } from './GarudaEagleLogo';

interface NavbarProps {
  systemStatus?: string;
  evidenceEngineStatus?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  systemStatus = 'OPERATIONAL',
  evidenceEngineStatus = 'ACTIVE_ISOLATION',
}) => {
  const [showArchModal, setShowArchModal] = useState(false);
  const [healthData, setHealthData] = useState<{
    backendConnected: boolean;
    dbConnected: boolean;
    dbStatus: string;
    simEngineStatus: string;
    extTelemetryStatus: string;
    extStreaming: boolean;
  }>({
    backendConnected: false,
    dbConnected: false,
    dbStatus: 'CHECKING',
    simEngineStatus: 'CHECKING',
    extTelemetryStatus: 'DISCONNECTED',
    extStreaming: false,
  });

  // Query actual backend health status
  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      try {
        const res = await fetch('/api/telemetry/health/system');
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setHealthData({
              backendConnected: true,
              dbConnected: data.services?.database?.connected ?? true,
              dbStatus: data.services?.database?.status ?? 'OPERATIONAL',
              simEngineStatus: data.services?.authoritative_simulation_engine?.status ?? 'ACTIVE',
              extTelemetryStatus: data.services?.external_simulators?.px4_sitl?.connection_status ?? 'DISCONNECTED',
              extStreaming: data.services?.external_simulators?.px4_sitl?.telemetry_streaming ?? false,
            });
          }
        } else {
          if (isMounted) {
            setHealthData((prev) => ({ ...prev, backendConnected: false }));
          }
        }
      } catch (err) {
        if (isMounted) {
          setHealthData((prev) => ({
            ...prev,
            backendConnected: false,
            dbConnected: false,
            dbStatus: 'OFFLINE',
          }));
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <>
      <header className="h-16 bg-[#050505]/90 backdrop-blur-xl border-b border-white/10 px-5 flex items-center justify-between z-30 sticky top-0 shadow-[0_4px_30px_rgba(0,0,0,0.8)]">
        {/* Brand Identity */}
        <div className="flex items-center gap-4">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B0A6B] to-[#241039] border border-[#00E5FF]/40 flex items-center justify-center shadow-[0_0_20px_rgba(0,229,255,0.25)] group-hover:border-[#00E5FF] transition-all">
              <GarudaEagleLogo className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-wider text-[#F7F5FA] font-mono">GARUDA</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-[#241039] text-[#00E5FF] border border-[#00E5FF]/30 shadow-[0_0_8px_rgba(0,229,255,0.15)]">
                  SIH26247
                </span>
              </div>
              <p className="text-[11px] text-[#AAA3B5] font-sans tracking-tight hidden sm:block">
                AI-Enabled Drone & Counter-Drone Threat Simulation Trainer
              </p>
            </div>
          </Link>
        </div>

        {/* Verified Live System Status Indicators & Blueprint */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowArchModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#241039]/80 hover:bg-[#3B0A6B] text-[#00E5FF] border border-[#00E5FF]/30 text-xs font-mono font-bold transition-all shadow-[0_0_15px_rgba(0,229,255,0.12)] hover:border-[#00E5FF]/60"
            title="Inspect System Architecture Blueprint"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Blueprint</span>
          </button>

          {/* 1. Backend Status */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono ${
              healthData.backendConnected
                ? 'bg-[#15121C] border-emerald-500/30 text-emerald-300'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}
            title="FastAPI Authoritative Simulation Backend API"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                healthData.backendConnected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-[#AAA3B5] text-[10px]">API:</span>
            <span className="font-semibold">{healthData.backendConnected ? 'ONLINE' : 'OFFLINE'}</span>
          </div>

          {/* 2. Database Status */}
          <div
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono ${
              healthData.dbConnected
                ? 'bg-[#15121C] border-white/10 text-[#F7F5FA]'
                : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
            }`}
            title="Database State Storage"
          >
            <Database className="w-3 h-3 text-[#00E5FF]" />
            <span className="text-[#AAA3B5] text-[10px]">DB:</span>
            <span className="font-semibold text-emerald-400">{healthData.dbConnected ? 'SQLITE OK' : 'ERR'}</span>
          </div>

          {/* 3. Internal Simulation Engine Status */}
          <div
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#15121C] border border-[#00E5FF]/25 text-[11px] font-mono text-[#00E5FF]"
            title="Authoritative Python PRNG 3D Simulation Engine"
          >
            <Cpu className="w-3 h-3" />
            <span className="text-[#AAA3B5] text-[10px]">SIM:</span>
            <span className="font-semibold">{healthData.simEngineStatus}</span>
          </div>

          {/* 4. External Telemetry Adapter Status (Honest, never fabricated) */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-mono ${
              healthData.extStreaming
                ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                : 'bg-[#15121C] border-white/10 text-amber-300'
            }`}
            title="External PX4/ArduPilot SITL Telemetry Adapter"
          >
            <Radio className="w-3 h-3 text-amber-400" />
            <span className="text-[#AAA3B5] text-[10px]">EXT SITL:</span>
            <span className="font-semibold">
              {healthData.extStreaming ? 'STREAMING' : 'STANDBY'}
            </span>
          </div>

          {/* Trainee Profile Badge */}
          <div className="flex items-center gap-2.5 pl-2.5 border-l border-white/10">
            <div className="w-8 h-8 rounded-xl bg-[#241039] border border-[#00E5FF]/40 flex items-center justify-center text-[#00E5FF] font-mono text-xs font-bold shadow-[0_0_12px_rgba(0,229,255,0.25)]">
              TA
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-[#F7F5FA] font-mono leading-none">Trainee-Alpha</p>
              <p className="text-[10px] text-[#AAA3B5] mt-0.5">Operator Console</p>
            </div>
          </div>
        </div>
      </header>

      <ArchitectureModal isOpen={showArchModal} onClose={() => setShowArchModal(false)} />
    </>
  );
};
