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
    <div className="relative w-full aspect-square max-w-[680px] mx-auto bg-[#08090B] rounded-lg border border-white/[0.12] shadow-level2 overflow-hidden flex items-center justify-center select-none">
      {/* Radar Sweep Effect (Restrained subtle sweep line) */}
      <div className="absolute inset-0 pointer-events-none opacity-20">
        <div 
          className="w-full h-full rounded-full border border-white/[0.08]"
          style={{
            background: 'conic-gradient(from 0deg at 50% 50%, rgba(0, 207, 232, 0.2) 0deg, rgba(0, 207, 232, 0) 65deg, transparent 360deg)',
            animation: 'spin 6s linear infinite',
          }}
        />
      </div>

      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative z-10 w-full h-full">
        <defs>
          <radialGradient id="radarGridGradient" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#191C23" stopOpacity="0.8" />
            <stop offset="60%" stopColor="#111318" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#08090B" stopOpacity="1" />
          </radialGradient>
        </defs>

        {/* Tactical Grid Background */}
        <circle cx={center} cy={center} r={center - 10} fill="url(#radarGridGradient)" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1" />


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
                stroke="#00CFE8"
                strokeWidth="1"
                strokeDasharray="4 4"
                opacity={0.3}
              />
              <text
                x={center + 8}
                y={center - r + 14}
                fill="#00CFE8"
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
          fill="rgba(112, 71, 200, 0.15)"
          stroke="#00CFE8"
          strokeWidth="1.5"
          strokeDasharray="6 3"
          opacity={0.7}
        />
        <text
          x={center + 8}
          y={center - 1800 * scale - 4}
          fill="#00CFE8"
          fontSize="9"
          fontWeight="bold"
          fontFamily="JetBrains Mono, monospace"
          opacity={0.85}
        >
          INNER DEFENSE PERIMETER (1.8km)
        </text>

        {/* Compass Crosshairs */}
        <line x1={center} y1={20} x2={center} y2={size - 20} stroke="#7047C8" strokeWidth="1" opacity={0.6} />
        <line x1={20} y1={center} x2={size - 20} y2={center} stroke="#7047C8" strokeWidth="1" opacity={0.6} />

        {/* Compass Cardinal Points */}
        <text x={center} y={35} textAnchor="middle" fill="#00CFE8" fontSize="12" fontWeight="bold">000° N</text>
        <text x={size - 40} y={center + 4} textAnchor="middle" fill="#00CFE8" fontSize="11">090° E</text>
        <text x={center} y={size - 25} textAnchor="middle" fill="#00CFE8" fontSize="11">180° S</text>
        <text x={40} y={center + 4} textAnchor="middle" fill="#00CFE8" fontSize="11">270° W</text>

        {/* Central Tactical HQ Base */}
        <circle cx={center} cy={center} r={5} fill="#00CFE8" />
        <circle cx={center} cy={center} r={12} fill="none" stroke="rgba(255, 255, 255, 0.2)" strokeWidth="1.5" />
        <text x={center} y={center + 24} textAnchor="middle" fill="#B3B7C2" fontSize="10" fontWeight="600" fontFamily="monospace">
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
                <line x1={cx} y1={cy} x2={vx} y2={vy} stroke={isHostile ? '#EF4444' : '#10B981'} strokeWidth="1.5" strokeDasharray="3 3" opacity={0.8} />
                <circle
                  cx={cx}
                  cy={cy}
                  r={8}
                  fill="none"
                  stroke={isHostile ? '#EF4444' : '#10B981'}
                  strokeWidth="1.5"
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
              className="cursor-pointer transition-transform hover:scale-105"
              onClick={() => onSelectEntity(eid)}
            >
              {/* Uncertainty Zone */}
              <circle
                cx={cx}
                cy={cy}
                r={uncertaintyRadius}
                fill={isSelected ? 'rgba(0, 207, 232, 0.12)' : 'rgba(112, 71, 200, 0.08)'}
                stroke={isSelected ? '#00CFE8' : 'rgba(255, 255, 255, 0.2)'}
                strokeWidth="1"
                strokeDasharray="2 2"
              />

              {/* Observed Blip */}
              <polygon
                points={`${cx},${cy - 8} ${cx + 7},${cy + 6} ${cx - 7},${cy + 6}`}
                fill={isSelected ? '#00CFE8' : '#38BDF8'}
                stroke={isSelected ? '#FFFFFF' : 'rgba(0,0,0,0.5)'}
                strokeWidth="1"
              />

              {/* Entity Callout Tag */}
              <rect
                x={cx + 10}
                y={cy - 18}
                width={70}
                height={20}
                rx={4}
                fill="#111318"
                stroke={isSelected ? '#00CFE8' : 'rgba(255, 255, 255, 0.15)'}
                strokeWidth="1"
                opacity={0.95}
              />
              <text
                x={cx + 16}
                y={cy - 4}
                fill={isSelected ? '#00CFE8' : '#F4F5F7'}
                fontSize="10"
                fontFamily="JetBrains Mono, monospace"
                fontWeight="bold"
              >
                {eid}
              </text>

              <text
                x={cx + 12}
                y={cy + 14}
                fill="#B3B7C2"
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
                stroke="#00CFE8"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />
              <text
                x={cx}
                y={cy + 28}
                textAnchor="middle"
                fill="#00CFE8"
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
          <span className="w-2 h-2 rounded-full bg-[#00CFE8]" />
          <span className="text-xs font-mono font-semibold text-[#00CFE8] tracking-wider">
            TACTICAL GRID ACTIVE
          </span>
        </div>
        <span className="text-[10px] font-mono text-[#B3B7C2]">
          RANGE: 4.5km | BEARING: 360° | CLOCK: {currentSimTime.toFixed(1)}s
        </span>
      </div>

      {/* Evaluator Mode Indicator Badge */}
      {isEvaluatorMode && (
        <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-lg bg-[#7047C8]/25 backdrop-blur-md border border-white/[0.12] text-[#00CFE8] font-mono text-[11px] font-semibold">
          EVALUATOR GROUND TRUTH UNLOCKED
        </div>
      )}

    </div>
  );
};
