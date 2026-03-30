'use client';

import Image from 'next/image';
import { Handle, Position } from '@xyflow/react';

const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

const ProgressIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
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
}

const BAR_COLOR = '#3d7a7a';

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
function Mascot() {
  return (
    <Image
      src="/snoopy.png"
      alt="Character"
      width={104}
      height={104}
      style={{
        position: 'absolute',
        objectFit: 'contain',
        top: -73,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 10,
        pointerEvents: 'none',
        //imageRendering: 'pixelated',
      }}
    />
  );
}

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
  const kind = data.kind || 'lesson';

  const bgColor = isActive ? '#3d7a7a' : isLocked ? 'rgba(255,255,255,0.7)' : '#ffffff';
  const borderColor = selected ? '#f7d22e' : isActive ? '#2e6666' : '#7ab8b8';

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
        {isActive && <Mascot />}
        <Handle type="target" position={Position.Left} className="opacity-0!" />
        <span
          style={{ position: 'relative', zIndex: 1 }}
          className="font-bold text-xs leading-tight uppercase tracking-tight text-center px-2"
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
        {isActive && <Mascot />}
        <Handle type="target" position={Position.Left} className="opacity-0!" />
        <div
          style={{ position: 'relative', zIndex: 1, width: '100%' }}
          className={`flex flex-col gap-2 px-5 py-4 ${isActive ? 'text-white' : isLocked ? 'text-slate-400' : 'text-slate-700'}`}
        >
          <div className="flex items-center gap-2">
            {isLocked ? (
              <LockIcon />
            ) : isCompleted ? (
              <CheckIcon />
            ) : (
              <ProjectIcon />
            )}
            <span className="font-bold text-sm leading-tight uppercase tracking-tight">
              {data.label}
            </span>
          </div>
          {!isLocked && (
            <div className="flex flex-col gap-1 w-full">
              <PixelProgressBar progress={data.progress} isActive={isActive} />
              <div className="flex justify-between items-center text-[10px] font-black">
                <span>{isActive ? `${data.progress}%` : ''}</span>
                <span className={isActive ? 'text-white/80' : 'text-slate-400'}>
                  {isActive ? 'IN PROGRESS' : `${data.progress}%`}
                </span>
              </div>
            </div>
          )}
          {isLocked && <span className="text-[10px] uppercase tracking-widest font-black opacity-60">Locked</span>}
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
      }}
      className={`shadow-sm transition-all flex flex-col items-center justify-center relative px-5 py-4 w-56 min-h-25
        ${isActive ? 'bg-[#3d7a7a] text-white' : isLocked ? 'bg-white/70 text-slate-400' : 'bg-white text-slate-700'}
        ${selected ? 'shadow-lg' : ''}`}
    >
      <Handle type="target" position={Position.Left} className="opacity-0!" />
      {isActive && <Mascot />}
      <div className="flex flex-col gap-2 w-full">
        <div className="flex items-center gap-2">
          {isLocked ? (
            <LockIcon />
          ) : isCompleted ? (
            <CheckIcon />
          ) : (
            <ProgressIcon />
          )}
          <span className="font-bold text-sm leading-tight uppercase tracking-tight">
            {data.label}
          </span>
        </div>
        {!isLocked && (
          <div className="flex flex-col gap-1 w-full">
            <PixelProgressBar progress={data.progress} isActive={isActive} />
            <div className="flex justify-between items-center text-[10px] font-black">
              <span>{isActive ? `${data.progress}%` : ''}</span>
              <span className={isActive ? 'text-white/80' : 'text-slate-400'}>
                {isActive ? 'IN PROGRESS' : `${data.progress}%`}
              </span>
            </div>
          </div>
        )}
        {isLocked && <span className="text-[10px] uppercase tracking-widest font-black opacity-60">Locked</span>}
      </div>
      <Handle type="source" position={Position.Right} className="opacity-0!" />
    </div>
  );
}