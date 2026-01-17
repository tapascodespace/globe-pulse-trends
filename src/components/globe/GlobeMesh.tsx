// GlobeMesh - Solid sphere with real world country borders

import { useRef, useMemo, useEffect, useState } from 'react';
import { Mesh, LineSegments, BufferGeometry, Float32BufferAttribute, LineBasicMaterial, Color, Group } from 'three';
import { useFrame } from '@react-three/fiber';
import * as topojson from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { WORLD_TOPOJSON_URL } from '@/data/worldData';

interface GlobeMeshProps {
  radius?: number;
  borderColor?: string;
  gridColor?: string;
  surfaceColor?: string;
  showGrid?: boolean;
}

interface WorldTopology extends Topology {
  objects: {
    countries: GeometryCollection;
    land: GeometryCollection;
  };
}

// Convert lat/lon to 3D position on sphere
function latLonTo3D(lat: number, lon: number, radius: number): [number, number, number] {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  
  return [
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  ];
}

// Create line geometry from GeoJSON coordinates
function createCountryBorders(
  topology: WorldTopology, 
  radius: number
): BufferGeometry {
  const positions: number[] = [];
  
  // Get country mesh from topology
  const countries = topojson.feature(topology, topology.objects.countries);
  
  if (countries.type === 'FeatureCollection') {
    countries.features.forEach((feature) => {
      const geometry = feature.geometry;
      
      if (geometry.type === 'Polygon') {
        geometry.coordinates.forEach((ring) => {
          addRingToPositions(ring, positions, radius);
        });
      } else if (geometry.type === 'MultiPolygon') {
        geometry.coordinates.forEach((polygon) => {
          polygon.forEach((ring) => {
            addRingToPositions(ring, positions, radius);
          });
        });
      }
    });
  }
  
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return geometry;
}

function addRingToPositions(
  ring: number[][], 
  positions: number[], 
  radius: number
): void {
  for (let i = 0; i < ring.length - 1; i++) {
    const [lon1, lat1] = ring[i];
    const [lon2, lat2] = ring[i + 1];
    
    // Skip if coordinates are invalid
    if (isNaN(lon1) || isNaN(lat1) || isNaN(lon2) || isNaN(lat2)) continue;
    
    // Skip very long lines (crossing dateline artifacts)
    if (Math.abs(lon2 - lon1) > 90) continue;
    
    const [x1, y1, z1] = latLonTo3D(lat1, lon1, radius);
    const [x2, y2, z2] = latLonTo3D(lat2, lon2, radius);
    
    positions.push(x1, y1, z1, x2, y2, z2);
  }
}

// Create graticule (lat/lon grid lines)
function createGraticule(radius: number): BufferGeometry {
  const positions: number[] = [];
  const segments = 60;

  // Latitude lines every 30 degrees
  for (let lat = -60; lat <= 60; lat += 30) {
    for (let i = 0; i <= segments; i++) {
      const lon1 = (i / segments) * 360 - 180;
      const lon2 = ((i + 1) / segments) * 360 - 180;
      
      if (i < segments) {
        const [x1, y1, z1] = latLonTo3D(lat, lon1, radius);
        const [x2, y2, z2] = latLonTo3D(lat, lon2, radius);
        positions.push(x1, y1, z1, x2, y2, z2);
      }
    }
  }

  // Longitude lines every 30 degrees
  for (let lon = -180; lon < 180; lon += 30) {
    for (let i = 0; i <= segments; i++) {
      const lat1 = (i / segments) * 180 - 90;
      const lat2 = ((i + 1) / segments) * 180 - 90;
      
      if (i < segments) {
        const [x1, y1, z1] = latLonTo3D(lat1, lon, radius);
        const [x2, y2, z2] = latLonTo3D(lat2, lon, radius);
        positions.push(x1, y1, z1, x2, y2, z2);
      }
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return geometry;
}

export function GlobeMesh({ 
  radius = 2, 
  borderColor = '#00e5ff',
  gridColor = '#00e5ff',
  surfaceColor = '#0a1220',
  showGrid = true
}: GlobeMeshProps) {
  const groupRef = useRef<Group>(null);
  const [bordersGeometry, setBordersGeometry] = useState<BufferGeometry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch and parse world topology
  useEffect(() => {
    fetch(WORLD_TOPOJSON_URL)
      .then(res => res.json())
      .then((topology: WorldTopology) => {
        const geometry = createCountryBorders(topology, radius * 1.001);
        setBordersGeometry(geometry);
        setIsLoading(false);
      })
      .catch(err => {
        console.error('Failed to load world data:', err);
        setIsLoading(false);
      });
  }, [radius]);

  // Create graticule grid
  const graticuleGeometry = useMemo(() => createGraticule(radius * 1.0005), [radius]);

  // Materials
  const borderMaterial = useMemo(() => 
    new LineBasicMaterial({ 
      color: new Color(borderColor), 
      transparent: true, 
      opacity: 0.85,
    }), [borderColor]);

  const gridMaterial = useMemo(() => 
    new LineBasicMaterial({ 
      color: new Color(gridColor).multiplyScalar(0.25), 
      transparent: true, 
      opacity: 0.3
    }), [gridColor]);

  // Slow auto-rotation
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.012;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Solid dark sphere - the actual globe surface */}
      <mesh>
        <sphereGeometry args={[radius, 64, 48]} />
        <meshStandardMaterial 
          color={surfaceColor}
          roughness={0.95}
          metalness={0.05}
        />
      </mesh>
      
      {/* Ocean color layer */}
      <mesh>
        <sphereGeometry args={[radius * 0.999, 64, 48]} />
        <meshBasicMaterial 
          color="#061018"
        />
      </mesh>
      
      {/* Atmosphere glow */}
      <mesh>
        <sphereGeometry args={[radius * 1.015, 48, 32]} />
        <meshBasicMaterial
          color="#00e5ff"
          transparent
          opacity={0.02}
          depthWrite={false}
        />
      </mesh>

      {/* Graticule grid lines */}
      {showGrid && (
        <lineSegments geometry={graticuleGeometry} material={gridMaterial} />
      )}
      
      {/* Country borders */}
      {bordersGeometry && (
        <lineSegments geometry={bordersGeometry} material={borderMaterial} />
      )}
      
      {/* Loading indicator sphere pulse */}
      {isLoading && (
        <mesh>
          <sphereGeometry args={[radius * 1.01, 32, 24]} />
          <meshBasicMaterial
            color="#00e5ff"
            transparent
            opacity={0.1}
            wireframe
          />
        </mesh>
      )}
    </group>
  );
}
