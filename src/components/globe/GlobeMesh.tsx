// GlobeMesh - Solid sphere with grid lines and country-like regions

import { useRef, useMemo } from 'react';
import { Mesh, LineSegments, BufferGeometry, Float32BufferAttribute, LineBasicMaterial, Color } from 'three';
import { useFrame } from '@react-three/fiber';

interface GlobeMeshProps {
  radius?: number;
  gridColor?: string;
  surfaceColor?: string;
}

export function GlobeMesh({ 
  radius = 2, 
  gridColor = '#00e5ff',
  surfaceColor = '#0a1525'
}: GlobeMeshProps) {
  const globeRef = useRef<Mesh>(null);
  const gridRef = useRef<LineSegments>(null);
  const outlineRef = useRef<LineSegments>(null);

  // Create latitude/longitude grid lines
  const gridGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    const positions: number[] = [];
    const segments = 64;

    // Latitude lines (horizontal circles)
    for (let lat = -60; lat <= 60; lat += 20) {
      const phi = (90 - lat) * (Math.PI / 180);
      const r = radius * 1.002; // Slightly above surface
      for (let i = 0; i <= segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);
        
        if (i > 0) {
          const prevTheta = ((i - 1) / segments) * Math.PI * 2;
          positions.push(
            r * Math.sin(phi) * Math.cos(prevTheta),
            r * Math.cos(phi),
            r * Math.sin(phi) * Math.sin(prevTheta),
            x, y, z
          );
        }
      }
    }

    // Longitude lines (vertical half-circles)
    for (let lon = 0; lon < 360; lon += 20) {
      const theta = lon * (Math.PI / 180);
      const r = radius * 1.002;
      for (let i = 0; i <= segments; i++) {
        const phi = (i / segments) * Math.PI;
        const x = r * Math.sin(phi) * Math.cos(theta);
        const y = r * Math.cos(phi);
        const z = r * Math.sin(phi) * Math.sin(theta);
        
        if (i > 0) {
          const prevPhi = ((i - 1) / segments) * Math.PI;
          positions.push(
            r * Math.sin(prevPhi) * Math.cos(theta),
            r * Math.cos(prevPhi),
            r * Math.sin(prevPhi) * Math.sin(theta),
            x, y, z
          );
        }
      }
    }

    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return geometry;
  }, [radius]);

  // Create stylized "continent" outlines (simplified polygonal shapes)
  const outlineGeometry = useMemo(() => {
    const geometry = new BufferGeometry();
    const positions: number[] = [];
    const r = radius * 1.003;

    // Helper to add a line segment
    const addLine = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const phi1 = (90 - lat1) * (Math.PI / 180);
      const theta1 = (lon1 + 180) * (Math.PI / 180);
      const phi2 = (90 - lat2) * (Math.PI / 180);
      const theta2 = (lon2 + 180) * (Math.PI / 180);
      
      positions.push(
        -r * Math.sin(phi1) * Math.cos(theta1),
        r * Math.cos(phi1),
        r * Math.sin(phi1) * Math.sin(theta1),
        -r * Math.sin(phi2) * Math.cos(theta2),
        r * Math.cos(phi2),
        r * Math.sin(phi2) * Math.sin(theta2)
      );
    };

    // Simplified North America outline
    const northAmerica = [
      [70, -170], [65, -140], [60, -140], [55, -130], [50, -125],
      [45, -125], [35, -120], [30, -115], [25, -110], [20, -105],
      [15, -95], [20, -90], [25, -80], [30, -80], [35, -75],
      [40, -75], [45, -70], [45, -65], [50, -60], [55, -60],
      [60, -65], [65, -70], [70, -80], [75, -95], [70, -170]
    ];

    // Simplified South America outline
    const southAmerica = [
      [10, -75], [5, -80], [0, -80], [-5, -80], [-10, -75],
      [-15, -75], [-20, -70], [-25, -65], [-35, -70], [-45, -75],
      [-55, -70], [-55, -65], [-45, -65], [-35, -55], [-25, -45],
      [-15, -40], [-5, -35], [0, -50], [5, -60], [10, -75]
    ];

    // Simplified Europe outline
    const europe = [
      [70, 25], [65, 30], [60, 30], [55, 20], [50, 5],
      [45, -5], [40, -10], [35, -5], [35, 25], [40, 30],
      [45, 30], [50, 40], [55, 50], [60, 45], [65, 40], [70, 25]
    ];

    // Simplified Africa outline
    const africa = [
      [35, -5], [30, -10], [25, -15], [20, -15], [15, -20],
      [10, -15], [5, -5], [0, 10], [-5, 15], [-10, 20],
      [-20, 25], [-30, 30], [-35, 20], [-35, 15], [-25, 15],
      [-15, 30], [-5, 40], [5, 50], [15, 50], [25, 35],
      [30, 30], [35, 35], [35, -5]
    ];

    // Simplified Asia outline
    const asia = [
      [70, 180], [70, 140], [65, 100], [60, 80], [55, 50],
      [50, 40], [45, 40], [40, 50], [35, 70], [30, 80],
      [25, 90], [20, 100], [10, 105], [5, 100], [0, 105],
      [-5, 110], [0, 130], [10, 140], [20, 140], [30, 130],
      [40, 140], [50, 140], [55, 155], [60, 170], [65, 180], [70, 180]
    ];

    // Simplified Australia outline
    const australia = [
      [-15, 130], [-20, 115], [-25, 115], [-30, 130], [-35, 140],
      [-40, 145], [-40, 150], [-35, 155], [-30, 155], [-25, 150],
      [-20, 145], [-15, 140], [-12, 135], [-15, 130]
    ];

    // Draw continent outlines
    [northAmerica, southAmerica, europe, africa, asia, australia].forEach(continent => {
      for (let i = 0; i < continent.length - 1; i++) {
        addLine(continent[i][0], continent[i][1], continent[i + 1][0], continent[i + 1][1]);
      }
    });

    geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
    return geometry;
  }, [radius]);

  // Slow auto-rotation
  useFrame((_, delta) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += delta * 0.015;
    }
    if (gridRef.current) {
      gridRef.current.rotation.y += delta * 0.015;
    }
    if (outlineRef.current) {
      outlineRef.current.rotation.y += delta * 0.015;
    }
  });

  const gridMaterial = useMemo(() => 
    new LineBasicMaterial({ 
      color: new Color(gridColor).multiplyScalar(0.3), 
      transparent: true, 
      opacity: 0.4
    }), [gridColor]);

  const outlineMaterial = useMemo(() => 
    new LineBasicMaterial({ 
      color: new Color(gridColor), 
      transparent: true, 
      opacity: 0.7,
      linewidth: 2
    }), [gridColor]);

  return (
    <group>
      {/* Solid dark sphere - the actual globe surface */}
      <mesh ref={globeRef}>
        <sphereGeometry args={[radius, 64, 48]} />
        <meshStandardMaterial 
          color={surfaceColor}
          roughness={0.9}
          metalness={0.1}
        />
      </mesh>
      
      {/* Atmosphere glow layer */}
      <mesh>
        <sphereGeometry args={[radius * 1.02, 48, 32]} />
        <meshBasicMaterial
          color="#00e5ff"
          transparent
          opacity={0.03}
          depthWrite={false}
        />
      </mesh>

      {/* Grid lines */}
      <lineSegments ref={gridRef} geometry={gridGeometry} material={gridMaterial} />
      
      {/* Continent outlines */}
      <lineSegments ref={outlineRef} geometry={outlineGeometry} material={outlineMaterial} />
    </group>
  );
}
