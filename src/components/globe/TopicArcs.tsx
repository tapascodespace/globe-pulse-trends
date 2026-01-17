// TopicArcs - Thin, aesthetic arcs between countries

import { useMemo, useRef } from 'react';
import { CubicBezierCurve3, Vector3, BufferGeometry, LineBasicMaterial, Color, Line } from 'three';
import { useFrame } from '@react-three/fiber';
import type { TopicArc } from '@/types/globe';
import type { GlobeTheme } from '@/lib/themes';

interface TopicArcsProps {
  arcs: TopicArc[];
  radius?: number;
  selectedTopicId: string | null;
  maxArcs?: number;
  theme: GlobeTheme;
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

function createArcCurve(start: Vector3, end: Vector3, baseRadius: number): CubicBezierCurve3 {
  const mid = new Vector3().addVectors(start, end).multiplyScalar(0.5);
  const distance = start.distanceTo(end);
  const arcHeight = Math.max(0.2, distance * 0.25);
  
  mid.normalize().multiplyScalar(baseRadius + arcHeight);
  
  const control1 = new Vector3().lerpVectors(start, mid, 0.4);
  const control2 = new Vector3().lerpVectors(mid, end, 0.4);
  
  control1.normalize().multiplyScalar(baseRadius + arcHeight * 0.6);
  control2.normalize().multiplyScalar(baseRadius + arcHeight * 0.6);
  
  return new CubicBezierCurve3(start, control1, control2, end);
}

interface ArcLineProps {
  arc: TopicArc;
  radius: number;
  isHighlighted: boolean;
  isFaded: boolean;
  theme: GlobeTheme;
}

function ArcLine({ arc, radius, isHighlighted, isFaded, theme }: ArcLineProps) {
  const lineRef = useRef<Line>(null);
  const dotRef = useRef<any>(null);
  const timeRef = useRef(Math.random() * 100);
  
  const { geometry, curve } = useMemo(() => {
    const startRadius = radius * 1.01;
    const start = latLonToVector3(arc.fromLat, arc.fromLon, startRadius);
    const end = latLonToVector3(arc.toLat, arc.toLon, startRadius);
    const curve = createArcCurve(start, end, radius);
    const points = curve.getPoints(48);
    const geometry = new BufferGeometry().setFromPoints(points);
    
    return { geometry, curve };
  }, [arc, radius]);

  const material = useMemo(() => {
    let opacity = isFaded ? 0.1 : (isHighlighted ? 0.9 : 0.5);
    let color = theme.arcColor;
    
    if (isFaded) {
      color = theme.gridColor;
    }
    
    return new LineBasicMaterial({
      color: new Color(color),
      transparent: true,
      opacity,
    });
  }, [theme, isHighlighted, isFaded]);

  // Animate traveling dot
  useFrame((_, delta) => {
    timeRef.current += delta * (isHighlighted ? 1.5 : 0.8);
    
    if (dotRef.current && !isFaded) {
      const t = (timeRef.current * 0.2) % 1;
      const pos = curve.getPoint(t);
      dotRef.current.position.copy(pos);
      
      const scale = isHighlighted ? 0.025 : 0.015;
      dotRef.current.scale.setScalar(scale * (Math.sin(t * Math.PI) * 0.5 + 0.8));
    }
  });

  return (
    <group>
      <primitive ref={lineRef} object={new Line(geometry, material)} />
      
      {/* Traveling dot */}
      {!isFaded && (
        <mesh ref={dotRef}>
          <sphereGeometry args={[1, 8, 6]} />
          <meshBasicMaterial 
            color={theme.accentColor} 
            transparent 
            opacity={isHighlighted ? 1 : 0.7}
          />
        </mesh>
      )}
    </group>
  );
}

export function TopicArcs({ 
  arcs, 
  radius = 2, 
  selectedTopicId,
  maxArcs = 50,
  theme
}: TopicArcsProps) {
  const visibleArcs = useMemo(() => {
    const sorted = [...arcs].sort((a, b) => b.strength - a.strength);
    
    const selectedArcs = selectedTopicId 
      ? sorted.filter(a => a.topicId === selectedTopicId)
      : [];
    
    const topArcs = sorted
      .filter(a => a.strength >= 0.3 || a.topicId === selectedTopicId)
      .slice(0, maxArcs);
    
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
          theme={theme}
        />
      ))}
    </group>
  );
}
