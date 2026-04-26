'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Navbar } from '../components/NavBar';
import fire from '../../icons/fire.png';
import { useRouter } from 'next/navigation';
import { api, type DashboardResponse, type DashboardRoadmap, type Checkpoint, type RoadmapEdge } from '@/lib/api';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  ReactFlowProvider,
  useReactFlow,
  useNodesInitialized,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { RoadmapNode } from '@/app/components/RoadmapNode';
import { applyDagreLayout } from '@/lib/layout';
import PixelProgress from '@/app/components/PixelProgress';

// ─── Minimap helpers (mirrors map/page.tsx) ───────────────────────────────────
const miniNodeTypes = { roadmap: RoadmapNode };

function toMiniFlowNodes(checkpoints: Checkpoint[]) {
  const currentCP = checkpoints.find(cp => !cp.locked && cp.progress < 100);
  return checkpoints.map(cp => ({
    id: cp.id,
    type: 'roadmap' as const,
    data: { label: cp.label, progress: cp.progress, locked: cp.locked, kind: cp.kind, isCurrent: cp === currentCP },
    position: cp.position,
  }));
}

function toMiniFlowEdges(edges: RoadmapEdge[], checkpoints: Checkpoint[]) {
  return edges.map(e => {
    const sourceCP = checkpoints.find(cp => cp.id === e.source);
    const unlocked = sourceCP && !sourceCP.locked;
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'step' as const,
      animated: false,
      style: {
        stroke: unlocked ? '#04A0FF' : '#8ED4FF',
        strokeWidth: 7,
        strokeDasharray: '8 14',
        strokeLinecap: 'square' as const,
        animation: unlocked ? 'stones-fwd 2.4s linear infinite' : 'none',
      },
    };
  });
}

// ─── Static fallback shown when a roadmap has no generated data ───────────────
const EDGE_STYLE = { stroke: '#8ED4FF', strokeWidth: 7, strokeDasharray: '8 14', strokeLinecap: 'square' as const };
const FALLBACK_NODES = [
  { id: 'f1', type: 'roadmap' as const, position: { x: 0,    y: 60 }, data: { label: 'Concept 1', progress: 0, locked: false, kind: 'lesson', isCurrent: true  } },
  { id: 'f2', type: 'roadmap' as const, position: { x: 320,  y: 60 }, data: { label: 'Concept 2', progress: 0, locked: true,  kind: 'lesson', isCurrent: false } },
  { id: 'f3', type: 'roadmap' as const, position: { x: 640,  y: 60 }, data: { label: 'Concept 3', progress: 0, locked: true,  kind: 'lesson', isCurrent: false } },
  // Ghost node off-screen right — makes the edge trail off the viewport edge
  { id: 'f4', type: 'roadmap' as const, position: { x: 1100, y: 60 }, data: { label: 'Concept 4', progress: 0, locked: true,  kind: 'lesson', isCurrent: false }, style: { opacity: 0, pointerEvents: 'none' as const } },
];
const FALLBACK_EDGES = [
  { id: 'fe1', source: 'f1', target: 'f2', type: 'step' as const, animated: false, style: EDGE_STYLE },
  { id: 'fe2', source: 'f2', target: 'f3', type: 'step' as const, animated: false, style: EDGE_STYLE },
  { id: 'fe3', source: 'f3', target: 'f4', type: 'step' as const, animated: false, style: EDGE_STYLE },
];

// f1 center in world coords: x=128, y=130
const FALLBACK_CENTER = { x: 128 + 220, y: 130 };

function FallbackMiniMap() {
  const { setCenter } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nodes, , onNodesChange] = useNodesState<any>(FALLBACK_NODES);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [edges, , onEdgesChange] = useEdgesState<any>(FALLBACK_EDGES);

  useEffect(() => {
    if (nodesInitialized) setCenter(FALLBACK_CENTER.x, FALLBACK_CENTER.y, { zoom: 0.65, duration: 0 });
  }, [nodesInitialized]); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <ReactFlow
      nodes={nodes} edges={edges}
      onNodesChange={onNodesChange} onEdgesChange={onEdgesChange}
      nodeTypes={miniNodeTypes}
      nodesDraggable={false} nodesConnectable={false}
      elementsSelectable={false} zoomOnScroll={false}
      panOnScroll={false} panOnDrag={false}
    >
      <Background variant={BackgroundVariant.Dots} color="#8ED4FF" gap={24} size={1.5} />
    </ReactFlow>
  );
}

// ─── Mini roadmap canvas ──────────────────────────────────────────────────────
function MiniRoadmapContent({ roadmapId }: { roadmapId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [anchorCenter, setAnchorCenter] = useState<{ x: number; y: number } | null>(null);
  const { setCenter } = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  useEffect(() => {
    api.roadmapMap(roadmapId)
      .then(data => {
        const flowNodes = toMiniFlowNodes(data.checkpoints);
        const flowEdges = toMiniFlowEdges(data.edges, data.checkpoints);
        const laidOut = applyDagreLayout(flowNodes, flowEdges);
        // Find anchor: first in-progress node → first unlocked node → leftmost node
        const activeCP =
          data.checkpoints.find(cp => !cp.locked && cp.progress < 100) ??
          data.checkpoints.find(cp => !cp.locked) ??
          null;
        const anchorNode = activeCP
          ? laidOut.find(n => n.id === activeCP.id)
          : laidOut.reduce((min, n) => (n.position.x < min.position.x ? n : min), laidOut[0]);
        // Show anchor + next 3 nodes to its right (sorted by x, then y for tie-breaking)
        const cutoff = anchorNode?.position.x ?? 0;
        const fromAnchor = laidOut
          .filter(n => n.position.x >= cutoff)
          .sort((a, b) => a.position.x - b.position.x || a.position.y - b.position.y);
        const visibleNodes = fromAnchor.slice(0, 4);
        const visibleIds = new Set(visibleNodes.map(n => n.id));
        const visibleEdges = flowEdges.filter(e => visibleIds.has(e.source) && visibleIds.has(e.target));
        setNodes(visibleNodes);
        setEdges(visibleEdges);
        // Store anchor center so we can position the viewport consistently
        if (anchorNode) {
          setAnchorCenter({ x: anchorNode.position.x + 128, y: anchorNode.position.y + 70 });
        }
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [roadmapId]); // eslint-disable-line react-hooks/exhaustive-deps
  // Position viewport so the anchor node sits in the left portion of the minimap
  useEffect(() => {
    if (!nodesInitialized || nodes.length === 0 || !anchorCenter) return;
    // Shift center 180 units right of anchor so anchor appears near the left edge with padding
    setCenter(anchorCenter.x + 220, anchorCenter.y, { zoom: 0.65, duration: 0 });
  }, [nodesInitialized]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="flex items-center justify-center h-full text-[#78ADCF] text-sm">Loading map...</div>;
  }

  if (error) {
    return (
      <div className="w-full h-full bg-[#E1FAFF]">
        <ReactFlowProvider>
          <FallbackMiniMap />
        </ReactFlowProvider>
      </div>
    );
  }

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={miniNodeTypes}
      nodesDraggable={false}
      nodesConnectable={false}
      elementsSelectable={false}
      zoomOnScroll={false}
      panOnScroll={false}
      panOnDrag={false}
    >
      <Background variant={BackgroundVariant.Dots} color="#8ED4FF" gap={24} size={1.5} />
    </ReactFlow>
  );
}

function MiniRoadmap({ roadmapId }: { roadmapId: string }) {
  return (
    <div className="w-full h-full bg-[#E1FAFF]">
      <ReactFlowProvider>
        <MiniRoadmapContent roadmapId={roadmapId} />
      </ReactFlowProvider>
    </div>
  );
}

// ─── Pixel primitives (inlined) ─────────────────────────────────────────────────────────

interface PixelButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'yellow';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  disabled?: boolean;
  type?: 'button' | 'submit';
}

function PixelButton({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  type = 'button',
}: PixelButtonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'primary':
        return 'bg-[#04A0FF] hover:bg-[#1aadff] active:bg-[#0080cc] text-white border-t-[#8ED4FF] border-l-[#8ED4FF] border-r-[#0060aa] border-b-[#0060aa]';
      case 'secondary':
        return 'bg-[#BEF8FF] hover:bg-[#d4fbff] active:bg-[#a0f0ff] text-[#334155] border-t-[#DEF2FF] border-l-[#DEF2FF] border-r-[#78ADCF] border-b-[#78ADCF]';
      case 'yellow':
        return 'bg-[#F9EC72] hover:bg-[#fdf0a0] active:bg-[#f0e050] text-[#334155] border-t-[#fdf8c0] border-l-[#fdf8c0] border-r-[#c8b800] border-b-[#c8b800]';
      case 'ghost':
        return 'bg-transparent hover:bg-[#BEF8FF] active:bg-[#8ED4FF] text-[#04A0FF] border-transparent';
    }
  };

  const getSizeClasses = () => {
    switch (size) {
      case 'xs':
        return 'px-2.5 py-1 text-xs';
      case 'sm':
        return 'px-4 py-2 text-xs';
      case 'md':
        return 'px-6 py-3 text-sm';
      case 'lg':
        return 'px-8 py-4 text-base';
    }
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`
        pixel-border
        ${getVariantClasses()}
        ${getSizeClasses()}
        transition-all duration-100
        disabled:opacity-50 disabled:cursor-not-allowed
        active:translate-y-[2px]
        image-rendering-pixelated
        border-4
      `}
      style={{
        fontFamily: "'Press Start 2P', monospace",
        imageRendering: 'pixelated',
      }}
    >
      {children}
    </button>
  );
}

interface PixelCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  selected?: boolean;
  hover?: boolean;
  className?: string;
}

function PixelCard({
  children,
  onClick,
  selected = false,
  hover = true,
  className = '',
}: PixelCardProps) {
  return (
    <div
      onClick={onClick}
      className={`
        pixel-border
        bg-white
        border-4
        border-t-[#DEF2FF] border-l-[#DEF2FF]
        border-r-[#334155] border-b-[#334155]
        transition-all duration-100
        ${onClick ? 'cursor-pointer' : ''}
        ${hover && onClick ? 'hover:bg-[#E1FAFF] hover:translate-y-[-2px]' : ''}
        ${selected ? 'border-t-[#8ED4FF] border-l-[#8ED4FF] border-r-[#334155] border-b-[#334155] bg-[#BEF8FF]' : ''}
        active:translate-y-[1px]
        ${className}
      `}
    >
      {children}
    </div>
  );
}


// ─── Dashboard ────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [displayProgress, setDisplayProgress] = useState(0);
  const [selectedRoadmap, setSelectedRoadmap] = useState<DashboardRoadmap | null>(null);

  useEffect(() => {
    // Gate: redirect to onboarding if not completed
    api.currentUser()
      .then(user => { if (!user.onboarding_completed) router.replace("/OnBoarding/Major"); })
      .catch(() => {});

    api.dashboard()
      .then(d => {
        setData(d);
        // Default minimap to whichever roadmap matches the map page (active_roadmap)
        const preferred = d.roadmaps.find(r => r.id === d.active_roadmap.id);
        const active = (preferred && preferred.progress_percentage > 0)
          ? preferred
          : (d.roadmaps.find(r => r.progress_percentage > 0) ?? preferred ?? d.roadmaps[0] ?? null);
        setSelectedRoadmap(active);
        const timer = setTimeout(() => setDisplayProgress(d.active_roadmap.progress_percentage), 300);
        return () => clearTimeout(timer);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-linear-to-b from-[#7EC8E3] to-[#E1FAFF] flex items-center justify-center">
        <p className="text-[#78ADCF]">Loading...</p>
      </div>
    );
  }

  const userName = data?.user.name ?? '';
  const xpTotal = data?.user.xp_total?.toLocaleString() ?? '0';
  const tasksCompleted = data?.gamification.tasks_completed ?? 0;
  const roadmaps = data?.roadmaps ?? [];
  const leaderboard = data?.leaderboard ?? [];

  return (
    // ── Page background: gradient from sky blue to light cyan ──
    <div className="min-h-screen w-full bg-linear-to-b from-[#7EC8E3] to-[#E1FAFF] relative">
      <Navbar />

      <div className="pt-25 px-8 pb-5 ml-8 mr-7">
        <div className="max-w-7xl mx-auto">

          {/* Header row */}
          <div className="flex items-start justify-between mb-6 gap-4">

            {/* Left: title */}
            <div>
              <div className='flex items-center'>
                {/* Title text: 334155 (Charcoal Blue) */}
                <h1 className="text-5xl text-[#334155] leading-tight tracking-wider">Dashboard</h1>
              </div>
              {/* Subtitle: slightly lighter, using Sky Reflection */}
              <p className="text-xl text-[#78ADCF] mt-1">Welcome back, {userName}</p>
            </div>

            {/* Right: quick stats + today's challenge */}
            <div className="flex items-stretch gap-3 shrink-0">

              {/* XP — Star icon + value in F9EC72 (Banana Cream yellow) */}
              <div className="flex items-center gap-3 px-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 shrink-0" style={{ color: '#F9EC72' }}>
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                {/* Currency/XP number also in F9EC72 per whiteboard */}
                <p className="text-4xl whitespace-nowrap" style={{ color: '#F9EC72' }}>XP: {xpTotal}</p>
              </div>

              {/* Progress ring — green (84BC2F = Lime Moss) per whiteboard */}
              <div className="flex items-center gap-3 px-2">
                <div className="relative w-10 h-10 shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#DEF2FF" strokeWidth="28" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#84BC2F" strokeWidth="28"
                      strokeDasharray={`${displayProgress * 5.03} 502`} strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 1s ease-out' }} transform="rotate(-90 100 100)" />
                  </svg>
                </div>
                <p className="text-4xl text-[#334155] whitespace-nowrap">{displayProgress}%</p>
              </div>

              {/* Today's Challenge — consistent top-left with other cards: DEF2FF */}
              <PixelCard className="bg-[#BEF8FF] px-5 py-2.5 flex items-center gap-4 !border-t-[#DEF2FF] !border-l-[#DEF2FF] !border-r-[#334155] !border-b-[#334155]">
                <div>
                  <p className="text-lg uppercase tracking-normal opacity-75 leading-none mb-0.5 text-[#334155]">Today&apos;s Challenge</p>
                  <p className="text-lg tracking-normal leading-tight text-[#334155]">Build a useState counter</p>
                </div>
                {/* Open Map / action buttons → yellow (F9EC72) per whiteboard */}
                <PixelButton variant="yellow" size="sm">
                  Start →
                </PixelButton>
              </PixelCard>
            </div>
          </div>

          {/* Main content: 3 columns */}
          <div className="grid grid-cols-12 gap-6">

            {/* LEFT col: Streak Leaderboard */}
            <PixelCard className="col-span-3 p-6 h-100 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#BEF8FF] flex items-center justify-center">
                    <Image src={fire} alt="Fire Icon" className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl text-[#334155] uppercase tracking-wider">Leaderboard</h2>
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                {leaderboard.slice(0, 4).map((user) => (
                  <div key={user.rank}
                    className={`flex items-center gap-3 px-4 py-3 transition-all border-2
                      ${user.is_you
                        // highlighted row for "you": BEF8FF bg, consistent borders
                        ? 'bg-[#BEF8FF] border-t-[#DEF2FF] border-l-[#DEF2FF] border-r-[#334155] border-b-[#334155]'
                        : 'bg-white border-t-[#DEF2FF] border-l-[#DEF2FF] border-r-[#8ED4FF] border-b-[#8ED4FF]'}`}>
                    <span className={`text-base font-normal w-6 text-center shrink-0 ${user.is_you ? 'text-[#04A0FF]' : 'text-[#78ADCF]'}`}>
                      {user.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-normal text-[#334155]">{user.is_you ? 'You' : user.name}</p>
                      <p className="text-lg text-[#78ADCF]">{user.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-base font-normal ${user.is_you ? 'text-[#334155]' : 'text-[#78ADCF]'}`}>
                        {user.streak}
                      </span>
                      <Image src={fire} alt="Fire Icon" className="h-5 w-5" />
                    </div>
                  </div>
                ))}
              </div>
            </PixelCard>

            {/* MIDDLE col: My Roadmaps */}
            <PixelCard className="col-span-3 p-5 flex flex-col h-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl text-[#334155] tracking-wider">MY ROADMAPS</h2>
                <span className="text-2xl text-[#04A0FF] cursor-pointer hover:text-[#0080cc] leading-none select-none">+</span>
              </div>

              <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                {roadmaps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-8">
                    <p className="text-sm text-[#78ADCF] mb-2">No roadmaps yet</p>
                    <a href="/OnBoarding/Major" className="text-xs text-[#04A0FF] bg-[#BEF8FF] hover:bg-[#8ED4FF] px-4 py-1.5 rounded-xl transition-colors">
                      Complete onboarding to generate your roadmap
                    </a>
                  </div>
                ) : roadmaps.map((rm: DashboardRoadmap) => {
                  return (
                    <div
                      key={rm.id}
                      onClick={() => setSelectedRoadmap(rm)}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-all hover:-translate-y-px border-2
                        ${selectedRoadmap?.id === rm.id
                          ? 'bg-[#BEF8FF] border-t-[#DEF2FF] border-l-[#DEF2FF] border-r-[#334155] border-b-[#334155]'
                          : 'bg-white border-t-[#DEF2FF] border-l-[#DEF2FF] border-r-[#8ED4FF] border-b-[#8ED4FF]'
                        }`}
                    >
                      <div className="flex-1">
                        <p className="text-base text-[#334155] tracking-normal mb-1.5">{rm.title}</p>
                        <PixelProgress value={rm.progress_percentage} showLabel={false} trackColor="#8ED4FF" fillColor="#04A0FF" />
                      </div>
                    </div>
                  );
                })}
              </div>
            </PixelCard>

            {/* RIGHT col: Minimap */}
            <PixelCard className="col-span-6 p-5 flex flex-col h-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl text-[#334155] tracking-wider">MAP</h2>
                {/* Open Map → yellow button per whiteboard */}
                <PixelButton variant="yellow" size="xs" onClick={() => router.push(selectedRoadmap ? `/map?roadmap=${selectedRoadmap.id}` : '/map')}>
                  Open Full Map →
                </PixelButton>
              </div>
              <div className="flex-1 relative">
                {selectedRoadmap ? (
                  <MiniRoadmap key={selectedRoadmap.id} roadmapId={selectedRoadmap.id} />
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-[#8ED4FF] tracking-normal">
                    Select a roadmap to preview
                  </div>
                )}
              </div>
            </PixelCard>

          </div>
        </div>
      </div>
    </div>
  );
}