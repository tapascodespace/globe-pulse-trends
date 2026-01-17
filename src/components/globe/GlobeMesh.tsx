// GlobeMesh - Wireframe sphere with latitude/longitude grid

import { useRef, useMemo } from 'react';
import { Mesh, LineSegments, BufferGeometry, Float32BufferAttribute, LineBasicMaterial } from 'three';
import { useFrame } from '@react-three/fiber';

interface GlobeMeshProps {
  radius?: number;
  wireframeColor?: string;
  gridColor?: string;
}

export function GlobeMesh({ 
  radius = 2, 
  wireframeColor = '#2a3f5f',
  gridColor = '#1a2535'
}: GlobeMeshProps) {
  const globeRef = useRef<Mesh>(null);
  const gridRef = useRef<LineSegments>(null);

  // Create latitude/longitude grid lines
  const gridGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    const positions: number[] = [];
    const segments = 64;

    // Latitude lines
    for (let lat = -75; lat <= 75; lat += 15) {
      const phi = (90 - lat) * (Math.PI / 180);
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        positions.push(x, y, z);
        
        if (i > 0) {
          const idx = positions.length / 3 - 1;
          positions.push(positions[(idx - 1) * 3], positions[(idx - 1) * 3 + 1], positions[(idx - 1) * 3 + 2]);
          positions.push(x, y, z);
        }
      }
    }

    // Longitude lines
    for (let lon = 0; lon < 360; lon += 15) {
      const theta = lon * (Math.PI / 180);
      for (let i = 0; i <= segments; i++) {
        const phi = (i / segments) * Math.PI;
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.cos(phi);
        const z = radius * Math.sin(phi) * Math.sin(theta);
        positions.push(x, y, z);
        
        if (i > 0) {
          const idx = positions.length / 3 - 1;
          positions.push(positions[(idx - 1) * 3], positions[(idx - 1) * 3 + 1], positions[(idx - 1) * 3 + 2]);
          positions.push(x, y, z);
        }
      }
    }

    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return geometry;
  }, [radius]);

  // Slow auto-rotation
  useFrame((_, delta) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += delta * 0.02;
    }
    if (gridRef.current) {
      gridRef.current.rotation.y += delta * 0.02;
    }
  });

  const gridMaterial = useMemo(() => 
    new LineBasicMaterial({ 
      color: gridColor, 
      transparent: true, 
      opacity: 0.3 
    }), [gridColor]);

  return (
    <group>
      {/* Main wireframe sphere */}
      <mesh ref={globeRef}>
        <sphereGeometry args={[radius, 48, 32]} />
        <meshBasicMaterial 
          color={wireframeColor}
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>
      
      {/* Inner glow sphere */}
      <mesh>
        <sphereGeometry args={[radius * 0.98, 32, 24]} />
        <meshBasicMaterial
          color="#0a1525"
          transparent
          opacity={0.8}
        />
      </mesh>

      {/* Grid lines */}
      <lineSegments ref={gridRef} geometry={gridGeometry} material={gridMaterial} />
    </group>
  );
}
