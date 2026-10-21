import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  Layers,
  Sliders,
  Crosshair,
  GitCommit,
  CheckCircle2,
  FileText,
  Sparkles,
  History,
  Activity,
  Server
} from 'lucide-react';
import { GarudaEagleLogo } from './GarudaEagleLogo';

const NAV_ITEMS = [
  { path: '/', label: 'Command Center', icon: LayoutDashboard },
  { path: '/scenarios', label: 'Scenario Library', icon: Layers },
  { path: '/scenarios/builder', label: 'Scenario Builder', icon: Sliders },
  { path: '/simulation', label: '3D Simulation', icon: Crosshair },
  { path: '/telemetry', label: 'Live Telemetry', icon: Activity },
  { path: '/timeline', label: 'Evidence Timeline', icon: GitCommit },
  { path: '/scoring', label: 'Decision Scoring', icon: CheckCircle2 },
  { path: '/review', label: 'After-Action Review', icon: FileText },
  { path: '/training', label: 'Adaptive Training', icon: Sparkles },
  { path: '/reports', label: 'Reports & History', icon: History },
  { path: '/health', label: 'System Health', icon: Server },
];

export const Sidebar: React.FC = () => {
  return (
    <aside className="w-64 bg-[#0D0B12]/95 backdrop-blur-xl border-r border-white/10 flex flex-col justify-between py-5 select-none shrink-0 shadow-[4px_0_30px_rgba(0,0,0,0.7)]">
      <div className="flex flex-col gap-1 px-3">
        <div className="px-3 pb-2.5 text-[10px] font-mono uppercase tracking-widest text-[#AAA3B5] font-bold">
          Tactical Modules
        </div>

        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) =>
                `group relative flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs font-mono transition-all duration-150 ${
                  isActive
                    ? 'bg-[#241039] text-[#F7F5FA] border border-[#3B0A6B] shadow-[0_0_18px_rgba(59,10,107,0.45)] font-semibold'
                    : 'text-[#AAA3B5] hover:text-[#F7F5FA] hover:bg-white/[0.04]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {/* Electric Cyan Active Indicator Strip */}
                  {isActive && (
                    <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]" />
                  )}
                  <Icon
                    className={`w-4 h-4 shrink-0 transition-colors ${
                      isActive ? 'text-[#00E5FF]' : 'text-[#AAA3B5] group-hover:text-[#F7F5FA]'
                    }`}
                  />
                  <span>{item.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Bottom Mission Card */}
      <div className="px-3">
        <div className="p-3.5 rounded-xl bg-[#15121C]/90 border border-[#3B0A6B]/50 backdrop-blur-md shadow-[0_4px_20px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between mb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#00E5FF] animate-ping" />
              <span className="text-[10px] font-mono text-[#00E5FF] font-bold tracking-wider">
                SIH26247 PROTOTYPE
              </span>
            </div>
            <GarudaEagleLogo className="w-4 h-4 shrink-0" />
          </div>
          <p className="text-[11px] text-[#AAA3B5] leading-relaxed">
            GARUDA • Autonomous Counter-UAS Simulation & Evaluation Engine
          </p>
        </div>
      </div>
    </aside>
  );
};
