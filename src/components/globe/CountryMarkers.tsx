// CountryMarkers - Activity dots on the globe

import { useMemo, useRef } from 'react';
import { InstancedMesh, Object3D, Color, Vector3 } from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import type { CountryActivity, Country } from '@/types/globe';
import { getMarkerVisualConfig } from '@/types/globe';

interface CountryMarkersProps {
  countries: Country[];
  activities: CountryActivity[];
  radius?: number;
  onHover?: (country: Country | null, event: ThreeEvent<PointerEvent>) => void;
  onClick?: (country: Country) => void;
}

// Convert lat/lon to 3D position
function latLonToVector3(lat: number, lon: number, radius: number): Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  
  return new Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

export function CountryMarkers({
  countries,
  activities,
  radius = 2,
  onHover,
  onClick,
}: CountryMarkersProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const glowRef = useRef<InstancedMesh>(null);
  const haloRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const timeRef = useRef(0);

  // Create activity map for quick lookup
  const activityMap = useMemo(() => {
    const map = new Map<string, CountryActivity>();
    activities.forEach(a => map.set(a.iso2, a));
    return map;
  }, [activities]);

  // Compute positions and configs
  const { positions, configs } = useMemo(() => {
    const positions: Vector3[] = [];
    const configs: ReturnType<typeof getMarkerVisualConfig>[] = [];

    countries.forEach(country => {
      const activity = activityMap.get(country.iso2);
      const score = activity?.activityScore || 0.1;
      const config = getMarkerVisualConfig(score);
      
      // Position markers slightly above the globe surface
      positions.push(latLonToVector3(country.lat, country.lon, radius * 1.015));
      configs.push(config);
    });

    return { positions, configs };
  }, [countries, activityMap, radius]);

  // Animate markers
  useFrame((_, delta) => {
    if (!meshRef.current || !glowRef.current || !haloRef.current) return;
    
    timeRef.current += delta;
    
    positions.forEach((pos, i) => {
      const config = configs[i];
      const pulse = Math.sin(timeRef.current * 2.5 + i * 0.7) * 0.15 + 1;
      
      // Main dot
      dummy.position.copy(pos);
      dummy.scale.setScalar(config.size * 1.2 * pulse);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      // Glow
      dummy.scale.setScalar(config.glowSize * 1.3 * pulse);
      dummy.updateMatrix();
      glowRef.current!.setMatrixAt(i, dummy.matrix);
      
      // Halo for high activity
      if (config.showHalo) {
        const haloPulse = Math.sin(timeRef.current * 1.5 + i) * 0.3 + 1;
        dummy.scale.setScalar(config.glowSize * 2 * haloPulse);
        dummy.updateMatrix();
        haloRef.current!.setMatrixAt(i, dummy.matrix);
      } else {
        dummy.scale.setScalar(0);
        dummy.updateMatrix();
        haloRef.current!.setMatrixAt(i, dummy.matrix);
      }
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    glowRef.current.instanceMatrix.needsUpdate = true;
    haloRef.current.instanceMatrix.needsUpdate = true;
  });

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (e.instanceId !== undefined) {
      const country = countries[e.instanceId];
      onHover?.(country, e);
    }
  };

  const handlePointerOut = (e: ThreeEvent<PointerEvent>) => {
    onHover?.(null, e);
  };

  const handleClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.instanceId !== undefined) {
      onClick?.(countries[e.instanceId]);
    }
  };

  return (
    <group>
      {/* Outer halo for high activity */}
      <instancedMesh 
        ref={haloRef} 
        args={[undefined, undefined, countries.length]}
      >
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial 
          color="#00e5ff" 
          transparent 
          opacity={0.08}
          depthWrite={false}
        />
      </instancedMesh>

      {/* Glow layer */}
      <instancedMesh 
        ref={glowRef} 
        args={[undefined, undefined, countries.length]}
      >
        <sphereGeometry args={[1, 10, 8]} />
        <meshBasicMaterial 
          color="#00e5ff" 
          transparent 
          opacity={0.25}
          depthWrite={false}
        />
      </instancedMesh>

      {/* Main dots */}
      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, countries.length]}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[1, 16, 12]} />
        <meshBasicMaterial color="#00ffff" transparent opacity={0.95} />
      </instancedMesh>
    </group>
  );
}
