// TopicArcs - Great circle arcs between countries (rendered OUTSIDE the globe)

import { useMemo, useRef } from 'react';
import { CubicBezierCurve3, Vector3, BufferGeometry, Line, LineBasicMaterial, Color, TubeGeometry, MeshBasicMaterial, Mesh } from 'three';
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

// Create a great circle arc between two points - OUTSIDE the globe
function createArcCurve(start: Vector3, end: Vector3, baseRadius: number, heightMultiplier: number): CubicBezierCurve3 {
  const mid = new Vector3().addVectors(start, end).multiplyScalar(0.5);
  const distance = start.distanceTo(end);
  
  // Arc height is proportional to distance - higher arcs for longer distances
  // Minimum height ensures arcs are always visible above the globe
  const arcHeight = Math.max(0.3, distance * heightMultiplier * 0.4);
  
  // Normalize mid point and push it outward
  mid.normalize().multiplyScalar(baseRadius + arcHeight);
  
  // Create control points that ensure the arc stays outside
  const control1 = new Vector3().lerpVectors(start, mid, 0.4);
  const control2 = new Vector3().lerpVectors(mid, end, 0.4);
  
  // Push control points outward
  control1.normalize().multiplyScalar(baseRadius + arcHeight * 0.7);
  control2.normalize().multiplyScalar(baseRadius + arcHeight * 0.7);
  
  return new CubicBezierCurve3(start, control1, control2, end);
}

interface ArcLineProps {
  arc: TopicArc;
  radius: number;
  isHighlighted: boolean;
  isFaded: boolean;
}

function ArcLine({ arc, radius, isHighlighted, isFaded }: ArcLineProps) {
  const meshRef = useRef<Mesh>(null);
  const pulseRef = useRef<Mesh>(null);
  const timeRef = useRef(Math.random() * 100);
  
  const config = useMemo(() => getArcVisualConfig(arc.strength), [arc.strength]);
  
  const { tubeGeometry, curve, points } = useMemo(() => {
    // Start and end points slightly above the globe surface
    const startRadius = radius * 1.02;
    const start = latLonToVector3(arc.fromLat, arc.fromLon, startRadius);
    const end = latLonToVector3(arc.toLat, arc.toLon, startRadius);
    
    // Height multiplier based on whether highlighted
    const heightMult = isHighlighted ? 0.6 : 0.5;
    const curve = createArcCurve(start, end, radius, heightMult);
    const points = curve.getPoints(64);
    
    // Create tube geometry for thicker, more visible arcs
    let tubeRadius = config.thickness * 0.008;
    if (isHighlighted) {
      tubeRadius *= 2;
    } else if (isFaded) {
      tubeRadius *= 0.4;
    }
    
    const tubeGeometry = new TubeGeometry(curve, 64, tubeRadius, 8, false);
    
    return { tubeGeometry, curve, points };
  }, [arc, radius, config.thickness, isHighlighted, isFaded]);

  const material = useMemo(() => {
    let opacity = config.opacity;
    let color = config.color;
    
    if (isFaded) {
      opacity = 0.08;
      color = '#004455';
    } else if (isHighlighted) {
      opacity = 1;
      color = '#00ffff';
    }
    
    return new MeshBasicMaterial({
      color: new Color(color),
      transparent: true,
      opacity,
      depthWrite: false,
    });
  }, [config, isHighlighted, isFaded]);

  // Animate pulse and glow
  useFrame((_, delta) => {
    timeRef.current += delta * (isHighlighted ? 2 : 1);
    
    if (meshRef.current) {
      const mat = meshRef.current.material as MeshBasicMaterial;
      if (isHighlighted) {
        const pulse = Math.sin(timeRef.current * 4) * 0.15 + 0.85;
        mat.opacity = pulse;
      }
    }
    
    // Animate the pulse traveling along the arc
    if (pulseRef.current && (isHighlighted || arc.strength >= 0.5)) {
      const t = (timeRef.current * 0.3) % 1;
      const pos = curve.getPoint(t);
      pulseRef.current.position.copy(pos);
      
      const pulseScale = isHighlighted ? 0.05 : 0.03;
      const scale = Math.sin(t * Math.PI) * pulseScale + pulseScale * 0.5;
      pulseRef.current.scale.setScalar(scale);
    }
  });

  const showPulse = isHighlighted || (!isFaded && arc.strength >= 0.5);

  return (
    <group>
      <mesh ref={meshRef} geometry={tubeGeometry} material={material} />
      
      {/* Traveling pulse dot */}
      {showPulse && (
        <mesh ref={pulseRef}>
          <sphereGeometry args={[1, 12, 8]} />
          <meshBasicMaterial 
            color={isHighlighted ? "#ffffff" : "#00e5ff"} 
            transparent 
            opacity={isHighlighted ? 1 : 0.8}
          />
        </mesh>
      )}
      
      {/* Glow effect for highlighted arcs */}
      {isHighlighted && (
        <mesh geometry={tubeGeometry}>
          <meshBasicMaterial
            color="#00ffff"
            transparent
            opacity={0.3}
            depthWrite={false}
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
    
    // Get top arcs (filter out very low strength unless selected)
    const topArcs = sorted
      .filter(a => a.strength >= 0.25 || a.topicId === selectedTopicId)
      .slice(0, maxArcs);
    
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
