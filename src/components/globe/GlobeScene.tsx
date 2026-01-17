// GlobeScene - Main 3D scene container

import { Suspense, useCallback } from 'react';
import { Canvas, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera } from '@react-three/drei';
import { GlobeMesh } from './GlobeMesh';
import { CountryMarkers } from './CountryMarkers';
import { TopicArcs } from './TopicArcs';
import { useGlobeStore } from '@/store/globeStore';
import { themes } from '@/lib/themes';
import type { Country, GlobalSummary } from '@/types/globe';

interface GlobeSceneProps {
  data: GlobalSummary | undefined;
  countries: Country[];
  isLoading?: boolean;
}

function GlobeContent({ data, countries }: Omit<GlobeSceneProps, 'isLoading'>) {
  const { selectedTopicId, setSelectedCountry, setHoveredCountry, themeId } = useGlobeStore();
  const theme = themes[themeId];

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
        rotateSpeed={0.4}
        zoomSpeed={0.6}
        dampingFactor={0.08}
        enableDamping
      />
      
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 3, 5]} intensity={0.4} />
      
      <GlobeMesh radius={2} theme={theme} />
      
      <CountryMarkers
        countries={countries}
        activities={data?.countries || []}
        radius={2}
        theme={theme}
        onHover={handleCountryHover}
        onClick={handleCountryClick}
      />
      
      <TopicArcs
        arcs={data?.arcs || []}
        radius={2}
        selectedTopicId={selectedTopicId}
        maxArcs={50}
        theme={theme}
      />
    </>
  );
}

export function GlobeScene({ data, countries, isLoading }: GlobeSceneProps) {
  const { themeId } = useGlobeStore();
  const theme = themes[themeId];

  return (
    <div 
      className="absolute inset-0 transition-colors duration-500"
      style={{ background: theme.background }}
    >
      <Canvas gl={{ antialias: true, alpha: false }}>
        <Suspense fallback={null}>
          <color attach="background" args={[theme.background]} />
          <GlobeContent data={data} countries={countries} />
        </Suspense>
      </Canvas>
      
      {isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center z-20 transition-colors"
          style={{ background: `${theme.background}80` }}
        >
          <div className="flex flex-col items-center gap-3">
            <div 
              className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: theme.accentColor, borderTopColor: 'transparent' }}
            />
            <span style={{ color: theme.textColor }} className="text-sm opacity-70">
              Loading globe data...
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
