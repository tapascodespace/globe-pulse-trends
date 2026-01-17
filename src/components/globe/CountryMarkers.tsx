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
  const dummy = useMemo(() => new Object3D(), []);
  const timeRef = useRef(0);

  // Create activity map for quick lookup
  const activityMap = useMemo(() => {
    const map = new Map<string, CountryActivity>();
    activities.forEach(a => map.set(a.iso2, a));
    return map;
  }, [activities]);

  // Compute positions and colors
  const { positions, colors, configs } = useMemo(() => {
    const positions: Vector3[] = [];
    const colors: Color[] = [];
    const configs: ReturnType<typeof getMarkerVisualConfig>[] = [];

    countries.forEach(country => {
      const activity = activityMap.get(country.iso2);
      const score = activity?.activityScore || 0.1;
      const config = getMarkerVisualConfig(score);
      
      positions.push(latLonToVector3(country.lat, country.lon, radius * 1.01));
      colors.push(new Color('#00e5ff'));
      configs.push(config);
    });

    return { positions, colors, configs };
  }, [countries, activityMap, radius]);

  // Animate markers
  useFrame((_, delta) => {
    if (!meshRef.current || !glowRef.current) return;
    
    timeRef.current += delta;
    
    positions.forEach((pos, i) => {
      const config = configs[i];
      const pulse = Math.sin(timeRef.current * 2 + i * 0.5) * 0.1 + 1;
      
      // Main dot
      dummy.position.copy(pos);
      dummy.scale.setScalar(config.size * pulse);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);
      meshRef.current!.setColorAt(i, colors[i].clone().multiplyScalar(config.opacity));

      // Glow
      dummy.scale.setScalar(config.glowSize * pulse);
      dummy.updateMatrix();
      glowRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    glowRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true;
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
      {/* Glow layer */}
      <instancedMesh 
        ref={glowRef} 
        args={[undefined, undefined, countries.length]}
      >
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial 
          color="#00e5ff" 
          transparent 
          opacity={0.15}
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
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color="#00e5ff" transparent />
      </instancedMesh>
    </group>
  );
}
