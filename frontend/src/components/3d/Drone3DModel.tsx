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
  showHudLabel?: boolean;
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
  showHudLabel = true,
  onClick,
}) => {
  const groupRef = useRef<THREE.Group>(null);
  const rotorsRef = useRef<THREE.Group>(null);
  const currentPos = useRef(new THREE.Vector3(...position));
  const currentYaw = useRef(yawDegrees);

  const targetPos = new THREE.Vector3(...position);
  const targetYaw = yawDegrees;

  // Frame loop: smooth position & yaw interpolation + high-RPM rotor spin
  useFrame((_, delta) => {
    // Smooth position lerp
    currentPos.current.lerp(targetPos, Math.min(1.0, delta * 8.5));
    if (groupRef.current) {
      groupRef.current.position.copy(currentPos.current);
    }

    // Smooth shortest-path yaw rotation
    let diff = targetYaw - currentYaw.current;
    while (diff < -180) diff += 360;
    while (diff > 180) diff -= 360;
    currentYaw.current += diff * Math.min(1.0, delta * 9.0);

    // Spin propeller discs continuously
    if (rotorsRef.current) {
      rotorsRef.current.rotation.y += delta * 45.0;
    }
  });

  const currentYawRad = (currentYaw.current * Math.PI) / 180;
  const isCivilian = category.toLowerCase().includes('civilian');
  const isFixedWing = category.toLowerCase().includes('fixed-wing') || category.toLowerCase().includes('loitering');
  const isHexacopter = category.toLowerCase().includes('heavy') || category.toLowerCase().includes('commercial');

  // Materials & Colors
  const airframeColor = isCivilian
    ? '#F1F5F9'
    : isFixedWing
    ? '#334155'
    : isHexacopter
    ? '#1E293B'
    : '#1A1A1A'; // Matte tactical carbon fiber
  const armColor = '#17191C'; // Matte carbon composite tubes

  return (
    <group ref={groupRef} position={position}>
      {/* Ground Contact Shadow Disc (Accurately projects shadow without vertical poles) */}
      <mesh position={[0, -currentPos.current.y + 0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[isSelected ? 8.5 : 6.0, 24]} />
        <meshBasicMaterial
          color={isSelected ? '#00E5FF' : '#050505'}
          opacity={isSelected ? 0.45 : 0.4}
          transparent
        />
      </mesh>

      {/* Uncertainty Volume Bubble (Visible for degraded observations) */}
      {!isGroundTruthTruePosition && qualityScore < 0.9 && (
        <mesh>
          <sphereGeometry args={[Math.max(6, (1.0 - qualityScore) * 28), 16, 16]} />
          <meshBasicMaterial
            color={isSelected ? '#00E5FF' : '#3B0A6B'}
            wireframe
            opacity={isSelected ? 0.25 : 0.12}
            transparent
          />
        </mesh>
      )}

      {/* Selected Target Ground Tracking Halo (Electric Cyan #00E5FF) */}
      {isSelected && (
        <group position={[0, -currentPos.current.y + 0.4, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[10, 11.2, 32]} />
          <meshBasicMaterial color="#00E5FF" side={THREE.DoubleSide} />
        </group>
      )}

      {/* Main Drone Assembly (Heading Rotated) */}
      <group
        rotation={[0, -currentYawRad, 0]}
        onClick={(e) => {
          e.stopPropagation();
          onClick();
        }}
      >
        {/* ===================================================================== */}
        {/* MODEL 1: FIXED-WING RECON / LOITERING UAV                             */}
        {/* ===================================================================== */}
        {isFixedWing ? (
          <group scale={[0.7, 0.7, 0.7]}>
            {/* Aerodynamic Fuselage */}
            <mesh position={[0, 0, 1]} rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[1.2, 1.6, 14, 12]} />
              <meshStandardMaterial color={airframeColor} roughness={0.35} metalness={0.6} />
            </mesh>

            {/* Nose Cone */}
            <mesh position={[0, 0, 8.5]} rotation={[-Math.PI / 2, 0, 0]} castShadow>
              <coneGeometry args={[1.2, 3.5, 12]} />
              <meshStandardMaterial color="#0F172A" roughness={0.25} metalness={0.8} />
            </mesh>

            {/* Ventral EO/IR Optical Turret */}
            <mesh position={[0, -1.2, 6]} castShadow>
              <sphereGeometry args={[0.9, 12, 12]} />
              <meshStandardMaterial color="#0284C7" roughness={0.1} metalness={0.9} />
            </mesh>

            {/* Main Swept Wings */}
            <mesh position={[0, 0.3, 1]} castShadow>
              <boxGeometry args={[26, 0.5, 4.2]} />
              <meshStandardMaterial color={airframeColor} roughness={0.35} metalness={0.5} />
            </mesh>

            {/* Winglet Left & Right */}
            <mesh position={[-12.9, 1.2, 0.8]} rotation={[0, 0, 0.2]} castShadow>
              <boxGeometry args={[0.3, 2.4, 2.8]} />
              <meshStandardMaterial color="#0F172A" />
            </mesh>
            <mesh position={[12.9, 1.2, 0.8]} rotation={[0, 0, -0.2]} castShadow>
              <boxGeometry args={[0.3, 2.4, 2.8]} />
              <meshStandardMaterial color="#0F172A" />
            </mesh>

            {/* Twin Vertical Stabilizers */}
            <mesh position={[3.2, 2.0, -5.5]} rotation={[0, 0, 0.15]} castShadow>
              <boxGeometry args={[0.3, 3.5, 2.5]} />
              <meshStandardMaterial color={airframeColor} />
            </mesh>
            <mesh position={[-3.2, 2.0, -5.5]} rotation={[0, 0, -0.15]} castShadow>
              <boxGeometry args={[0.3, 3.5, 2.5]} />
              <meshStandardMaterial color={airframeColor} />
            </mesh>

            {/* Rear Spinning Pusher Propeller */}
            <group ref={rotorsRef} position={[0, 0, -6.5]}>
              <mesh rotation={[0, 0, 0]}>
                <cylinderGeometry args={[0.3, 0.3, 5.0, 4]} />
                <meshBasicMaterial color="#94A3B8" opacity={0.65} transparent />
              </mesh>
            </group>
          </group>
        ) : isHexacopter ? (
          /* ===================================================================== */
          /* MODEL 2: HEAVY COMMERCIAL / INDUSTRIAL HEXACOPTER                    */
          /* ===================================================================== */
          <group scale={[0.65, 0.65, 0.65]}>
            {/* Hexagonal Center Hub */}
            <mesh position={[0, 0, 0]} castShadow>
              <cylinderGeometry args={[4.8, 4.8, 2.4, 6]} />
              <meshStandardMaterial color={airframeColor} roughness={0.3} metalness={0.8} />
            </mesh>

            {/* Underslung Payload Pod */}
            <mesh position={[0, -2.4, 0]} castShadow>
              <boxGeometry args={[4.5, 3.0, 6.0]} />
              <meshStandardMaterial color="#334155" roughness={0.3} metalness={0.7} />
            </mesh>

            {/* 6 Radial Tubular Arms */}
            {[0, 60, 120, 180, 240, 300].map((deg, i) => {
              const rad = (deg * Math.PI) / 180;
              return (
                <group key={i} rotation={[0, rad, 0]}>
                  <mesh position={[7.0, 0.2, 0]} rotation={[0, 0, Math.PI / 2]} castShadow>
                    <cylinderGeometry args={[0.45, 0.45, 9, 8]} />
                    <meshStandardMaterial color={armColor} metalness={0.9} roughness={0.2} />
                  </mesh>
                  <mesh position={[11.5, 0.7, 0]} castShadow>
                    <cylinderGeometry args={[1.1, 1.1, 1.6, 12]} />
                    <meshStandardMaterial color="#64748B" metalness={0.8} roughness={0.2} />
                  </mesh>
                </group>
              );
            })}

            {/* 6 Spinning Rotor Discs */}
            <group ref={rotorsRef}>
              {[0, 60, 120, 180, 240, 300].map((deg, i) => {
                const rad = (deg * Math.PI) / 180;
                const px = Math.cos(rad) * 11.5;
                const pz = Math.sin(rad) * 11.5;
                return (
                  <mesh key={i} position={[px, 1.6, pz]}>
                    <cylinderGeometry args={[3.6, 3.6, 0.08, 16]} />
                    <meshBasicMaterial color="#94A3B8" opacity={0.5} transparent />
                  </mesh>
                );
              })}
            </group>
          </group>
        ) : (
          /* ===================================================================== */
          /* MODEL 3: REALISTIC TACTICAL QUADCOPTER                               */
          /* ===================================================================== */
          <group scale={[0.65, 0.65, 0.65]}>
            {/* Center Aerodynamic Fuselage Pod */}
            <mesh position={[0, 0.4, 0]} castShadow>
              <boxGeometry args={[4.8, 2.0, 7.2]} />
              <meshStandardMaterial color={airframeColor} roughness={0.25} metalness={0.75} />
            </mesh>

            {/* Top Avionics & GPS Module Dome */}
            <mesh position={[0, 1.6, -0.4]} castShadow>
              <boxGeometry args={[3.2, 0.9, 4.8]} />
              <meshStandardMaterial color="#0F172A" roughness={0.2} metalness={0.85} />
            </mesh>

            {/* Forward-Looking 2-Axis Gimbal Camera */}
            <group position={[0, -0.6, 3.8]}>
              <mesh castShadow>
                <sphereGeometry args={[1.0, 12, 12]} />
                <meshStandardMaterial color="#1E293B" metalness={0.8} roughness={0.2} />
              </mesh>
              {/* Camera Lens */}
              <mesh position={[0, 0, 0.8]} rotation={[Math.PI / 2, 0, 0]}>
                <cylinderGeometry args={[0.5, 0.5, 0.3, 16]} />
                <meshStandardMaterial color="#0284C7" metalness={0.9} roughness={0.1} />
              </mesh>
            </group>

            {/* 4 Carbon Arms in X-Configuration */}
            <mesh rotation={[0, Math.PI / 4, 0]} castShadow>
              <boxGeometry args={[15.5, 0.5, 0.8]} />
              <meshStandardMaterial color={armColor} metalness={0.9} roughness={0.25} />
            </mesh>
            <mesh rotation={[0, -Math.PI / 4, 0]} castShadow>
              <boxGeometry args={[15.5, 0.5, 0.8]} />
              <meshStandardMaterial color={armColor} metalness={0.9} roughness={0.25} />
            </mesh>

            {/* 4 Brushless Outrunner Motors */}
            {[
              [5.5, 0.6, 5.5],
              [-5.5, 0.6, 5.5],
              [5.5, 0.6, -5.5],
              [-5.5, 0.6, -5.5],
            ].map((pos, idx) => (
              <group key={idx} position={pos as [number, number, number]}>
                <mesh castShadow>
                  <cylinderGeometry args={[0.95, 0.95, 1.2, 12]} />
                  <meshStandardMaterial color="#475569" metalness={0.85} roughness={0.2} />
                </mesh>
              </group>
            ))}

            {/* Aviation Navigation Strobe LEDs */}
            {/* Port (Left Front): Red */}
            <mesh position={[-5.5, 0.2, 5.5]}>
              <sphereGeometry args={[0.4, 8, 8]} />
              <meshBasicMaterial color="#EF4444" />
            </mesh>
            {/* Starboard (Right Front): Green */}
            <mesh position={[5.5, 0.2, 5.5]}>
              <sphereGeometry args={[0.4, 8, 8]} />
              <meshBasicMaterial color="#22C55E" />
            </mesh>
            {/* Tail Strobe: White/Amber */}
            <mesh position={[0, 1.8, -3.2]}>
              <sphereGeometry args={[0.35, 8, 8]} />
              <meshBasicMaterial color={isCivilian ? '#10B981' : '#FBBF24'} />
            </mesh>

            {/* Minimal Landing Skids */}
            <group position={[0, -1.8, 0]}>
              <mesh position={[2.6, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.3, 0.3, 7.5, 8]} />
                <meshStandardMaterial color="#1E293B" metalness={0.7} />
              </mesh>
              <mesh position={[-2.6, 0, 0]} rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.3, 0.3, 7.5, 8]} />
                <meshStandardMaterial color="#1E293B" metalness={0.7} />
              </mesh>
            </group>

            {/* 4 Spinning Propeller Discs */}
            <group ref={rotorsRef}>
              {[
                [5.5, 1.4, 5.5],
                [-5.5, 1.4, 5.5],
                [5.5, 1.4, -5.5],
                [-5.5, 1.4, -5.5],
              ].map((pos, i) => (
                <mesh key={i} position={pos as [number, number, number]}>
                  <cylinderGeometry args={[3.2, 3.2, 0.06, 16]} />
                  <meshBasicMaterial color="#CBD5E1" opacity={0.5} transparent />
                </mesh>
              ))}
            </group>
          </group>
        )}
      </group>

      {/* Selected Target Tactical Halo */}
      {isSelected && (
        <group position={[0, 0, 0]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[14, 15.6, 32]} />
            <meshBasicMaterial color="#00E5FF" side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[18, 19.0, 32]} />
            <meshBasicMaterial color="#00E5FF" opacity={0.35} transparent side={THREE.DoubleSide} />
          </mesh>
        </group>
      )}

      {/* Clean 3D Tactical Billboard HUD Label */}
      {showHudLabel && (
        <Html
          position={[0, 11, 0]}
          center
          distanceFactor={320}
          style={{ pointerEvents: 'auto', userSelect: 'none' }}
        >
          <div
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
            className={`cursor-pointer px-2 py-1 rounded-md backdrop-blur-md transition-all font-mono whitespace-nowrap shadow-level1 flex flex-col gap-0.5 border ${
              isSelected
                ? 'bg-[#111318]/95 border-[#00CFE8] text-[#F4F5F7] ring-1 ring-[#00CFE8]'
                : 'bg-[#111318]/85 border-white/[0.12] text-[#B3B7C2] hover:text-[#F4F5F7] hover:border-white/30'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[10px]">
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isGroundTruthTruePosition
                    ? isHostile
                      ? 'bg-rose-500'
                      : 'bg-emerald-400'
                    : isHostile
                    ? 'bg-rose-500'
                    : 'bg-emerald-400'
                }`}
              />
              <span className="font-bold text-[#F5F3F7] tracking-wider">{entityId}</span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-white/10 text-white/80">
                {category.split(' ')[0]}
              </span>
            </div>

            <div className="flex items-center gap-2 text-[8px] text-[#AAA5B2] border-t border-white/10 pt-0.5">
              <span>AGL: {altitudeAGL !== undefined ? `${Math.round(altitudeAGL)}m` : 'N/A'}</span>
              <span>SPD: {speed !== undefined ? `${speed.toFixed(1)}m/s` : 'N/A'}</span>
              <span>HDG: {Math.round(yawDegrees)}°</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};
