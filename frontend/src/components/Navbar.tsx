import React, { useState, useEffect } from 'react';
import { Radio, Database, Cpu, Layers, Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { ArchitectureModal } from './ArchitectureModal';
import { GarudaEagleLogo } from './GarudaEagleLogo';
import { useTheme } from '../context/ThemeContext';

interface NavbarProps {
  systemStatus?: string;
  evidenceEngineStatus?: string;
}

export const Navbar: React.FC<NavbarProps> = () => {
  const { theme, toggleTheme } = useTheme();
  const [showArchModal, setShowArchModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [zuluTime, setZuluTime] = useState('');
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

  // Ticking ZULU / UTC clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const zHours = String(now.getUTCHours()).padStart(2, '0');
      const zMinutes = String(now.getUTCMinutes()).padStart(2, '0');
      const zSeconds = String(now.getUTCSeconds()).padStart(2, '0');
      setZuluTime(`${zHours}:${zMinutes}:${zSeconds}Z`);
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

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
      } catch {
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
      <header className="h-14 bg-white/95 dark:bg-[#0B0D12]/95 backdrop-blur-[24px] border-b border-slate-200 dark:border-white/[0.12] px-3.5 lg:px-6 flex items-center justify-between z-30 sticky top-0 shadow-sm dark:shadow-[0_4px_20px_rgba(0,0,0,0.6)] transition-colors duration-200">
        {/* Brand Identity & Tactical Breadcrumb */}
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <img
              src="/garuda-logo.png"
              alt="GARUDA"
              className="h-7 w-auto object-contain transition-transform duration-150 group-hover:scale-105"
            />
            <span className="hidden md:inline-block h-3.5 w-px bg-slate-300 dark:bg-white/[0.16]" />
            <span className="text-[9.5px] text-[#0284C7] dark:text-[#00CFE8] font-mono tracking-widest uppercase hidden md:inline-block select-none font-bold">
              TACTICAL C2 RIG
            </span>
          </Link>

          {/* Airspace Threat Level Pill */}
          <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-0.5 rounded badge-threat-elevated text-[10px] font-mono font-bold tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
            <span>THREATCON: BRAVO-2</span>
          </div>

          {/* Zulu Clock */}
          <div className="hidden sm:flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.10] text-[10.5px] font-mono text-slate-800 dark:text-[#F4F5F7]">
            <span className="text-slate-500 dark:text-[#858B99] text-[9.5px] font-semibold">ZULU</span>
            <span className="text-[#0284C7] dark:text-[#00CFE8] font-bold tabular-nums">{zuluTime || '00:00:00Z'}</span>
          </div>
        </div>

        {/* Verified Live System Status Indicators & Actions */}
        <div className="flex items-center gap-2">
          {/* Day / Night Aerospace Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#191C23]/80 dark:hover:bg-white/[0.08] text-slate-700 dark:text-[#F4F5F7] border border-slate-200 dark:border-white/[0.14] text-xs font-mono font-medium transition-all shadow-sm"
            title={theme === 'light' ? 'Switch to Dark Mode (Obsidian Tactical)' : 'Switch to Light Mode (Daylight Precision White)'}
            aria-label="Toggle theme"
          >
            {theme === 'light' ? (
              <>
                <Moon className="w-3.5 h-3.5 text-violet-600" />
                <span className="hidden sm:inline text-[11px] font-semibold">Dark Mode</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline text-[11px] font-semibold">Light Mode</span>
              </>
            )}
          </button>

          <button
            onClick={() => setShowArchModal(true)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-[#191C23]/80 dark:hover:bg-white/[0.08] text-slate-800 dark:text-[#F4F5F7] border border-slate-200 dark:border-white/[0.14] text-xs font-mono font-medium transition-all shadow-sm"
            title="Inspect System Architecture Blueprint"
          >
            <Layers className="w-3.5 h-3.5 text-[#0284C7] dark:text-[#00CFE8]" />
            <span className="hidden md:inline text-[11px]">System Blueprint</span>
          </button>

          {/* 1. Backend Status */}
          <div
            className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10.5px] font-mono ${
              healthData.backendConnected
                ? 'bg-emerald-50 dark:bg-[#191C23]/80 border-emerald-200 dark:border-emerald-500/30 text-emerald-700 dark:text-emerald-300'
                : 'bg-rose-50 dark:bg-[#191C23]/80 border-rose-200 dark:border-rose-500/40 text-rose-700 dark:text-rose-300'
            }`}
            title="FastAPI Authoritative Simulation Backend API"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                healthData.backendConnected ? 'bg-emerald-500 dark:bg-emerald-400 animate-pulse' : 'bg-rose-500'
              }`}
            />
            <span className="text-slate-500 dark:text-[#858B99] text-[9.5px]">API</span>
            <span className="font-semibold">{healthData.backendConnected ? 'ONLINE' : 'OFFLINE'}</span>
          </div>

          {/* 2. Database Status */}
          <div
            className={`hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/[0.12] bg-slate-100 dark:bg-[#191C23]/80 text-[10.5px] font-mono ${
              healthData.dbConnected ? 'text-slate-800 dark:text-[#F4F5F7]' : 'text-rose-600 dark:text-rose-300'
            }`}
            title="Database State Storage"
          >
            <Database className="w-3 h-3 text-[#0284C7] dark:text-[#00CFE8]" />
            <span className="text-slate-500 dark:text-[#858B99] text-[9.5px]">DB</span>
            <span className="font-semibold text-emerald-600 dark:text-emerald-400">{healthData.dbConnected ? 'SQLITE OK' : 'ERR'}</span>
          </div>

          {/* 3. Internal Simulation Engine Status */}
          <div
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#191C23]/80 border border-slate-200 dark:border-white/[0.12] text-[10.5px] font-mono text-slate-800 dark:text-[#F4F5F7]"
            title="Authoritative Python PRNG 3D Simulation Engine"
          >
            <Cpu className="w-3 h-3 text-[#0284C7] dark:text-[#00CFE8]" />
            <span className="text-slate-500 dark:text-[#858B99] text-[9.5px]">SIM</span>
            <span className="font-semibold text-[#0284C7] dark:text-[#00CFE8]">{healthData.simEngineStatus}</span>
          </div>

          {/* 4. External Telemetry Adapter Status */}
          <div
            className={`hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-white/[0.12] text-[10.5px] font-mono ${
              healthData.extStreaming
                ? 'bg-emerald-50 dark:bg-[#191C23]/80 text-emerald-700 dark:text-emerald-300'
                : 'bg-amber-50 dark:bg-[#191C23]/80 text-amber-700 dark:text-[#E9A23B]'
            }`}
            title="External PX4/ArduPilot SITL Telemetry Adapter"
          >
            <Radio className="w-3 h-3 text-amber-500 dark:text-[#E9A23B]" />
            <span className="text-slate-500 dark:text-[#858B99] text-[9.5px]">SITL</span>
            <span className="font-semibold">
              {healthData.extStreaming ? 'STREAMING' : 'STANDBY'}
            </span>
          </div>

          {/* Trainee Profile Badge with Accessible Popover */}
          <div className="relative pl-2 border-l border-slate-200 dark:border-white/[0.12]">
            <button
              onClick={() => setShowProfile((prev) => !prev)}
              className="flex items-center gap-2 p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-white/[0.04] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0284C7] dark:focus-visible:ring-[#00CFE8]"
              aria-label="Trainee Profile & Console Metadata"
            >
              <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-[#7047C8]/25 border border-violet-200 dark:border-white/[0.12] flex items-center justify-center text-violet-700 dark:text-[#F4F5F7] font-mono text-[11px] font-semibold">
                TA
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-xs font-semibold text-slate-900 dark:text-[#F4F5F7] font-mono leading-none">Trainee-Alpha</p>
                <p className="text-[10px] text-slate-500 dark:text-[#858B99] mt-0.5">Operator Console</p>
              </div>
            </button>

            {/* Profile Popover Menu (Level 3 Floating Overlay) */}
            {showProfile && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-white dark:bg-[#191C23] border border-slate-200 dark:border-white/[0.18] p-4 space-y-3 z-50 text-xs shadow-xl text-slate-800 dark:text-[#F4F5F7]">
                <div className="flex items-center justify-between border-b border-slate-100 dark:border-white/[0.08] pb-2">
                  <span className="font-mono font-bold text-slate-900 dark:text-[#F4F5F7] uppercase tracking-wider text-[10.5px]">
                    Operator Station
                  </span>
                  <span className="px-2 py-0.5 rounded text-[9.5px] font-mono font-bold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30">
                    ACTIVE DUTY
                  </span>
                </div>

                <div className="space-y-1.5 font-mono text-[11px]">
                  <div className="flex justify-between text-slate-500 dark:text-[#858B99]">
                    <span>Callsign:</span>
                    <span className="text-slate-900 dark:text-[#F4F5F7] font-bold">Trainee-Alpha</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-[#858B99]">
                    <span>Station:</span>
                    <span className="text-[#0284C7] dark:text-[#00CFE8]">Console Alpha-01</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-[#858B99]">
                    <span>Role:</span>
                    <span className="text-slate-900 dark:text-[#F4F5F7]">Counter-UAS Operator</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-[#858B99]">
                    <span>Clearance:</span>
                    <span className="text-amber-600 dark:text-[#E9A23B]">Level 3 (Simulation Rig)</span>
                  </div>
                  <div className="flex justify-between text-slate-500 dark:text-[#858B99]">
                    <span>Evaluation Mode:</span>
                    <span className="text-emerald-600 dark:text-emerald-400">Evidence-Aware Strict</span>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-white/[0.08] flex justify-end">
                  <button
                    onClick={() => setShowProfile(false)}
                    className="px-3 py-1 rounded-lg btn-secondary text-[11px] font-mono"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <ArchitectureModal isOpen={showArchModal} onClose={() => setShowArchModal(false)} />
    </>
  );
};

