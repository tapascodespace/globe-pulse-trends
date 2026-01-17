// TopicArcs - Great circle arcs between countries

import { useMemo, useRef } from 'react';
import { CubicBezierCurve3, Vector3, BufferGeometry, Line, LineBasicMaterial, Color } from 'three';
import { useFrame } from '@react-three/fiber';
import type { TopicArc } from '@/types/globe';
import { getArcVisualConfig } from '@/types/globe';

interface TopicArcsProps {
  arcs: TopicArc[];
  radius?: number;
  selectedTopicId: string | null;
  maxArcs?: number;
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

// Create a great circle arc between two points
function createArcCurve(start: Vector3, end: Vector3, height: number): CubicBezierCurve3 {
  const mid = new Vector3().addVectors(start, end).multiplyScalar(0.5);
  const distance = start.distanceTo(end);
  mid.normalize().multiplyScalar(start.length() + distance * height);
  
  const control1 = new Vector3().lerpVectors(start, mid, 0.33);
  const control2 = new Vector3().lerpVectors(mid, end, 0.33);
  
  return new CubicBezierCurve3(start, control1, control2, end);
}

interface ArcLineProps {
  arc: TopicArc;
  radius: number;
  isHighlighted: boolean;
  isFaded: boolean;
}

function ArcLine({ arc, radius, isHighlighted, isFaded }: ArcLineProps) {
  const lineRef = useRef<Line>(null);
  const timeRef = useRef(Math.random() * 100);
  
  const config = useMemo(() => getArcVisualConfig(arc.strength), [arc.strength]);
  
  const { geometry, points } = useMemo(() => {
    const start = latLonToVector3(arc.fromLat, arc.fromLon, radius * 1.01);
    const end = latLonToVector3(arc.toLat, arc.toLon, radius * 1.01);
    const curve = createArcCurve(start, end, 0.25);
    const points = curve.getPoints(50);
    const geometry = new BufferGeometry().setFromPoints(points);
    return { geometry, points };
  }, [arc, radius]);

  const material = useMemo(() => {
    let opacity = config.opacity;
    let color = config.color;
    
    if (isFaded) {
      opacity = 0.05;
      color = '#003344';
    } else if (isHighlighted) {
      opacity = 1;
      color = '#00ffff';
    }
    
    return new LineBasicMaterial({
      color: new Color(color),
      transparent: true,
      opacity,
      linewidth: config.thickness,
    });
  }, [config, isHighlighted, isFaded]);

  // Animate dash offset for pulse effect
  useFrame((_, delta) => {
    if (!lineRef.current) return;
    timeRef.current += delta * (isHighlighted ? 1.5 : 1);
    
    const mat = lineRef.current.material as LineBasicMaterial;
    if (isHighlighted) {
      const pulse = Math.sin(timeRef.current * 3) * 0.2 + 0.8;
      mat.opacity = pulse;
    }
  });

  return (
    <primitive 
      ref={lineRef}
      object={new Line(geometry, material)} 
    />
  );
}

export function TopicArcs({ 
  arcs, 
  radius = 2, 
  selectedTopicId,
  maxArcs = 60 
}: TopicArcsProps) {
  // Filter and sort arcs
  const visibleArcs = useMemo(() => {
    // Sort by strength
    const sorted = [...arcs].sort((a, b) => b.strength - a.strength);
    
    // Always include selected topic arcs
    const selectedArcs = selectedTopicId 
      ? sorted.filter(a => a.topicId === selectedTopicId)
      : [];
    
    // Get top arcs
    const topArcs = sorted.slice(0, maxArcs);
    
    // Merge without duplicates
    const arcMap = new Map<string, TopicArc>();
    [...topArcs, ...selectedArcs].forEach(arc => arcMap.set(arc.id, arc));
    
    return Array.from(arcMap.values());
  }, [arcs, selectedTopicId, maxArcs]);

  return (
    <group>
      {visibleArcs.map(arc => (
        <ArcLine
          key={arc.id}
          arc={arc}
          radius={radius}
          isHighlighted={selectedTopicId === arc.topicId}
          isFaded={selectedTopicId !== null && selectedTopicId !== arc.topicId}
        />
      ))}
    </group>
  );
}
