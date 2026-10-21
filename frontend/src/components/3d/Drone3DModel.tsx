import React, { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import * as THREE from 'three';

interface Drone3DModelProps {
  entityId: string;
  category: string;
  position: [number, number, number]; // Target [x, y, z] from backend telemetry
  yawDegrees: number;
  speed?: number; // m/s
  altitudeAGL?: number; // meters
  isHostile: boolean;
  isSelected: boolean;
  qualityScore: number;
  isEvaluatorMode: boolean;
  isGroundTruthTruePosition?: boolean;
  onClick: () => void;
}

export const Drone3DModel: React.FC<Drone3DModelProps> = ({
  entityId,
  category,
  position,
  yawDegrees,
  speed,
  altitudeAGL,
  isHostile,
  isSelected,
  qualityScore,
  isEvaluatorMode,
  isGroundTruthTruePosition = false,
  onClick,
}) => {
  // References for smooth interpolation and rotating rotors
  const groupRef = useRef<THREE.Group>(null);
  const rotorsRef = useRef<THREE.Group>(null);
  const currentPos = useRef(new THREE.Vector3(...position));
  const currentYaw = useRef(yawDegrees);

  // Target values
  const targetPos = new THREE.Vector3(...position);
  const targetYaw = yawDegrees;

  // Frame loop: smooth position & yaw interpolation + rotor spin
  useFrame((_, delta) => {
    // Smooth position lerp (damping factor approx 8 per sec)
    currentPos.current.lerp(targetPos, Math.min(1.0, delta * 7.5));
    if (groupRef.current) {
      groupRef.current.position.copy(currentPos.current);
    }

    // Smooth shortest-path yaw rotation
    let diff = targetYaw - currentYaw.current;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;
    currentYaw.current += diff * Math.min(1.0, delta * 8.0);

    // Spin propellers continuously
    if (rotorsRef.current) {
      rotorsRef.current.rotation.y += delta * 35.0;
    }
  });

  const currentYawRad = (currentYaw.current * Math.PI) / 180;
  const uncertaintyRadius = Math.max(12, (1.0 - qualityScore) * 65);

  // Colors: Realistic drone airframe materials (dark carbon fiber, military tactical gray, civilian white)
  const isCivilian = category === 'Friendly Civilian';
  const isFixedWing = category === 'Fixed-Wing Loitering' || category.includes('Fixed-Wing');
  const isHexacopter = category === 'Heavy Commercial' || category.includes('Heavy');

  // Airframe body color
  const airframeColor = isCivilian ? '#ECEFF1' : isFixedWing ? '#374151' : isHexacopter ? '#1E293B' : '#262626';
  const armColor = '#1F2421'; // Carbon composite tubes

  return (
    <group ref={groupRef} position={position}>
      {/* Plumb Line to Ground (shows altitude AGL) */}
      <line>
        <bufferGeometry
          attach="geometry"
          onUpdate={(geom) => {
            geom.setFromPoints([
              new THREE.Vector3(0, 0, 0),
              new THREE.Vector3(0, -currentPos.current.y, 0),
            ]);
          }}
        />
        <lineDashedMaterial
          attach="material"
          color={isGroundTruthTruePosition ? (isHostile ? '#EF4444' : '#10B981') : isSelected ? '#00E5FF' : '#3B0A6B'}
          dashSize={4}
          gapSize={4}
          opacity={isSelected ? 0.7 : 0.3}
          transparent
        />
      </line>

      {/* Ground Projection Contact Shadow Disc */}
      <mesh position={[0, -currentPos.current.y + 0.3, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[14, 24]} />
        <meshBasicMaterial
          color={isSelected ? '#00E5FF' : '#050505'}
          opacity={isSelected ? 0.35 : 0.45}
          transparent
        />
      </mesh>

      {/* Sensor Uncertainty Sphere (Visible for Trainee observations when degraded) */}
      {!isGroundTruthTruePosition && qualityScore < 0.95 && (
        <mesh>
          <sphereGeometry args={[uncertaintyRadius, 16, 16]} />
          <meshBasicMaterial
            color={isSelected ? '#00E5FF' : '#3B0A6B'}
            wireframe
            opacity={isSelected ? 0.3 : 0.15}
            transparent
          />
        </mesh>
      )}

      {/* Main Drone Assembly (Heading rotated) */}
      <group
        rotation={[0, -currentYawRad, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {/* ===================================================================== */}
        {/* MODEL 1: FIXED-WING LOITERING / RECON UAV                             */}
        {/* ===================================================================== */}
        {isFixedWing ? (
          <group scale={[1.8, 1.8, 1.8]}>
            {/* Aerodynamic Fuselage */}
            <mesh position={[0, 0, 2]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[1.6, 2.2, 16, 12]} />
              <meshStandardMaterial color={airframeColor} roughness={0.4} metalness={0.6} />
            </mesh>

            {/* Nose Cone */}
            <mesh position={[0, 0, 11]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
              <coneGeometry args={[1.6, 4.5, 12]} />
              <meshStandardMaterial color="#1E293B" roughness={0.3} metalness={0.7} />
            </mesh>

            {/* Ventral EO/IR Camera Turret */}
            <mesh position={[0, -1.8, 8]} castShadow>
              <sphereGeometry args={[1.2, 12, 12]} />
              <meshStandardMaterial color="#0F172A" roughness={0.1} metalness={0.9} />
            </mesh>

            {/* Main Swept Wings */}
            <mesh position={[0, 0.4, 2]} castShadow>
              <boxGeometry args={[32, 0.6, 5]} />
              <meshStandardMaterial color={airframeColor} roughness={0.4} metalness={0.5} />
            </mesh>

            {/* Winglet Left */}
            <mesh position={[-15.8, 1.8, 1.5]} rotation={[0, 0, 0.2]} castShadow>
              <boxGeometry args={[0.4, 3.2, 3.5]} />
              <meshStandardMaterial color="#1E293B" />
            </mesh>

            {/* Winglet Right */}
            <mesh position={[15.8, 1.8, 1.5]} rotation={[0, 0, -0.2]} castShadow>
              <boxGeometry args={[0.4, 3.2, 3.5]} />
              <meshStandardMaterial color="#1E293B" />
            </mesh>

            {/* Twin Vertical Stabilizers */}
            <mesh position={[4, 2.5, -6]} rotation={[0, 0, 0.15]} castShadow>
              <boxGeometry args={[0.4, 4.5, 3]} />
              <meshStandardMaterial color={airframeColor} />
            </mesh>
            <mesh position={[-4, 2.5, -6]} rotation={[0, 0, -0.15]} castShadow>
              <boxGeometry args={[0.4, 4.5, 3]} />
              <meshStandardMaterial color={airframeColor} />
            </mesh>

            {/* Rear Pusher Propeller (Spinning) */}
            <group ref={rotorsRef} position={[0, 0, -7]}>
              <mesh rotation={[0, 0, 0]}>
                <cylinderGeometry args={[0.4, 0.4, 6.5, 4]} />
                <meshBasicMaterial color="#94A3B8" opacity={0.6} transparent />
              </mesh>
            </group>
          </group>
        ) : isHexacopter ? (
          /* ===================================================================== */
          /* MODEL 2: HEAVY COMMERCIAL / INDUSTRIAL HEXACOPTER                    */
          /* ===================================================================== */
          <group scale={[1.7, 1.7, 1.7]}>
            {/* Hexagonal Central Core */}
            <mesh position={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[6.5, 6.5, 3, 6]} />
              <meshStandardMaterial color={airframeColor} roughness={0.3} metalness={0.8} />
            </mesh>

            {/* Heavy Underslung Payload Pod */}
            <mesh position={[0, -3.2, 0]} castShadow>
              <boxGeometry args={[6, 4, 8]} />
              <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.7} />
            </mesh>

            {/* 6 Radial Tubular Arms */}
            {[0, 60, 120, 180, 240, 300].map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              return (
                <group key={i} rotation={[0, rad, 0]}>
                  {/* Carbon Arm Tube */}
                  <mesh position={[9.5, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                    <cylinderGeometry args={[0.65, 0.65, 12, 8]} />
                    <meshStandardMaterial color={armColor} metalness={0.9} roughness={0.2} />
                  </mesh>

                  {/* Motor Pod */}
                  <mesh position={[15.5, 0.8, 0]} castShadow>
                    <cylinderGeometry args={[1.5, 1.5, 2, 12]} />
                    <meshStandardMaterial color="#64748B" metalness={0.8} roughness={0.2} />
                  </mesh>
                </group>
              );
            })}

            {/* Dual Heavy Landing Skids */}
            <group position={[0, -5.5, 0]}>
              <mesh position={[5.5, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.5, 0.5, 16, 8]} />
                <meshStandardMaterial color="#1E293B" metalness={0.8} />
              </mesh>
              <mesh position={[-5.5, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.5, 0.5, 16, 8]} />
                <meshStandardMaterial color="#1E293B" metalness={0.8} />
              </mesh>
            </group>

            {/* 6 Spinning Rotor Discs */}
            <group ref={rotorsRef}>
              {[0, 60, 120, 180, 240, 300].map((deg, i) => {
                const rad = (deg * Math.PI) / 180;
                const px = Math.cos(rad) * 15.5;
                const pz = Math.sin(rad) * 15.5;
                return (
                  <mesh key={i} position={[px, 2.2, pz]}>
                    <cylinderGeometry args={[4.8, 4.8, 0.1, 16]} />
                    <meshBasicMaterial color="#94A3B8" opacity={0.45} transparent />
                  </mesh>
                );
              })}
            </group>
          </group>
        ) : (
          /* ===================================================================== */
          /* MODEL 3: REALISTIC QUADCOPTER (TACTICAL / MICRO / CIVILIAN)           */
          /* ===================================================================== */
          <group scale={[1.8, 1.8, 1.8]}>
            {/* Center Aerodynamic Fuselage Shell */}
            <mesh position={[0, 0.5, 0]} castShadow>
              <boxGeometry args={[6.5, 2.8, 9.5]} />
              <meshStandardMaterial color={airframeColor} roughness={0.25} metalness={0.7} />
            </mesh>

            {/* Top Battery Hatch / Avionics Dome */}
            <mesh position={[0, 2.2, -0.5]} castShadow>
              <boxGeometry args={[4.2, 1.2, 6.5]} />
              <meshStandardMaterial color="#0F172A" roughness={0.2} metalness={0.8} />
            </mesh>

            {/* Front 2-Axis Camera Gimbal */}
            <group position={[0, -0.8, 4.8]}>
              <mesh castShadow>
                <sphereGeometry args={[1.4, 12, 12]} />
                <meshStandardMaterial color="#1E293B" metalness={0.8} roughness={0.2} />
              </mesh>
              {/* Optical Glass Lens */}
              <mesh position={[0, 0, 1.2]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.7, 0.7, 0.4, 16]} />
                <meshStandardMaterial color="#0284C7" metalness={0.9} roughness={0.1} />
              </mesh>
            </group>

            {/* 4 Carbon Arms in X-Configuration */}
            <mesh rotation={[0, Math.PI / 4, 0]} castShadow>
              <boxGeometry args={[22, 0.7, 1.1]} />
              <meshStandardMaterial color={armColor} metalness={0.85} roughness={0.3} />
            </mesh>
            <mesh rotation={[0, -Math.PI / 4, 0]} castShadow>
              <boxGeometry args={[22, 0.7, 1.1]} />
              <meshStandardMaterial color={armColor} metalness={0.85} roughness={0.3} />
            </mesh>

            {/* 4 Brushless Outrunner Motors */}
            {[
              [7.8, 0.8, 7.8],
              [-7.8, 0.8, 7.8],
              [7.8, 0.8, -7.8],
              [-7.8, 0.8, -7.8],
            ].map((pos, idx) => (
              <group key={idx} position={pos as [number, number, number]}>
                <mesh castShadow>
                  <cylinderGeometry args={[1.3, 1.3, 1.6, 12]} />
                  <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.2} />
                </mesh>
              </group>
            ))}

            {/* Realistic Aviation Navigation LED Lights */}
            {/* Port (Left) Red LED */}
            <mesh position={[-7.8, 0.3, 7.8]}>
              <sphereGeometry args={[0.6, 8, 8]} />
              <meshBasicMaterial color="#EF4444" />
            </mesh>
            {/* Starboard (Right) Green LED */}
            <mesh position={[7.8, 0.3, 7.8]}>
              <sphereGeometry args={[0.6, 8, 8]} />
              <meshBasicMaterial color="#22C55E" />
            </mesh>
            {/* Tail Strobe White LED */}
            <mesh position={[0, 2.6, -4.2]}>
              <sphereGeometry args={[0.5, 8, 8]} />
              <meshBasicMaterial color={isCivilian ? '#10B981' : '#FFFFFF'} />
            </mesh>

            {/* Dual Landing Skids */}
            <group position={[0, -2.4, 0]}>
              <mesh position={[3.6, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.4, 0.4, 10, 8]} />
                <meshStandardMaterial color="#1E293B" metalness={0.7} />
              </mesh>
              <mesh position={[-3.6, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.4, 0.4, 10, 8]} />
                <meshStandardMaterial color="#1E293B" metalness={0.7} />
              </mesh>
              {/* Skid Vertical Struts */}
              <mesh position={[3.6, 1.0, 2.8]} rotation={[0.2, 0, 0]}>
                <cylinderGeometry args={[0.3, 0.3, 2.2, 6]} />
                <meshStandardMaterial color="#1E293B" />
              </mesh>
              <mesh position={[3.6, 1.0, -2.8]} rotation={[-0.2, 0, 0]}>
                <cylinderGeometry args={[0.3, 0.3, 2.2, 6]} />
                <meshStandardMaterial color="#1E293B" />
              </mesh>
              <mesh position={[-3.6, 1.0, 2.8]} rotation={[0.2, 0, 0]}>
                <cylinderGeometry args={[0.3, 0.3, 2.2, 6]} />
                <meshStandardMaterial color="#1E293B" />
              </mesh>
              <mesh position={[-3.6, 1.0, -2.8]} rotation={[-0.2, 0, 0]}>
                <cylinderGeometry args={[0.3, 0.3, 2.2, 6]} />
                <meshStandardMaterial color="#1E293B" />
              </mesh>
            </group>

            {/* 4 High-RPM Spinning Propeller Discs */}
            <group ref={rotorsRef}>
              {[
                [7.8, 1.9, 7.8],
                [-7.8, 1.9, 7.8],
                [7.8, 1.9, -7.8],
                [-7.8, 1.9, -7.8],
              ].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]}>
                  <cylinderGeometry args={[4.4, 4.4, 0.08, 16]} />
                  <meshBasicMaterial color="#CBD5E1" opacity={0.5} transparent />
                </mesh>
              ))}
            </group>
          </group>
        )}
      </group>

      {/* Selected Entity Tactical Halo (GARUDA Electric Cyan #00E5FF) */}
      {isSelected && (
        <group position={[0, 0, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[20, 22.5, 32]} />
            <meshBasicMaterial color="#00E5FF" side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[26, 27.2, 32]} />
            <meshBasicMaterial color="#00E5FF" opacity={0.4} transparent side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* 3D Interactive Tactical HUD Billboard Label */}
      <Html
        position={[0, 18, 0]}
        center
        distanceFactor={380}
        style={{ pointerEvents: 'auto', userSelect: 'none' }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            onClick();
          }}
          className={`cursor-pointer px-2.5 py-1.5 rounded-lg backdrop-blur-md transition-all font-mono whitespace-nowrap shadow-lg flex flex-col gap-0.5 ${
            isSelected
              ? 'bg-[#050505]/95 border-2 border-[#00E5FF] text-[#F7F5FA] shadow-[0_0_18px_rgba(0,229,255,0.45)] ring-2 ring-[#00E5FF]/40 scale-105'
              : 'bg-[#0D0B12]/85 border border-white/10 text-[#AAA3B5] hover:text-[#F7F5FA] hover:border-[#00E5FF]/50'
          }`}
        >
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                isGroundTruthTruePosition
                  ? isHostile
                    ? 'bg-rose-500'
                    : 'bg-emerald-400'
                  : isHostile
                  ? 'bg-rose-500'
                  : 'bg-emerald-400'
              }`}
            />
            <span className="font-bold text-[11px] text-[#F7F5FA] tracking-wider">
              {entityId}
            </span>
            <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-white/80">
              {category.split(' ')[0]}
            </span>
          </div>

          <div className="flex items-center gap-2 text-[9px] text-[#AAA3B5] border-t border-white/10 pt-0.5">
            <span>AGL: {altitudeAGL !== undefined ? `${Math.round(altitudeAGL)}m` : 'N/A'}</span>
            <span>SPD: {speed !== undefined ? `${speed.toFixed(1)}m/s` : 'N/A'}</span>
            <span>HDG: {Math.round(yawDegrees)}°</span>
          </div>
        </div>
      </Html>
    </group>
  );
};
