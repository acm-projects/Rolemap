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

// ─── Mini roadmap canvas ──────────────────────────────────────────────────────
function MiniRoadmapContent({ roadmapId }: { roadmapId: string }) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const { fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();

  useEffect(() => {
    api.roadmapMap(roadmapId)
      .then(data => {
        const flowNodes = toMiniFlowNodes(data.checkpoints);
        const flowEdges = toMiniFlowEdges(data.edges, data.checkpoints);
        const laidOut = applyDagreLayout(flowNodes, flowEdges);
        setNodes(laidOut);
        setEdges(flowEdges);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [roadmapId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fit once ReactFlow has actually measured all nodes
  useEffect(() => {
    if (nodesInitialized && nodes.length > 0) {
      fitView({ duration: 0, padding: 0.15 });
    }
  }, [nodesInitialized]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <div className="flex items-center justify-center h-full text-slate-400 text-sm">Loading map...</div>;
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-2">
        <p className="text-slate-400 text-sm">No map data available</p>
        <p className="text-slate-300 text-xs">This roadmap hasn&apos;t been generated yet</p>
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
        const active = d.roadmaps.find(r => r.id === d.active_roadmap.id) ?? d.roadmaps[0] ?? null;
        setSelectedRoadmap(active);
        const timer = setTimeout(() => setDisplayProgress(d.active_roadmap.progress_percentage), 300);
        return () => clearTimeout(timer);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-[#eef1f7] flex items-center justify-center">
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
          <div className="flex items-start justify-between mb-6 gap-4">

            {/* Left: title */}
            <div>
              <div className='flex items-center '>
                <h1 className="text-5xl text-slate-700 leading-tight tracking-wider">Dashboard</h1>
              </div>
              <p className="text-xl text-[#508484] mt-1">Welcome back, {userName}</p>
            </div>

            {/* Right: quick stats + today's challenge */}
            <div className="flex items-stretch gap-3 shrink-0">

              {/* XP — no box */}
              <div className="flex items-center gap-3 px-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-yellow-400 shrink-0">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
                <p className="text-4xl text-slate-700 whitespace-nowrap">XP: {xpTotal}</p>
              </div>

              {/* Progress — no box */}
              <div className="flex items-center gap-3 px-2">
                <div className="relative w-10 h-10 shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#e2e8f0" strokeWidth="28" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#4a7c7c" strokeWidth="28"
                      strokeDasharray={`${displayProgress * 5.03} 502`} strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 1s ease-out' }} transform="rotate(-90 100 100)" />
                  </svg>
                </div>
                <p className="text-4xl text-slate-700 whitespace-nowrap">{displayProgress}%</p>
              </div>

              {/* Today's Challenge — PixelCard with gradient + PixelButton */}
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

            {/* LEFT col: Streak Leaderboard */}
            <PixelCard className="col-span-3 p-6 h-100 flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <Image src={fire} alt="Fire Icon" className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl text-slate-700 uppercase tracking-wider">Leaderboard</h2>
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
                <h2 className="text-2xl text-slate-700 tracking-wider">MY ROADMAPS</h2>
                <span className="text-2xl text-slate-400 cursor-pointer hover:text-slate-600 leading-none select-none">+</span>
              </div>

              <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
                {roadmaps.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center py-8">
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
                <h2 className="text-2xl text-slate-700 tracking-wider">MAP</h2>
                <PixelButton variant="secondary" size="xs" onClick={() => router.push('/map')}>
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
