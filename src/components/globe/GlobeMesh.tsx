// GlobeMesh - Grid-style globe like Snapchat maps with real country borders

import { useRef, useMemo, useEffect, useState } from 'react';
import { BufferGeometry, Float32BufferAttribute, LineBasicMaterial, Color, Group } from 'three';
import { useFrame } from '@react-three/fiber';
import * as topojson from 'topojson-client';
import type { Topology, GeometryCollection } from 'topojson-specification';
import { WORLD_TOPOJSON_URL } from '@/data/worldData';
import type { GlobeTheme } from '@/lib/themes';

interface GlobeMeshProps {
  radius?: number;
  theme: GlobeTheme;
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
    
    if (isNaN(lon1) || isNaN(lat1) || isNaN(lon2) || isNaN(lat2)) continue;
    if (Math.abs(lon2 - lon1) > 90) continue;
    
    const [x1, y1, z1] = latLonTo3D(lat1, lon1, radius);
    const [x2, y2, z2] = latLonTo3D(lat2, lon2, radius);
    
    positions.push(x1, y1, z1, x2, y2, z2);
  }
}

// Create Snapchat-style grid (denser, cleaner grid pattern)
function createSnapchatGrid(radius: number): BufferGeometry {
  const positions: number[] = [];
  const segments = 72;

  // Latitude lines every 15 degrees
  for (let lat = -75; lat <= 75; lat += 15) {
    for (let i = 0; i < segments; i++) {
      const lon1 = (i / segments) * 360 - 180;
      const lon2 = ((i + 1) / segments) * 360 - 180;
      
      const [x1, y1, z1] = latLonTo3D(lat, lon1, radius);
      const [x2, y2, z2] = latLonTo3D(lat, lon2, radius);
      positions.push(x1, y1, z1, x2, y2, z2);
    }
  }

  // Longitude lines every 15 degrees
  for (let lon = -180; lon < 180; lon += 15) {
    for (let i = 0; i < segments; i++) {
      const lat1 = (i / segments) * 180 - 90;
      const lat2 = ((i + 1) / segments) * 180 - 90;
      
      const [x1, y1, z1] = latLonTo3D(lat1, lon, radius);
      const [x2, y2, z2] = latLonTo3D(lat2, lon, radius);
      positions.push(x1, y1, z1, x2, y2, z2);
    }
  }

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return geometry;
}

export function GlobeMesh({ radius = 2, theme }: GlobeMeshProps) {
  const groupRef = useRef<Group>(null);
  const [bordersGeometry, setBordersGeometry] = useState<BufferGeometry | null>(null);

  // Fetch and parse world topology
  useEffect(() => {
    fetch(WORLD_TOPOJSON_URL)
      .then(res => res.json())
      .then((topology: WorldTopology) => {
        const geometry = createCountryBorders(topology, radius * 1.002);
        setBordersGeometry(geometry);
      })
      .catch(err => {
        console.error('Failed to load world data:', err);
      });
  }, [radius]);

  // Create grid
  const gridGeometry = useMemo(() => createSnapchatGrid(radius * 1.001), [radius]);

  // Materials - update based on theme
  const borderMaterial = useMemo(() => 
    new LineBasicMaterial({ 
      color: new Color(theme.borderColor), 
      transparent: true, 
      opacity: 0.9,
    }), [theme.borderColor]);

  const gridMaterial = useMemo(() => 
    new LineBasicMaterial({ 
      color: new Color(theme.gridColor), 
      transparent: true, 
      opacity: theme.id === 'light' ? 0.4 : 0.25
    }), [theme.gridColor, theme.id]);

  // Slow auto-rotation
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.01;
    }
  });

  return (
    <group ref={groupRef}>
      {/* Solid sphere surface */}
      <mesh>
        <sphereGeometry args={[radius, 64, 48]} />
        <meshBasicMaterial color={theme.globeSurface} />
      </mesh>

      {/* Grid lines - Snapchat style */}
      <lineSegments geometry={gridGeometry} material={gridMaterial} />
      
      {/* Country borders */}
      {bordersGeometry && (
        <lineSegments geometry={bordersGeometry} material={borderMaterial} />
      )}
    </group>
  );
}
