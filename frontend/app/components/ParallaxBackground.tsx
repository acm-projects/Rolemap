import React from 'react';

// Confirmed asset dimensions:
//   sky.png        256 × 240  →  2× = 512 × 480
//   clouds-back.png 256 × 240  →  2× = 512 × 480
//   clouds-front.png 256 × 240 →  2× = 512 × 480
//   ground.png     898 × 106  →  2× = 1796 × 212

const PIXEL: React.CSSProperties = {
  imageRendering: 'pixelated',
};

// Tile width at 2× — used for the seamless translateX loop in globals.css
const TILE_W = 512;
const TILE_H = 480;

const GROUND_W = 1796;
const GROUND_H = 212;

interface ParallaxBackgroundProps {
  children?: React.ReactNode;
}

export default function ParallaxBackground({ children }: ParallaxBackgroundProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">

      {/* ── Sky — fixed base, tiles in both axes ────────────────────────── */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          ...PIXEL,
          backgroundImage: "url('/assets/sky.png')",
          backgroundSize: `${TILE_W}px ${TILE_H}px`,
          backgroundRepeat: 'repeat',
        }}
      />

      {/* ── Back clouds — slow drift (120 s), slightly faded ────────────── */}
      {/* width: 200% so the second tile copy stays visible during the loop  */}
      <div
        aria-hidden="true"
        className="fixed top-0 h-screen z-1 pointer-events-none"
        style={{
          ...PIXEL,
          width: '200%',
          backgroundImage: "url('/assets/clouds-back.png')",
          backgroundSize: `${TILE_W}px ${TILE_H}px`,
          backgroundRepeat: 'repeat-x',
          opacity: 0.85,
          animation: 'driftClouds 120s linear infinite',
        }}
      />

      {/* ── Front clouds — fast drift (60 s) ────────────────────────────── */}
      <div
        aria-hidden="true"
        className="fixed top-0 h-screen z-2 pointer-events-none"
        style={{
          ...PIXEL,
          width: '200%',
          backgroundImage: "url('/assets/clouds-front.png')",
          backgroundSize: `${TILE_W}px ${TILE_H}px`,
          backgroundRepeat: 'repeat-x',
          animation: 'driftClouds 60s linear infinite',
        }}
      />

      {/* ── Ground — pinned to bottom, never scrolls ────────────────────── */}
      <div
        aria-hidden="true"
        className="fixed bottom-0 left-0 w-full z-4 pointer-events-none"
        style={{
          ...PIXEL,
          height: `${GROUND_H}px`,
          backgroundImage: "url('/assets/ground.png')",
          backgroundSize: `${GROUND_W}px ${GROUND_H}px`,
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'bottom left',
        }}
      />

      {/* ── Content — scrolls normally, above clouds, below ground ─────── */}
      {/* pb accounts for the ground height so nothing hides behind it      */}
      <div
        className="relative z-5 max-w-175 mx-auto px-6 pt-8 text-white"
        style={{ paddingBottom: `${GROUND_H + 28}px` }}
      >
        {children}
      </div>
    </div>
  );
}
