// GlobeScene - Main 3D scene container

import { Suspense, useCallback, useRef } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Stars } from '@react-three/drei';
import { GlobeMesh } from './GlobeMesh';
import { CountryMarkers } from './CountryMarkers';
import { TopicArcs } from './TopicArcs';
import { useGlobeStore } from '@/store/globeStore';
import type { Country, GlobalSummary } from '@/types/globe';

interface GlobeSceneProps {
  data: GlobalSummary | undefined;
  countries: Country[];
  isLoading?: boolean;
}

function GlobeContent({ data, countries }: Omit<GlobeSceneProps, 'isLoading'>) {
  const { selectedTopicId, setSelectedCountry, setHoveredCountry } = useGlobeStore();

  const handleCountryHover = useCallback((country: Country | null, event: ThreeEvent<PointerEvent>) => {
    if (country) {
      setHoveredCountry({
        country,
        position: { x: event.clientX, y: event.clientY }
      });
    } else {
      setHoveredCountry(null);
    }
  }, [setHoveredCountry]);

  const handleCountryClick = useCallback((country: Country) => {
    setSelectedCountry(country);
  }, [setSelectedCountry]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 6]} fov={45} />
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={3.5}
        maxDistance={12}
        rotateSpeed={0.4}
        zoomSpeed={0.6}
        dampingFactor={0.08}
        enableDamping
      />
      
      {/* Lighting for solid globe */}
      <ambientLight intensity={0.4} />
      <directionalLight position={[5, 3, 5]} intensity={0.6} color="#ffffff" />
      <directionalLight position={[-5, -3, -5]} intensity={0.2} color="#00e5ff" />
      <pointLight position={[0, 0, 8]} intensity={0.3} color="#00e5ff" />
      
      {/* Background stars */}
      <Stars 
        radius={100} 
        depth={50} 
        count={2000} 
        factor={3} 
        saturation={0} 
        fade 
        speed={0.5}
      />
      
      {/* Globe */}
      <GlobeMesh radius={2} />
      
      {/* Country markers */}
      <CountryMarkers
        countries={countries}
        activities={data?.countries || []}
        radius={2}
        onHover={handleCountryHover}
        onClick={handleCountryClick}
      />
      
      {/* Topic arcs - rendered AFTER globe so they appear on top */}
      <TopicArcs
        arcs={data?.arcs || []}
        radius={2}
        selectedTopicId={selectedTopicId}
        maxArcs={60}
      />
    </>
  );
}

export function GlobeScene({ data, countries, isLoading }: GlobeSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div 
      ref={containerRef}
      className="absolute inset-0"
      style={{
        background: 'radial-gradient(ellipse at center, #0a1628 0%, #050810 50%, #020408 100%)'
      }}
    >
      {/* Vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.4) 80%, rgba(0,0,0,0.7) 100%)'
        }}
      />
      
      <Canvas gl={{ antialias: true, alpha: false }}>
        <Suspense fallback={null}>
          <color attach="background" args={['#050810']} />
          <fog attach="fog" args={['#050810', 8, 20]} />
          <GlobeContent data={data} countries={countries} />
        </Suspense>
      </Canvas>
      
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm z-20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-muted-foreground">Loading globe data...</span>
          </div>
        </div>
      )}
    </div>
  );
}
