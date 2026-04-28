'use client';
import { createContext, useContext, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

export type CharPhase = 'idle' | 'departing' | 'arriving' | 'walk';

export interface CharState {
  phase: CharPhase;
  startX: number;
  startY: number;    // feet Y (bottom of character)
  floorY: number;
  charSize: number;  // rendered pixel width — varies with ReactFlow zoom
  animKey: number;
  awaitingMapArrival: boolean;
  mascotFallInKey: number;  // increments each time CharacterMascot should play fall-in
}

interface CharContextType {
  charState: CharState;
  triggerTransition: (href: string, fromX?: number, fromY?: number, fromCharSize?: number) => void;
  notifyMapReady: () => void;
}

const FLOOR_FRACTIONS: Record<string, number> = {
  '/dashboard': 0.85,
  '/tasks':     0.85,
  '/shop':      0.80,
};

const DEFAULT_CHAR_SIZE = 96;

const CharContext = createContext<CharContextType>({
  charState: { phase: 'idle', startX: 400, startY: 400, floorY: 600, charSize: DEFAULT_CHAR_SIZE, animKey: 0, awaitingMapArrival: false, mascotFallInKey: 0 },
  triggerTransition: () => {},
  notifyMapReady: () => {},
});

export function CharacterProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [charState, setCharState] = useState<CharState>({
    phase: 'idle',
    startX: 400,
    startY: 400,
    floorY: 600,
    charSize: DEFAULT_CHAR_SIZE,
    animKey: 0,
    awaitingMapArrival: false,
    mascotFallInKey: 0,
  });
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const triggerTransition = useCallback((
    href: string,
    fromX?: number,
    fromY?: number,
    fromCharSize?: number,
  ) => {
    timers.current.forEach(clearTimeout);
    timers.current = [];

    const x = fromX ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 400);
    const y = fromY ?? charState.startY;
    const size = fromCharSize ?? DEFAULT_CHAR_SIZE;

    setCharState(prev => ({
      phase: 'departing',
      startX: x,
      startY: y,
      floorY: prev.floorY,
      charSize: size,
      animKey: prev.animKey + 1,
      awaitingMapArrival: false,
      mascotFallInKey: prev.mascotFallInKey,
    }));

    timers.current.push(setTimeout(() => {
      router.push(href);
    }, 300));

    if (href === '/map') {
      timers.current.push(setTimeout(() => {
        setCharState(prev => ({ ...prev, awaitingMapArrival: true }));
      }, 520));
      // Fallback if map never calls notifyMapReady
      timers.current.push(setTimeout(() => {
        setCharState(prev =>
          prev.awaitingMapArrival
            ? { ...prev, phase: 'idle', awaitingMapArrival: false }
            : prev
        );
      }, 12000));
    } else {
      timers.current.push(setTimeout(() => {
        const frac = FLOOR_FRACTIONS[href] ?? 0.85;
        const floorY = typeof window !== 'undefined' ? window.innerHeight * frac : 600;
        const centerX = typeof window !== 'undefined' ? window.innerWidth / 2 : 400;
        setCharState(prev => ({
          phase: 'arriving',
          startX: centerX,
          startY: -prev.charSize,
          floorY,
          charSize: DEFAULT_CHAR_SIZE,
          animKey: prev.animKey + 1,
          awaitingMapArrival: false,
          mascotFallInKey: prev.mascotFallInKey,
        }));
      }, 520));

      timers.current.push(setTimeout(() => {
        setCharState(prev => ({ ...prev, phase: 'walk', startY: prev.floorY }));
      }, 1200));
    }
  }, [router, charState.startY]);

  // Called by map page when data loaded + camera settled.
  // CharacterMascot handles its own fall-in animation — no GlobalCharacter needed.
  const notifyMapReady = useCallback(() => {
    setCharState(prev => {
      if (!prev.awaitingMapArrival) return prev;
      return {
        ...prev,
        phase: 'idle',
        awaitingMapArrival: false,
        mascotFallInKey: prev.mascotFallInKey + 1,
      };
    });
  }, []);

  return (
    <CharContext.Provider value={{ charState, triggerTransition, notifyMapReady }}>
      {children}
    </CharContext.Provider>
  );
}

export function useCharacter() {
  return useContext(CharContext);
}
