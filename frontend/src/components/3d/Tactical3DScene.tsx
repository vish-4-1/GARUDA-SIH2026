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
  Sliders,
  Crosshair,
  Maximize2
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

// Camera Follow Controller Component (runs inside Canvas)
const CameraTracker: React.FC<{
  targetPos: [number, number, number] | null;
  isTracking: boolean;
  controlsRef: React.RefObject<any>;
}> = ({ targetPos, isTracking, controlsRef }) => {
  useFrame(() => {
    if (isTracking && targetPos && controlsRef.current) {
      const controls = controlsRef.current;
      const targetVec = new THREE.Vector3(targetPos[0], targetPos[1], targetPos[2]);
      controls.target.lerp(targetVec, 0.05);
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

  // Active Environment & Weather (can be overridden interactively or driven by scenario)
  const [activeEnv, setActiveEnv] = useState<string>(environmentType.toLowerCase());
  const [activeWeather, setActiveWeather] = useState<string>(weatherCondition);
  const [lightingMode, setLightingMode] = useState<'DAY' | 'NIGHT' | 'DUSK'>('DAY');
  const [graphicsQuality, setGraphicsQuality] = useState<'high' | 'medium' | 'low'>('high');
  const [cameraMode, setCameraMode] = useState<'ORBIT' | 'TOP_DOWN' | 'CHASE' | 'GROUND'>('ORBIT');

  // Sync with incoming scenario props when changed
  useEffect(() => {
    if (environmentType) setActiveEnv(environmentType.toLowerCase());
  }, [environmentType]);

  useEffect(() => {
    if (weatherCondition) {
      setActiveWeather(weatherCondition);
      if (weatherCondition.toLowerCase().includes('night')) {
        setLightingMode('NIGHT');
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

  // Camera Presets
  const handleResetCamera = () => {
    setCameraMode('ORBIT');
    if (controlsRef.current) {
      controlsRef.current.reset();
      controlsRef.current.object.position.set(0, 420, 680);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const handleTopDownView = () => {
    setCameraMode('TOP_DOWN');
    if (controlsRef.current) {
      controlsRef.current.object.position.set(0, 650, 0);
      controlsRef.current.target.set(0, 0, 0);
      controlsRef.current.update();
    }
  };

  const handleGroundObserverView = () => {
    setCameraMode('GROUND');
    if (controlsRef.current) {
      controlsRef.current.object.position.set(0, 15, 260);
      controlsRef.current.target.set(0, 60, 0);
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
    <div className="relative w-full h-[620px] bg-[#09090D] rounded-2xl border border-[#FF4FA3]/25 shadow-[0_0_50px_rgba(255,45,149,0.18)] overflow-hidden select-none">
      {/* 3D Canvas */}
      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 420, 680]} fov={48} far={3200} />
        <OrbitControls
          ref={controlsRef}
          enableDamping
          dampingFactor={0.06}
          maxPolarAngle={Math.PI / 2 - 0.02} // Do not dip below ground
          minDistance={30}
          maxDistance={1400}
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
          const posY = Math.max(10, payload.observed_altitude * scale);
          const posZ = -payload.observed_pos_y * scale;

          return (
            <Drone3DModel
              key={`obs-3d-${obs.id}`}
              entityId={eid}
              category="Micro-Quadcopter"
              position={[posX, posY, posZ]}
              yawDegrees={payload.estimated_bearing || 0}
              speed={payload.observed_speed}
              altitudeAGL={payload.observed_altitude}
              isHostile={true}
              isSelected={isSelected}
              qualityScore={obs.quality_score}
              isEvaluatorMode={isEvaluatorMode}
              onClick={() => onSelectEntity(eid)}
            />
          );
        })}

        {/* Evaluator Ground Truth True 3D Markers (Visible ONLY in Evaluator Mode) */}
        {isEvaluatorMode &&
          Object.values(activeGtByEntity).map((gt) => {
            const posX = gt.pos_x * scale;
            const posY = Math.max(10, gt.altitude * scale);
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
                onClick={() => onSelectEntity(gt.entity_id)}
              />
            );
          })}
      </Canvas>

      {/* TOP-LEFT: Status & Engine Telemetry Badge */}
      <div className="absolute top-4 left-4 z-20 flex flex-col gap-1.5 pointer-events-none">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-[0_0_8px_#00E5FF] animate-ping" />
          <span className="text-xs font-mono font-bold text-[#F7F5FA] tracking-wider drop-shadow-md">
            GARUDA 3D TACTICAL SIMULATOR
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#241039]/80 border border-[#3B0A6B] text-[#00E5FF] font-mono font-bold shadow-[0_0_10px_rgba(59,10,107,0.4)]">
            {activeEnv.toUpperCase()}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono text-[#AAA3B5] drop-shadow">
          <span>SIM CLOCK: <strong className="text-[#F7F5FA]">{currentSimTime.toFixed(1)}s</strong></span>
          <span>•</span>
          <span>WEATHER: <strong className="text-[#00E5FF]">{activeWeather}</strong></span>
          <span>•</span>
          <span>CONTACTS: <strong className="text-[#00E5FF]">{Object.keys(latestObsByEntity).length}</strong></span>
        </div>
      </div>

      {/* TOP-RIGHT: Evaluator Mode Badge & Quick Preset Selectors */}
      <div className="absolute top-4 right-4 z-20 flex flex-col items-end gap-2">
        {isEvaluatorMode && (
          <div className="px-3 py-1 rounded-lg bg-[#241039]/80 backdrop-blur-md border border-[#3B0A6B] text-[#00E5FF] font-mono text-[11px] font-bold shadow-[0_0_15px_rgba(59,10,107,0.4)]">
            EVALUATOR GROUND TRUTH VISIBLE
          </div>
        )}

        {/* Environment Preset Switcher Tabs (Urban / Rural / Coastal / Border) */}
        <div className="flex items-center gap-1 bg-[#0D0B12]/85 backdrop-blur-md border border-white/10 p-1 rounded-xl text-xs font-mono shadow-xl">
          <span className="text-[10px] text-[#AAA3B5] font-bold px-1.5">ENV:</span>
          {(['urban', 'rural', 'coastal', 'border'] as const).map((env) => (
            <button
              key={env}
              onClick={() => handleSetEnvironment(env)}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase transition-all ${
                activeEnv === env
                  ? 'bg-[#3B0A6B] text-[#F7F5FA] border border-[#00E5FF]/40 shadow-[0_0_12px_rgba(0,229,255,0.25)]'
                  : 'text-[#AAA3B5] hover:text-[#F7F5FA] hover:bg-white/5'
              }`}
            >
              {env}
            </button>
          ))}
        </div>

        {/* Weather Switcher Tabs */}
        <div className="flex items-center gap-1 bg-[#0D0B12]/85 backdrop-blur-md border border-white/10 p-1 rounded-xl text-xs font-mono shadow-xl">
          <span className="text-[10px] text-[#AAA3B5] font-bold px-1.5">CONDITIONS:</span>
          {[
            { id: 'Clear Day', label: 'Day', icon: Sun },
            { id: 'Overcast', label: 'Overcast', icon: Cloud },
            { id: 'Dense Fog', label: 'Fog', icon: Eye },
            { id: 'Heavy Rain', label: 'Rain', icon: CloudRain },
            { id: 'Night / FLIR', label: 'Night', icon: Moon },
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => handleSetWeather(id)}
              className={`flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold transition-all ${
                activeWeather === id
                  ? 'bg-[#3B0A6B] text-[#00E5FF] border border-[#00E5FF]/40 shadow-[0_0_10px_rgba(0,229,255,0.25)]'
                  : 'text-[#AAA3B5] hover:text-[#F7F5FA] hover:bg-white/5'
              }`}
            >
              <Icon className="w-3 h-3" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* BOTTOM-LEFT: Floating Camera & Quality HUD Bar */}
      <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-2 bg-[#0D0B12]/90 backdrop-blur-md border border-white/10 p-2 rounded-xl text-xs font-mono shadow-[0_6px_25px_rgba(0,0,0,0.7)]">
        {/* Camera Preset Buttons */}
        <button
          onClick={handleResetCamera}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#15121C] hover:bg-[#3B0A6B]/30 hover:border-[#00E5FF]/40 text-[#F7F5FA] border border-white/10 text-[11px] font-semibold transition-all"
          title="Reset Camera to Default Tactical View"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#00E5FF]" /> Tactical 45°
        </button>

        <button
          onClick={handleTopDownView}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
            cameraMode === 'TOP_DOWN'
              ? 'bg-[#3B0A6B] text-[#00E5FF] border-[#00E5FF]/50 shadow-[0_0_12px_rgba(0,229,255,0.25)]'
              : 'bg-[#15121C] hover:bg-[#3B0A6B]/30 text-[#F7F5FA] border-white/10'
          }`}
          title="Top-Down 90° Strategic Map View"
        >
          <Compass className="w-3.5 h-3.5 text-[#00E5FF]" /> Top-Down (90°)
        </button>

        <button
          onClick={handleGroundObserverView}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-semibold transition-all ${
            cameraMode === 'GROUND'
              ? 'bg-[#3B0A6B] text-[#00E5FF] border-[#00E5FF]/50 shadow-[0_0_12px_rgba(0,229,255,0.25)]'
              : 'bg-[#15121C] hover:bg-[#3B0A6B]/30 text-[#F7F5FA] border-white/10'
          }`}
          title="Low-Angle Ground Observer View"
        >
          <Maximize2 className="w-3.5 h-3.5 text-[#00E5FF]" /> Ground Observer
        </button>

        {selectedDronePos && (
          <button
            onClick={handleToggleChaseMode}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-bold transition-all ${
              cameraMode === 'CHASE'
                ? 'bg-[#00E5FF] text-[#050505] border-[#00E5FF] shadow-[0_0_15px_rgba(0,229,255,0.5)]'
                : 'bg-[#15121C] hover:bg-[#3B0A6B]/30 text-[#00E5FF] border-[#3B0A6B]/60'
            }`}
            title="Lock Camera on Selected Entity"
          >
            <Crosshair className="w-3.5 h-3.5 fill-current" />
            {cameraMode === 'CHASE' ? 'Tracking Drone' : 'Chase Target'}
          </button>
        )}

        <div className="h-4 w-px bg-white/10 mx-1" />

        {/* Graphics Quality Toggle */}
        <div className="flex items-center gap-1">
          <span className="text-[10px] text-[#AAA3B5] mr-0.5">GFX:</span>
          {(['high', 'medium', 'low'] as const).map((q) => (
            <button
              key={q}
              onClick={() => setGraphicsQuality(q)}
              className={`px-2 py-1 rounded text-[10px] font-bold uppercase transition-all ${
                graphicsQuality === q
                  ? 'bg-[#3B0A6B] text-[#00E5FF] border border-[#00E5FF]/40'
                  : 'text-[#AAA3B5] hover:text-[#F7F5FA]'
              }`}
            >
              {q}
            </button>
          ))}
        </div>
      </div>

      {/* BOTTOM-RIGHT: Selected Entity Real-Time Telemetry Card */}
      {selectedEntityId && (selectedObs || selectedGt) && (
        <div className="absolute bottom-4 right-4 z-20 max-w-xs bg-[#0D0B12]/95 backdrop-blur-xl border border-white/15 p-3 rounded-xl shadow-[0_8px_30px_rgba(0,0,0,0.8)] text-xs font-mono space-y-2">
          <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00E5FF] shadow-[0_0_8px_#00E5FF] animate-pulse" />
              <span className="font-bold text-[#F7F5FA] text-sm tracking-wide">
                {selectedEntityId}
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-[#241039]/80 border border-[#3B0A6B] text-[#00E5FF] font-bold shadow-[0_0_8px_rgba(59,10,107,0.3)]">
              {selectedGt ? selectedGt.threat_category : 'Micro-Quadcopter'}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <div>
              <span className="text-[#AAA3B5] block text-[9px]">ALTITUDE AGL</span>
              <span className="text-[#F7F5FA] font-bold">
                {selectedObs
                  ? `${Math.round(selectedObs.trainee_payload.observed_altitude)}m`
                  : selectedGt
                  ? `${Math.round(selectedGt.altitude)}m`
                  : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[#AAA3B5] block text-[9px]">GROUND SPEED</span>
              <span className="text-[#F7F5FA] font-bold">
                {selectedObs
                  ? `${selectedObs.trainee_payload.observed_speed.toFixed(1)} m/s`
                  : selectedGt
                  ? `${selectedGt.speed.toFixed(1)} m/s`
                  : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[#AAA3B5] block text-[9px]">BEARING / HEADING</span>
              <span className="text-[#F7F5FA] font-bold">
                {selectedObs
                  ? `${Math.round(selectedObs.trainee_payload.estimated_bearing || 0)}°`
                  : selectedGt
                  ? `${Math.round(selectedGt.heading)}°`
                  : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-[#AAA3B5] block text-[9px]">SENSOR QUALITY</span>
              <span className="text-emerald-400 font-bold">
                {selectedObs ? `${Math.round(selectedObs.quality_score * 100)}%` : '100% (Truth)'}
              </span>
            </div>
          </div>

          {selectedObs && (
            <div className="pt-1.5 border-t border-white/10 text-[10px] text-[#AAA3B5] flex justify-between items-center">
              <span>Source: <strong className="text-[#F7F5FA]">{selectedObs.sensor_type}</strong></span>
              <span>Delay: <strong className="text-amber-400">{selectedObs.delay_applied.toFixed(1)}s</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
