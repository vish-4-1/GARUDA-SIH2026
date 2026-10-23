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
      color: 'border-white/[0.12] bg-[#191C23] text-[#00CFE8]',
      tech: 'JSON/YAML, Urban/Coastal/Border Models, Weather Presets, Seeded PRNG',
      description: 'Generates deterministic synthetic drone threat scenarios with customizable density, duration, and atmospheric conditions.',
      prototype: 'ScenarioBuilder.tsx, /api/scenarios',
    },
    {
      num: '2',
      title: 'Simulation Engine (Drone Models)',
      icon: Cpu,
      color: 'border-white/[0.12] bg-[#191C23] text-[#00CFE8]',
      tech: 'Python Kinematics, Containerized Docker Engine, Seeded Deterministic Vectors',
      description: 'Simulates multi-axis ingress flights for Micro-Quadcopters, Fixed-Wing Loitering Munitions, Heavy-Lift UAVs, and Friendly Drones.',
      prototype: 'app/engine/generator.py, /api/runs',
    },
    {
      num: '3',
      title: 'Observation & Comm Delay Simulator',
      icon: Radio,
      color: 'border-[#E9A23B]/30 bg-[#191C23] text-[#E9A23B]',
      tech: 'RF Scanner, Radar, EO/IR, Acoustic, Latency Jitter, Jamming Packet Drop',
      description: 'Applies transmission latency, packet loss, and Gaussian sensor noise. Strictly separates ground truth from delivered telemetry.',
      prototype: 'app/engine/degradation.py, /api/runs/{id}/workspace',
    },
    {
      num: '4',
      title: 'Trainee Interface (Decision Making)',
      icon: Crosshair,
      color: 'border-white/[0.12] bg-[#191C23] text-[#00CFE8]',
      tech: 'React 18, TypeScript, Tailwind CSS, 3D Canvas / 2D Radar, REST API',
      description: 'Presents degraded observations on an interactive radar scope. Allows operators to Classify, Mark Uncertain, Request Ping, or Flag False Alarm.',
      prototype: 'SimulationWorkspace.tsx, Tactical3DScene.tsx',
    },
    {
      num: '5',
      title: 'Decision Scoring Engine',
      icon: Award,
      color: 'border-white/[0.12] bg-[#191C23] text-[#00CFE8]',
      tech: 'Python Scoring Logic, Evidence Cross-Referencing, Protected Denominators',
      description: 'Audits trainee decisions against delivered evidence at decision time. Evaluates Detection Rate, Accuracy, Timeliness, and Discipline.',
      prototype: 'app/scoring/evaluator.py, /api/runs/{id}/score',
    },
    {
      num: '6',
      title: 'After-Action Review & Adaptive Training',
      icon: Sparkles,
      color: 'border-white/[0.12] bg-[#7047C8]/20 text-[#00CFE8]',
      tech: 'Automated Diagnostic Rules, JSON/CSV Export Ledgers, 1-Click Drill Launcher',
      description: 'Analyzes performance weaknesses and automatically generates personalized follow-up exercises in a continuous learning loop.',
      prototype: 'AfterActionReview.tsx, AdaptiveTraining.tsx',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-[16px] animate-fade-in">
      <div className="relative w-full max-w-5xl max-h-[90vh] overflow-y-auto glass-overlay rounded-xl p-6 md:p-8 shadow-level3 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.12] pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#7047C8]/20 text-[#00CFE8] border border-white/[0.12]">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold font-mono text-[#F4F5F7] tracking-tight">GARUDA System Architecture</h2>
              </div>
              <p className="text-xs text-[#858B99]">
                End-to-End Functional Architecture & Subsystem Mapping for Counter-Drone Threat Simulation
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-[#191C23]/70 hover:bg-white/10 text-[#858B99] hover:text-[#F4F5F7] border border-white/[0.12] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 6 Subsystems Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {subsystems.map((sub) => {
            const Icon = sub.icon;
            return (
              <div
                key={sub.num}
                className={`p-4 rounded-lg border border-white/[0.12] bg-[#111318]/90 flex flex-col justify-between space-y-3 backdrop-blur-[16px] shadow-sm`}
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10.5px] font-bold px-2 py-0.5 rounded bg-[#191C23] text-[#00CFE8] border border-white/[0.12]">
                      STAGE {sub.num}
                    </span>
                    <Icon className="w-4 h-4 text-[#858B99]" />
                  </div>

                  <h3 className="font-bold text-[13px] text-[#F4F5F7] font-mono">{sub.title}</h3>
                  <p className="text-xs text-[#B3B7C2] font-sans leading-relaxed">{sub.description}</p>
                </div>

                <div className="pt-2 border-t border-white/[0.08] space-y-1 text-[11px] font-mono">
                  <div className="text-[#858B99]">
                    <strong className="text-[#F4F5F7]">Stack:</strong> {sub.tech}
                  </div>
                  <div className="text-[#00CFE8]">
                    <strong>Code:</strong> {sub.prototype}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Data Layer & Continuous Feedback Loop */}
        <div className="p-4 rounded-lg bg-[#111318]/90 border border-white/[0.12] space-y-3">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-[#F4F5F7] font-semibold flex items-center gap-2">
              <Database className="w-4 h-4 text-[#00CFE8]" />
              Integrated Data Layer
            </span>
            <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> PostgreSQL & SQLite Storage
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono text-[#858B99]">
            <div className="p-2.5 rounded-lg bg-[#191C23]/70 border border-white/[0.12]">
              <strong className="text-[#F4F5F7] block mb-0.5">Scenarios & Configurations:</strong>
              Persisted with duration, seeds, and degradation parameters.
            </div>
            <div className="p-2.5 rounded-lg bg-[#191C23]/70 border border-white/[0.12]">
              <strong className="text-[#F4F5F7] block mb-0.5">Evidence & Telemetry Ledgers:</strong>
              Every observation, latency offset, and dropped packet archived.
            </div>
            <div className="p-2.5 rounded-lg bg-[#191C23]/70 border border-white/[0.12]">
              <strong className="text-[#F4F5F7] block mb-0.5">Continuous Feedback Loop:</strong>
              AAR weaknesses feed directly back into Stage 1 adaptive scenario generation.
            </div>
          </div>
        </div>

        {/* Close Button */}
        <div className="flex justify-end pt-1">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg btn-primary text-xs font-mono font-semibold"
          >
            Close Blueprint
          </button>
        </div>
      </div>
    </div>
  );
};

