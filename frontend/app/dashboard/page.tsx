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
        stroke: unlocked ? '#548080' : '#c8d0dc',
        strokeWidth: 7,
        strokeDasharray: '8 14',
        strokeLinecap: 'square' as const,
        animation: unlocked ? 'stones-fwd 2.4s linear infinite' : 'none',
      },
    };
  });
}

// ─── Static fallback shown when a roadmap has no generated data ───────────────
const EDGE_STYLE = { stroke: '#c8d0dc', strokeWidth: 7, strokeDasharray: '8 14', strokeLinecap: 'square' as const };
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
      <Background variant={BackgroundVariant.Dots} color="#d1d5db" gap={24} size={1.5} />
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
    return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading map...</div>;
  }

  if (error) {
    return (
      <div className="w-full h-full bg-[#eef1f7]">
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
      <Background variant={BackgroundVariant.Dots} color="#d1d5db" gap={24} size={1.5} />
    </ReactFlow>
  );
}

function MiniRoadmap({ roadmapId }: { roadmapId: string }) {
  return (
    <div className="w-full h-full bg-[#eef1f7]">
      <ReactFlowProvider>
        <MiniRoadmapContent roadmapId={roadmapId} />
      </ReactFlowProvider>
    </div>
  );
}

// ─── Pixel primitives (inlined) ───────────────────────────────────────────────

interface PixelButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
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
        return 'bg-[#4e8888] hover:bg-[#5e9a9a] active:bg-[#3a6666] text-white border-t-[#7ab3b3] border-l-[#7ab3b3] border-r-[#2d5050] border-b-[#2d5050]';
      case 'secondary':
        return 'bg-[#d4e8e8] hover:bg-[#c0dede] active:bg-[#b0d0d0] text-[#2d5050] border-t-[#e8f4f4] border-l-[#e8f4f4] border-r-[#9fc9c9] border-b-[#9fc9c9]';
      case 'ghost':
        return 'bg-transparent hover:bg-[#e8f4f4] active:bg-[#d4e8e8] text-[#4e8888] border-transparent';
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
        border-t-[#d4e8e8] border-l-[#d4e8e8]
        border-r-[#7ab3b3] border-b-[#7ab3b3]
        transition-all duration-100
        ${onClick ? 'cursor-pointer' : ''}
        ${hover && onClick ? 'hover:bg-[#f0f8f8] hover:translate-y-[-2px]' : ''}
        ${selected ? 'border-t-[#7ab3b3] border-l-[#7ab3b3] border-r-[#4e8888] border-b-[#4e8888] bg-[#e8f4f4]' : ''}
        active:translate-y-[1px]
        ${className}
      `}
    >
      {children}
    </div>
  );
}

// ─── Minimap ──────────────────────────────────────────────────────────────────

function RoadmapMinimap({
  nodes,
  edges,
  doneNodes,
  active,
}: {
  nodes: { x: number; y: number }[];
  edges: { a: number; b: number; done: boolean }[];
  doneNodes: number[];
  active: boolean;
}) {
  return (
    <svg viewBox="0 0 100 100" className="w-full h-full" preserveAspectRatio="xMidYMid meet" style={{ opacity: active ? 1 : 0.7 }}>
      {edges.map((e, i) => {
        const na = nodes[e.a], nb = nodes[e.b];
        return (
          <line key={i} x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
            stroke={e.done ? '#4a7c7c' : '#cbd5e1'} strokeWidth="2.5"
            strokeDasharray={e.done ? 'none' : '4 3'} />
        );
      })}
      {nodes.map((n, i) => (
        <circle key={i} cx={n.x} cy={n.y} r="6"
          fill={doneNodes.includes(i) ? '#4a7c7c' : '#e2e8f0'} stroke="white" strokeWidth="2" />
      ))}
    </svg>
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
      <div className="min-h-screen w-full bg-[#f0f8f8] flex items-center justify-center">
        <p className="text-slate-400">Loading...</p>
      </div>
    );
  }

  const userName = data?.user.name ?? '';
  const xpTotal = data?.user.xp_total?.toLocaleString() ?? '0';
  const tasksCompleted = data?.gamification.tasks_completed ?? 0;
  const roadmaps = data?.roadmaps ?? [];
  const leaderboard = data?.leaderboard ?? [];

  return (
    <div className="min-h-screen w-full bg-[#f0f8f8] relative">
      <Navbar />

      <div className="pt-25 px-8 pb-5 ml-8 mr-7">
        <div className="max-w-7xl mx-auto">

          {/* Header row */}
          <div className="flex items-start justify-between mb-8 gap-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                {data?.active_roadmap.title} Path
              </p>
              <div className='flex items-center '>
                <h1 className="text-4xl font-bold text-slate-700 leading-tight">Dashboard</h1>
              </div>
              <p className="text-xl text-[#508484] mt-1">Welcome back, {userName}</p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {/* XP block */}
              <PixelCard className="flex items-center gap-2 px-4 py-2.5">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-400">
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Total XP</p>
                  <p className="text-sm font-bold text-slate-700">{xpTotal}</p>
                </div>
              </PixelCard>

              {/* Progress block */}
              <PixelCard className="flex items-center gap-2 px-4 py-2.5">
                <div className="relative w-7 h-7 shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#e2e8f0" strokeWidth="28" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#4a7c7c" strokeWidth="28"
                      strokeDasharray={`${displayProgress * 5.03} 502`} strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 1s ease-out' }} transform="rotate(-90 100 100)" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-[8px] font-bold text-slate-700">{displayProgress}%</span>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Progress</p>
                  <p className="text-sm font-bold text-slate-700">{displayProgress}%</p>
                </div>
              </PixelCard>

              {/* Challenges block */}
              <PixelCard className="flex items-center gap-2 px-4 py-2.5">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-500">
                    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Challenges</p>
                  <p className="text-sm font-bold text-slate-700">{tasksCompleted}/30</p>
                </div>
              </PixelCard>

              {/* Today's Challenge */}
              <PixelCard className="bg-gradient-to-r from-[#4a7c7c] to-[#6fa8a8] px-5 py-2.5 flex items-center gap-4 text-white !border-t-[#6fa8a8] !border-l-[#6fa8a8] !border-r-[#2d5050] !border-b-[#2d5050]">
                <div>
                  <p className="text-lg uppercase tracking-normal opacity-75 leading-none mb-0.5">Today&apos;s Challenge</p>
                  <p className="text-lg tracking-normal leading-tight">Build a useState counter</p>
                </div>
                <PixelButton variant="secondary" size="sm">
                  Start →
                </PixelButton>
              </PixelCard>
            </div>
          </div>

          {/* Main content: 3 columns */}
          <div className="grid grid-cols-12 gap-6">

            {/* LEFT col: Leaderboard */}
            <PixelCard className="col-span-3 p-6 h-100 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <Image src={fire} alt="Fire Icon" className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl text-slate-800 uppercase tracking-wider">Leaderboard</h2>
                </div>
              </div>
              <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                {leaderboard.slice(0, 4).map((user) => (
                  <div key={user.rank}
                    className={`flex items-center gap-3 px-4 py-3 transition-all border-2
                      ${user.is_you
                        ? 'bg-[#d4eaea] border-t-[#4a7c7c] border-l-[#4a7c7c] border-r-[#2d5050] border-b-[#2d5050]'
                        : 'bg-white border-t-[#d4e8e8] border-l-[#d4e8e8] border-r-[#7ab3b3] border-b-[#7ab3b3]'}`}>
                    <span className={`text-base font-normal w-6 text-center shrink-0 ${user.is_you ? 'text-[#4a7c7c]' : 'text-slate-500'}`}>
                      {user.rank}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-normal text-slate-700">{user.is_you ? 'You' : user.name}</p>
                      <p className="text-lg text-slate-400">{user.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className={`text-base font-normal ${user.is_you ? 'text-slate-700' : 'text-slate-500'}`}>
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
                <h2 className="text-2xl text-slate-800 tracking-wider">MY ROADMAPS</h2>
                <span className="text-2xl text-slate-400 cursor-pointer hover:text-slate-600 leading-none select-none">+</span>
              </div>

              <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
                {roadmaps.length === 0 ? (
                  <div className="col-span-2 flex flex-col items-center justify-center text-center py-8">
                    <p className="text-sm text-slate-400 mb-2">No roadmaps yet</p>
                    <a href="/OnBoarding/Major" className="text-xs text-[#4a7c7c] bg-[#4a7c7c]/10 hover:bg-[#4a7c7c]/20 px-4 py-1.5 rounded-xl transition-colors">
                      Complete onboarding to generate your roadmap
                    </a>
                  </div>
                ) : roadmaps.map((rm: DashboardRoadmap) => {
                  return (
                    <div
                      key={rm.id}
                      onClick={() => setSelectedRoadmap(rm)}
                      className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-all hover:-translate-y-px border-2
                        ${rm.progress_percentage > 0
                          ? 'bg-[#d4eaea] border-t-[#4a7c7c] border-l-[#4a7c7c] border-r-[#2d5050] border-b-[#2d5050]'
                          : 'bg-white border-t-[#d4e8e8] border-l-[#d4e8e8] border-r-[#7ab3b3] border-b-[#7ab3b3]'
                        }`}
                    >
                      <div className="flex-1">
                        <p className="text-base text-slate-700 tracking-normal mb-1.5">{rm.title}</p>
                        <PixelProgress value={rm.progress_percentage} showLabel={false} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </PixelCard>

            {/* RIGHT col: Minimap — always visible, widest panel */}
            <PixelCard className="col-span-6 p-5 flex flex-col h-100">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl text-slate-800 tracking-wider">MAP</h2>
                <PixelButton variant="secondary" size="xs" onClick={() => router.push(selectedRoadmap ? `/map?roadmap=${selectedRoadmap.id}` : '/map')}>
                  Open Full Map →
                </PixelButton>
              </div>
              <div className="flex-1 relative">
                {selectedRoadmap ? (
                  <MiniRoadmap key={selectedRoadmap.id} roadmapId={selectedRoadmap.id} />
                ) : (
                  <div className="flex items-center justify-center h-full text-sm text-slate-300 tracking-normal">
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
