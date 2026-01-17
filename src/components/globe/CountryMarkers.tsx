// CountryMarkers - Activity dots on the globe

import { useMemo, useRef } from 'react';
import { InstancedMesh, Object3D, Color, Vector3 } from 'three';
import { useFrame, ThreeEvent } from '@react-three/fiber';
import type { CountryActivity, Country } from '@/types/globe';
import { getMarkerVisualConfig } from '@/types/globe';
import type { GlobeTheme } from '@/lib/themes';

interface CountryMarkersProps {
  countries: Country[];
  activities: CountryActivity[];
  radius?: number;
  theme: GlobeTheme;
  onHover?: (country: Country | null, event: ThreeEvent<PointerEvent>) => void;
  onClick?: (country: Country) => void;
}

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
  theme,
  onHover,
  onClick,
}: CountryMarkersProps) {
  const meshRef = useRef<InstancedMesh>(null);
  const glowRef = useRef<InstancedMesh>(null);
  const dummy = useMemo(() => new Object3D(), []);
  const timeRef = useRef(0);

  const activityMap = useMemo(() => {
    const map = new Map<string, CountryActivity>();
    activities.forEach(a => map.set(a.iso2, a));
    return map;
  }, [activities]);

  const { positions, configs } = useMemo(() => {
    const positions: Vector3[] = [];
    const configs: ReturnType<typeof getMarkerVisualConfig>[] = [];

    countries.forEach(country => {
      const activity = activityMap.get(country.iso2);
      const score = activity?.activityScore || 0.1;
      const config = getMarkerVisualConfig(score);
      
      positions.push(latLonToVector3(country.lat, country.lon, radius * 1.012));
      configs.push(config);
    });

    return { positions, configs };
  }, [countries, activityMap, radius]);

  useFrame((_, delta) => {
    if (!meshRef.current || !glowRef.current) return;
    
    timeRef.current += delta;
    
    positions.forEach((pos, i) => {
      const config = configs[i];
      const pulse = Math.sin(timeRef.current * 2 + i * 0.5) * 0.1 + 1;
      
      dummy.position.copy(pos);
      dummy.scale.setScalar(config.size * 1.2 * pulse);
      dummy.updateMatrix();
      meshRef.current!.setMatrixAt(i, dummy.matrix);

      dummy.scale.setScalar(config.glowSize * 1.4 * pulse);
      dummy.updateMatrix();
      glowRef.current!.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
    glowRef.current.instanceMatrix.needsUpdate = true;
  });

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (e.instanceId !== undefined) {
      onHover?.(countries[e.instanceId], e);
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
      <instancedMesh 
        ref={glowRef} 
        args={[undefined, undefined, countries.length]}
      >
        <sphereGeometry args={[1, 8, 6]} />
        <meshBasicMaterial 
          color={theme.markerColor} 
          transparent 
          opacity={0.2}
          depthWrite={false}
        />
      </instancedMesh>

      <instancedMesh
        ref={meshRef}
        args={[undefined, undefined, countries.length]}
        onPointerMove={handlePointerMove}
        onPointerOut={handlePointerOut}
        onClick={handleClick}
      >
        <sphereGeometry args={[1, 12, 8]} />
        <meshBasicMaterial color={theme.markerColor} transparent opacity={0.9} />
      </instancedMesh>
    </group>
  );
}
