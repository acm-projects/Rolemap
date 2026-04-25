'use client';

import { useState, useEffect, useRef } from 'react';
import { CharacterPreview, Category } from './CharacterPreview';
//import Image from 'next/image';
import { Handle, Position } from '@xyflow/react';
import { useCharacter } from '../context/CharacterContext';

type SavedChar = { skin: string; eyes: string; clothes: string; pants: string; shoes: string; hair: string; accessories: string };
type SavedVariants = Partial<Record<string, number>>;

const DEFAULTS: SavedChar = {
  skin: 'char1.png', eyes: 'eyes.png', clothes: 'suit.png',
  pants: 'pants.png', shoes: 'shoes.png', hair: 'buzzcut.png', accessories: '',
};


function CharacterMascot({ isJumping }: { isJumping: boolean }) {
  const { charState } = useCharacter();
  const [char, setChar] = useState<SavedChar>(DEFAULTS);
  const [variants, setVariants] = useState<SavedVariants>({});
  const [fallingIn, setFallingIn] = useState(false);
  const prevFallInKey = useRef(0);

  const load = () => {
    try {
      const saved = localStorage.getItem('character_saved');
      if (saved) setChar({ ...DEFAULTS, ...JSON.parse(saved) });
      const savedV = localStorage.getItem('character_saved_variants');
      if (savedV) setVariants(JSON.parse(savedV));
    } catch {}
  };

  useEffect(() => {
    load();
    window.addEventListener('storage', load);
    return () => window.removeEventListener('storage', load);
  }, []);

  useEffect(() => {
    const key = charState.mascotFallInKey;
    if (key === 0 || key === prevFallInKey.current) return;
    prevFallInKey.current = key;
    setFallingIn(true);
    const t = setTimeout(() => setFallingIn(false), 800);
    return () => clearTimeout(t);
  }, [charState.mascotFallInKey]);

  const v: Partial<Record<Category, number>> = {
    skin:        variants[char.skin]        ?? 0,
    eyes:        variants[char.eyes]        ?? 0,
    clothes:     variants[char.clothes]     ?? 0,
    pants:       variants[char.pants]       ?? 0,
    shoes:       variants[char.shoes]       ?? 0,
    hair:        variants[char.hair]        ?? 0,
    accessories: variants[char.accessories] ?? 0,
  };

  // Hide during global tab transitions so GlobalCharacter doesn't double-show
  if (charState.phase !== 'idle') return null;

  return (
    <>
      <style>{`
        @keyframes mascot-bounce {
          0%   { transform: translateX(-50%) translateY(0px); }
          35%  { transform: translateX(-50%) translateY(-20px); }
          65%  { transform: translateX(-50%) translateY(-6px); }
          100% { transform: translateX(-50%) translateY(0px); }
        }
        @keyframes mascot-fall-in {
          0%   { transform: translateX(-50%) translateY(-600px); }
          72%  { transform: translateX(-50%) translateY(14px); }
          86%  { transform: translateX(-50%) translateY(-6px); }
          100% { transform: translateX(-50%) translateY(0px); }
        }
      `}</style>
      <div data-char-mascot style={{
        position: 'absolute',
        top: -120,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        pointerEvents: 'none',
        animation: fallingIn
          ? 'mascot-fall-in 0.7s ease-in forwards'
          : isJumping
          ? 'mascot-bounce 0.35s ease-out 0.8s forwards'
          : 'none',
      }}>
        <CharacterPreview
          size={104}
          showLegs
          jump={false}
          skin={char.skin} eyes={char.eyes} clothes={char.clothes}
          pants={char.pants} shoes={char.shoes} hair={char.hair}
          accessory={char.accessories}
          variants={v}
        />
      </div>
    </>
  );
}
const CheckIcon = () => (
  <svg id="check" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <polygon points="22 4 22 6 21 6 21 7 20 7 20 8 19 8 19 9 18 9 18 10 17 10 17 11 16 11 16 12 15 12 15 13 14 13 14 14 13 14 13 15 12 15 12 16 11 16 11 17 10 17 10 18 8 18 8 17 7 17 7 16 6 16 6 15 5 15 5 14 4 14 4 13 3 13 3 12 2 12 2 10 4 10 4 11 5 11 5 12 6 12 6 13 7 13 7 14 8 14 8 15 10 15 10 14 11 14 11 13 12 13 12 12 13 12 13 11 14 11 14 10 15 10 15 9 16 9 16 8 17 8 17 7 18 7 18 6 19 6 19 5 20 5 20 4 22 4"/>
  </svg>
);

const ProgressIcon = () => (
  <svg id="circle-notch" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <polygon points="23 9 23 15 22 15 22 17 21 17 21 19 20 19 20 20 19 20 19 21 17 21 17 22 15 22 15 23 9 23 9 22 7 22 7 21 5 21 5 20 4 20 4 19 3 19 3 17 2 17 2 15 1 15 1 9 2 9 2 7 3 7 3 5 4 5 4 4 5 4 5 3 7 3 7 2 9 2 9 1 10 1 10 2 11 2 11 3 10 3 10 4 8 4 8 5 6 5 6 6 5 6 5 8 4 8 4 10 3 10 3 14 4 14 4 16 5 16 5 18 6 18 6 19 8 19 8 20 10 20 10 21 14 21 14 20 16 20 16 19 18 19 18 18 19 18 19 16 20 16 20 14 21 14 21 10 20 10 20 8 19 8 19 6 18 6 18 5 16 5 16 4 14 4 14 3 13 3 13 2 14 2 14 1 15 1 15 2 17 2 17 3 19 3 19 4 20 4 20 5 21 5 21 7 22 7 22 9 23 9"/>
  </svg>
);

const CurrentIcon = () => (
  <svg id="bars" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <rect x="1" y="11" width="22" height="2"/><rect x="1" y="19" width="22" height="2"/><rect x="1" y="3" width="22" height="2"/>
  </svg>
);

const LockIcon = () => (
  <svg id="lock-alt-solid" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
    <path d="m20,12v-1h-1v-5h-1v-2h-1v-1h-1v-1h-2v-1h-4v1h-2v1h-1v1h-1v2h-1v5h-1v1h-1v10h1v1h16v-1h1v-10h-1Zm-12-6h1v-1h1v-1h4v1h1v1h1v5h-8v-5Z"/>
  </svg>
);

const ProjectIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
  </svg>
);

interface RoadmapNodeData {
  locked: boolean;
  progress: number;
  kind?: string;
  label: string;
  isCurrent?: boolean;
  isJumping?: boolean;
  isMascotJumping?: boolean;
  decayHealth?: number; // 0–100; <100 = decaying, lower = worse
}

// Pixel crack overlay — severity 0 (mild) to 1 (severe)
function CrackOverlay({ width, height, severity }: { width: number; height: number; severity: number }) {
  const s = Math.max(0, Math.min(1, severity));
  // Pre-baked crack paths: light cracks at low severity, more/deeper at high
  const cracks = [
    // always shown (even mild decay)
    `M${width*0.25},${height*0.1} L${width*0.18},${height*0.35} L${width*0.28},${height*0.55}`,
    `M${width*0.7},${height*0.15} L${width*0.78},${height*0.4}`,
    // shown at moderate+ decay
    ...(s > 0.35 ? [
      `M${width*0.45},${height*0.0} L${width*0.38},${height*0.3} L${width*0.48},${height*0.6} L${width*0.42},${height*0.9}`,
      `M${width*0.8},${height*0.5} L${width*0.68},${height*0.75} L${width*0.72},${height*0.95}`,
    ] : []),
    // shown at severe decay
    ...(s > 0.65 ? [
      `M${width*0.1},${height*0.6} L${width*0.22},${height*0.8} L${width*0.15},${height*1.0}`,
      `M${width*0.55},${height*0.2} L${width*0.65},${height*0.45} L${width*0.58},${height*0.65} L${width*0.7},${height*0.85}`,
    ] : []),
  ];

  const crackColor = s > 0.65 ? 'rgba(90,40,10,0.7)' : s > 0.35 ? 'rgba(80,50,20,0.55)' : 'rgba(100,70,30,0.4)';

  return (
    <svg
      width={width} height={height}
      style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none', zIndex: 5, imageRendering: 'pixelated' }}
    >
      {/* dark outline for depth */}
      {cracks.map((d, i) => <path key={`o${i}`} d={d} fill="none" stroke="rgba(0,0,0,0.35)" strokeWidth={3} strokeLinecap="square" />)}
      {/* main crack color */}
      {cracks.map((d, i) => <path key={`c${i}`} d={d} fill="none" stroke={crackColor} strokeWidth={1.5} strokeLinecap="square" />)}
      {/* crumble dots at severe */}
      {s > 0.5 && [
        [width*0.2, height*0.55], [width*0.75, height*0.42], [width*0.45, height*0.88],
        [width*0.6, height*0.7], [width*0.12, height*0.8],
      ].map(([cx, cy], i) => (
        <rect key={`d${i}`} x={cx} y={cy} width={3} height={3} fill={crackColor} />
      ))}
    </svg>
  );
}
const BAR_COLOR = '#3d7a7a';

function blendHex(hex1: string, hex2: string, t: number): string {
  const p = (h: string) => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
  const [r1,g1,b1] = p(hex1), [r2,g2,b2] = p(hex2);
  return `#${[r1+(r2-r1)*t, g1+(g2-g1)*t, b1+(b2-b1)*t].map(v => Math.round(v).toString(16).padStart(2,'0')).join('')}`;
}

function pixelRing(s: number, color: string, bgColor: string, dx = 0, dy = 0): string[] {
  return [
    `${dx}px ${dy - s}px 0 0 ${color}`,
    `${dx}px ${dy + s}px 0 0 ${color}`,
    `${dx - s}px ${dy}px 0 0 ${color}`,
    `${dx + s}px ${dy}px 0 0 ${color}`,
    `${dx - s}px ${dy - s}px 0 0 ${bgColor}`,
    `${dx + s}px ${dy - s}px 0 0 ${bgColor}`,
    `${dx - s}px ${dy + s}px 0 0 ${bgColor}`,
    `${dx + s}px ${dy + s}px 0 0 ${bgColor}`,
    `${dx - s * 2}px ${dy - s}px 0 0 ${color}`,
    `${dx + s * 2}px ${dy - s}px 0 0 ${color}`,
    `${dx - s * 2}px ${dy + s}px 0 0 ${color}`,
    `${dx + s * 2}px ${dy + s}px 0 0 ${color}`,
    `${dx - s}px ${dy - s * 2}px 0 0 ${color}`,
    `${dx + s}px ${dy - s * 2}px 0 0 ${color}`,
    `${dx - s}px ${dy + s * 2}px 0 0 ${color}`,
    `${dx + s}px ${dy + s * 2}px 0 0 ${color}`,
    `${dx - s * 2}px ${dy - s * 2}px 0 0 ${bgColor}`,
    `${dx + s * 2}px ${dy - s * 2}px 0 0 ${bgColor}`,
    `${dx - s * 2}px ${dy + s * 2}px 0 0 ${bgColor}`,
    `${dx + s * 2}px ${dy + s * 2}px 0 0 ${bgColor}`,
  ];
}

function getPixelBoxShadow(borderColor: string, bgColor: string): string {
  const s = 4;
  const drop = s * 3;
  const shadowColor = 'rgba(45, 110, 110, 0.75)';
  return [
    ...pixelRing(s, borderColor, bgColor, 0, 0),
    ...pixelRing(s, shadowColor, 'transparent', drop, drop),
  ].join(', ');
}

function PixelProgressBar({ progress, isActive }: { progress: number; isActive: boolean }) {
  const totalBlocks = 10;
  const filledBlocks = Math.round((progress / 100) * totalBlocks);
  const fillColor = isActive ? 'rgba(255,255,255,0.85)' : BAR_COLOR;
  const trackColor = isActive ? 'rgba(255,255,255,0.2)' : 'rgba(100,140,140,0.2)';

  return (
    <div style={{ display: 'flex', gap: '2px', width: '100%', alignItems: 'center' }}>
      {Array.from({ length: totalBlocks }).map((_, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: '8px',
            backgroundColor: i < filledBlocks ? fillColor : trackColor,
            borderRadius: 0,
            imageRendering: 'pixelated',
          }}
        />
      ))}
    </div>
  );
}

/**
 * Renders N stacked pixel-offset copies of a shape path behind the main shape.
 * Each layer is offset by `step` pixels further down-right, getting darker,
 * exactly like the rectangle's box-shadow stack. The top layer is the border.
 */
const LAYER_STEP = 4;      // px between each stacked layer
const LAYER_COUNT = 3;     // how many shadow layers (matching rect's drop = s*3 = 12px total)
const BORDER_WIDTH = 4;    // stroke width for the border ring

// Darkest → lightest shadow layers leading up to the border
const LAYER_COLORS = [
  'rgba(30, 80, 80, 0.55)',
  'rgba(38, 95, 95, 0.65)',
  'rgba(45, 110, 110, 0.75)',
];

/**
 * Character image that sits above the node, peeking out from the top edge.
 * Only rendered when the node is active (in progress).
 */
// function Mascot() {
//   return (
//     <Image
//       src="/snoopy.png"
//       alt="Character"
//       width={104}
//       height={104}
//       style={{
//         position: 'absolute',
//         objectFit: 'contain',
//         top: -73,
//         left: '50%',
//         transform: 'translateX(-50%)',
//         zIndex: 10,
//         pointerEvents: 'none',
//         //imageRendering: 'pixelated',
//       }}
//     />
//   );
// }

function OctagonPixelBorder({
  width,
  height,
  borderColor,
  bgColor,
}: {
  width: number;
  height: number;
  borderColor: string;
  bgColor: string;
}) {
  const cut = 24;
  const pad = LAYER_STEP * LAYER_COUNT + BORDER_WIDTH;

  // Octagon path offset by (dx, dy)
  const octPath = (dx: number, dy: number) =>
    `M${cut + dx},${dy} L${width - cut + dx},${dy} L${width + dx},${cut + dy} ` +
    `L${width + dx},${height - cut + dy} L${width - cut + dx},${height + dy} ` +
    `L${cut + dx},${height + dy} L${dx},${height - cut + dy} L${dx},${cut + dy} Z`;

  const ox = pad; // origin x inside the SVG canvas
  const oy = pad; // origin y

  return (
    <svg
      width={width + pad * 2}
      height={height + pad * 2}
      style={{
        position: 'absolute',
        top: -pad,
        left: -pad,
        overflow: 'visible',
        pointerEvents: 'none',
        zIndex: 0,
        imageRendering: 'pixelated',
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Stacked shadow layers — rendered back-to-front */}
      {Array.from({ length: LAYER_COUNT }).map((_, i) => {
        const layerIdx = LAYER_COUNT - 1 - i; // paint darkest first
        const offset = (layerIdx + 1) * LAYER_STEP;
        return (
          <path
            key={i}
            d={octPath(ox + offset, oy + offset)}
            fill={LAYER_COLORS[layerIdx]}
          />
        );
      })}
      {/* Main fill */}
      <path d={octPath(ox, oy)} fill={bgColor} />
      {/* Border stroke */}
      <path
        d={octPath(ox, oy)}
        fill="none"
        stroke={borderColor}
        strokeWidth={BORDER_WIDTH}
        strokeLinejoin="miter"
        style={{ shapeRendering: 'crispEdges' }}
      />
    </svg>
  );
}

function CirclePixelBorder({
  size,
  borderColor,
  bgColor,
}: {
  size: number;
  borderColor: string;
  bgColor: string;
}) {
  const r = size / 2;
  const pad = LAYER_STEP * LAYER_COUNT + BORDER_WIDTH;
  const totalSize = size + pad * 2;
  const cx = pad + r;
  const cy = pad + r;

  return (
    <svg
      width={totalSize}
      height={totalSize}
      style={{
        position: 'absolute',
        top: -pad,
        left: -pad,
        overflow: 'visible',
        pointerEvents: 'none',
        zIndex: 0,
        imageRendering: 'pixelated',
      }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Stacked shadow layers — rendered back-to-front */}
      {Array.from({ length: LAYER_COUNT }).map((_, i) => {
        const layerIdx = LAYER_COUNT - 1 - i;
        const offset = (layerIdx + 1) * LAYER_STEP;
        return (
          <circle
            key={i}
            cx={cx + offset}
            cy={cy + offset}
            r={r}
            fill={LAYER_COLORS[layerIdx]}
          />
        );
      })}
      {/* Main fill */}
      <circle cx={cx} cy={cy} r={r} fill={bgColor} />
      {/* Border stroke */}
      <circle
        cx={cx}
        cy={cy}
        r={r - BORDER_WIDTH / 2}
        fill="none"
        stroke={borderColor}
        strokeWidth={BORDER_WIDTH}
      />
    </svg>
  );
}

// Octagon node dimensions
const OCT_W = 224;
const OCT_H = 120;

// Quiz circle size
const QUIZ_SIZE = 128;

export function RoadmapNode({ data, selected }: { data: RoadmapNodeData; selected?: boolean }) {
  const isLocked = data.locked;
  const isCompleted = data.progress === 100;
  const isActive = data.progress > 0 && data.progress < 100;
  const isCurrent = !!data.isCurrent;
  const kind = data.kind || 'lesson';
  const isJumping = !!data.isJumping;
  const isMascotJumping = !!data.isMascotJumping;
  const decaySeverity = data.decayHealth != null ? Math.max(0, (100 - data.decayHealth) / 100) : 0;
  const isDecaying = decaySeverity > 0;
  const bgColor = isDecaying
    ? `color-mix(in srgb, ${isCurrent ? '#3d7a7a' : isActive ? '#eaf4f4' : '#ffffff'} ${100 - decaySeverity * 30}%, #c8a060 ${decaySeverity * 30}%)`
    : isCurrent ? '#3d7a7a' : isActive ? '#eaf4f4' : isLocked ? 'rgba(255,255,255,0.7)' : '#ffffff';
  const borderColor = isDecaying
    ? `color-mix(in srgb, #7ab8b8 ${100 - decaySeverity * 60}%, #a0642a ${decaySeverity * 60}%)`
    : selected ? '#f7d22e' : isCurrent ? '#2e6666' : isActive ? '#4a9696' : '#7ab8b8';

  // ── QUIZ (circle) ──────────────────────────────────────────────
  if (kind === 'quiz') {
    return (
      <div
        style={{
          position: 'relative',
          width: QUIZ_SIZE,
          height: QUIZ_SIZE,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CirclePixelBorder size={QUIZ_SIZE} borderColor={borderColor} bgColor={bgColor} />
        {isCurrent && !data.isJumping && <CharacterMascot isJumping={isMascotJumping} />}
        {isDecaying && <CrackOverlay width={QUIZ_SIZE} height={QUIZ_SIZE} severity={decaySeverity} />}
        <Handle type="target" position={Position.Left} className="opacity-0!" />
        <span
          style={{ position: 'relative', zIndex: 1 }}
          className={`text-xs leading-tight uppercase tracking-tight text-center px-2 ${isCurrent ? 'text-white' : isLocked ? 'text-slate-400' : 'text-slate-700'}`}
        >
          {data.label}
        </span>
        <Handle type="source" position={Position.Right} className="opacity-0!" />
      </div>
    );
  }

  // ── PROJECT (octagon) ─────────────────────────────────────────
  if (kind === 'project') {
    return (
      <div
        style={{
          position: 'relative',
          width: OCT_W,
          height: OCT_H,
          margin: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <OctagonPixelBorder
          width={OCT_W}
          height={OCT_H}
          borderColor={borderColor}
          bgColor={bgColor}
        />
        {isCurrent && !data.isJumping && <CharacterMascot isJumping={isMascotJumping} />}
        {isDecaying && <CrackOverlay width={OCT_W} height={OCT_H} severity={decaySeverity} />}
        <Handle type="target" position={Position.Left} className="opacity-0!" />
        <div
          style={{ position: 'relative', zIndex: 1, width: '100%' }}
          className={`flex flex-col gap-2 px-5 py-4 ${isCurrent ? 'text-white' : isActive ? 'text-[#2e6666]' : isLocked ? 'text-slate-400' : 'text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            {isLocked ? (
              <LockIcon />
            ) : isCompleted ? (
              <CheckIcon />
            ) : isCurrent ? (
              <CurrentIcon />
            ) : (
              <ProjectIcon />
            )}
            <span className="text-sm leading-tight uppercase tracking-tight">
              {data.label}
            </span>
          </div>
          {!isLocked && (
            <div className="flex flex-col gap-1 w-full">
              <PixelProgressBar progress={data.progress} isActive={isCurrent} />
              <div className="flex justify-between items-center text-[10px] font-normal">
                <span>{isActive ? `${data.progress}%` : ''}</span>
                <span className={isCurrent ? 'text-white/80' : 'text-[#4a9696]'}>
                  {isActive ? 'IN PROGRESS' : isCurrent ? 'CURRENT' : `${data.progress}%`}
                </span>
              </div>
            </div>
          )}
          {isLocked && <span className="text-[10px] uppercase tracking-widest font-normal opacity-60">Locked</span>}
        </div>
        <Handle type="source" position={Position.Right} className="opacity-0!" />
      </div>
    );
  }

  // ── Concept Node Content Styling ────────────────────────────
  return (
    <div
      style={{
        borderRadius: 0,
        border: 'none',
        boxShadow: getPixelBoxShadow(borderColor, bgColor),
        margin: '16px',
        backgroundColor: bgColor,
      }}
      className={`shadow-sm transition-all flex flex-col items-center justify-center relative px-5 py-4 w-56 min-h-25
        ${isCurrent ? 'text-white' : isActive ? 'text-[#2e6666]' : isLocked ? 'bg-white/70 text-slate-400' : 'text-slate-700'}
        ${selected ? 'shadow-lg' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="opacity-0!" />
      {isCurrent && !data.isJumping && <CharacterMascot isJumping={isMascotJumping} />}
      {isDecaying && <CrackOverlay width={224} height={100} severity={decaySeverity} />}
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center gap-2">
          {isLocked ? (
            <LockIcon />
          ) : isCompleted ? (
            <CheckIcon />
          ) : isCurrent ? (
            <CurrentIcon />
          ) : (
            <ProgressIcon />
          )}
          <span className="text-sm leading-tight uppercase tracking-tight">
            {data.label}
          </span>
        </div>
        {!isLocked && (
          <div className="flex flex-col gap-1 w-full">
            <PixelProgressBar progress={data.progress} isActive={isCurrent} />
            <div className="flex justify-between items-center text-[10px] font-normal">
              <span>{isActive ? `${data.progress}%` : ''}</span>
              <span className={isCurrent ? 'text-white/80' : 'text-[#4a9696]'}>
                {isActive ? 'IN PROGRESS' : isCurrent ? 'CURRENT' : `${data.progress}%`}
              </span>
            </div>
          </div>
        )}
        {isLocked && <span className="text-[10px] uppercase tracking-widest font-normal opacity-60">Locked</span>}
      </div>
      <Handle type="source" position={Position.Right} className="opacity-0!" />
    </div>
  );
}