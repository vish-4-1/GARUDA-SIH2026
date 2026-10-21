import React from 'react';
import { Observation, GroundTruthEvent, TraineeDecision } from '../types';

interface TacticalRadarCanvasProps {
  visibleObservations: Observation[];
  evaluatorGroundTruth?: GroundTruthEvent[] | null;
  decisions: TraineeDecision[];
  selectedEntityId?: string | null;
  onSelectEntity: (entityId: string) => void;
  isEvaluatorMode: boolean;
  currentSimTime: number;
}

export const TacticalRadarCanvas: React.FC<TacticalRadarCanvasProps> = ({
  visibleObservations,
  evaluatorGroundTruth,
  decisions,
  selectedEntityId,
  onSelectEntity,
  isEvaluatorMode,
  currentSimTime,
}) => {
  const size = 680;
  const center = size / 2;
  const maxRangeMeters = 4500;
  const scale = (size / 2 - 20) / maxRangeMeters;

  const toCanvasCoords = (x: number, y: number) => {
    return {
      cx: center + x * scale,
      cy: center - y * scale,
    };
  };

  // Group latest observation per entity
  const latestObsByEntity: Record<string, Observation> = {};
  visibleObservations.forEach((obs) => {
    const eid = obs.trainee_payload.entity_id;
    if (!latestObsByEntity[eid] || obs.delivered_at_sim_time > latestObsByEntity[eid].delivered_at_sim_time) {
      latestObsByEntity[eid] = obs;
    }
  });

  // Active ground truth entities
  const activeGtByEntity: Record<string, GroundTruthEvent> = {};
  if (isEvaluatorMode && evaluatorGroundTruth) {
    evaluatorGroundTruth.forEach((gt) => {
      if (gt.simulation_time <= currentSimTime + 5.0) {
        const eid = gt.entity_id;
        if (!activeGtByEntity[eid] || gt.simulation_time > activeGtByEntity[eid].simulation_time) {
          activeGtByEntity[eid] = gt;
        }
      }
    });
  }

  return (
    <div className="relative w-full aspect-square max-w-[680px] mx-auto bg-[#050505] rounded-2xl border border-[#00E5FF]/25 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden flex items-center justify-center select-none">
      {/* Radar Sweep Effect (Electric Cyan Gradient) */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div 
          className="w-full h-full rounded-full border border-[#00E5FF]/20"
          style={{
            background: 'conic-gradient(from 0deg at 50% 50%, rgba(0, 229, 255, 0.3) 0deg, rgba(0, 229, 255, 0) 65deg, transparent 360deg)',
            animation: 'spin 6s linear infinite',
          }}
        />
      </div>

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative z-10 w-full h-full">
        <defs>
          <radialGradient id="radarGridGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#3B0A6B" stopOpacity="0.4" />
            <stop offset="60%" stopColor="#15121C" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#050505" stopOpacity="1" />
          </radialGradient>
          
          <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        {/* Tactical Grid Background */}
        <circle cx={center} cy={center} r={center - 10} fill="url(#radarGridGlow)" stroke="#3B0A6B" strokeWidth="1.5" />

        {/* Range Rings: 1km, 2km, 3km, 4km (Electric Cyan / Amethyst) */}
        {[1000, 2000, 3000, 4000].map((range) => {
          const r = range * scale;
          return (
            <g key={range}>
              <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke="#00E5FF"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity={0.3}
              />
              <text
                x={center + 8}
                y={center - r + 14}
                fill="#00E5FF"
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                opacity={0.75}
              >
                {range / 1000}km
              </text>
            </g>
          );
        })}

        {/* Defense Core Perimeter Warning Boundary: 1800m */}
        <circle
          cx={center}
          cy={center}
          r={1800 * scale}
          fill="rgba(59, 10, 107, 0.15)"
          stroke="#00E5FF"
          strokeWidth="1.5"
          strokeDasharray="6 3"
          opacity={0.7}
        />
        <text
          x={center + 8}
          y={center - 1800 * scale - 4}
          fill="#00E5FF"
          fontSize="9"
          fontWeight="bold"
          fontFamily="JetBrains Mono, monospace"
          opacity={0.85}
        >
          INNER DEFENSE PERIMETER (1.8km)
        </text>

        {/* Compass Crosshairs */}
        <line x1={center} y1={20} x2={center} y2={size - 20} stroke="#3B0A6B" strokeWidth="1" opacity={0.6} />
        <line x1={20} y1={center} x2={size - 20} y2={center} stroke="#3B0A6B" strokeWidth="1" opacity={0.6} />

        {/* Compass Cardinal Points */}
        <text x={center} y={35} textAnchor="middle" fill="#00E5FF" fontSize="12" fontWeight="bold">000° N</text>
        <text x={size - 40} y={center + 4} textAnchor="middle" fill="#00E5FF" fontSize="11">090° E</text>
        <text x={center} y={size - 25} textAnchor="middle" fill="#00E5FF" fontSize="11">180° S</text>
        <text x={40} y={center + 4} textAnchor="middle" fill="#00E5FF" fontSize="11">270° W</text>

        {/* Central Tactical HQ Base */}
        <circle cx={center} cy={center} r={6} fill="#00E5FF" filter="url(#cyanGlow)" />
        <circle cx={center} cy={center} r={14} fill="none" stroke="#3B0A6B" strokeWidth="2" />
        <text x={center} y={center + 26} textAnchor="middle" fill="#AAA3B5" fontSize="10" fontWeight="600" fontFamily="monospace">
          HQ DEFENSE NODE
        </text>

        {/* Evaluator Ground Truth Overlay (Visible ONLY in Evaluator Mode) */}
        {isEvaluatorMode &&
          Object.values(activeGtByEntity).map((gt) => {
            const { cx, cy } = toCanvasCoords(gt.pos_x, gt.pos_y);
            const isHostile = gt.is_hostile;
            const headingRad = (gt.heading * Math.PI) / 180;
            const vectorLen = 24;
            const vx = cx + vectorLen * Math.sin(headingRad);
            const vy = cy - vectorLen * Math.cos(headingRad);

            return (
              <g key={`gt-${gt.entity_id}`}>
                <line x1={cx} y1={cy} x2={vx} y2={vy} stroke={isHostile ? '#EF4444' : '#10B981'} strokeWidth="2" strokeDasharray="3 3" opacity={0.8} />
                <circle
                  cx={cx}
                  cy={cy}
                  r={8}
                  fill="none"
                  stroke={isHostile ? '#EF4444' : '#10B981'}
                  strokeWidth="2"
                  opacity={0.9}
                />
                <circle cx={cx} cy={cy} r={3} fill={isHostile ? '#EF4444' : '#10B981'} />
                <text
                  x={cx + 12}
                  y={cy - 10}
                  fill={isHostile ? '#F87171' : '#86efac'}
                  fontSize="10"
                  fontFamily="JetBrains Mono, monospace"
                  fontWeight="bold"
                >
                  [TRUE] {gt.entity_id} ({gt.threat_category})
                </text>
              </g>
            );
          })}

        {/* Trainee Observed Contacts */}
        {Object.values(latestObsByEntity).map((obs) => {
          const payload = obs.trainee_payload;
          const eid = payload.entity_id;
          const { cx, cy } = toCanvasCoords(payload.observed_pos_x, payload.observed_pos_y);
          const isSelected = selectedEntityId === eid;
          const uncertaintyRadius = Math.max(12, (1.0 - obs.quality_score) * 45);

          return (
            <g
              key={`obs-${obs.id}`}
              className="cursor-pointer transition-transform hover:scale-110"
              onClick={() => onSelectEntity(eid)}
            >
              {/* Uncertainty Zone */}
              <circle
                cx={cx}
                cy={cy}
                r={uncertaintyRadius}
                fill={isSelected ? 'rgba(0, 229, 255, 0.18)' : 'rgba(59, 10, 107, 0.12)'}
                stroke={isSelected ? '#00E5FF' : '#3B0A6B'}
                strokeWidth="1"
                strokeDasharray="2 2"
              />

              {/* Observed Blip */}
              <polygon
                points={`${cx},${cy - 8} ${cx + 7},${cy + 6} ${cx - 7},${cy + 6}`}
                fill={isSelected ? '#00E5FF' : '#38BDF8'}
                stroke={isSelected ? '#FFFFFF' : '#3B0A6B'}
                strokeWidth="1.5"
                filter={isSelected ? 'url(#cyanGlow)' : undefined}
              />

              {/* Entity Callout Tag */}
              <rect
                x={cx + 10}
                y={cy - 18}
                width={70}
                height={20}
                rx={4}
                fill="#15121C"
                stroke={isSelected ? '#00E5FF' : 'rgba(255, 255, 255, 0.15)'}
                strokeWidth="1"
                opacity={0.95}
              />
              <text
                x={cx + 16}
                y={cy - 4}
                fill={isSelected ? '#00E5FF' : '#F7F5FA'}
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="bold"
              >
                {eid}
              </text>

              <text
                x={cx + 12}
                y={cy + 14}
                fill="#AAA3B5"
                fontSize="8"
                fontFamily="JetBrains Mono, monospace"
              >
                {obs.sensor_type.split('_')[0]} • Q:{Math.round(obs.quality_score * 100)}%
              </text>
            </g>
          );
        })}

        {/* Trainee Decision Marker Overlay */}
        {decisions.map((dec) => {
          const targetObs = latestObsByEntity[dec.target_entity_id || ''];
          if (!targetObs) return null;
          const { cx, cy } = toCanvasCoords(targetObs.trainee_payload.observed_pos_x, targetObs.trainee_payload.observed_pos_y);

          return (
            <g key={`dec-tag-${dec.id}`}>
              <circle
                cx={cx}
                cy={cy}
                r={16}
                fill="none"
                stroke="#00E5FF"
                strokeWidth="2"
                strokeDasharray="3 3"
              />
              <text
                x={cx}
                y={cy + 28}
                textAnchor="middle"
                fill="#00E5FF"
                fontSize="8"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="bold"
              >
                DECISION: {dec.decision_type}
              </text>
            </g>
          );
        })}
      </svg>

      {/* Radar Coordinate & Status Header Overlay */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] animate-ping" />
          <span className="text-xs font-mono font-semibold text-[#00E5FF] tracking-wider">
            TACTICAL GRID ACTIVE
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#AAA3B5]">
          RANGE: 4.5km | BEARING: 360° | CLOCK: {currentSimTime.toFixed(1)}s
        </span>
      </div>

      {/* Evaluator Mode Indicator Badge */}
      {isEvaluatorMode && (
        <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-lg bg-[#241039]/80 backdrop-blur-md border border-[#3B0A6B] text-[#00E5FF] font-mono text-[11px] font-bold shadow-[0_0_15px_rgba(0,229,255,0.2)]">
          EVALUATOR GROUND TRUTH UNLOCKED
        </div>
      )}
    </div>
  );
};
