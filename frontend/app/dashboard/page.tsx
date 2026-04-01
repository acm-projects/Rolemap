'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Navbar } from '../components/NavBar';
import fire from '../../icons/fire.png';
import { useRouter } from 'next/navigation';
import { api, type DashboardResponse, type DashboardRoadmap } from '@/lib/api';

// Static minimap shape data (decorative only — progress/status come from API)
const ROADMAP_SHAPES: Record<string, {
  nodes: { x: number; y: number }[];
  edges: { a: number; b: number; done: boolean }[];
  doneNodes: number[];
}> = {
  'rm-001': {
    nodes: [{ x: 15, y: 50 }, { x: 38, y: 50 }, { x: 60, y: 25 }, { x: 60, y: 72 }, { x: 83, y: 50 }],
    edges: [{ a: 0, b: 1, done: true }, { a: 1, b: 2, done: true }, { a: 1, b: 3, done: false }, { a: 2, b: 4, done: false }, { a: 3, b: 4, done: false }],
    doneNodes: [0, 1, 2],
  },
  'rm-002': {
    nodes: [{ x: 15, y: 50 }, { x: 40, y: 25 }, { x: 40, y: 72 }, { x: 65, y: 50 }, { x: 85, y: 50 }],
    edges: [{ a: 0, b: 1, done: true }, { a: 0, b: 2, done: false }, { a: 1, b: 3, done: false }, { a: 2, b: 3, done: false }, { a: 3, b: 4, done: false }],
    doneNodes: [0],
  },
  'rm-003': {
    nodes: [{ x: 18, y: 50 }, { x: 45, y: 25 }, { x: 45, y: 75 }, { x: 78, y: 50 }],
    edges: [{ a: 0, b: 1, done: false }, { a: 0, b: 2, done: false }, { a: 1, b: 3, done: false }, { a: 2, b: 3, done: false }],
    doneNodes: [],
  },
  'rm-004': {
    nodes: [{ x: 12, y: 50 }, { x: 38, y: 50 }, { x: 62, y: 25 }, { x: 62, y: 72 }, { x: 86, y: 50 }],
    edges: [{ a: 0, b: 1, done: true }, { a: 1, b: 2, done: true }, { a: 1, b: 3, done: false }, { a: 2, b: 4, done: false }, { a: 3, b: 4, done: false }],
    doneNodes: [0, 1, 2],
  },
};

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
    <div className="min-h-screen w-full bg-[#eef1f7] relative">
      <Navbar />

      <div className="pt-28 px-8 pb-8">
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
              <p className="text-sm text-slate-400 mt-1">Welcome back, {userName}</p>
            </div>

            <div className="flex items-center gap-3 flex-shrink-0">
              {/* XP block */}
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm">
                <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-blue-400">
                    <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Total XP</p>
                  <p className="text-sm font-bold text-slate-700">{xpTotal}</p>
                </div>
              </div>

              {/* Progress block */}
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm">
                <div className="relative w-7 h-7 flex-shrink-0">
                  <svg className="w-full h-full" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#e2e8f0" strokeWidth="24" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#4a7c7c" strokeWidth="24"
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
              </div>

              {/* Challenges block */}
              <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-2xl px-4 py-2.5 shadow-sm">
                <div className="w-7 h-7 rounded-full bg-green-100 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-green-500">
                    <path fillRule="evenodd" d="M8.603 3.799A4.49 4.49 0 0112 2.25c1.357 0 2.573.6 3.397 1.549a4.49 4.49 0 013.498 1.307 4.491 4.491 0 011.307 3.497A4.49 4.49 0 0121.75 12a4.49 4.49 0 01-1.549 3.397 4.491 4.491 0 01-1.307 3.497 4.491 4.491 0 01-3.497 1.307A4.49 4.49 0 0112 21.75a4.49 4.49 0 01-3.397-1.549 4.49 4.49 0 01-3.498-1.306 4.491 4.491 0 01-1.307-3.498A4.49 4.49 0 012.25 12c0-1.357.6-2.573 1.549-3.397a4.49 4.49 0 011.307-3.497 4.49 4.49 0 013.497-1.307zm7.007 6.387a.75.75 0 10-1.22-.872l-3.236 4.53L9.53 12.22a.75.75 0 00-1.06 1.06l2.25 2.25a.75.75 0 001.14-.094l3.75-5.25z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none">Challenges</p>
                  <p className="text-sm font-bold text-slate-700">{tasksCompleted}/30</p>
                </div>
              </div>

              {/* Today's Challenge */}
              <div className="bg-gradient-to-r from-[#4a7c7c] to-[#6fa8a8] rounded-2xl px-5 py-2.5 shadow-sm flex items-center gap-4 text-white">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-75 leading-none mb-0.5">Today&apos;s Challenge</p>
                  <p className="text-sm font-bold leading-tight">Build a useState counter</p>
                </div>
                <button className="bg-white text-[#4a7c7c] font-bold px-4 py-1.5 rounded-xl text-xs hover:bg-slate-50 transition-colors flex-shrink-0">
                  Start →
                </button>
              </div>
            </div>
          </div>

          {/* Main content: 2 columns */}
          <div className="grid grid-cols-12 gap-6">

            {/* LEFT col: Leaderboard */}
            <div className="col-span-4 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-[360px] overflow-hidden">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <Image src={fire} alt="Fire Icon" className="h-6 w-6" />
                  </div>
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Streak Leaderboard</h2>
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
            </div>

            {/* RIGHT col: My Roadmaps */}
            <div className="col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-[360px]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-bold text-slate-700">My Roadmaps</h2>
                <button className="text-xs font-semibold text-[#4a7c7c] bg-[#4a7c7c]/10 hover:bg-[#4a7c7c]/20 px-4 py-1.5 rounded-xl transition-colors">
                  + Add Roadmap
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 flex-1 min-h-0">
                {roadmaps.map((rm: DashboardRoadmap) => {
                  const shape = ROADMAP_SHAPES[rm.id] ?? ROADMAP_SHAPES['rm-001'];
                  const active = rm.status === 'active';
                  return (
                    <a key={rm.id} href="/map"
                      className={`flex flex-col rounded-2xl border-2 overflow-hidden transition-all hover:shadow-md cursor-pointer group
                        ${active ? 'border-[#4a7c7c]' : 'border-slate-200 hover:border-slate-300'}`}>
                      <div className="flex-1 bg-[#f7fafa] relative px-3 py-2 min-h-0">
                        {active && (
                          <span className="absolute top-2 left-2 text-[9px] font-bold text-[#4a7c7c] bg-white border border-[#4a7c7c]/30 px-2 py-0.5 rounded-full uppercase tracking-wider z-10">
                            Active
                          </span>
                        )}
                        <RoadmapMinimap nodes={shape.nodes} edges={shape.edges} doneNodes={shape.doneNodes} active={active} />
                      </div>
                      <div className="px-4 py-3 bg-white border-t border-slate-100">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-semibold text-slate-700 truncate">{rm.title}</p>
                          <p className="text-[10px] font-bold text-slate-400 ml-2 flex-shrink-0">{rm.progress_percentage}%</p>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full"
                            style={{ width: `${rm.progress_percentage}%`, backgroundColor: active ? '#4a7c7c' : '#94a3b8' }} />
                        </div>
                      </div>
                    </a>
                  );
                })}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
