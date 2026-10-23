import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface Environment3DProps {
  environmentType: string; // 'urban' | 'rural' | 'coastal' | 'border'
  scaleFactor: number;
  graphicsQuality?: 'high' | 'medium' | 'low';
}

type UrbanFeatures = {
  type: 'urban';
  buildings: Array<{
    pos: [number, number, number];
    size: [number, number, number];
    color: string;
    windowColor: string;
    roofColor: string;
    type: 'skyscraper' | 'commercial' | 'residential';
    hasHelipad?: boolean;
    hasAntenna?: boolean;
  }>;
  avenueTrees: Array<[number, number, number]>;
};

type RuralFeatures = {
  type: 'rural';
  trees: Array<{ pos: [number, number, number]; scale: number; isPine: boolean }>;
  structures: Array<{ pos: [number, number, number]; type: string }>;
};

type CoastalFeatures = {
  type: 'coastal';
  coastalRocks: Array<{ pos: [number, number, number]; size: [number, number, number]; rot: number }>;
  coastalTrees: Array<[number, number, number]>;
};

type BorderFeatures = {
  type: 'border';
  canyonMesas: Array<{ pos: [number, number, number]; size: [number, number, number] }>;
  watchtowers: Array<[number, number, number]>;
};

type Features = UrbanFeatures | RuralFeatures | CoastalFeatures | BorderFeatures;

export const Environment3D: React.FC<Environment3DProps> = ({
  environmentType,
  scaleFactor,
  graphicsQuality = 'high',
}) => {
  const waterRef = useRef<THREE.Mesh>(null);
  const lighthouseBeamRef = useRef<THREE.SpotLight>(null);
  const radarDishRef = useRef<THREE.Group>(null);

  // Dynamic animations for water ripples, lighthouse beam, and radar dish
  useFrame((state, delta) => {
    // Ocean water wave roughness and slight position displacement
    if (waterRef.current && environmentType === 'coastal') {
      const mat = waterRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.roughness = 0.12 + Math.sin(state.clock.elapsedTime * 1.5) * 0.04;
      }
    }
    // Rotating coastal lighthouse beam
    if (lighthouseBeamRef.current && environmentType === 'coastal') {
      const angle = state.clock.elapsedTime * 0.8;
      lighthouseBeamRef.current.target.position.x = 280 + Math.cos(angle) * 150;
      lighthouseBeamRef.current.target.position.z = -140 + Math.sin(angle) * 150;
      lighthouseBeamRef.current.target.updateMatrixWorld();
    }
    // Rotating border defense radar dish
    if (radarDishRef.current && environmentType === 'border') {
      radarDishRef.current.rotation.y += delta * 1.2;
    }
  });

  // Procedural features generation with deterministic pseudo-random seed
  const features = useMemo(() => {
    const rng = (seed: number) => {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    };

    // =========================================================================
    // 1. URBAN ENVIRONMENT DATA
    // =========================================================================
    if (environmentType === 'urban') {
      const buildings: Array<{
        pos: [number, number, number];
        size: [number, number, number];
        color: string;
        windowColor: string;
        roofColor: string;
        type: 'skyscraper' | 'commercial' | 'residential';
        hasHelipad?: boolean;
        hasAntenna?: boolean;
      }> = [];

      let seed = 42;
      const buildingColors = ['#5A626B', '#6D747D', '#7B848F', '#4A525B', '#8E95A0', '#414750'];
      const windowTints = ['#93C5FD', '#60A5FA', '#38BDF8', '#CBD5E1', '#1E293B'];

      // City blocks outside center clear zone (radius 100m to 560m)
      const gridSize = 6;
      const spacing = 80;
      for (let ix = -gridSize; ix <= gridSize; ix++) {
        for (let iz = -gridSize; iz <= gridSize; iz++) {
          const bx = ix * spacing + (rng(seed++) - 0.5) * 16;
          const bz = iz * spacing + (rng(seed++) - 0.5) * 16;
          const distFromCenter = Math.hypot(bx, bz);

          // Keep central tactical command area clear
          if (distFromCenter < 120 || distFromCenter > 520) continue;

          // Road corridors gap
          if ((Math.abs(ix) % 2 === 0 && Math.abs(iz) % 2 === 0) || rng(seed++) < 0.2) continue;

          const w = 28 + rng(seed++) * 24;
          const d = 28 + rng(seed++) * 24;
          // Taller in core business district (up to 140m), tapering outward
          const heightFactor = Math.max(0.35, 1.0 - distFromCenter / 580);
          const h = 30 + rng(seed++) * 110 * heightFactor;

          const color = buildingColors[Math.floor(rng(seed++) * buildingColors.length)];
          const windowColor = windowTints[Math.floor(rng(seed++) * windowTints.length)];
          const roofColor = rng(seed++) > 0.5 ? '#2A2E35' : '#1F242B';

          buildings.push({
            pos: [bx, h / 2, bz],
            size: [w, h, d],
            color,
            windowColor,
            roofColor,
            type: h > 85 ? 'skyscraper' : h > 50 ? 'commercial' : 'residential',
            hasHelipad: h > 90 && rng(seed++) > 0.6,
            hasAntenna: h > 70 && rng(seed++) > 0.4,
          });
        }
      }

      // Street trees lining avenues
      const avenueTrees: Array<[number, number, number]> = [];
      for (let i = 0; i < 48; i++) {
        const ang = rng(seed++) * Math.PI * 2;
        const rad = 130 + rng(seed++) * 360;
        avenueTrees.push([Math.cos(ang) * rad, 0, Math.sin(ang) * rad]);
      }

      return { type: 'urban', buildings, avenueTrees };
    }

    // =========================================================================
    // 2. RURAL FARMLAND & ROLLING COUNTRYSIDE DATA
    // =========================================================================
    if (environmentType === 'rural') {
      let seed = 101;
      const trees: Array<{ pos: [number, number, number]; scale: number; isPine: boolean }> = [];
      for (let i = 0; i < (graphicsQuality === 'low' ? 35 : 75); i++) {
        const ang = rng(seed++) * Math.PI * 2;
        const dist = 120 + rng(seed++) * 400;
        trees.push({
          pos: [Math.cos(ang) * dist, 0, Math.sin(ang) * dist],
          scale: 0.9 + rng(seed++) * 0.9,
          isPine: rng(seed++) > 0.45,
        });
      }

      // Farm structures (Barns, Silos, Farmhouse)
      const structures = [
        { pos: [-190, 0, 150] as [number, number, number], type: 'barn' },
        { pos: [-230, 0, 165] as [number, number, number], type: 'silo' },
        { pos: [-245, 0, 155] as [number, number, number], type: 'silo' },
        { pos: [210, 0, -170] as [number, number, number], type: 'farmhouse' },
        { pos: [250, 0, -150] as [number, number, number], type: 'barn' },
      ];

      return { type: 'rural', trees, structures };
    }

    // =========================================================================
    // 3. COASTAL SHORELINE & MARITIME DATA
    // =========================================================================
    if (environmentType === 'coastal') {
      let seed = 303;
      const coastalRocks: Array<{ pos: [number, number, number]; size: [number, number, number]; rot: number }> = [];
      for (let i = 0; i < 30; i++) {
        const rx = 135 + rng(seed++) * 180;
        const rz = (rng(seed++) - 0.5) * 700;
        coastalRocks.push({
          pos: [rx, 3 + rng(seed++) * 8, rz],
          size: [14 + rng(seed++) * 18, 9 + rng(seed++) * 14, 14 + rng(seed++) * 18],
          rot: rng(seed++) * Math.PI,
        });
      }

      const coastalTrees: Array<[number, number, number]> = [];
      for (let i = 0; i < 38; i++) {
        const tx = -60 - rng(seed++) * 380;
        const tz = (rng(seed++) - 0.5) * 750;
        coastalTrees.push([tx, 0, tz]);
      }

      return { type: 'coastal', coastalRocks, coastalTrees };
    }

    // =========================================================================
    // 4. BORDER CANYON & MILITARY OUTPOST DATA
    // =========================================================================
    let seed = 505;
    const canyonMesas: Array<{ pos: [number, number, number]; size: [number, number, number] }> = [];
    for (let i = 0; i < 32; i++) {
      const ang = rng(seed++) * Math.PI * 2;
      const dist = 170 + rng(seed++) * 360;
      canyonMesas.push({
        pos: [Math.cos(ang) * dist, 12 + rng(seed++) * 20, Math.sin(ang) * dist],
        size: [35 + rng(seed++) * 55, 24 + rng(seed++) * 40, 35 + rng(seed++) * 55],
      });
    }

    const watchtowers = [
      [150, 0, 150] as [number, number, number],
      [-150, 0, 150] as [number, number, number],
      [150, 0, -150] as [number, number, number],
      [-150, 0, -150] as [number, number, number],
    ];

    return { type: 'border', canyonMesas, watchtowers };
  }, [environmentType, graphicsQuality]);

  const urbanFeatures = features.type === 'urban' ? (features as UrbanFeatures) : null;
  const ruralFeatures = features.type === 'rural' ? (features as RuralFeatures) : null;
  const coastalFeatures = features.type === 'coastal' ? (features as CoastalFeatures) : null;
  const borderFeatures = features.type === 'border' ? (features as BorderFeatures) : null;

  return (
    <group>
      {/* ========================================================================= */}
      {/* 0. SEAMLESS HORIZON BASE (Prevents isolated floating platform appearance)  */}
      {/* ========================================================================= */}
      {/* Endless ground disc extending 8000 units to the horizon */}
      <mesh position={[0, -1.2, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[8000, 8000]} />
        <meshStandardMaterial
          color={
            environmentType === 'urban'
              ? '#2A2E35'
              : environmentType === 'rural'
              ? '#3E5B28'
              : environmentType === 'coastal'
              ? '#3D542E'
              : '#6E5D47'
          }
          roughness={0.96}
          metalness={0.04}
        />
      </mesh>

      {/* Distant Rolling Horizon Hills (Silhouette ring around battlefield perimeter) */}
      <group position={[0, -2, 0]}>
        {[0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330].map((deg, idx) => {
          const rad = (deg * Math.PI) / 180;
          const dist = 1800 + (idx % 3) * 200;
          const px = Math.cos(rad) * dist;
          const pz = Math.sin(rad) * dist;
          const hillH = 90 + (idx % 4) * 55;
          const hillW = 420 + (idx % 2) * 160;
          return (
            <mesh key={`horizon-hill-${idx}`} position={[px, hillH / 2 - 10, pz]}>
              <coneGeometry args={[hillW, hillH, 12]} />
              <meshStandardMaterial
                color={
                  environmentType === 'urban'
                    ? '#383E48'
                    : environmentType === 'rural'
                    ? '#344D24'
                    : environmentType === 'coastal'
                    ? '#2E4426'
                    : '#5C4A35'
                }
                roughness={0.98}
              />
            </mesh>
          );
        })}
      </group>

      {/* ========================================================================= */}
      {/* 1. URBAN ENVIRONMENT PRESET                                              */}
      {/* ========================================================================= */}
      {environmentType === 'urban' && (
        <group>
          {/* Main Urban Ground Plane: Paved Asphalt Fabric */}
          <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[1600, 1600]} />
            <meshStandardMaterial color="#2B3038" roughness={0.88} metalness={0.12} />
          </mesh>

          {/* Road Network Grid (Avenues with White & Yellow Markings) */}
          {[-260, -130, 130, 260].map((coord, i) => (
            <group key={`road-${i}`}>
              {/* East-West Asphalt Boulevard */}
              <mesh position={[0, -0.4, coord]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[1580, 26]} />
                <meshStandardMaterial color="#22252A" roughness={0.9} />
              </mesh>
              {/* Center Yellow Double Lines */}
              <mesh position={[0, -0.34, coord]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[1560, 0.8]} />
                <meshBasicMaterial color="#FBBF24" opacity={0.8} transparent />
              </mesh>
              {/* North-South Asphalt Boulevard */}
              <mesh position={[coord, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[26, 1580]} />
                <meshStandardMaterial color="#22252A" roughness={0.9} />
              </mesh>
              {/* North-South Center Yellow Double Lines */}
              <mesh position={[coord, -0.34, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[0.8, 1560]} />
                <meshBasicMaterial color="#FBBF24" opacity={0.8} transparent />
              </mesh>
            </group>
          ))}

          {/* City Green Parks / Lawn Plazas */}
          {[
            [-180, -0.45, -180],
            [180, -0.45, 180],
            [-180, -0.45, 180],
            [180, -0.45, -180],
          ].map((pos, i) => (
            <group key={`park-${i}`} position={pos as [number, number, number]}>
              <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[95, 95]} />
                <meshStandardMaterial color="#355E28" roughness={0.95} />
              </mesh>
              {/* Park Center Fountain Pool */}
              <mesh position={[0, 0.4, 0]}>
                <cylinderGeometry args={[14, 15, 1.2, 16]} />
                <meshStandardMaterial color="#64748B" roughness={0.4} />
              </mesh>
              <mesh position={[0, 0.9, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[12, 16]} />
                <meshStandardMaterial color="#0284C7" roughness={0.1} metalness={0.8} />
              </mesh>
            </group>
          ))}

          {/* Procedural Buildings */}
          {urbanFeatures &&
            urbanFeatures.buildings.map((b, i) => (
              <group key={`bldg-${i}`} position={b.pos}>
                {/* Main Building Body */}
                <mesh castShadow receiveShadow>
                  <boxGeometry args={b.size} />
                  <meshStandardMaterial color={b.color} roughness={0.5} metalness={0.25} />
                </mesh>

                {/* Glazed Window Accent Panels */}
                <mesh position={[0, 0, b.size[2] / 2 + 0.1]}>
                  <planeGeometry args={[b.size[0] * 0.85, b.size[1] * 0.88]} />
                  <meshStandardMaterial
                    color={b.windowColor}
                    roughness={0.15}
                    metalness={0.7}
                    opacity={0.85}
                    transparent
                  />
                </mesh>
                <mesh position={[0, 0, -b.size[2] / 2 - 0.1]} rotation={[0, Math.PI, 0]}>
                  <planeGeometry args={[b.size[0] * 0.85, b.size[1] * 0.88]} />
                  <meshStandardMaterial
                    color={b.windowColor}
                    roughness={0.15}
                    metalness={0.7}
                    opacity={0.85}
                    transparent
                  />
                </mesh>

                {/* Rooftop Parapet Border */}
                <mesh position={[0, b.size[1] / 2 + 0.8, 0]}>
                  <boxGeometry args={[b.size[0] * 0.96, 1.6, b.size[2] * 0.96]} />
                  <meshStandardMaterial color={b.roofColor} roughness={0.8} />
                </mesh>

                {/* Rooftop HVAC Mechanical Box */}
                <mesh position={[b.size[0] * 0.2, b.size[1] / 2 + 3.0, b.size[2] * 0.2]} castShadow>
                  <boxGeometry args={[b.size[0] * 0.35, 4.5, b.size[2] * 0.35]} />
                  <meshStandardMaterial color="#4B5563" roughness={0.6} metalness={0.4} />
                </mesh>

                {/* Helipad Marking on tall skyscrapers */}
                {b.hasHelipad && (
                  <group position={[0, b.size[1] / 2 + 0.9, 0]}>
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                      <circleGeometry args={[10, 24]} />
                      <meshBasicMaterial color="#1E293B" />
                    </mesh>
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                      <ringGeometry args={[8.5, 9.5, 24]} />
                      <meshBasicMaterial color="#FBBF24" />
                    </mesh>
                  </group>
                )}

                {/* Rooftop Telecommunication Mast */}
                {b.hasAntenna && (
                  <mesh position={[0, b.size[1] / 2 + 12, 0]} castShadow>
                    <cylinderGeometry args={[0.3, 0.8, 22, 6]} />
                    <meshStandardMaterial color="#DC2626" roughness={0.3} metalness={0.8} />
                  </mesh>
                )}
              </group>
            ))}

          {/* Avenue Trees */}
          {urbanFeatures &&
            urbanFeatures.avenueTrees.map((pos, idx) => (
              <group key={`utree-${idx}`} position={pos}>
                {/* Trunk */}
                <mesh position={[0, 4, 0]} castShadow>
                  <cylinderGeometry args={[0.5, 0.7, 8, 8]} />
                  <meshStandardMaterial color="#543D28" roughness={0.9} />
                </mesh>
                {/* Foliage Canopy */}
                <mesh position={[0, 9, 0]} castShadow>
                  <sphereGeometry args={[4.5, 10, 10]} />
                  <meshStandardMaterial color="#2E6930" roughness={0.9} />
                </mesh>
              </group>
            ))}
        </group>
      )}

      {/* ========================================================================= */}
      {/* 2. RURAL FARMLAND PRESET                                                 */}
      {/* ========================================================================= */}
      {environmentType === 'rural' && (
        <group>
          {/* Main Rolling Meadow Terrain */}
          <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[1600, 1600]} />
            <meshStandardMaterial color="#4A7538" roughness={0.92} metalness={0.05} />
          </mesh>

          {/* Agricultural Patchwork Crop Fields */}
          {[
            { pos: [-240, -0.45, -200], size: [240, 200], color: '#C6A752' }, // Golden Wheat field
            { pos: [220, -0.45, -220], size: [250, 200], color: '#3A682D' },  // Lush green pasture
            { pos: [-220, -0.45, 200], size: [210, 220], color: '#563E26' },  // Plowed dark brown loam
            { pos: [240, -0.45, 180], size: [220, 180], color: '#889842' },   // Hay / alfalfa field
            { pos: [0, -0.45, 320], size: [360, 160], color: '#B39446' },     // Barley field
            { pos: [0, -0.45, -320], size: [360, 160], color: '#446E33' },    // Orchard / vineyard
          ].map((field, idx) => (
            <mesh key={`field-${idx}`} position={field.pos as [number, number, number]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
              <planeGeometry args={field.size as [number, number]} />
              <meshStandardMaterial color={field.color} roughness={0.96} />
            </mesh>
          ))}

          {/* Country Dirt & Gravel Roads */}
          <mesh position={[0, -0.38, 0]} rotation={[-Math.PI / 2, 0, Math.PI / 6]} receiveShadow>
            <planeGeometry args={[14, 1500]} />
            <meshStandardMaterial color="#887258" roughness={0.98} />
          </mesh>
          <mesh position={[0, -0.38, 0]} rotation={[-Math.PI / 2, 0, -Math.PI / 4]} receiveShadow>
            <planeGeometry args={[12, 1500]} />
            <meshStandardMaterial color="#887258" roughness={0.98} />
          </mesh>

          {/* Rural Country Stream / Pond */}
          <group position={[80, -0.3, 40]}>
            <mesh rotation={[-Math.PI / 2, 0, 0]}>
              <circleGeometry args={[45, 32]} />
              <meshStandardMaterial color="#1E3A5F" roughness={0.15} metalness={0.7} />
            </mesh>
          </group>

          {/* Farm Structures (Barns, Silos, Farmhouse) */}
          {ruralFeatures &&
            ruralFeatures.structures.map((s, idx) => (
              <group key={`struct-${idx}`} position={s.pos}>
                {s.type === 'barn' ? (
                  <group>
                    {/* Red Barn Body */}
                    <mesh position={[0, 9, 0]} castShadow receiveShadow>
                      <boxGeometry args={[28, 18, 42]} />
                      <meshStandardMaterial color="#8B1E1E" roughness={0.7} />
                    </mesh>
                    {/* Pitched Roof */}
                    <mesh position={[0, 20.5, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
                      <boxGeometry args={[22, 22, 44]} />
                      <meshStandardMaterial color="#FFFFFF" roughness={0.5} />
                    </mesh>
                  </group>
                ) : s.type === 'silo' ? (
                  <group>
                    {/* Corrugated Metal Silo Cylinder */}
                    <mesh position={[0, 16, 0]} castShadow>
                      <cylinderGeometry args={[6, 6, 32, 16]} />
                      <meshStandardMaterial color="#94A3B8" roughness={0.35} metalness={0.75} />
                    </mesh>
                    {/* Silo Dome Roof */}
                    <mesh position={[0, 34, 0]} castShadow>
                      <sphereGeometry args={[6, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                      <meshStandardMaterial color="#94A3B8" roughness={0.3} metalness={0.8} />
                    </mesh>
                  </group>
                ) : (
                  <group>
                    {/* Farmhouse Body */}
                    <mesh position={[0, 7, 0]} castShadow receiveShadow>
                      <boxGeometry args={[22, 14, 26]} />
                      <meshStandardMaterial color="#E2E8F0" roughness={0.6} />
                    </mesh>
                    {/* House Roof */}
                    <mesh position={[0, 16, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
                      <boxGeometry args={[18, 18, 28]} />
                      <meshStandardMaterial color="#475569" roughness={0.5} />
                    </mesh>
                  </group>
                )}
              </group>
            ))}

          {/* Natural Rural Trees (Pine & Deciduous) */}
          {ruralFeatures &&
            ruralFeatures.trees.map((t, idx) => (
              <group key={`rtree-${idx}`} position={t.pos} scale={[t.scale, t.scale, t.scale]}>
                {t.isPine ? (
                  <group>
                    {/* Pine Trunk */}
                    <mesh position={[0, 4, 0]} castShadow>
                      <cylinderGeometry args={[0.5, 0.8, 8, 8]} />
                      <meshStandardMaterial color="#3E2723" roughness={0.9} />
                    </mesh>
                    {/* 3 Tiered Pine Needle Cones */}
                    <mesh position={[0, 10, 0]} castShadow>
                      <coneGeometry args={[5.5, 9, 8]} />
                      <meshStandardMaterial color="#1B4D2E" roughness={0.85} />
                    </mesh>
                    <mesh position={[0, 16, 0]} castShadow>
                      <coneGeometry args={[4.2, 8, 8]} />
                      <meshStandardMaterial color="#215A36" roughness={0.85} />
                    </mesh>
                    <mesh position={[0, 21, 0]} castShadow>
                      <coneGeometry args={[2.8, 6, 8]} />
                      <meshStandardMaterial color="#28693F" roughness={0.85} />
                    </mesh>
                  </group>
                ) : (
                  <group>
                    {/* Deciduous Oak Trunk */}
                    <mesh position={[0, 5, 0]} castShadow>
                      <cylinderGeometry args={[0.7, 1.1, 10, 8]} />
                      <meshStandardMaterial color="#4E342E" roughness={0.9} />
                    </mesh>
                    {/* Rounded Leaf Canopy */}
                    <mesh position={[0, 12, 0]} castShadow>
                      <sphereGeometry args={[6.5, 12, 12]} />
                      <meshStandardMaterial color="#3B7A38" roughness={0.9} />
                    </mesh>
                  </group>
                )}
              </group>
            ))}
        </group>
      )}

      {/* ========================================================================= */}
      {/* 3. COASTAL SHORELINE PRESET                                              */}
      {/* ========================================================================= */}
      {environmentType === 'coastal' && (
        <group>
          {/* Western Land Mass / Coastal Greenery */}
          <mesh position={[-380, -0.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[800, 1600]} />
            <meshStandardMaterial color="#4F793B" roughness={0.92} />
          </mesh>

          {/* Sandy Beach Shoreline Strip */}
          <mesh position={[45, -0.45, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[130, 1600]} />
            <meshStandardMaterial color="#DFC9A0" roughness={0.88} />
          </mesh>

          {/* Wet Sand Tide Zone (Dark glistening sand) */}
          <mesh position={[115, -0.42, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[28, 1600]} />
            <meshStandardMaterial color="#998363" roughness={0.35} metalness={0.25} />
          </mesh>

          {/* Realistic Ocean Water Body (Eastern Half) */}
          <mesh ref={waterRef} position={[450, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <planeGeometry args={[760, 1600]} />
            <meshStandardMaterial
              color="#134E6F"
              roughness={0.1}
              metalness={0.8}
              opacity={0.9}
              transparent
            />
          </mesh>

          {/* Wooden Harbor Boat Dock / Pier extending into Ocean */}
          <group position={[120, 2.8, 80]}>
            <mesh castShadow receiveShadow>
              <boxGeometry args={[160, 2.8, 18]} />
              <meshStandardMaterial color="#5C452D" roughness={0.85} />
            </mesh>
            {/* Dock Support Pilings */}
            {[-60, -20, 20, 60].map((px, i) => (
              <group key={`pile-${i}`} position={[px, -4.5, 0]}>
                <mesh position={[0, 0, 7]} castShadow>
                  <cylinderGeometry args={[0.9, 0.9, 12, 8]} />
                  <meshStandardMaterial color="#3D2E1E" roughness={0.9} />
                </mesh>
                <mesh position={[0, 0, -7]} castShadow>
                  <cylinderGeometry args={[0.9, 0.9, 12, 8]} />
                  <meshStandardMaterial color="#3D2E1E" roughness={0.9} />
                </mesh>
              </group>
            ))}
          </group>

          {/* Maritime Coastal Lighthouse on Rocky Promontory */}
          <group position={[280, 0, -140]}>
            {/* Rocky Foundation Base */}
            <mesh position={[0, 8, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[26, 32, 16, 12]} />
              <meshStandardMaterial color="#4A5568" roughness={0.95} />
            </mesh>
            {/* Lighthouse Tapered Tower */}
            <mesh position={[0, 42, 0]} castShadow>
              <cylinderGeometry args={[5, 9, 52, 16]} />
              <meshStandardMaterial color="#FFFFFF" roughness={0.4} />
            </mesh>
            {/* Red Lantern Gallery Ring */}
            <mesh position={[0, 69, 0]} castShadow>
              <cylinderGeometry args={[6.5, 6.5, 3.5, 16]} />
              <meshStandardMaterial color="#DC2626" roughness={0.3} />
            </mesh>
            {/* Glass Lantern Housing */}
            <mesh position={[0, 73, 0]}>
              <cylinderGeometry args={[5, 5, 5, 12]} />
              <meshStandardMaterial color="#FBBF24" roughness={0.1} metalness={0.9} />
            </mesh>
            {/* Rotating Spotlight Beam */}
            <spotLight
              ref={lighthouseBeamRef}
              position={[0, 73, 0]}
              intensity={4.5}
              angle={0.4}
              penumbra={0.3}
              color="#FEF08A"
              distance={800}
            />
          </group>

          {/* Coastal Granite Rocks */}
          {coastalFeatures &&
            coastalFeatures.coastalRocks.map((r, idx) => (
              <mesh
                key={`crock-${idx}`}
                position={r.pos}
                rotation={[0, r.rot, 0]}
                castShadow
                receiveShadow
              >
                <boxGeometry args={r.size} />
                <meshStandardMaterial color="#64748B" roughness={0.92} />
              </mesh>
            ))}

          {/* Coastal Trees */}
          {coastalFeatures &&
            coastalFeatures.coastalTrees.map((pos, idx) => (
              <group key={`ctree-${idx}`} position={pos}>
                <mesh position={[0, 4, 0]} castShadow>
                  <cylinderGeometry args={[0.5, 0.8, 8, 8]} />
                  <meshStandardMaterial color="#4E342E" roughness={0.9} />
                </mesh>
                <mesh position={[0, 9, 0]} castShadow>
                  <sphereGeometry args={[4.5, 10, 10]} />
                  <meshStandardMaterial color="#2E6930" roughness={0.9} />
                </mesh>
              </group>
            ))}
        </group>
      )}

      {/* ========================================================================= */}
      {/* 4. BORDER / DESERT OUTPOST PRESET                                        */}
      {/* ========================================================================= */}
      {environmentType === 'border' && (
        <group>
          {/* Main Arid Sandstone Ground Plane */}
          <mesh position={[0, -0.6, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[1600, 1600]} />
            <meshStandardMaterial color="#8C7355" roughness={0.95} metalness={0.05} />
          </mesh>

          {/* Central Forward Operating Base (FOB) Pad */}
          <mesh position={[0, -0.4, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
            <planeGeometry args={[280, 280]} />
            <meshStandardMaterial color="#4A5243" roughness={0.85} />
          </mesh>

          {/* Security Perimeter Fence Outline */}
          <lineSegments position={[0, 4, 0]}>
            <edgesGeometry args={[new THREE.BoxGeometry(276, 8, 276)]} />
            <lineBasicMaterial color="#94A3B8" opacity={0.6} transparent />
          </lineSegments>

          {/* Central Tactical Airspace Radar Radome */}
          <group position={[0, 0, 0]}>
            {/* Concrete Pedestal */}
            <mesh position={[0, 4, 0]} castShadow receiveShadow>
              <cylinderGeometry args={[14, 16, 8, 16]} />
              <meshStandardMaterial color="#334155" roughness={0.8} />
            </mesh>
            {/* White Surveillance Dome */}
            <mesh position={[0, 16, 0]} castShadow>
              <sphereGeometry args={[12, 24, 24]} />
              <meshStandardMaterial color="#F8FAFC" roughness={0.3} metalness={0.2} />
            </mesh>
            {/* Rotating Radar Feed Horn Array */}
            <group ref={radarDishRef} position={[0, 28, 0]}>
              <mesh position={[0, 3, 0]} rotation={[0.3, 0, 0]}>
                <boxGeometry args={[18, 5, 1.5]} />
                <meshStandardMaterial color="#00E5FF" roughness={0.2} metalness={0.8} />
              </mesh>
            </group>
          </group>

          {/* Military Conex Containers & Modular Headquarters Bunkers */}
          {[
            { pos: [-55, 4.5, -45], size: [24, 9, 12], color: '#4B5541' },
            { pos: [-55, 4.5, -30], size: [24, 9, 12], color: '#685D45' },
            { pos: [55, 4.5, -45], size: [24, 9, 12], color: '#685D45' },
            { pos: [-40, 5.5, 55], size: [30, 11, 16], color: '#3F4839' },
            { pos: [40, 5.5, 55], size: [30, 11, 16], color: '#545D4B' },
          ].map((c, i) => (
            <mesh key={`bunker-${i}`} position={c.pos as [number, number, number]} castShadow receiveShadow>
              <boxGeometry args={c.size as [number, number, number]} />
              <meshStandardMaterial color={c.color} roughness={0.7} metalness={0.2} />
            </mesh>
          ))}

          {/* Watchtowers at 4 Corners of Perimeter */}
          {borderFeatures &&
            borderFeatures.watchtowers.map((pos, idx) => (
              <group key={`tower-${idx}`} position={pos}>
                {/* 4 Leg Struts */}
                <mesh position={[0, 14, 0]} castShadow>
                  <cylinderGeometry args={[2.5, 4.5, 28, 4]} />
                  <meshStandardMaterial color="#1E293B" metalness={0.8} />
                </mesh>
                {/* Lookout Cabin */}
                <mesh position={[0, 29, 0]} castShadow>
                  <boxGeometry args={[10, 6, 10]} />
                  <meshStandardMaterial color="#475569" roughness={0.5} />
                </mesh>
                {/* Roof */}
                <mesh position={[0, 33, 0]} castShadow>
                  <boxGeometry args={[12, 1.5, 12]} />
                  <meshStandardMaterial color="#0F172A" />
                </mesh>
              </group>
            ))}

          {/* Arid Canyon Mesas & Rocky Outcrops */}
          {borderFeatures &&
            borderFeatures.canyonMesas.map((m, idx) => (
              <mesh key={`mesa-${idx}`} position={m.pos} castShadow receiveShadow>
                <boxGeometry args={m.size} />
                <meshStandardMaterial color="#947A5A" roughness={0.96} />
              </mesh>
            ))}
        </group>
      )}

      {/* ========================================================================= */}
      {/* 5. TACTICAL BASE DEFENSE RANGE RINGS (Semi-transparent reference circles)  */}
      {/* ========================================================================= */}
      <group position={[0, -0.3, 0]}>
        {[
          { r: 1000 * scaleFactor, label: '1km' },
          { r: 2000 * scaleFactor, label: '2km' },
          { r: 3000 * scaleFactor, label: '3km' },
          { r: 4000 * scaleFactor, label: '4km' },
        ].map(({ r }, idx) => (
          <mesh key={`range-ring-${idx}`} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[r - 0.6, r + 0.6, 64]} />
            <meshBasicMaterial color="#00E5FF" opacity={0.22} transparent side={THREE.DoubleSide} />
          </mesh>
        ))}
      </group>
    </group>
  );
};
