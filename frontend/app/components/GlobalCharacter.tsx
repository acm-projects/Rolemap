'use client';
import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { CharacterPreview } from './CharacterPreview';
import { useCharacter } from '../context/CharacterContext';

const DEFAULT_EQUIPPED = {
  skin: 'char1.png', eyes: 'eyes.png', clothes: 'suit.png',
  pants: 'pants.png', shoes: 'shoes.png', hair: 'buzzcut.png', accessories: '',
};

const HIDDEN_PATHS = ['/', '/OnBoarding'];

export function GlobalCharacter() {
  const { charState } = useCharacter();
  const { phase, startX, startY, floorY, charSize, animKey } = charState;
  const pathname = usePathname();
  const [equipped, setEquipped] = useState(DEFAULT_EQUIPPED);
  const [colorVariants, setColorVariants] = useState<Record<string, number>>({});
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const load = () => {
      try {
        const eq = localStorage.getItem('character_saved');
        const cv = localStorage.getItem('character_saved_variants');
        if (eq) setEquipped(prev => ({ ...prev, ...JSON.parse(eq) }));
        if (cv) setColorVariants(JSON.parse(cv));
      } catch {}
    };
    load();
    window.addEventListener('character-saved', load);
    return () => window.removeEventListener('character-saved', load);
  }, []);

  if (!mounted || phase === 'idle') return null;
  if (HIDDEN_PATHS.some(p => pathname === p || pathname.startsWith(p + '/'))) return null;
  // On tasks/shop/dashboard page, local character handles arrival/walk — only show during departure
  if ((pathname === '/tasks' || pathname === '/shop' || pathname === '/dashboard') && phase !== 'departing') return null;

  // showLegs height formula matches CharacterPreview: Math.round(size * 32 / 28)
  const charHeight = Math.round(charSize * 32 / 28);

  // Fall distance: from screen bottom back to character top, plus buffer
  const departFallDist = window.innerHeight - (startY - charHeight) + 60;

  // Spawn this far above the viewport (feels like falling from sky)
  const ARRIVE_START = 500;
  // translateY needed: from top:-ARRIVE_START to top:(floorY - charHeight)
  const arriveDist = floorY - charHeight + ARRIVE_START;

  const k = animKey;

  let posStyle: React.CSSProperties;
  let animName: string;
  let animDuration: string;
  let timing: string;
  let iterationCount = '1';

  if (phase === 'departing') {
    posStyle = { left: startX - charSize / 2, top: startY - charHeight };
    animName = `gc-depart-${k}`;
    animDuration = '0.52s';
    timing = 'linear';
  } else if (phase === 'arriving') {
    posStyle = { left: startX - charSize / 2, top: -ARRIVE_START };
    animName = `gc-arrive-${k}`;
    animDuration = '0.75s';
    timing = 'linear';
  } else {
    // walk sprites are square (charSize × charSize), feet at bottom
    posStyle = { left: startX - charSize / 2, top: floorY - charSize };
    animName = `gc-walk-${k}`;
    animDuration = '4s';
    timing = 'linear';
    iterationCount = 'infinite';
  }

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, pointerEvents: 'none', overflow: 'hidden' }}>
      <style>{`
        @keyframes gc-depart-${k} {
          0%   { transform: translateY(0px); }
          18%  { transform: translateY(-26px); }
          30%  { transform: translateY(-22px); }
          42%  { transform: translateY(-6px); }
          54%  { transform: translateY(${Math.round(departFallDist * 0.12)}px); }
          65%  { transform: translateY(${Math.round(departFallDist * 0.32)}px); }
          76%  { transform: translateY(${Math.round(departFallDist * 0.58)}px); }
          86%  { transform: translateY(${Math.round(departFallDist * 0.79)}px); }
          93%  { transform: translateY(${Math.round(departFallDist * 0.91)}px); }
          100% { transform: translateY(${departFallDist}px); }
        }
        @keyframes gc-arrive-${k} {
          0%   { transform: translateY(0px); }
          12%  { transform: translateY(${Math.round(arriveDist * 0.02)}px); }
          25%  { transform: translateY(${Math.round(arriveDist * 0.07)}px); }
          40%  { transform: translateY(${Math.round(arriveDist * 0.19)}px); }
          55%  { transform: translateY(${Math.round(arriveDist * 0.40)}px); }
          68%  { transform: translateY(${Math.round(arriveDist * 0.62)}px); }
          79%  { transform: translateY(${Math.round(arriveDist * 0.80)}px); }
          88%  { transform: translateY(${Math.round(arriveDist * 0.93)}px); }
          93%  { transform: translateY(${arriveDist + 18}px); }
          97%  { transform: translateY(${arriveDist - 7}px); }
          100% { transform: translateY(${arriveDist}px); }
        }
        @keyframes gc-walk-${k} {
          0%   { transform: translateX(-55px); }
          50%  { transform: translateX(55px); }
          100% { transform: translateX(-55px); }
        }
      `}</style>
      <div
        key={`${k}-${phase}`}
        {...(phase === 'walk' ? { 'data-global-char': '' } : {})}
        style={{
          position: 'absolute',
          ...posStyle,
          width: charSize,
          height: charHeight,
          animation: `${animName} ${animDuration} ${timing} ${iterationCount} forwards`,
          imageRendering: 'pixelated',
        }}
      >
        {phase === 'walk' ? (
          <CharacterPreview
            size={charSize}
            walk
            skin={equipped.skin}
            eyes={equipped.eyes}
            clothes={equipped.clothes}
            pants={equipped.pants}
            shoes={equipped.shoes}
            hair={equipped.hair}
            accessory={equipped.accessories}
            variants={colorVariants}
          />
        ) : (
          <CharacterPreview
            size={charSize}
            showLegs
            skin={equipped.skin}
            eyes={equipped.eyes}
            clothes={equipped.clothes}
            pants={equipped.pants}
            shoes={equipped.shoes}
            hair={equipped.hair}
            accessory={equipped.accessories}
            variants={colorVariants}
          />
        )}
      </div>
    </div>
  );
}
