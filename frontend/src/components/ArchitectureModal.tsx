import React from 'react';
import { X, Layers, Cpu, Radio, Crosshair, Award, Sparkles, Database, CheckCircle2 } from 'lucide-react';

interface ArchitectureModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ArchitectureModal: React.FC<ArchitectureModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  const subsystems = [
    {
      num: '1',
      title: 'Scenario & Environment Generator',
      icon: Layers,
      color: 'border-[#3B0A6B]/50 bg-[#15121C]/90 text-[#00E5FF]',
      tech: 'JSON/YAML, Urban/Coastal/Border Models, Weather Presets, Seeded PRNG',
      description: 'Generates deterministic synthetic drone threat scenarios with customizable density, duration, and atmospheric conditions.',
      prototype: 'ScenarioBuilder.tsx, /api/scenarios',
    },
    {
      num: '2',
      title: 'Simulation Engine (Drone Models)',
      icon: Cpu,
      color: 'border-[#3B0A6B]/50 bg-[#15121C]/90 text-[#00E5FF]',
      tech: 'Python Kinematics, Containerized Docker Engine, Seeded Deterministic Vectors',
      description: 'Simulates multi-axis ingress flights for Micro-Quadcopters, Fixed-Wing Loitering Munitions, Heavy-Lift UAVs, and Friendly Drones.',
      prototype: 'app/engine/generator.py, /api/runs',
    },
    {
      num: '3',
      title: 'Observation & Comm Delay Simulator',
      icon: Radio,
      color: 'border-amber-500/30 bg-[#15121C]/90 text-amber-400',
      tech: 'RF Scanner, Radar, EO/IR, Acoustic, Latency Jitter, Jamming Packet Drop',
      description: 'Applies transmission latency, packet loss, and Gaussian sensor noise. Strictly separates ground truth from delivered telemetry.',
      prototype: 'app/engine/degradation.py, /api/runs/{id}/workspace',
    },
    {
      num: '4',
      title: 'Trainee Interface (Decision Making)',
      icon: Crosshair,
      color: 'border-[#00E5FF]/40 bg-[#15121C]/90 text-[#00E5FF]',
      tech: 'React 18, TypeScript, Tailwind CSS, 3D Canvas / 2D Radar, REST API',
      description: 'Presents degraded observations on an interactive radar scope. Allows operators to Classify, Mark Uncertain, Request Ping, or Flag False Alarm.',
      prototype: 'SimulationWorkspace.tsx, Tactical3DScene.tsx',
    },
    {
      num: '5',
      title: 'Decision Scoring Engine',
      icon: Award,
      color: 'border-[#3B0A6B]/50 bg-[#15121C]/90 text-[#00E5FF]',
      tech: 'Python Scoring Logic, Evidence Cross-Referencing, Protected Denominators',
      description: 'Audits trainee decisions against delivered evidence at decision time. Evaluates Detection Rate, Accuracy, Timeliness, and Discipline.',
      prototype: 'app/scoring/evaluator.py, /api/runs/{id}/score',
    },
    {
      num: '6',
      title: 'After-Action Review & Adaptive Training',
      icon: Sparkles,
      color: 'border-[#3B0A6B]/50 bg-[#241039]/90 text-[#00E5FF]',
      tech: 'Automated Diagnostic Rules, JSON/CSV Export Ledgers, 1-Click Drill Launcher',
      description: 'Analyzes performance weaknesses and automatically generates personalized follow-up exercises in a continuous learning loop.',
      prototype: 'AfterActionReview.tsx, AdaptiveTraining.tsx',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto bg-[#050505]/95 border border-[#3B0A6B]/60 rounded-2xl p-6 md:p-8 shadow-[0_0_50px_rgba(0,0,0,0.9)] space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#241039] text-[#00E5FF] border border-[#00E5FF]/30 shadow-[0_0_15px_rgba(0,229,255,0.2)]">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold font-mono text-[#F7F5FA]">GARUDA System Architecture</h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-[#241039] text-[#00E5FF] border border-[#00E5FF]/30">
                  SIH26247
                </span>
              </div>
              <p className="text-xs text-[#AAA3B5]">
                End-to-End Functional Architecture & Subsystem Mapping for Smart India Hackathon 2026
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-[#15121C] hover:bg-white/10 text-[#AAA3B5] hover:text-[#F7F5FA] border border-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 6 Subsystems Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {subsystems.map((sub) => {
            const Icon = sub.icon;
            return (
              <div
                key={sub.num}
                className={`p-4 rounded-xl border flex flex-col justify-between space-y-3 ${sub.color}`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-[#0D0B12] text-[#00E5FF] border border-[#00E5FF]/20">
                      STAGE {sub.num}
                    </span>
                    <Icon className="w-5 h-5" />
                  </div>

                  <h3 className="font-bold text-sm text-[#F7F5FA] font-mono">{sub.title}</h3>
                  <p className="text-xs text-[#AAA3B5] font-sans leading-relaxed">{sub.description}</p>
                </div>

                <div className="pt-2 border-t border-white/10 space-y-1 text-[11px] font-mono">
                  <div className="text-[#AAA3B5]">
                    <strong className="text-[#F7F5FA]">Stack:</strong> {sub.tech}
                  </div>
                  <div className="text-[#00E5FF]">
                    <strong>Code:</strong> {sub.prototype}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Data Layer & Continuous Feedback Loop */}
        <div className="p-4 rounded-xl bg-[#0D0B12] border border-[#3B0A6B]/50 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#F7F5FA] font-bold flex items-center gap-2">
              <Database className="w-4 h-4 text-[#00E5FF]" />
              Integrated Data Layer
            </span>
            <span className="text-emerald-400 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" /> PostgreSQL & SQLite Storage
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-[#AAA3B5]">
            <div className="p-2.5 rounded-lg bg-[#15121C] border border-white/10">
              <strong className="text-[#F7F5FA] block mb-0.5">Scenarios & Configurations:</strong>
              Persisted with duration, seeds, and degradation parameters.
            </div>
            <div className="p-2.5 rounded-lg bg-[#15121C] border border-white/10">
              <strong className="text-[#F7F5FA] block mb-0.5">Evidence & Telemetry Ledgers:</strong>
              Every observation, latency offset, and dropped packet archived.
            </div>
            <div className="p-2.5 rounded-lg bg-[#15121C] border border-white/10">
              <strong className="text-[#F7F5FA] block mb-0.5">Continuous Feedback Loop:</strong>
              AAR weaknesses feed directly back into Stage 1 adaptive scenario generation.
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-2">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#3B0A6B] to-[#241039] hover:border-[#00E5FF]/60 border border-[#00E5FF]/30 text-[#00E5FF] font-mono text-xs font-bold transition-all shadow-[0_0_20px_rgba(0,229,255,0.2)]"
          >
            Close Blueprint
          </button>
        </div>
      </div>
    </div>
  );
};
