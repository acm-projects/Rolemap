'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Navbar } from '../components/NavBar';
import fire from '../../icons/fire.png';
import { useRouter } from 'next/navigation';
import { api, type DashboardResponse, type DashboardRoadmap } from '@/lib/api';

// ─── Pixel primitives (inlined) ───────────────────────────────────────────────

interface PixelButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
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

  useEffect(() => {
    // Gate: redirect to onboarding if not completed
    api.currentUser()
      .then(user => { if (!user.onboarding_completed) router.replace("/OnBoarding/Major"); })
      .catch(() => {});

    api.dashboard()
      .then(d => {
        setData(d);
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
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">
                {data?.active_roadmap.title} Path
              </p>
              <div className='flex items-center '>
                <h1 className="text-5xl text-slate-700 leading-tight tracking-wider">Dashboard</h1>
              </div>
              <p className="text-xl text-[#508484] mt-1">Welcome back, {userName}</p>
            </div>

            {/* Right: quick stats + today's challenge */}
            <div className="flex items-stretch gap-3 flex-shrink-0">

              {/* XP block — PixelCard */}
              <PixelCard className="flex items-center gap-2 px-4 py-2.5">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-400">
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider leading-none">Total XP</p>
                  <p className="text-sm text-slate-700">{xpTotal}</p>
                </div>
              </PixelCard>

              {/* Progress block — PixelCard */}
              <PixelCard className="flex items-center gap-2 px-4 py-2.5">
                <div className="relative w-7 h-7 flex-shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#e2e8f0" strokeWidth="24" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#4a7c7c" strokeWidth="24"
                      strokeDasharray={`${displayProgress * 5.03} 502`} strokeLinecap="round"
                      style={{ transition: 'stroke-dasharray 1s ease-out' }} transform="rotate(-90 100 100)" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase tracking-wider leading-none">Progress</p>
                  <p className="text-sm text-slate-700">{displayProgress}%</p>
                </div>
              </PixelCard>

              {/* Today's Challenge — PixelCard with gradient + PixelButton */}
              <PixelCard className="bg-gradient-to-r from-[#4a7c7c] to-[#6fa8a8] px-5 py-2.5 flex items-center gap-4 text-white !border-t-[#6fa8a8] !border-l-[#6fa8a8] !border-r-[#2d5050] !border-b-[#2d5050]">
                <div>
                  <p className="text-[10px] uppercase tracking-widest opacity-75 leading-none mb-0.5">Today&apos;s Challenge</p>
                  <p className="text-sm leading-tight">Build a useState counter</p>
                </div>
                <PixelButton variant="secondary" size="sm">
                  Start →
                </PixelButton>
              </PixelCard>
            </div>
          </div>

          {/* Main content: 2 columns */}
          <div className="grid grid-cols-12 gap-6">

            {/* LEFT col: Leaderboard — PixelCard */}
            <PixelCard className="col-span-4 p-6 h-[360px] overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <Image src={fire} alt="Fire Icon" className="h-6 w-6" />
                  </div>
                  <h2 className="text-md text-slate-700 uppercase tracking-wider">Streak Leaderboard</h2>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wide">Today</span>
              </div>
              <div className="space-y-1.5">
                {leaderboard.map((user) => (
                  <div key={user.rank}
                    className={`flex items-center gap-3 px-3 py-2 rounded-2xl transition-all
                      ${user.is_you ? 'bg-white border border-slate-200 shadow-sm' : 'hover:bg-slate-50'}`}>
                    <span className={`text-sm font-bold w-5 text-center ${user.is_you ? 'text-[#4a7c7c]' : 'text-slate-300'}`}>
                      {user.rank}
                    </span>
                    <div className="relative w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: user.avatar_bg + (user.is_you ? '33' : '') }}>
                      <span className={`text-xs font-bold ${user.is_you ? 'text-[#4a7c7c]' : 'text-white'}`}>
                        {user.avatar}
                      </span>
                      {user.rank === 1 && <span className="absolute -top-2 -right-1 text-sm">👑</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{user.is_you ? 'You' : user.name}</p>
                      <p className="text-[10px] text-slate-400">{user.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-bold ${user.is_you ? 'text-slate-700' : 'text-slate-500'}`}>
                        {user.streak}
                      </span>
                      <Image src={fire} alt="Fire Icon" className="h-6 w-6" />
                    </div>
                  </div>
                ))}
              </div>
            </PixelCard>

            {/* RIGHT col: My Roadmaps — PixelCard */}
            <PixelCard className="col-span-8 p-5 flex flex-col h-[360px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-3xl text-slate-700 tracking-wider">My Roadmaps</h2>
                <PixelButton variant="ghost" size="sm">
                  + Add Roadmap
                </PixelButton>
              </div>

              <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
                {roadmaps.length === 0 ? (
                  <div className="col-span-2 flex flex-col items-center justify-center text-center py-8">
                    <p className="text-sm text-slate-400 mb-2">No roadmaps yet</p>
                    <a href="/OnBoarding/Major" className="text-xs font-semibold text-[#4a7c7c] bg-[#4a7c7c]/10 hover:bg-[#4a7c7c]/20 px-4 py-1.5 rounded-xl transition-colors">
                      Complete onboarding to generate your roadmap
                    </a>
                  </div>
                ) : roadmaps.map((rm: DashboardRoadmap) => {
                  const minimap = rm.minimap ?? { nodes: [], edges: [], done_nodes: [] };
                  const active = rm.status === 'active';
                  return (
                    <a
                      key={rm.id}
                      href="/map"
                      className="block min-h-0"
                    >
                      <div
                        className={`flex flex-col overflow-hidden h-full transition-all hover:shadow-md hover:translate-y-[-2px] cursor-pointer
                          border-4
                          ${active
                            ? 'border-t-[#7ab3b3] border-l-[#7ab3b3] border-r-[#2d5050] border-b-[#2d5050]'
                            : 'border-t-[#d4e8e8] border-l-[#d4e8e8] border-r-[#7ab3b3] border-b-[#7ab3b3]'
                          }`}
                      >
                        {/* Minimap SVG area */}
                        <div className="flex-1 bg-[#f7fafa] relative px-3 py-2 min-h-0">
                          {active && (
                            <span className="absolute top-2 left-2 text-[9px] font-bold text-[#4a7c7c] bg-white border border-[#4a7c7c]/30 px-2 py-0.5 rounded-full uppercase tracking-wider z-10">
                              Active
                            </span>
                          )}
                          <RoadmapMinimap nodes={minimap.nodes} edges={minimap.edges} doneNodes={minimap.done_nodes} active={active} />
                        </div>

                        {/* Progress bar + title */}
                        <div className="px-4 py-3 bg-white border-t border-slate-100">
                          <div className="flex items-center justify-between mb-1.5">
                            <p className="text-xl text-slate-700 truncate tracking-wide">{rm.title}</p>
                            <p className="text-xl text-slate-400 ml-2 flex-shrink-0">{rm.progress_percentage}%</p>
                          </div>
                          <div className="h-1.5 bg-slate-100 overflow-hidden">
                            <div className="h-full"
                              style={{ width: `${rm.progress_percentage}%`, backgroundColor: active ? '#4a7c7c' : '#94a3b8' }} />
                          </div>
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </PixelCard>

          </div>
        </div>
      </div>
    </div>
  );
}
