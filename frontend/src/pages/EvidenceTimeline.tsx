import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  GitCommit,
  Clock,
  AlertTriangle,
  CheckCircle2,
  EyeOff,
  Shield,
  Layers,
  Search,
  Copy,
  Check,
  Lock,
  Radio,
  Activity,
  AlertOctagon,
} from 'lucide-react';
import { api } from '../services/api';
import { TimelineNode, SimulationRunState } from '../types';

interface TimelineResponse {
  run_id: string;
  current_sim_time: number;
  total_items: number;
  counts?: {
    all: number;
    delivered: number;
    delayed: number;
    lost: number;
    decisions: number;
    ground_truth: number;
  };
  role?: string;
  timeline: TimelineNode[];
}

export const EvidenceTimeline: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const runId = searchParams.get('run_id');

  const [runs, setRuns] = useState<SimulationRunState[]>([]);
  const [timelineData, setTimelineData] = useState<TimelineResponse | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const roleParam = searchParams.get('role') === 'trainee' ? 'trainee' : 'evaluator';
  const [role, setRole] = useState<'evaluator' | 'trainee'>(roleParam);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedNode, setSelectedNode] = useState<TimelineNode | null>(null);
  const [copiedPayload, setCopiedPayload] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    loadRuns();
  }, []);

  useEffect(() => {
    const currentRole = searchParams.get('role') === 'trainee' ? 'trainee' : 'evaluator';
    if (currentRole !== role) {
      setRole(currentRole);
    }
  }, [searchParams, role]);

  useEffect(() => {
    if (runId) {
      loadTimeline(runId, filterType, role);
    }
  }, [runId, filterType, role]);

  const loadRuns = async () => {
    try {
      const data = await api.getRuns();
      setRuns(data);
      if (!runId && data.length > 0) {
        const nextParams = new URLSearchParams(searchParams);
        nextParams.set('run_id', data[0].id);
        setSearchParams(nextParams);
      }
    } catch (err) {
      console.error('Failed to load runs', err);
    }
  };

  const loadTimeline = async (id: string, filter: string, activeRole: 'evaluator' | 'trainee') => {
    try {
      setLoading(true);
      const data = await api.getTimeline(id, filter, activeRole);
      setTimelineData(data);
      if (data.timeline && data.timeline.length > 0) {
        setSelectedNode((prev) => {
          if (!prev) return data.timeline[0];
          const found = data.timeline.find((n) => n.timeline_id === prev.timeline_id);
          return found || data.timeline[0];
        });
      } else {
        setSelectedNode(null);
      }
    } catch (err) {
      console.error('Failed to load timeline', err);
      setTimelineData(null);
      setSelectedNode(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRunChange = (newRunId: string) => {
    setSelectedNode(null);
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('run_id', newRunId);
    setSearchParams(nextParams);
  };

  const handleRoleToggle = (newRole: 'evaluator' | 'trainee') => {
    setRole(newRole);
    const newParams = new URLSearchParams(searchParams);
    newParams.set('role', newRole);
    if (newRole === 'trainee' && filterType === 'ground_truth') {
      setFilterType('all');
    }
    setSearchParams(newParams);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedPayload(true);
    setTimeout(() => setCopiedPayload(false), 2000);
  };

  const activeRun = runs.find((r) => r.id === runId);

  // Filter items locally by search query if provided
  const visibleItems = (timelineData?.timeline || []).filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q) ||
      (item.entity_id && item.entity_id.toLowerCase().includes(q)) ||
      item.item_type.toLowerCase().includes(q)
    );
  });

  const counts = timelineData?.counts || {
    all: timelineData?.total_items || 0,
    delivered: 0,
    delayed: 0,
    lost: 0,
    decisions: 0,
    ground_truth: 0,
  };

  const filterTabs = [
    { id: 'all', label: 'All Nodes', count: counts.all, icon: Layers },
    { id: 'delivered', label: 'Delivered', count: counts.delivered, icon: CheckCircle2 },
    { id: 'delayed', label: 'Delayed (>4s)', count: counts.delayed, icon: Clock },
    { id: 'lost', label: 'Lost / Jammed', count: counts.lost, icon: AlertOctagon },
    { id: 'decisions', label: 'Decisions', count: counts.decisions, icon: Activity },
    {
      id: 'ground_truth',
      label: 'Ground Truth',
      count: counts.ground_truth,
      icon: Shield,
      disabled: role === 'trainee',
      tooltip: role === 'trainee' ? 'Restricted in Trainee View' : undefined,
    },
  ];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-white/[0.08] pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-[#7047C8]/20 border border-white/[0.12] flex items-center justify-center">
              <GitCommit className="w-5 h-5 text-[#00CFE8]" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-[#F4F5F7] tracking-tight">
                Observation & Evidence Timeline
              </h1>
              <p className="text-[#858B99] text-xs mt-0.5">
                Chronological reconciliation of ground-truth state, delayed & dropped sensor packets, and trainee decisions.
              </p>
            </div>
          </div>
        </div>

        {/* Controls: Run Selector and Role Switcher */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Access Control Role Switcher */}
          <div className="inline-flex p-1 rounded-lg bg-[#111318]/90 border border-white/[0.12] text-xs font-mono">
            <button
              onClick={() => handleRoleToggle('evaluator')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                role === 'evaluator'
                  ? 'bg-[#7047C8]/25 text-[#00CFE8] border border-white/[0.14]'
                  : 'text-[#858B99] hover:text-[#F4F5F7]'
              }`}
              title="Full unrestricted evaluation audit ledger including physical ground truth"
            >
              <Shield className="w-3.5 h-3.5 text-[#00CFE8]" />
              Evaluator Audit
            </button>
            <button
              onClick={() => handleRoleToggle('trainee')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-semibold transition-all ${
                role === 'trainee'
                  ? 'bg-[#191C23] text-[#F4F5F7] border border-white/[0.14]'
                  : 'text-[#858B99] hover:text-[#F4F5F7]'
              }`}
              title="Restricted trainee view — ground truth and unreceived packets are completely excluded"
            >
              <EyeOff className="w-3.5 h-3.5 text-[#E9A23B]" />
              Trainee View
            </button>
          </div>

          {/* Run Selector Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={runId || ''}
              onChange={(e) => handleRunChange(e.target.value)}
              className="glass-input text-xs font-mono text-[#00CFE8] cursor-pointer min-w-[220px] py-1.5 px-2.5 bg-[#111318]"
              aria-label="Select Simulation Run"
            >
              {runs.length === 0 ? (
                <option value="">No simulation runs available</option>
              ) : (
                runs.map((r) => (
                  <option key={r.id} value={r.id} className="bg-[#111318] text-[#F4F5F7]">
                    {r.id.slice(0, 8)}... — {r.scenario_name || r.scenario_id || 'Seeded'} ({r.status})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Role Notice Banner */}
      {role === 'trainee' && (
        <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-600/30 flex items-center justify-between text-xs text-amber-200/90 font-mono">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#E9A23B] shrink-0" />
            <span>
              <strong>Trainee Operational Boundary Active:</strong> Evaluator-only Ground Truth events and dropped sensor frames are strictly excluded at the API level.
            </span>
          </div>
          <button
            onClick={() => handleRoleToggle('evaluator')}
            className="text-[11px] text-[#00CFE8] hover:underline font-bold shrink-0 ml-4"
          >
            Switch to Evaluator Audit
          </button>
        </div>
      )}

      {/* Active Run Status & Metadata Bar */}
      {activeRun && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2.5 text-xs font-mono">
          <div className="p-3 rounded-lg surface-structural">
            <span className="text-[#858B99] block text-[9.5px] uppercase tracking-wider font-medium">Run Status</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`w-1.5 h-1.5 rounded-full ${
                activeRun.status === 'RUNNING' ? 'bg-[#00CFE8]' :
                activeRun.status === 'COMPLETED' ? 'bg-emerald-400' : 'bg-[#E9A23B]'
              }`} />
              <span className="font-bold text-[#F4F5F7] text-xs">{activeRun.status}</span>
            </div>
          </div>
          <div className="p-3 rounded-lg surface-structural">
            <span className="text-[#858B99] block text-[9.5px] uppercase tracking-wider font-medium">Sim Clock</span>
            <span className="font-bold text-[#00CFE8] text-xs mt-0.5 block tabular-stat">
              T = {activeRun.current_sim_time.toFixed(1)}s / {activeRun.duration_seconds}s
            </span>
          </div>
          <div className="p-3 rounded-lg surface-structural">
            <span className="text-[#858B99] block text-[9.5px] uppercase tracking-wider font-medium">Delivered</span>
            <span className="font-bold text-[#F4F5F7] text-xs mt-0.5 block tabular-stat">
              {activeRun.delivered_observations_count}
            </span>
          </div>
          <div className="p-3 rounded-lg surface-structural">
            <span className="text-[#858B99] block text-[9.5px] uppercase tracking-wider font-medium">Delayed</span>
            <span className="font-bold text-[#E9A23B] text-xs mt-0.5 block tabular-stat">
              {activeRun.pending_delayed_count}
            </span>
          </div>
          <div className="p-3 rounded-lg surface-structural">
            <span className="text-[#858B99] block text-[9.5px] uppercase tracking-wider font-medium">Lost / Jammed</span>
            <span className="font-bold text-rose-400 text-xs mt-0.5 block tabular-stat">
              {activeRun.lost_observations_count}
            </span>
          </div>
          <div className="p-3 rounded-lg surface-structural">
            <span className="text-[#858B99] block text-[9.5px] uppercase tracking-wider font-medium">Decisions</span>
            <span className="font-bold text-emerald-400 text-xs mt-0.5 block tabular-stat">
              {activeRun.trainee_decisions_count}
            </span>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Tabs */}
        <div className="p-1 rounded-lg glass-card flex items-center gap-1 overflow-x-auto text-xs font-mono scrollbar-none">
          {filterTabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = filterType === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => !tab.disabled && setFilterType(tab.id)}
                disabled={tab.disabled}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md font-medium text-xs transition-all shrink-0 focus:outline-none focus:ring-1 focus:ring-[#00CFE8] ${
                  tab.disabled
                    ? 'opacity-40 cursor-not-allowed text-[#858B99]'
                    : isActive
                    ? 'bg-[#7047C8]/25 text-[#00CFE8] border border-white/[0.14] font-semibold'
                    : 'text-[#858B99] hover:text-[#F4F5F7] hover:bg-white/[0.04]'
                }`}
                title={tab.tooltip}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#00CFE8]' : 'text-[#858B99]'}`} />
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[9.5px] tabular-stat ${
                  isActive ? 'bg-[#00CFE8]/20 text-[#00CFE8]' : 'bg-white/[0.06] text-[#858B99]'
                }`}>
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Quick Search */}
        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-[#858B99] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search entity, sensor, or title..."
            className="glass-input pl-8 pr-3 py-1.5 text-xs font-mono w-full text-[#F4F5F7]"
          />
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Timeline Event Feed (7 Cols) */}
        <div className="lg:col-span-7 space-y-2.5">
          {loading ? (
            <div className="p-12 text-center text-[#858B99] font-mono text-xs space-y-2 glass-card rounded-xl">
              <div className="w-6 h-6 rounded-full border-2 border-[#00CFE8] border-t-transparent animate-spin mx-auto" />
              <p>Reconciling evidence timeline ledger...</p>
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="p-10 text-center text-[#858B99] font-mono text-xs space-y-2.5 glass-card rounded-xl">
              <AlertTriangle className="w-6 h-6 text-[#E9A23B]/80 mx-auto" />
              <h4 className="text-xs font-bold text-[#F4F5F7]">No Matching Timeline Events</h4>
              <p className="max-w-md mx-auto text-[#858B99]">
                {searchQuery
                  ? `No events matching "${searchQuery}" in this filter category.`
                  : `No events recorded for filter "${filterType}".`}
              </p>
              {(filterType !== 'all' || searchQuery) && (
                <button
                  onClick={() => {
                    setFilterType('all');
                    setSearchQuery('');
                  }}
                  className="px-3 py-1 rounded-md bg-white/[0.08] hover:bg-white/[0.12] text-[#00CFE8] font-semibold text-xs transition-all"
                >
                  Reset to All Events
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-2 max-h-[760px] overflow-y-auto pr-1">
              {visibleItems.map((node) => {
                const isSelected = selectedNode?.timeline_id === node.timeline_id;
                const isDecision = node.item_type === 'TRAINEE_DECISION';
                const isLost = node.item_type.includes('LOST');
                const isDelayed = node.item_type.includes('DELAYED');
                const isGT = node.item_type === 'GROUND_TRUTH_EVENT';

                const cardStyle = isSelected
                  ? 'border-[#00CFE8] bg-[#191C23] shadow-level1'
                  : isGT
                  ? 'border-[#7047C8]/40 bg-[#161220]/70 hover:border-[#7047C8]/60'
                  : isLost
                  ? 'border-rose-900/30 bg-rose-950/15 hover:border-rose-700/40'
                  : isDelayed
                  ? 'border-amber-900/30 bg-amber-950/15 hover:border-amber-700/40'
                  : isDecision
                  ? 'border-emerald-900/30 bg-emerald-950/15 hover:border-emerald-700/40'
                  : 'border-white/[0.10] bg-[#111318]/80 hover:border-white/20';

                return (
                  <div
                    key={node.timeline_id}
                    onClick={() => setSelectedNode(node)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        setSelectedNode(node);
                      }
                    }}
                    tabIndex={0}
                    role="button"
                    aria-selected={isSelected}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${cardStyle}`}
                  >
                    {/* Top Row: Timestamp, Badges, and Evaluator Tag */}
                    <div className="flex items-center justify-between text-xs font-mono mb-1">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-[#00CFE8] bg-[#00CFE8]/10 px-1.5 py-0.5 rounded text-[10.5px] tabular-stat">
                          T + {node.timestamp.toFixed(1)}s
                        </span>

                        {/* Event Category Badge */}
                        <span className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider ${
                          isGT ? 'bg-[#7047C8]/30 text-[#F4F5F7] border border-[#7047C8]/50' :
                          isDecision ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40' :
                          isLost ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40' :
                          isDelayed ? 'bg-amber-950/60 text-amber-300 border border-amber-800/40' :
                          'bg-white/[0.04] text-[#858B99] border border-white/[0.12]'
                        }`}>
                          {node.item_type.replace('OBSERVATION_', '').replace('_', ' ')}
                        </span>

                        {node.entity_id && (
                          <span className="text-[10px] font-mono text-[#858B99] bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/[0.08]">
                            {node.entity_id}
                          </span>
                        )}
                      </div>

                      {node.is_evaluator_only && (
                        <span className="text-[9.5px] font-mono font-bold text-[#F4F5F7] bg-[#7047C8]/40 px-1.5 py-0.5 rounded border border-white/[0.14] flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5 text-[#00CFE8]" />
                          EVALUATOR ONLY
                        </span>
                      )}
                    </div>

                    {/* Middle: Title & Description */}
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-bold text-[#F4F5F7] font-mono flex items-center justify-between">
                        <span>{node.title}</span>
                        {node.delay_applied !== undefined && node.delay_applied > 0 && (
                          <span className="text-[10px] text-[#E9A23B] font-normal tabular-stat">
                            +{node.delay_applied}s delay
                          </span>
                        )}
                      </h4>
                      <p className="text-[11px] text-[#B3B7C2] font-sans line-clamp-2">
                        {node.description}
                      </p>
                    </div>

                    {/* Bottom Metadata Badges */}
                    <div className="flex flex-wrap items-center gap-2 mt-1.5 pt-1.5 border-t border-white/[0.05] text-[10px] font-mono text-[#858B99]">
                      {node.metadata?.quality_score !== undefined && (
                        <span>Quality: <strong className="text-slate-200 tabular-stat">{Math.round(node.metadata.quality_score * 100)}%</strong></span>
                      )}
                      {node.metadata?.sensor_type && (
                        <span>Sensor: <strong className="text-[#00CFE8]">{node.metadata.sensor_type}</strong></span>
                      )}
                      {node.metadata?.is_hostile !== undefined && (
                        <span>Threat: <strong className={node.metadata.is_hostile ? 'text-rose-400' : 'text-emerald-400'}>
                          {node.metadata.is_hostile ? 'HOSTILE' : 'NON-HOSTILE'}
                        </strong></span>
                      )}
                      {node.metadata?.evidence_status && (
                        <span>Status: <strong className="text-emerald-400">{node.metadata.evidence_status}</strong></span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Column: Evidence Packet Inspector (5 Cols) */}
        <div className="lg:col-span-5 space-y-3.5">
          <div className="p-4 rounded-xl glass-card space-y-3.5 sticky top-20 shadow-level2">
            {/* Inspector Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
              <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-[#00CFE8] flex items-center gap-1.5">
                <Radio className="w-4 h-4 text-[#00CFE8]" />
                Evidence Packet Inspector
              </h3>
              {selectedNode && (
                <span className="text-xs font-mono font-bold text-[#F4F5F7] bg-[#00CFE8]/10 px-2 py-0.5 rounded border border-[#00CFE8]/30 tabular-stat">
                  T + {selectedNode.timestamp.toFixed(1)}s
                </span>
              )}
            </div>

            {selectedNode ? (
              <div className="space-y-3 text-xs font-mono">
                {/* Event Summary Box */}
                <div className="p-3 rounded-lg bg-[#111318]/90 border border-white/[0.08] space-y-0.5">
                  <div className="text-[9.5px] uppercase text-[#858B99] tracking-wider font-semibold">Selected Event Summary</div>
                  <div className="text-xs font-bold text-[#F4F5F7]">{selectedNode.title}</div>
                  <div className="text-[11px] text-[#B3B7C2] font-sans">{selectedNode.description}</div>
                </div>

                {/* Key-Value Metadata Grid */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-lg bg-[#111318]/90 border border-white/[0.06]">
                    <span className="text-[#858B99] block text-[9.5px]">Entity Identifier</span>
                    <span className="text-[#F4F5F7] font-bold text-xs">{selectedNode.entity_id || 'Global Environment'}</span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#111318]/90 border border-white/[0.06]">
                    <span className="text-[#858B99] block text-[9.5px]">Event Classification</span>
                    <span className="text-[#00CFE8] font-bold text-xs">
                      {selectedNode.item_type.replace('OBSERVATION_', '').replace('_', ' ')}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#111318]/90 border border-white/[0.06]">
                    <span className="text-[#858B99] block text-[9.5px]">Delivered Sim Time</span>
                    <span className="text-[#F4F5F7] font-bold text-xs tabular-stat">
                      {selectedNode.timestamp !== undefined ? `${selectedNode.timestamp.toFixed(1)}s` : 'N/A'}
                    </span>
                  </div>
                  <div className="p-2 rounded-lg bg-[#111318]/90 border border-white/[0.06]">
                    <span className="text-[#858B99] block text-[9.5px]">Created Sim Time</span>
                    <span className="text-[#F4F5F7] font-bold text-xs tabular-stat">
                      {selectedNode.created_at_sim_time !== undefined ? `${selectedNode.created_at_sim_time.toFixed(1)}s` : `${selectedNode.timestamp.toFixed(1)}s`}
                    </span>
                  </div>
                </div>

                {/* Delivery & Latency Information */}
                {selectedNode.delay_applied !== undefined && (
                  <div className="p-2.5 rounded-lg bg-[#111318]/90 border border-white/[0.08] space-y-1.5">
                    <span className="text-[9.5px] uppercase font-bold text-[#858B99] block tracking-wider">
                      Transmission & Latency Metrics
                    </span>
                    <div className="grid grid-cols-3 gap-2 text-[11px]">
                      <div>
                        <span className="text-[#858B99] block text-[9.5px]">Delay</span>
                        <span className="text-[#E9A23B] font-bold tabular-stat">{selectedNode.delay_applied}s</span>
                      </div>
                      <div>
                        <span className="text-[#858B99] block text-[9.5px]">Quality</span>
                        <span className="text-slate-200 font-bold tabular-stat">
                          {selectedNode.metadata?.quality_score !== undefined
                            ? `${Math.round(selectedNode.metadata.quality_score * 100)}%`
                            : 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#858B99] block text-[9.5px]">Status</span>
                        <span className={`font-bold text-[10px] ${
                          selectedNode.item_type.includes('LOST') ? 'text-rose-400' :
                          selectedNode.item_type.includes('DELAYED') ? 'text-[#E9A23B]' : 'text-emerald-400'
                        }`}>
                          {selectedNode.item_type.includes('LOST') ? 'DROPPED' :
                           selectedNode.item_type.includes('DELAYED') ? 'DELAYED' : 'DELIVERED'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Evidence Awareness Impact Explanation */}
                <div className="p-3 rounded-lg bg-[#111318]/90 border border-white/[0.08] space-y-1 text-[#B3B7C2] font-sans text-xs">
                  <div className="font-bold text-[#00CFE8] font-mono text-[10.5px] flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-[#00CFE8]" />
                    Evidence Isolation Assessment:
                  </div>
                  {selectedNode.item_type.includes('LOST') ? (
                    <p className="text-rose-300">
                      <strong>Observation Dropped (RF Jamming / Sensor Failure):</strong> The trainee never received this sensor frame. Under evidence-aware evaluation rules, any failure to react to this unreceived observation is strictly forgiven and does not penalize score.
                    </p>
                  ) : selectedNode.item_type.includes('DELAYED') ? (
                    <p className="text-amber-300">
                      <strong>Transmission Latency ({selectedNode.delay_applied}s):</strong> This observation was produced at T={selectedNode.created_at_sim_time}s but reached the trainee station at T={selectedNode.timestamp}s. Trainee timeliness scoring evaluates response from delivery time, not creation time.
                    </p>
                  ) : selectedNode.item_type === 'TRAINEE_DECISION' ? (
                    <p className="text-emerald-300">
                      <strong>Operational Decision Recorded:</strong> Status evaluated as <strong>{selectedNode.metadata?.evidence_status || 'RECORDED'}</strong> based on {selectedNode.metadata?.available_observation_count || 0} delivered sensor frames.
                    </p>
                  ) : selectedNode.item_type === 'GROUND_TRUTH_EVENT' ? (
                    <p className="text-[#F4F5F7]">
                      <strong>Authoritative Physical Truth (Evaluator Ledger):</strong> Represents exact 3D kinematic coordinates and true hostile intent. Strictly hidden from trainee operational console during live simulation.
                    </p>
                  ) : (
                    <p className="text-[#858B99]">
                      Sensor frame delivered within acceptable latency tolerance. Available to trainee console at T={selectedNode.timestamp}s.
                    </p>
                  )}
                </div>

                {/* Raw Telemetry JSON Payload */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-[#858B99]">Raw Event Payload</span>
                    <button
                      onClick={() => copyToClipboard(JSON.stringify(selectedNode.metadata, null, 2))}
                      className="flex items-center gap-1 text-[10px] text-[#00CFE8] hover:text-[#00CFE8]/80 transition-all font-mono"
                      title="Copy raw JSON payload"
                    >
                      {copiedPayload ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy JSON</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="p-2.5 rounded-lg bg-[#08090B] border border-white/[0.08] text-[10px] text-[#00CFE8] font-mono overflow-x-auto max-h-56 scrollbar-thin scrollbar-thumb-white/10 select-all">
                    {JSON.stringify(selectedNode.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 text-[#858B99]/70 font-mono text-xs space-y-2">
                <Radio className="w-6 h-6 text-white/20 mx-auto" />
                <p>Select a timeline node on the left to inspect its telemetry, delivery metrics, and evidence-isolation assessment.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default EvidenceTimeline;
