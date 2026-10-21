import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Sky, Cloud, Stars } from '@react-three/drei';
import * as THREE from 'three';

interface WeatherEffectsProps {
  weatherCondition: string; // 'Clear Day' | 'Overcast' | 'Dense Fog' | 'Heavy Rain' | 'High RF Jamming'
  lightingMode: 'DAY' | 'NIGHT' | 'DUSK';
  graphicsQuality?: 'high' | 'medium' | 'low';
}

export const WeatherEffects3D: React.FC<WeatherEffectsProps> = ({
  weatherCondition,
  lightingMode,
  graphicsQuality = 'high',
}) => {
  const isNight = lightingMode === 'NIGHT';
  const isDusk = lightingMode === 'DUSK';
  const isRain = weatherCondition === 'Heavy Rain';
  const isFog = weatherCondition === 'Dense Fog';
  const isOvercast = weatherCondition === 'Overcast';

  // ----------------------------------------------------
  // Dynamic Rain Particle System
  // ----------------------------------------------------
  const rainCount = graphicsQuality === 'high' ? 1800 : graphicsQuality === 'medium' ? 900 : 350;
  const rainGeoRef = useRef<THREE.BufferGeometry>(null);

  const rainPositions = useMemo(() => {
    const pos = new Float32Array(rainCount * 3);
    for (let i = 0; i < rainCount; i++) {
      pos[i * 3 + 0] = (Math.random() - 0.5) * 800; // x spread
      pos[i * 3 + 1] = Math.random() * 350;         // y altitude
      pos[i * 3 + 2] = (Math.random() - 0.5) * 800; // z spread
    }
    return pos;
  }, [rainCount]);

  useFrame((_, delta) => {
    if (isRain && rainGeoRef.current) {
      const positions = rainGeoRef.current.attributes.position.array as Float32Array;
      const speed = 400 * delta;
      const windX = 60 * delta; // slight wind slant
      for (let i = 0; i < rainCount; i++) {
        positions[i * 3 + 1] -= speed; // fall downward
        positions[i * 3 + 0] += windX; // drift with wind

        // Wrap around when hitting the ground
        if (positions[i * 3 + 1] < 0) {
          positions[i * 3 + 1] = 320 + Math.random() * 30;
          positions[i * 3 + 0] = (Math.random() - 0.5) * 800;
          positions[i * 3 + 2] = (Math.random() - 0.5) * 800;
        }
      }
      rainGeoRef.current.attributes.position.needsUpdate = true;
    }
  });

  // ----------------------------------------------------
  // Sky & Lighting Parameters
  // ----------------------------------------------------
  // Sun Position based on lighting mode
  const sunPosition: [number, number, number] = useMemo(() => {
    if (isNight) return [0, -100, -200];
    if (isDusk) return [300, 40, -400]; // Low sun on horizon
    if (isOvercast) return [100, 250, 100];
    return [250, 450, 250]; // Bright midday sun
  }, [isNight, isDusk, isOvercast]);

  // Atmospheric Fog Settings (Natural, realistic colors)
  const fogColor = useMemo(() => {
    if (isNight) return '#060A14';
    if (isRain) return '#4A5568';
    if (isFog) return '#C8D3DC';
    if (isDusk) return '#B86F58';
    if (isOvercast) return '#8C9BAA';
    return '#BCE0FD'; // Clear soft blue horizon haze
  }, [isNight, isRain, isFog, isDusk, isOvercast]);

  const fogNear = isFog ? 40 : isRain ? 120 : 250;
  const fogFar = isFog ? 550 : isRain ? 900 : isNight ? 1100 : 1600;

  // Directional Sunlight Intensity & Tint
  const sunColor = isNight
    ? '#4A6984' // Moonlit silver-blue
    : isDusk
    ? '#FF9E64' // Warm golden hour orange
    : isRain
    ? '#8DA2B4' // Cool storm gray
    : isOvercast
    ? '#CFD8DC' // Diffuse slate
    : '#FFF8E7'; // Crisp warm sunlight

  const sunIntensity = isNight ? 0.35 : isDusk ? 1.1 : isRain ? 0.75 : isOvercast ? 0.9 : 1.6;
  const ambientIntensity = isNight ? 0.25 : isDusk ? 0.45 : isRain ? 0.55 : isOvercast ? 0.75 : 0.65;
  const ambientColor = isNight ? '#1E293B' : isRain ? '#64748B' : '#E2E8F0';

  return (
    <group>
      {/* Dynamic Atmospheric Fog */}
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />

      {/* Natural Sky Dome */}
      {!isNight ? (
        <Sky
          distance={450000}
          sunPosition={sunPosition}
          turbidity={isFog ? 12 : isRain ? 10 : isOvercast ? 8 : 4}
          rayleigh={isDusk ? 4 : isRain ? 1.5 : 1.2}
          mieCoefficient={isFog ? 0.08 : 0.005}
          mieDirectionalG={0.8}
        />
      ) : (
        /* Starry Night Sky */
        <Stars
          radius={500}
          depth={80}
          count={graphicsQuality === 'low' ? 800 : 2200}
          factor={4}
          saturation={0}
          fade
          speed={0.8}
        />
      )}

      {/* Realistic Volumetric Clouds (for Day, Overcast, and Rain) */}
      {!isNight && graphicsQuality !== 'low' && (
        <group position={[0, 200, 0]}>
          <Cloud
            opacity={isOvercast || isRain ? 0.85 : 0.45}
            speed={0.15}
            bounds={isOvercast ? [40, 12, 40] : [24, 8, 24]}
            segments={isOvercast ? 14 : 8}
            color={isRain ? '#4A5568' : isOvercast ? '#A0AEC0' : '#FFFFFF'}
          />
          {isRain && (
            <Cloud
              opacity={0.7}
              speed={0.25}
              bounds={[30, 10, 30]}
              segments={8}
              position={[80, -30, -50]}
              color="#334155"
            />
          )}
        </group>
      )}

      {/* Main Directional Sunlight / Moonlight with Soft Shadows */}
      <directionalLight
        position={sunPosition}
        intensity={sunIntensity}
        color={sunColor}
        castShadow={graphicsQuality !== 'low'}
        shadow-mapSize-width={graphicsQuality === 'high' ? 2048 : 1024}
        shadow-mapSize-height={graphicsQuality === 'high' ? 2048 : 1024}
        shadow-camera-near={50}
        shadow-camera-far={1200}
        shadow-camera-left={-500}
        shadow-camera-right={500}
        shadow-camera-top={500}
        shadow-camera-bottom={-500}
        shadow-bias={-0.0005}
      />

      {/* Secondary Soft Fill / Sky Hemisphere Lighting */}
      <hemisphereLight
        args={[
          isNight ? '#0F172A' : isDusk ? '#FED7AA' : '#BAE6FD', // Sky light
          isNight ? '#05070B' : '#334155',                     // Ground bounce light
          ambientIntensity,
        ]}
      />

      {/* Ambient Diffuse Light */}
      <ambientLight color={ambientColor} intensity={ambientIntensity * 0.8} />

      {/* Active Rainfall Particles */}
      {isRain && (
        <points>
          <bufferGeometry ref={rainGeoRef}>
            <bufferAttribute
              attach="attributes-position"
              count={rainPositions.length / 3}
              array={rainPositions}
              itemSize={3}
            />
          </bufferGeometry>
          <pointsMaterial
            color="#A5C8E4"
            size={graphicsQuality === 'high' ? 1.8 : 1.4}
            transparent
            opacity={0.65}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </points>
      )}
    </group>
  );
};
