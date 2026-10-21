import React, { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import {
  GitCommit,
  Filter,
  Radio,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Shield,
  Layers,
  Search,
  ExternalLink
} from 'lucide-react';
import { api } from '../services/api';
import { TimelineNode, SimulationRunState } from '../types';

export const EvidenceTimeline: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const runId = searchParams.get('run_id');

  const [runs, setRuns] = useState<SimulationRunState[]>([]);
  const [timelineData, setTimelineData] = useState<{ run_id: string; current_sim_time: number; total_items: number; timeline: TimelineNode[] } | null>(null);
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);
  const [selectedNode, setSelectedNode] = useState<TimelineNode | null>(null);

  useEffect(() => {
    loadRuns();
  }, []);

  useEffect(() => {
    if (runId) {
      loadTimeline(runId, filterType);
    }
  }, [runId, filterType]);

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

  const loadTimeline = async (id: string, filter: string) => {
    try {
      setLoading(true);
      const data = await api.getTimeline(id, filter);
      setTimelineData(data);
      if (data.timeline.length > 0 && !selectedNode) {
        setSelectedNode(data.timeline[0]);
      }
    } catch (err) {
      console.error('Failed to load timeline', err);
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
            <GitCommit className="w-7 h-7 text-[#00E5FF]" />
            Observation & Evidence Timeline
          </h1>
          <p className="text-[#AAA3B5] text-xs mt-1">
            Chronological audit reconciling physical ground truth, delayed & dropped sensor packets, and trainee decisions.
          </p>
        </div>

        {/* Run Selector Dropdown */}
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-[#AAA3B5]">Select Run:</span>
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
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="p-3 rounded-2xl bg-[#0D0B12]/80 backdrop-blur-md border border-white/10 flex items-center gap-2 overflow-x-auto text-xs font-mono shadow-md">
        <Filter className="w-4 h-4 text-[#AAA3B5] ml-2 mr-1" />
        {[
          { id: 'all', label: 'All Timeline Nodes' },
          { id: 'delivered', label: 'Delivered Packets' },
          { id: 'delayed', label: 'Delayed (>4s) Packets' },
          { id: 'lost', label: 'Lost / Jammed Packets' },
          { id: 'decisions', label: 'Trainee Decisions' },
          { id: 'ground_truth', label: 'Evaluator Ground Truth' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3 py-1.5 rounded-xl font-bold transition-all shrink-0 ${
              filterType === tab.id
                ? 'bg-[#241039] text-[#00E5FF] border border-[#3B0A6B] shadow-[0_0_12px_rgba(59,10,107,0.3)]'
                : 'text-[#AAA3B5] hover:text-[#F7F5FA] hover:bg-white/[0.04]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Timeline List and Detail Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Timeline Event Feed (7 Cols) */}
        <div className="lg:col-span-7 space-y-3">
          {loading ? (
            <div className="py-20 text-center text-[#AAA3B5] font-mono text-xs animate-pulse">
              Reconstructing evidence timeline ledger...
            </div>
          ) : !timelineData || timelineData.timeline.length === 0 ? (
            <div className="p-8 text-center bg-[#0D0B12]/80 backdrop-blur-md rounded-2xl border border-white/10 text-[#AAA3B5] font-mono text-xs">
              No timeline events recorded for this filter.
            </div>
          ) : (
            <div className="space-y-3 max-h-[720px] overflow-y-auto pr-2">
              {timelineData.timeline.map((node) => {
                const isSelected = selectedNode?.timeline_id === node.timeline_id;
                const isDecision = node.item_type === 'TRAINEE_DECISION';
                const isLost = node.item_type.includes('LOST');
                const isDelayed = node.item_type.includes('DELAYED');
                const isGT = node.item_type === 'GROUND_TRUTH_EVENT';

                const borderAccent = isSelected
                  ? 'border-[#00E5FF] bg-[#00E5FF]/10 shadow-[0_0_20px_rgba(0,229,255,0.2)]'
                  : isGT
                  ? 'border-[#3B0A6B]/60 bg-[#241039]/40 hover:border-[#00E5FF]/40'
                  : isLost
                  ? 'border-rose-900/60 bg-rose-950/15 hover:border-rose-700'
                  : isDelayed
                  ? 'border-amber-900/60 bg-amber-950/15 hover:border-amber-700'
                  : isDecision
                  ? 'border-emerald-900/60 bg-emerald-950/15 hover:border-emerald-700'
                  : 'border-white/10 bg-[#0D0B12]/80 hover:border-[#00E5FF]/40';

                return (
                  <div
                    key={node.timeline_id}
                    onClick={() => setSelectedNode(node)}
                    className={`p-4 rounded-2xl border cursor-pointer transition-all space-y-2 backdrop-blur-md ${borderAccent}`}
                  >
                    <div className="flex items-center justify-between text-xs font-mono">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#00E5FF]">{node.timestamp.toFixed(1)}s</span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          isGT ? 'bg-[#241039] text-[#00E5FF] border border-[#3B0A6B]' :
                          isDecision ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                          isLost ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                          isDelayed ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                          'bg-[#15121C] text-[#00E5FF] border border-white/10'
                        }`}>
                          {node.item_type.replace('OBSERVATION_', '')}
                        </span>
                      </div>

                      {node.is_evaluator_only && (
                        <span className="text-[10px] font-mono text-[#00E5FF] font-bold bg-[#241039] px-2 py-0.5 rounded border border-[#3B0A6B]">
                          [EVALUATOR ONLY]
                        </span>
                      )}
                    </div>

                    <h4 className="text-sm font-bold text-[#F7F5FA] font-mono">{node.title}</h4>
                    <p className="text-xs text-[#AAA3B5] font-sans">{node.description}</p>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Event Evidence Inspector (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="p-6 rounded-2xl bg-[#0D0B12]/85 backdrop-blur-xl border border-white/10 space-y-4 sticky top-24 shadow-xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h3 className="text-sm font-mono font-bold uppercase tracking-wider text-[#00E5FF] flex items-center gap-2">
                <Radio className="w-4 h-4 text-[#00E5FF]" />
                Evidence Packet Inspector
              </h3>
              {selectedNode && (
                <span className="text-xs font-mono text-[#AAA3B5]">
                  T = {selectedNode.timestamp}s
                </span>
              )}
            </div>

            {selectedNode ? (
              <div className="space-y-4 text-xs font-mono">
                <div>
                  <div className="text-[#AAA3B5] mb-1">Entity Identifier</div>
                  <div className="text-base font-bold text-[#F7F5FA]">{selectedNode.entity_id || 'Global'}</div>
                </div>

                <div>
                  <div className="text-[#AAA3B5] mb-1">Packet Type</div>
                  <div className="text-[#F7F5FA] font-semibold">{selectedNode.title}</div>
                </div>

                {selectedNode.delay_applied !== undefined && (
                  <div className="grid grid-cols-2 gap-2 p-3 rounded-xl bg-[#15121C] border border-white/10">
                    <div>
                      <span className="text-[#AAA3B5]/60 block">Transmission Delay</span>
                      <span className="text-amber-400 font-bold">{selectedNode.delay_applied}s</span>
                    </div>
                    <div>
                      <span className="text-[#AAA3B5]/60 block">Created At</span>
                      <span className="text-[#F7F5FA] font-bold">{selectedNode.created_at_sim_time}s</span>
                    </div>
                  </div>
                )}

                {/* Evidence Awareness Impact Explanation */}
                <div className="p-3.5 rounded-xl bg-[#15121C] border border-white/10 space-y-1.5 text-[#AAA3B5] font-sans text-xs">
                  <div className="font-bold text-[#00E5FF] font-mono text-[11px]">
                    Evidence Isolation Assessment:
                  </div>
                  {selectedNode.item_type.includes('LOST') ? (
                    <p className="text-rose-300">
                      This packet was <strong>dropped by RF jamming</strong>. The trainee never received this sensor frame. Under GARUDA evidence-aware rules, any failure to react to this observation is completely forgiven.
                    </p>
                  ) : selectedNode.item_type.includes('DELAYED') ? (
                    <p className="text-amber-300">
                      This observation experienced <strong>latency ({selectedNode.delay_applied}s)</strong>. The trainee was only able to act after T={selectedNode.timestamp}s. Response time scoring benchmarks start at delivered time, not creation time!
                    </p>
                  ) : selectedNode.item_type === 'TRAINEE_DECISION' ? (
                    <p className="text-emerald-300">
                      Trainee logged action with status: <strong>{selectedNode.metadata.evidence_status}</strong> based on {selectedNode.metadata.available_observation_count} delivered sensor packets.
                    </p>
                  ) : (
                    <p className="text-[#AAA3B5]">
                      Standard sensor frame delivered within normal latency tolerances.
                    </p>
                  )}
                </div>

                {/* Raw Metadata JSON Payload */}
                <div>
                  <div className="text-[#AAA3B5] mb-1 text-[11px]">Telemetry Payload Data</div>
                  <pre className="p-3 rounded-xl bg-[#050505] border border-white/10 text-[10px] text-[#00E5FF] font-mono overflow-x-auto max-h-56">
                    {JSON.stringify(selectedNode.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-[#AAA3B5]/60 font-mono text-xs">
                Select a timeline node on the left to inspect its telemetry and delivery status.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

