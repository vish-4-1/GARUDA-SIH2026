import React, { useState } from 'react';
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
  Server,
  Activity,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { GarudaEagleLogo } from './GarudaEagleLogo';

interface NavItem {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  end?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: 'Operations',
    items: [
      { path: '/', label: 'Command Center', icon: LayoutDashboard, end: true },
      { path: '/scenarios', label: 'Scenario Library', icon: Layers, end: true },
      { path: '/scenarios/builder', label: 'Scenario Builder', icon: Sliders },
      { path: '/simulation', label: '3D Simulation', icon: Crosshair },
      { path: '/telemetry', label: 'Live Telemetry', icon: Activity },
    ],
  },
  {
    title: 'Evaluation & Audit',
    items: [
      { path: '/timeline', label: 'Evidence Timeline', icon: GitCommit },
      { path: '/scoring', label: 'Decision Scoring', icon: CheckCircle2 },
      { path: '/review', label: 'After-Action Review', icon: FileText },
      { path: '/training', label: 'Adaptive Training', icon: Sparkles },
    ],
  },
  {
    title: 'System Archive',
    items: [
      { path: '/reports', label: 'Reports & History', icon: History },
      { path: '/health', label: 'System Health', icon: Server },
    ],
  },
];

export const Sidebar: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside
      className={`${
        isCollapsed ? 'w-16' : 'w-64'
      } bg-white/98 dark:bg-[#0B0D12]/98 backdrop-blur-[24px] border-r border-slate-200 dark:border-white/[0.12] flex flex-col justify-between py-3 select-none shrink-0 shadow-sm dark:shadow-[4px_0_24px_rgba(0,0,0,0.7)] transition-all duration-200 z-20`}
    >
      <div className="flex flex-col gap-2.5 px-2.5 overflow-y-auto overflow-x-hidden">
        {/* Top Header Identity & Collapse Control */}
        <div className="flex items-center justify-between px-2 pt-1 pb-2 border-b border-slate-200 dark:border-white/[0.08]">
          {!isCollapsed ? (
            <div className="flex items-center gap-2.5">
              <GarudaEagleLogo className="w-6 h-6 shrink-0 text-slate-800 dark:text-[#F4F5F7]" />
              <div>
                <span className="font-bold text-sm tracking-wider text-slate-900 dark:text-[#F4F5F7] font-mono block leading-none">
                  GARUDA
                </span>
                <span className="text-[8.5px] text-[#0284C7] dark:text-[#00CFE8] font-mono tracking-widest uppercase block mt-0.5 font-bold">
                  COUNTER-UAS SIM
                </span>
              </div>
            </div>
          ) : (
            <div className="mx-auto py-0.5">
              <GarudaEagleLogo className="w-6 h-6 text-slate-800 dark:text-[#F4F5F7]" />
            </div>
          )}
          <button
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-[#858B99] dark:hover:text-[#F4F5F7] dark:hover:bg-white/[0.08] transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#0284C7] dark:focus-visible:ring-[#00CFE8]"
            title={isCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
            aria-label={isCollapsed ? 'Expand Navigation Sidebar' : 'Collapse Navigation Sidebar'}
          >
            {isCollapsed ? (
              <PanelLeftOpen className="w-4 h-4 text-[#0284C7] dark:text-[#00CFE8]" />
            ) : (
              <PanelLeftClose className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation Sections */}
        {NAV_SECTIONS.map((section, idx) => (
          <div key={section.title} className={idx > 0 ? 'pt-2 border-t border-slate-200 dark:border-white/[0.06]' : ''}>
            {!isCollapsed && (
              <div className="text-[9.5px] font-mono uppercase tracking-widest text-slate-400 dark:text-[#858B99] font-bold px-2.5 pb-1 flex items-center justify-between">
                <span>{`// 0${idx + 1} ${section.title}`}</span>
              </div>
            )}
            <div className="flex flex-col gap-1">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.end}
                    title={isCollapsed ? item.label : undefined}
                    className={({ isActive }) =>
                      `group relative flex items-center ${
                        isCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2'
                      } rounded-lg text-[12px] font-mono transition-all duration-150 ${
                        isActive
                          ? 'bg-sky-50 dark:bg-[#7047C8]/25 text-[#0284C7] dark:text-[#F4F5F7] border border-sky-200 dark:border-[#00CFE8]/40 shadow-sm dark:shadow-[0_0_12px_rgba(0,207,232,0.12)] font-semibold'
                          : 'text-slate-600 dark:text-[#858B99] hover:text-slate-900 dark:hover:text-[#F4F5F7] hover:bg-slate-100 dark:hover:bg-white/[0.06] border border-transparent'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        {/* Active indicator bar */}
                        {isActive && (
                          <span className="absolute left-0 top-1 bottom-1 w-1 rounded-r bg-[#0284C7] dark:bg-[#00CFE8] shadow-[0_0_8px_rgba(2,132,199,0.5)] dark:shadow-[0_0_8px_#00CFE8]" />
                        )}
                        <Icon
                          className={`w-4 h-4 shrink-0 transition-colors ${
                            isActive ? 'text-[#0284C7] dark:text-[#00CFE8]' : 'text-slate-500 dark:text-[#858B99] group-hover:text-slate-900 dark:group-hover:text-[#F4F5F7]'
                          }`}
                        />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Status / Platform Indicator */}
      <div className="px-2.5 pt-2 border-t border-slate-200 dark:border-white/[0.06]">
        <div
          className={`rounded-lg bg-slate-50 dark:bg-[#191C23]/80 border border-slate-200 dark:border-white/[0.12] backdrop-blur-[16px] ${
            isCollapsed ? 'p-2 text-center' : 'p-2.5'
          }`}
        >
          {isCollapsed ? (
            <div className="flex flex-col items-center gap-1.5" title="GARUDA Counter-UAS Platform">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[8.5px] font-mono text-[#0284C7] dark:text-[#00CFE8] font-bold">LIVE</span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0 animate-pulse" />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-mono text-slate-800 dark:text-[#F4F5F7] font-semibold truncate">
                      COUNTER-UAS RIG
                    </span>
                  </div>
                  <p className="text-[9px] text-[#0284C7] dark:text-[#00CFE8] font-mono truncate font-bold">
                    EVIDENCE ISOLATION ACTIVE
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
