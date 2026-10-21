import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Environment3DProps {
  environmentType: string; // 'urban' | 'rural' | 'coastal' | 'border'
  scaleFactor: number;
  graphicsQuality?: 'high' | 'medium' | 'low';
}

export const Environment3D: React.FC<Environment3DProps> = ({
  environmentType,
  scaleFactor,
  graphicsQuality = 'high',
}) => {
  const waterRef = useRef<THREE.Mesh>(null);
  const lighthouseLightRef = useRef<THREE.SpotLight>(null);

  // Animated water ripples & lighthouse beam rotation
  useFrame((_, delta) => {
    if (waterRef.current && (environmentType === 'coastal')) {
      const mat = waterRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.roughness = 0.15 + Math.sin(Date.now() * 0.002) * 0.05;
      }
    }
    if (lighthouseLightRef.current && environmentType === 'coastal') {
      lighthouseLightRef.current.target.position.x = 260 + Math.cos(Date.now() * 0.0015) * 120;
      lighthouseLightRef.current.target.position.z = -120 + Math.sin(Date.now() * 0.0015) * 120;
      lighthouseLightRef.current.target.updateMatrixWorld();
    }
  });

  // Range rings (1km, 2km, 3km, 4km)
  const rings = [1000, 2000, 3000, 4000].map((r) => r * scaleFactor);
  const perimeterRadius = 1800 * scaleFactor;

  // -------------------------------------------------------------------------
  // PROCEDURAL SEEDED FEATURE GENERATION
  // -------------------------------------------------------------------------
  const features = useMemo(() => {
    const rng = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    if (environmentType === 'urban') {
      // Generate Urban Buildings arranged in city blocks along street corridors
      const buildings: Array<{
        pos: [number, number, number];
        size: [number, number, number];
        color: string;
        roofColor: string;
        hasAntenna?: boolean;
        hasHVAC?: boolean;
      }> = [];

      let seed = 42;
      const palette = ['#737B85', '#8C949E', '#5A626B', '#A4ABB5', '#6D747D', '#4B535E', '#9E6B55']; // concrete, glass-tint, warm brick

      // City blocks outside center clear zone (radius > 160)
      const gridSize = 7;
      const spacing = 75;
      for (let ix = -gridSize; ix <= gridSize; ix++) {
        for (let iz = -gridSize; iz <= gridSize; iz++) {
          const bx = ix * spacing + (rng(seed++) - 0.5) * 15;
          const bz = iz * spacing + (rng(seed++) - 0.5) * 15;
          const distFromCenter = Math.hypot(bx, bz);

          // Keep central tactical base clear
          if (distFromCenter < 140 || distFromCenter > 520) continue;

          // Skip some slots for roads / open plazas
          if ((Math.abs(ix) % 2 === 0 && Math.abs(iz) % 2 === 0) || rng(seed++) < 0.25) continue;

          const w = 26 + rng(seed++) * 24;
          const d = 26 + rng(seed++) * 24;
          // Varied heights: taller near center (up to 95m), medium further out
          const heightFactor = Math.max(0.3, 1.0 - distFromCenter / 600);
          const h = 25 + rng(seed++) * 75 * heightFactor;

          const color = palette[Math.floor(rng(seed++) * palette.length)];
          const roofColor = rng(seed++) > 0.5 ? '#3A3F47' : '#2A2E35';

          buildings.push({
            pos: [bx, h / 2, bz],
            size: [w, h, d],
            color,
            roofColor,
            hasAntenna: rng(seed++) > 0.6,
            hasHVAC: rng(seed++) > 0.4,
          });
        }
      }

      // Street trees lining avenues
      const streetTrees: Array<[number, number, number]> = [];
      for (let i = 0; i < 36; i++) {
        const ang = rng(seed++) * Math.PI * 2;
        const rad = 150 + rng(seed++) * 320;
        streetTrees.push([Math.cos(ang) * rad, 0, Math.sin(ang) * rad]);
      }

      return { type: 'urban', buildings, streetTrees };
    } else if (environmentType === 'rural') {
      // Generate Rural Farmland: Patchwork fields, tree clusters, barns, grain silos
      let seed = 101;
      const trees: Array<{ pos: [number, number, number]; scale: number; isPine: boolean }> = [];
      for (let i = 0; i < (graphicsQuality === 'low' ? 30 : 65); i++) {
        const ang = rng(seed++) * Math.PI * 2;
        const dist = 140 + rng(seed++) * 360;
        trees.push({
          pos: [Math.cos(ang) * dist, 0, Math.sin(ang) * dist],
          scale: 0.8 + rng(seed++) * 0.8,
          isPine: rng(seed++) > 0.5,
        });
      }

      // Farm structures
      const structures = [
        { pos: [-180, 0, 160] as [number, number, number], type: 'barn' },
        { pos: [-220, 0, 175] as [number, number, number], type: 'silo' },
        { pos: [-235, 0, 165] as [number, number, number], type: 'silo' },
        { pos: [220, 0, -180] as [number, number, number], type: 'farmhouse' },
        { pos: [260, 0, -160] as [number, number, number], type: 'barn' },
      ];

      return { type: 'rural', trees, structures };
    } else if (environmentType === 'coastal') {
      // Generate Coastal Terrain: Shoreline, beach, rocky outcrops, dock, lighthouse
      let seed = 303;
      const coastalRocks: Array<{ pos: [number, number, number]; size: [number, number, number] }> = [];
      for (let i = 0; i < 24; i++) {
        const rx = 140 + rng(seed++) * 180;
        const rz = (rng(seed++) - 0.5) * 600;
        coastalRocks.push({
          pos: [rx, 4 + rng(seed++) * 6, rz],
          size: [12 + rng(seed++) * 16, 8 + rng(seed++) * 12, 12 + rng(seed++) * 16],
        });
      }

      const coastalTrees: Array<[number, number, number]> = [];
      for (let i = 0; i < 32; i++) {
        const tx = -50 - rng(seed++) * 350;
        const tz = (rng(seed++) - 0.5) * 700;
        coastalTrees.push([tx, 0, tz]);
      }

      return { type: 'coastal', coastalRocks, coastalTrees };
    } else {
      // Border / Outpost: Arid rocky terrain, watchtowers, security fencing, radar outpost
      let seed = 505;
      const hills: Array<{ pos: [number, number, number]; size: [number, number, number] }> = [];
      for (let i = 0; i < 28; i++) {
        const ang = rng(seed++) * Math.PI * 2;
        const dist = 180 + rng(seed++) * 320;
        hills.push({
          pos: [Math.cos(ang) * dist, 8 + rng(seed++) * 14, Math.sin(ang) * dist],
          size: [30 + rng(seed++) * 40, 16 + rng(seed++) * 28, 30 + rng(seed++) * 40],
        });
      }

      const watchtowers = [
        [170, 0, 170] as [number, number, number],
        [-170, 0, 170] as [number, number, number],
        [170, 0, -170] as [number, number, number],
        [-170, 0, -170] as [number, number, number],
      ];

      return { type: 'border', hills, watchtowers };
    }
  }, [environmentType, graphicsQuality]);

  return (
    <group>
      {/* ========================================================================= */}
      {/* 1. TERRAIN / GROUND BASES ACCORDING TO ENVIRONMENT PRESET                 */}
      {/* ========================================================================= */}
      {environmentType === 'urban' && (
        <group>
          {/* Main Urban Ground Plane: Dark Asphalt / City Fabric */}
          <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[1400, 1400]} />
            <meshStandardMaterial color="#22252A" roughness={0.85} metalness={0.15} />
          </mesh>

          {/* Road Network Grid (Main East-West and North-South Avenues) */}
          {[-250, -125, 125, 250].map((coord, i) => (
            <group key={`road-x-${i}`}>
              {/* East-West Asphalt Road */}
              <mesh position={[0, -0.4, coord]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[1300, 24]} />
                <meshStandardMaterial color="#2B2F36" roughness={0.9} />
              </mesh>
              {/* Road White Dashed Lane Markings */}
              <mesh position={[0, -0.35, coord]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1280, 0.9]} />
                <meshBasicMaterial color="#E2E8F0" opacity={0.65} transparent />
              </mesh>
              {/* North-South Asphalt Road */}
              <mesh position={[coord, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[24, 1300]} />
                <meshStandardMaterial color="#2B2F36" roughness={0.9} />
              </mesh>
              {/* North-South White Markings */}
              <mesh position={[coord, -0.35, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.9, 1280]} />
                <meshBasicMaterial color="#E2E8F0" opacity={0.65} transparent />
              </mesh>
            </group>
          ))}

          {/* City Green Parks / Lawn Patches */}
          {[
            [-180, -0.45, -180],
            [180, -0.45, 180],
            [-180, -0.45, 180],
            [180, -0.45, -180],
          ].map((pos, i) => (
            <mesh key={`park-${i}`} position={pos as [number, number, number]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={[90, 90]} />
              <meshStandardMaterial color="#3D6832" roughness={0.95} />
            </mesh>
          ))}
        </group>
      )}

      {environmentType === 'rural' && (
        <group>
          {/* Main Rolling Meadow Base Ground */}
          <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[1400, 1400]} />
            <meshStandardMaterial color="#4A7538" roughness={0.92} metalness={0.05} />
          </mesh>

          {/* Agricultural Patchwork Crop Fields */}
          {[
            { pos: [-240, -0.45, -200], size: [220, 180], color: '#BFA152' }, // Golden Wheat field
            { pos: [220, -0.45, -220], size: [240, 190], color: '#3E662F' },  // Lush green pasture
            { pos: [-220, -0.45, 200], size: [200, 210], color: '#543D28' },  // Plowed dark brown loam
            { pos: [240, -0.45, 180], size: [210, 170], color: '#8F9B48' },   // Hay / alfalfa field
            { pos: [0, -0.45, 300], size: [340, 150], color: '#A68A42' },     // Barley field
            { pos: [0, -0.45, -300], size: [340, 150], color: '#446E33' },    // Orchard / vineyard
          ].map((field, idx) => (
            <mesh key={`field-${idx}`} position={field.pos as [number, number, number]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={field.size as [number, number]} />
              <meshStandardMaterial color={field.color} roughness={0.96} />
            </mesh>
          ))}

          {/* Winding Dirt & Gravel Country Road */}
          <mesh position={[0, -0.38, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 6]} receiveShadow>
            <planeGeometry args={[14, 1300]} />
            <meshStandardMaterial color="#826E54" roughness={0.98} />
          </mesh>
          <mesh position={[0, -0.38, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 4]} receiveShadow>
            <planeGeometry args={[12, 1300]} />
            <meshStandardMaterial color="#826E54" roughness={0.98} />
          </mesh>
        </group>
      )}

      {environmentType === 'coastal' && (
        <group>
          {/* Western Land Mass / Coastal Dunes & Greenery */}
          <mesh position={[-350, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[700, 1400]} />
            <meshStandardMaterial color="#50783D" roughness={0.92} />
          </mesh>

          {/* Sandy Beach Shoreline Strip (Natural transition) */}
          <mesh position={[40, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[120, 1400]} />
            <meshStandardMaterial color="#D8C398" roughness={0.88} />
          </mesh>

          {/* Wet Sand Tide Edge (Glossier dark sand) */}
          <mesh position={[105, -0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[25, 1400]} />
            <meshStandardMaterial color="#948060" roughness={0.4} metalness={0.2} />
          </mesh>

          {/* Realistic Ocean Water Body (Eastern half) */}
          <mesh ref={waterRef} position={[420, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[680, 1400]} />
            <meshStandardMaterial
              color="#1B5274"
              roughness={0.12}
              metalness={0.75}
              opacity={0.88}
              transparent
            />
          </mesh>

          {/* Wooden Harbor Boat Dock / Pier extending into Ocean */}
          <group position={[110, 2.5, 80]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[140, 2.5, 16]} />
              <meshStandardMaterial color="#5C452D" roughness={0.85} />
            </mesh>
            {/* Dock Support Pilings in water */}
            {[-50, -20, 10, 40, 60].map((px, i) => (
              <group key={`piling-${i}`} position={[px, -4, 0]}>
                <mesh position={[0, 0, 7]} castShadow>
                  <cylinderGeometry args={[1, 1, 10, 8]} />
                  <meshStandardMaterial color="#3D2D1E" roughness={0.9} />
                </mesh>
                <mesh position={[0, 0, -7]} castShadow>
                  <cylinderGeometry args={[1, 1, 10, 8]} />
                  <meshStandardMaterial color="#3D2D1E" roughness={0.9} />
                </mesh>
              </group>
            ))}
          </group>

          {/* Coastal Headland Lighthouse on Rocky Promontory */}
          <group position={[130, 0, -180]}>
            {/* Rocky base hill */}
            <mesh position={[0, 8, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[22, 34, 16, 12]} />
              <meshStandardMaterial color="#5C5852" roughness={0.95} />
            </mesh>
            {/* White Tapered Tower */}
            <mesh position={[0, 32, 0]} castShadow>
              <cylinderGeometry args={[4.5, 7.5, 32, 16]} />
              <meshStandardMaterial color="#E2E8F0" roughness={0.3} />
            </mesh>
            {/* Red Mid-band Stripe */}
            <mesh position={[0, 32, 0]} castShadow>
              <cylinderGeometry args={[5.6, 6.4, 7, 16]} />
              <meshStandardMaterial color="#DC2626" roughness={0.4} />
            </mesh>
            {/* Lantern Room Glass & Top Dome */}
            <mesh position={[0, 50, 0]} castShadow>
              <cylinderGeometry args={[4.2, 4.2, 5, 12]} />
              <meshStandardMaterial color="#0284C7" roughness={0.1} metalness={0.9} />
            </mesh>
            <mesh position={[0, 54, 0]} castShadow>
              <sphereGeometry args={[4.2, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
              <meshStandardMaterial color="#1E293B" metalness={0.8} />
            </mesh>
            {/* Rotating Lighthouse Spotlight */}
            <spotLight
              ref={lighthouseLightRef}
              position={[0, 50, 0]}
              intensity={4.0}
              angle={0.25}
              penumbra={0.4}
              color="#FEF08A"
              distance={400}
            />
          </group>
        </group>
      )}

      {environmentType === 'border' && (
        <group>
          {/* Arid Mountain / Semi-Desert Ground Base */}
          <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[1400, 1400]} />
            <meshStandardMaterial color="#8C6E4A" roughness={0.95} metalness={0.05} />
          </mesh>

          {/* Dirt Patrol Perimeter Road */}
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.4, 0]}>
            <ringGeometry args={[perimeterRadius - 6, perimeterRadius + 6, 64]} />
            <meshStandardMaterial color="#6E5539" roughness={0.96} />
          </mesh>

          {/* Border Security Chain-link Fence Along Perimeter */}
          {graphicsQuality !== 'low' && (
            <mesh position={[0, 3, 0]}>
              <cylinderGeometry args={[perimeterRadius, perimeterRadius, 6, 48, 1, true]} />
              <meshStandardMaterial color="#78716C" wireframe opacity={0.45} transparent />
            </mesh>
          )}
        </group>
      )}

      {/* ========================================================================= */}
      {/* 2. PROCEDURAL 3D STRUCTURES, VEGETATION & FEATURES                        */}
      {/* ========================================================================= */}
      {/* Urban Buildings with Rooftop Detailing */}
      {features.type === 'urban' &&
        features.buildings?.map((b, i) => (
          <group key={`bld-${i}`} position={b.pos}>
            {/* Main Building Block */}
            <mesh castShadow receiveShadow>
              <boxGeometry args={b.size} />
              <meshStandardMaterial color={b.color} roughness={0.5} metalness={0.25} />
            </mesh>

            {/* Rooftop Parapet Perimeter */}
            <mesh position={[0, b.size[1] / 2 + 0.4, 0]} castShadow>
              <boxGeometry args={[b.size[0] + 0.5, 0.8, b.size[2] + 0.5]} />
              <meshStandardMaterial color={b.roofColor} roughness={0.8} />
            </mesh>

            {/* Rooftop HVAC Elevator Bulkhead / Chiller Unit */}
            {b.hasHVAC && (
              <mesh position={[b.size[0] * 0.15, b.size[1] / 2 + 2.5, b.size[2] * 0.15]} castShadow>
                <boxGeometry args={[b.size[0] * 0.35, 4.5, b.size[2] * 0.35]} />
                <meshStandardMaterial color="#475569" roughness={0.7} metalness={0.4} />
              </mesh>
            )}

            {/* Rooftop Telecommunication Mast */}
            {b.hasAntenna && (
              <mesh position={[-b.size[0] * 0.25, b.size[1] / 2 + 6, -b.size[2] * 0.25]} castShadow>
                <cylinderGeometry args={[0.3, 0.4, 12, 6]} />
                <meshStandardMaterial color="#94A3B8" metalness={0.9} />
              </mesh>
            )}
          </group>
        ))}

      {/* Urban Sidewalk Trees */}
      {features.type === 'urban' &&
        features.streetTrees?.map((pos, i) => (
          <group key={`tree-u-${i}`} position={pos}>
            {/* Tree Trunk */}
            <mesh position={[0, 4, 0]} castShadow>
              <cylinderGeometry args={[0.7, 1.0, 8, 8]} />
              <meshStandardMaterial color="#5C4033" roughness={0.9} />
            </mesh>
            {/* Tree Leaf Canopy */}
            <mesh position={[0, 9.5, 0]} castShadow>
              <sphereGeometry args={[5, 12, 10]} />
              <meshStandardMaterial color="#2E6930" roughness={0.8} />
            </mesh>
          </group>
        ))}

      {/* Rural Barns, Silos, Farmhouses */}
      {features.type === 'rural' &&
        features.structures?.map((s, i) => (
          <group key={`struct-${i}`} position={s.pos}>
            {s.type === 'barn' ? (
              /* Traditional Red Gambrel Barn */
              <group position={[0, 9, 0]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[32, 18, 22]} />
                  <meshStandardMaterial color="#991B1B" roughness={0.75} />
                </mesh>
                {/* Pitched Roof */}
                <mesh position={[0, 12, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
                  <boxGeometry args={[18, 18, 23]} />
                  <meshStandardMaterial color="#374151" roughness={0.7} />
                </mesh>
              </group>
            ) : s.type === 'silo' ? (
              /* Corrugated Grain Silo */
              <group position={[0, 16, 0]}>
                <mesh castShadow>
                  <cylinderGeometry args={[7, 7, 32, 16]} />
                  <meshStandardMaterial color="#94A3B8" metalness={0.75} roughness={0.3} />
                </mesh>
                {/* Conical Dome */}
                <mesh position={[0, 19, 0]} castShadow>
                  <coneGeometry args={[7.2, 6, 16]} />
                  <meshStandardMaterial color="#64748B" metalness={0.8} roughness={0.3} />
                </mesh>
              </group>
            ) : (
              /* Rural Farmhouse */
              <group position={[0, 7.5, 0]}>
                <mesh castShadow receiveShadow>
                  <boxGeometry args={[24, 15, 18]} />
                  <meshStandardMaterial color="#F1F5F9" roughness={0.6} />
                </mesh>
                {/* Gabled Roof */}
                <mesh position={[0, 10.5, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
                  <boxGeometry args={[14, 14, 19]} />
                  <meshStandardMaterial color="#1E293B" roughness={0.6} />
                </mesh>
              </group>
            )}
          </group>
        ))}

      {/* Rural Natural Trees (Deciduous and Evergreen Pine) */}
      {features.type === 'rural' &&
        features.trees?.map((t, i) => (
          <group key={`rtree-${i}`} position={t.pos} scale={[t.scale, t.scale, t.scale]}>
            {t.isPine ? (
              /* Tall Conical Pine Tree */
              <group>
                <mesh position={[0, 4, 0]} castShadow>
                  <cylinderGeometry args={[0.8, 1.2, 8, 8]} />
                  <meshStandardMaterial color="#4A3728" roughness={0.9} />
                </mesh>
                {/* Layered Cones */}
                <mesh position={[0, 10, 0]} castShadow>
                  <coneGeometry args={[6.5, 8, 8]} />
                  <meshStandardMaterial color="#1E3A2F" roughness={0.85} />
                </mesh>
                <mesh position={[0, 15, 0]} castShadow>
                  <coneGeometry args={[5, 7, 8]} />
                  <meshStandardMaterial color="#234E3F" roughness={0.85} />
                </mesh>
                <mesh position={[0, 19, 0]} castShadow>
                  <coneGeometry args={[3.2, 6, 8]} />
                  <meshStandardMaterial color="#2D5F4D" roughness={0.85} />
                </mesh>
              </group>
            ) : (
              /* Broad Deciduous Oak */
              <group>
                <mesh position={[0, 5, 0]} castShadow>
                  <cylinderGeometry args={[1.2, 1.8, 10, 8]} />
                  <meshStandardMaterial color="#543D2B" roughness={0.9} />
                </mesh>
                <mesh position={[0, 12, 0]} castShadow>
                  <sphereGeometry args={[7.5, 12, 10]} />
                  <meshStandardMaterial color="#36682B" roughness={0.8} />
                </mesh>
                <mesh position={[3, 14, -2]} castShadow>
                  <sphereGeometry args={[5, 10, 8]} />
                  <meshStandardMaterial color="#457A36" roughness={0.8} />
                </mesh>
              </group>
            )}
          </group>
        ))}

      {/* Coastal Rocky Outcrops & Boulders */}
      {features.type === 'coastal' &&
        features.coastalRocks?.map((r, i) => (
          <mesh key={`crock-${i}`} position={r.pos} castShadow receiveShadow>
            <dodecahedronGeometry args={[r.size[0] / 2, 1]} />
            <meshStandardMaterial color="#57534E" roughness={0.95} metalness={0.1} />
          </mesh>
        ))}

      {/* Border Outpost Watchtowers */}
      {features.type === 'border' &&
        features.watchtowers?.map((pos, i) => (
          <group key={`tower-${i}`} position={pos}>
            {/* 4 Steel Support Legs */}
            {[-4, 4].map((lx) =>
              [-4, 4].map((lz) => (
                <mesh key={`${lx}-${lz}`} position={[lx, 14, lz]} castShadow>
                  <cylinderGeometry args={[0.4, 0.4, 28, 6]} />
                  <meshStandardMaterial color="#44403C" metalness={0.8} />
                </mesh>
              ))
            )}
            {/* Observation Cabin */}
            <mesh position={[0, 28, 0]} castShadow receiveShadow>
              <boxGeometry args={[12, 6, 12]} />
              <meshStandardMaterial color="#57534E" roughness={0.6} />
            </mesh>
            {/* Glass windows */}
            <mesh position={[0, 28, 0]}>
              <boxGeometry args={[12.2, 2.5, 12.2]} />
              <meshStandardMaterial color="#0284C7" opacity={0.7} transparent roughness={0.1} />
            </mesh>
            {/* Pyramid Roof */}
            <mesh position={[0, 33, 0]} rotation={[0, Math.PI / 4, 0]} castShadow>
              <coneGeometry args={[9, 4, 4]} />
              <meshStandardMaterial color="#292524" />
            </mesh>
          </group>
        ))}

      {/* Border Rolling Rocky Hills */}
      {features.type === 'border' &&
        features.hills?.map((h, i) => (
          <mesh key={`hill-${i}`} position={h.pos} castShadow receiveShadow>
            <dodecahedronGeometry args={[h.size[0] / 2, 1]} />
            <meshStandardMaterial color="#78593A" roughness={0.95} />
          </mesh>
        ))}

      {/* ========================================================================= */}
      {/* 3. CENTRAL GARUDA TACTICAL COMMAND NODE (HQ RADAR & SATELLITE BASE)       */}
      {/* ========================================================================= */}
      <group position={[0, 0, 0]}>
        {/* Reinforced Command Bunker Platform */}
        <mesh position={[0, 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[16, 20, 4, 16]} />
          <meshStandardMaterial color="#334155" roughness={0.7} metalness={0.4} />
        </mesh>

        {/* Outer Perimeter Walkway Curb */}
        <mesh position={[0, 4.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[14, 16, 32]} />
          <meshStandardMaterial color="#1E293B" roughness={0.6} />
        </mesh>

        {/* Phased Array Radar Geodesic Dome */}
        <mesh position={[0, 8.5, 0]} castShadow>
          <sphereGeometry args={[7.5, 24, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color="#F1F5F9"
            roughness={0.3}
            metalness={0.2}
          />
        </mesh>

        {/* Tactical Mast & Antenna Array */}
        <mesh position={[0, 22, 0]} castShadow>
          <cylinderGeometry args={[0.5, 0.7, 24, 8]} />
          <meshStandardMaterial color="#94A3B8" metalness={0.9} />
        </mesh>
        {/* Radar Crossbars */}
        <mesh position={[0, 28, 0]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.3, 0.3, 10, 8]} />
          <meshStandardMaterial color="#CBD5E1" metalness={0.9} />
        </mesh>
        {/* Central Beacon Status Light (GARUDA Accent) */}
        <mesh position={[0, 34, 0]}>
          <sphereGeometry args={[0.9, 12, 12]} />
          <meshBasicMaterial color="#00E5FF" />
        </mesh>
      </group>

      {/* ========================================================================= */}
      {/* 4. RESTRAINED TACTICAL OVERLAYS (RANGE RINGS & PERIMETER)                 */}
      {/* ========================================================================= */}
      {/* Subtle Concentric Range Rings (1km, 2km, 3km, 4km) */}
      {rings.map((r, idx) => (
        <mesh key={`ring-${idx}`} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.15, 0]}>
          <ringGeometry args={[r - 0.7, r + 0.7, 96]} />
          <meshBasicMaterial color="#00E5FF" opacity={0.16} transparent side={THREE.DoubleSide} />
        </mesh>
      ))}

      {/* 1.8km Inner Defense Perimeter Ring (Restrained warning boundary) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
        <ringGeometry args={[perimeterRadius - 1.2, perimeterRadius + 1.2, 96]} />
        <meshBasicMaterial color="#00E5FF" opacity={0.38} transparent side={THREE.DoubleSide} />
      </mesh>
    </group>
  );
};
