// GlobeScene - Main 3D scene container

import { Suspense, useCallback, useRef } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { GlobeMesh } from './GlobeMesh';
import { CountryMarkers } from './CountryMarkers';
import { TopicArcs } from './TopicArcs';
import { useGlobeStore } from '@/store/globeStore';
import type { Country, CountryActivity, TopicArc, GlobalSummary } from '@/types/globe';

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
      <PerspectiveCamera makeDefault position={[0, 0, 5.5]} fov={45} />
      <OrbitControls
        enablePan={false}
        enableZoom={true}
        minDistance={3}
        maxDistance={10}
        rotateSpeed={0.5}
        zoomSpeed={0.8}
        dampingFactor={0.05}
        enableDamping
      />
      
      {/* Ambient lighting */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={0.5} />
      
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
      
      {/* Topic arcs */}
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
      className="absolute inset-0 bg-gradient-to-b from-background via-background to-[#050810]"
    >
      {/* Vignette overlay */}
      <div 
        className="absolute inset-0 pointer-events-none z-10"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, hsl(210 30% 4% / 0.6) 80%, hsl(210 30% 4% / 0.9) 100%)'
        }}
      />
      
      <Canvas>
        <Suspense fallback={null}>
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
