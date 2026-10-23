import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import * as THREE from 'three';
import { Environment3D } from './Environment3D';
import { Drone3DModel } from './Drone3DModel';
import { WeatherEffects3D } from './WeatherEffects3D';
import { Observation, GroundTruthEvent, TraineeDecision } from '../../types';
import {
  Compass,
  RotateCcw,
  Sun,
  Moon,
  CloudRain,
  Cloud,
  Eye,
  Crosshair,
  Maximize2,
  Tag
} from 'lucide-react';

interface Tactical3DSceneProps {
  visibleObservations: Observation[];
  evaluatorGroundTruth?: GroundTruthEvent[] | null;
  decisions: TraineeDecision[];
  selectedEntityId?: string | null;
  onSelectEntity: (entityId: string) => void;
  isEvaluatorMode: boolean;
  currentSimTime: number;
  environmentType?: string;
  weatherCondition?: string;
  onEnvironmentChange?: (env: string) => void;
  onWeatherChange?: (weather: string) => void;
}

// Smooth Camera Follow Controller Component (runs inside Canvas)
const CameraTracker: React.FC<{
  targetPos: [number, number, number] | null;
  isTracking: boolean;
  controlsRef: React.RefObject<any>;
}> = ({ targetPos, isTracking, controlsRef }) => {
  useFrame(() => {
    if (isTracking && targetPos && controlsRef.current) {
      const controls = controlsRef.current;
      const targetVec = new THREE.Vector3(targetPos[0], targetPos[1], targetPos[2]);
      controls.target.lerp(targetVec, 0.08);
      controls.update();
    }
  });
  return null;
};

export const Tactical3DScene: React.FC<Tactical3DSceneProps> = ({
  visibleObservations,
  evaluatorGroundTruth,
  decisions,
  selectedEntityId,
  onSelectEntity,
  isEvaluatorMode,
  currentSimTime,
  environmentType = 'urban',
  weatherCondition = 'Clear Day',
  onEnvironmentChange,
  onWeatherChange,
}) => {
  // Scaling: 1 real meter = 0.08 3D scene units
  const scale = 0.08;
  const controlsRef = useRef<any>(null);

  // Active Environment & Weather
  const [activeEnv, setActiveEnv] = useState<string>(environmentType.toLowerCase());
  const [activeWeather, setActiveWeather] = useState<string>(weatherCondition);
  const [lightingMode, setLightingMode] = useState<'DAY' | 'NIGHT' | 'DUSK'>('DAY');
  const [graphicsQuality, setGraphicsQuality] = useState<'high' | 'medium' | 'low'>('high');
  const [cameraMode, setCameraMode] = useState<'ORBIT' | 'TOP_DOWN' | 'CHASE' | 'GROUND'>('ORBIT');
  const [showLabels, setShowLabels] = useState<boolean>(true);

  // Sync with incoming scenario props when changed
  useEffect(() => {
    if (environmentType) setActiveEnv(environmentType.toLowerCase());
  }, [environmentType]);

  useEffect(() => {
    if (weatherCondition) {
      setActiveWeather(weatherCondition);
      if (weatherCondition.toLowerCase().includes('night')) {
        setLightingMode('NIGHT');
      } else {
        setLightingMode('DAY');
      }
    }
  }, [weatherCondition]);

  // Group latest observation per entity
  const latestObsByEntity: Record<string, Observation> = {};
  visibleObservations.forEach((obs) => {
    const eid = obs.trainee_payload.entity_id;
    if (!latestObsByEntity[eid] || obs.delivered_at_sim_time > latestObsByEntity[eid].delivered_at_sim_time) {
      latestObsByEntity[eid] = obs;
    }
  });

  // Active ground-truth entities (visible ONLY in Evaluator Mode)
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

  // Selected Entity Position (for Chase Camera)
  const selectedDronePos: [number, number, number] | null = (() => {
    if (!selectedEntityId) return null;
    const obs = latestObsByEntity[selectedEntityId];
    if (obs) {
      return [
        obs.trainee_payload.observed_pos_x * scale,
        Math.max(10, obs.trainee_payload.observed_altitude * scale),
        -obs.trainee_payload.observed_pos_y * scale,
      ];
    }
    const gt = activeGtByEntity[selectedEntityId];
    if (gt) {
      return [gt.pos_x * scale, Math.max(10, gt.altitude * scale), -gt.pos_y * scale];
    }
    return null;
  })();

  // Helper to infer or retrieve realistic drone category
  const getDroneCategory = (eid: string, obs?: Observation): string => {
    if (activeGtByEntity[eid]) {
      return activeGtByEntity[eid].threat_category;
    }
    if (obs) {
      const spd = obs.trainee_payload.observed_speed;
      if (spd > 28) return 'Fixed-Wing Loitering';
      if (spd < 12 && obs.trainee_payload.observed_altitude > 130) return 'Heavy Commercial';
      return 'Tactical Quadcopter';
    }
    return 'Tactical Quadcopter';
  };

  // Camera Presets
  const handleResetCamera = () => {
    setCameraMode('ORBIT');
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.object.position.set(0, 340, 560);
      controlsRef.current.target.set(0, 20, 0);
      controlsRef.current.update();
    }
  };

  const handleTopDownView = () => {
    setCameraMode('TOP_DOWN');
    if (controlsRef.current) {
      controlsRef.current.object.position.set(0, 750, 0);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const handleGroundObserverView = () => {
    setCameraMode('GROUND');
    if (controlsRef.current) {
      controlsRef.current.object.position.set(0, 12, 220);
      controlsRef.current.target.set(0, 50, -60);
      controlsRef.current.update();
    }
  };

  const handleToggleChaseMode = () => {
    if (cameraMode === 'CHASE') {
      setCameraMode('ORBIT');
    } else {
      if (selectedDronePos) {
        setCameraMode('CHASE');
        if (controlsRef.current) {
          controlsRef.current.target.set(...selectedDronePos);
          controlsRef.current.update();
        }
      }
    }
  };

  const handleSetEnvironment = (env: string) => {
    setActiveEnv(env);
    if (onEnvironmentChange) onEnvironmentChange(env);
  };

  const handleSetWeather = (w: string) => {
    setActiveWeather(w);
    if (w.includes('Night')) {
      setLightingMode('NIGHT');
    } else if (lightingMode === 'NIGHT') {
      setLightingMode('DAY');
    }
    if (onWeatherChange) onWeatherChange(w);
  };

  // Selected Drone Observation / GT object for Telemetry HUD card
  const selectedObs = selectedEntityId ? latestObsByEntity[selectedEntityId] : null;
  const selectedGt = selectedEntityId ? activeGtByEntity[selectedEntityId] : null;

  return (
    <div className="relative w-full h-[440px] sm:h-[480px] lg:h-[520px] xl:h-[550px] min-h-[420px] bg-[#050505] rounded-2xl border border-white/[0.12] shadow-sm overflow-hidden select-none box-border">
      {/* ========================================================================= */}
      {/* REGION C: CENTER 3D SCENE CANVAS                                          */}
      {/* ========================================================================= */}
      <div className="absolute inset-0 z-0">
        <Canvas shadows>
          <PerspectiveCamera makeDefault position={[0, 340, 560]} fov={46} far={4500} />
          <OrbitControls
            ref={controlsRef}
            enableDamping
            dampingFactor={0.06}
            maxPolarAngle={Math.PI / 2 - 0.05} // Prevent camera clipping below terrain
            minDistance={20}
            maxDistance={2200}
          />

          {/* Camera Tracker for Chase / Target Focus */}
          <CameraTracker
            targetPos={selectedDronePos}
            isTracking={cameraMode === 'CHASE'}
            controlsRef={controlsRef}
          />

          {/* Realistic Weather, Sun Lighting, Clouds, and Fog */}
          <WeatherEffects3D
            weatherCondition={activeWeather}
            lightingMode={lightingMode}
            graphicsQuality={graphicsQuality}
          />

          {/* Realistic 3D Environment Geometry (Urban / Rural / Coastal / Border) */}
          <Environment3D
            environmentType={activeEnv}
            scaleFactor={scale}
            graphicsQuality={graphicsQuality}
          />

          {/* Trainee Delivered Observations (Rendered with realistic drone models) */}
          {Object.values(latestObsByEntity).map((obs) => {
            const payload = obs.trainee_payload;
            const eid = payload.entity_id;
            const isSelected = selectedEntityId === eid;

            // Convert coordinates: X -> X, Altitude -> Y, Y (North) -> -Z in Three.js
            const posX = payload.observed_pos_x * scale;
            const posY = Math.max(8, payload.observed_altitude * scale);
            const posZ = -payload.observed_pos_y * scale;

            return (
              <Drone3DModel
                key={`obs-3d-${obs.id}`}
                entityId={eid}
                category={getDroneCategory(eid, obs)}
                position={[posX, posY, posZ]}
                yawDegrees={payload.estimated_bearing || 0}
                speed={payload.observed_speed}
                altitudeAGL={payload.observed_altitude}
                isHostile={true}
                isSelected={isSelected}
                qualityScore={obs.quality_score}
                isEvaluatorMode={isEvaluatorMode}
                showHudLabel={showLabels}
                onClick={() => onSelectEntity(eid)}
              />
            );
          })}

          {/* Evaluator Ground Truth True 3D Markers (Visible ONLY in Evaluator Mode) */}
          {isEvaluatorMode &&
            Object.values(activeGtByEntity).map((gt) => {
              const posX = gt.pos_x * scale;
              const posY = Math.max(8, gt.altitude * scale);
              const posZ = -gt.pos_y * scale;

              return (
                <Drone3DModel
                  key={`gt-3d-${gt.entity_id}`}
                  entityId={gt.entity_id}
                  category={gt.threat_category}
                  position={[posX, posY, posZ]}
                  yawDegrees={gt.heading}
                  speed={gt.speed}
                  altitudeAGL={gt.altitude}
                  isHostile={gt.is_hostile}
                  isSelected={selectedEntityId === gt.entity_id}
                  qualityScore={1.0}
                  isEvaluatorMode={true}
                  isGroundTruthTruePosition={true}
                  showHudLabel={showLabels}
                  onClick={() => onSelectEntity(gt.entity_id)}
                />
              );
            })}
        </Canvas>
      </div>

      {/* ========================================================================= */}
      {/* TOP REGION CONTAINER (Regions A & B)                                      */}
      {/* ========================================================================= */}
      <div className="absolute top-2.5 inset-x-2.5 z-20 flex flex-col lg:flex-row items-start justify-between gap-2 pointer-events-none">
        {/* REGION A: TOP-LEFT SCENE INFORMATION */}
        <div className="pointer-events-auto bg-[#111318]/90 backdrop-blur-[16px] border border-white/[0.12] px-3 py-1.5 rounded-xl text-xs font-mono shadow-level1 flex flex-col gap-0.5 shrink-0 max-w-full">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="w-2 h-2 rounded-full bg-[#00CFE8] shrink-0" />
            <span className="text-[11px] font-bold text-[#F4F5F7] tracking-wider whitespace-nowrap">
              GARUDA 3D TACTICAL SIMULATOR
            </span>
            <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#191C23] border border-white/[0.12] text-[#00CFE8] font-semibold uppercase shrink-0">
              {activeEnv}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[10px] text-[#858B99] flex-wrap">
            <span>CLOCK: <strong className="text-[#F4F5F7]">{currentSimTime.toFixed(1)}s</strong></span>
            <span>•</span>
            <span>WEATHER: <strong className="text-[#00CFE8]">{activeWeather}</strong></span>
            <span>•</span>
            <span>CONTACTS: <strong className="text-[#00CFE8]">{Object.keys(latestObsByEntity).length}</strong></span>
          </div>
        </div>

        {/* REGION B: TOP-RIGHT ENVIRONMENT & WEATHER CONTROLS */}
        <div className="pointer-events-auto flex flex-col items-start lg:items-end gap-1.5 shrink-0 max-w-full">
          {isEvaluatorMode && (
            <div className="px-2 py-0.5 rounded-lg bg-[#7047C8]/20 backdrop-blur-[16px] border border-white/[0.14] text-[#00CFE8] font-mono text-[9px] font-semibold shadow-level1">
              EVALUATOR GROUND TRUTH OVERLAY ACTIVE
            </div>
          )}

          {/* Row 1: Environment Switcher */}
          <div className="flex items-center gap-1 bg-[#111318]/90 backdrop-blur-[16px] border border-white/[0.12] p-1 rounded-xl text-[10px] font-mono shadow-level1 flex-wrap max-w-full">
            <span className="text-[#858B99] font-semibold px-1.5 text-[9px]">ENV:</span>
            {(['urban', 'rural', 'coastal', 'border'] as const).map((env) => (
              <button
                key={env}
                type="button"
                onClick={() => handleSetEnvironment(env)}
                className={`px-2 py-0.5 rounded-lg font-semibold uppercase transition-colors text-[10px] ${
                  activeEnv === env
                    ? 'bg-[#7047C8] text-[#F4F5F7] border border-[#7047C8]'
                    : 'text-[#B3B7C2] hover:text-[#F4F5F7] hover:bg-white/[0.04]'
                }`}
              >
                {env}
              </button>
            ))}
          </div>

          {/* Row 2: Weather Switcher */}
          <div className="flex items-center gap-1 bg-[#111318]/90 backdrop-blur-[16px] border border-white/[0.12] p-1 rounded-xl text-[10px] font-mono shadow-level1 flex-wrap justify-start lg:justify-end max-w-full">
            <span className="text-[#858B99] font-semibold px-1.5 text-[9px]">WEATHER:</span>
            {[
              { id: 'Clear Day', label: 'Day', icon: Sun },
              { id: 'Overcast', label: 'Overcast', icon: Cloud },
              { id: 'Dense Fog', label: 'Fog', icon: Eye },
              { id: 'Heavy Rain', label: 'Rain', icon: CloudRain },
              { id: 'Night / FLIR', label: 'Night', icon: Moon },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => handleSetWeather(id)}
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg font-semibold transition-colors text-[10px] ${
                  activeWeather === id
                    ? 'bg-[#7047C8]/25 text-[#00CFE8] border border-white/[0.14]'
                    : 'text-[#B3B7C2] hover:text-[#F4F5F7] hover:bg-white/[0.04]'
                }`}
              >
                <Icon className="w-2.5 h-2.5" />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* BOTTOM REGION CONTAINER (Regions D & E)                                   */}
      {/* ========================================================================= */}
      <div className="absolute bottom-2.5 inset-x-2.5 z-20 flex flex-col lg:flex-row items-stretch lg:items-end justify-between gap-2.5 pointer-events-none">
        {/* REGION D: BOTTOM-LEFT CAMERA & RENDERING CONTROLS */}
        <div className="pointer-events-auto flex flex-col gap-1.5 max-w-full shrink-0">
          {/* Row 1: Camera Toolbar */}
          <div className="bg-[#111318]/90 backdrop-blur-[16px] border border-white/[0.12] p-1.5 rounded-xl flex flex-wrap items-center gap-1 text-[11px] font-mono shadow-level1">
            <button
              type="button"
              onClick={handleResetCamera}
              className="flex items-center gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-[#F4F5F7] border border-white/[0.12] font-medium transition-colors text-[10px]"
              title="Reset Camera to Default Tactical View"
            >
              <RotateCcw className="w-3 h-3 text-[#00CFE8]" /> Tactical 45°
            </button>

            <button
              type="button"
              onClick={handleTopDownView}
              className={`flex items-center gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg border font-medium transition-colors text-[10px] ${
                cameraMode === 'TOP_DOWN'
                  ? 'bg-[#7047C8]/30 text-[#00CFE8] border-white/[0.16]'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#B3B7C2] hover:text-[#F4F5F7] border-white/[0.12]'
              }`}
              title="Top-Down 90° Strategic Map View"
            >
              <Compass className="w-3 h-3 text-[#00CFE8]" /> Top-Down (90°)
            </button>

            <button
              type="button"
              onClick={handleGroundObserverView}
              className={`flex items-center gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg border font-medium transition-colors text-[10px] ${
                cameraMode === 'GROUND'
                  ? 'bg-[#7047C8]/30 text-[#00CFE8] border-white/[0.16]'
                  : 'bg-white/[0.04] hover:bg-white/[0.08] text-[#B3B7C2] hover:text-[#F4F5F7] border-white/[0.12]'
              }`}
              title="Low-Angle Ground Observer View"
            >
              <Maximize2 className="w-3 h-3 text-[#00CFE8]" /> Ground Observer
            </button>

            {selectedDronePos && (
              <button
                type="button"
                onClick={handleToggleChaseMode}
                className={`flex items-center gap-1.5 px-2 py-0.5 md:px-2.5 md:py-1 rounded-lg border font-semibold transition-colors text-[10px] ${
                  cameraMode === 'CHASE'
                    ? 'bg-[#00CFE8] text-[#08090B] border-white/[0.20]'
                    : 'bg-white/[0.04] hover:bg-[#7047C8]/25 text-[#00CFE8] border-white/[0.12]'
                }`}
                title="Lock Camera on Selected Entity"
              >
                <Crosshair className="w-3 h-3 fill-current" />
                {cameraMode === 'CHASE' ? 'Tracking Drone' : 'Chase Target'}
              </button>
            )}

            <div className="h-3.5 w-px bg-white/[0.12] mx-0.5" />

            {/* 3D HUD Labels Visibility Toggle */}
            <button
              type="button"
              onClick={() => setShowLabels(!showLabels)}
              className={`flex items-center gap-1 px-2 py-0.5 md:px-2 md:py-1 rounded-lg border font-medium transition-colors text-[10px] ${
                showLabels
                  ? 'bg-[#7047C8]/30 text-[#00CFE8] border-white/[0.16]'
                  : 'bg-white/[0.04] text-[#858B99] border-white/[0.12] hover:text-[#F4F5F7]'
              }`}
              title="Toggle 3D Tactical Billboard Labels"
            >
              <Tag className="w-3 h-3" />
              <span>Labels: {showLabels ? 'ON' : 'OFF'}</span>
            </button>
          </div>

          {/* Row 2: Separate Graphics Quality Row */}
          <div className="bg-[#111318]/90 backdrop-blur-[16px] border border-white/[0.12] px-2.5 py-1 rounded-lg flex items-center gap-1.5 text-[10px] font-mono self-start shadow-level1">
            <span className="text-[#858B99] text-[9px] font-semibold">GFX QUALITY:</span>
            {(['high', 'medium', 'low'] as const).map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => setGraphicsQuality(q)}
                className={`px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase transition-colors ${
                  graphicsQuality === q
                    ? 'bg-[#7047C8] text-[#F4F5F7] border border-[#7047C8]'
                    : 'text-[#858B99] hover:text-[#F4F5F7]'
                }`}
              >
                {q}
              </button>
            ))}
          </div>
        </div>

        {/* REGION E: BOTTOM-RIGHT SELECTED DRONE TELEMETRY */}
        {selectedEntityId && (selectedObs || selectedGt) ? (
          <div className="pointer-events-auto w-full sm:w-[250px] md:w-[270px] shrink-0 bg-[#111318]/95 backdrop-blur-[16px] border border-white/[0.12] p-2.5 rounded-xl shadow-level2 text-xs font-mono space-y-1.5">
            <div className="flex items-center justify-between border-b border-white/[0.12] pb-1">
              <div className="flex items-center gap-1.5 truncate">
                <span className="w-2 h-2 rounded-full bg-[#00CFE8] shrink-0" />
                <span className="font-bold text-[#F4F5F7] text-xs tracking-wide truncate">
                  {selectedEntityId}
                </span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 rounded bg-[#191C23] border border-white/[0.12] text-[#00CFE8] font-semibold shrink-0">
                {selectedGt ? selectedGt.threat_category.split(' ')[0] : getDroneCategory(selectedEntityId, selectedObs || undefined).split(' ')[0]}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div className="bg-white/[0.02] p-1 rounded border border-white/[0.04]">
                <span className="text-[#858B99] block text-[8px]">ALTITUDE AGL</span>
                <span className="text-[#F4F5F7] font-bold text-[10px]">
                  {selectedObs
                    ? `${Math.round(selectedObs.trainee_payload.observed_altitude)}m`
                    : selectedGt
                    ? `${Math.round(selectedGt.altitude)}m`
                    : 'N/A'}
                </span>
              </div>
              <div className="bg-white/[0.02] p-1 rounded border border-white/[0.04]">
                <span className="text-[#858B99] block text-[8px]">GROUND SPEED</span>
                <span className="text-[#F4F5F7] font-bold text-[10px]">
                  {selectedObs
                    ? `${selectedObs.trainee_payload.observed_speed.toFixed(1)} m/s`
                    : selectedGt
                    ? `${selectedGt.speed.toFixed(1)} m/s`
                    : 'N/A'}
                </span>
              </div>
              <div className="bg-white/[0.02] p-1 rounded border border-white/[0.04]">
                <span className="text-[#858B99] block text-[8px]">HEADING</span>
                <span className="text-[#F4F5F7] font-bold text-[10px]">
                  {selectedObs
                    ? `${Math.round(selectedObs.trainee_payload.estimated_bearing || 0)}°`
                    : selectedGt
                    ? `${Math.round(selectedGt.heading)}°`
                    : 'N/A'}
                </span>
              </div>
              <div className="bg-white/[0.02] p-1 rounded border border-white/[0.04]">
                <span className="text-[#858B99] block text-[8px]">SENSOR QUALITY</span>
                <span className="text-emerald-400 font-bold text-[10px]">
                  {selectedObs ? `${Math.round(selectedObs.quality_score * 100)}%` : '100%'}
                </span>
              </div>
            </div>

            {selectedObs && (
              <div className="pt-1 border-t border-white/[0.08] text-[9px] text-[#858B99] flex justify-between items-center">
                <span>Source: <strong className="text-[#F4F5F7]">{selectedObs.sensor_type}</strong></span>
                <span>Delay: <strong className="text-amber-400">+{selectedObs.delay_applied.toFixed(1)}s</strong></span>
              </div>
            )}
          </div>
        ) : (
          <div className="pointer-events-auto w-full sm:w-[230px] shrink-0 bg-[#111318]/90 backdrop-blur-[16px] border border-white/[0.12] p-2 rounded-xl shadow-level1 text-xs font-mono flex items-center gap-2 text-[#858B99]">
            <span className="w-2 h-2 rounded-full bg-[#00CFE8]/50 shrink-0" />
            <span className="text-[10px] leading-tight">Click any contact in 3D scene to inspect live telemetry</span>
          </div>
        )}
      </div>
    </div>
  );
};
