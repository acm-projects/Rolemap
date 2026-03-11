'use client';

import React, { useState, useEffect } from 'react';
import { Star } from 'lucide-react';
import { Navbar } from '../components/NavBar';

const CircleCheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const StreakIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-6 h-6">
    <path d="M11.47 3.841a.75.75 0 0 1 1.06 0l8.69 8.69a.75.75 0 1 0 1.06-1.061L13.06 2.78a.75.75 0 0 0-1.06 0L3.72 11.469a.75.75 0 0 0 1.06 1.061l8.69-8.69Z" />
  </svg>
);

const FireIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-orange-400">
    <path fillRule="evenodd" d="M12.963 2.286a.75.75 0 0 0-1.071-.136 9.742 9.742 0 0 0-3.539 6.176 7.547 7.547 0 0 1-1.705-1.715.75.75 0 0 0-1.152-.082A9 9 0 1 0 15.68 4.534a7.46 7.46 0 0 1-2.717-2.248ZM15.75 14.25a3.75 3.75 0 1 1-7.313-1.172c.628.465 1.35.81 2.133 1a5.99 5.99 0 0 1 1.925-3.546 3.75 3.75 0 0 1 3.255 3.718Z" clipRule="evenodd" />
  </svg>
);

const leaderboard = [
  { rank: 1, name: 'Tom Wilson', subtitle: 'Master Level', streak: 28, isYou: false, crown: true,  avatar: 'TW', avatarBg: 'bg-slate-700' },
  { rank: 2, name: 'You',        subtitle: 'Keep it up!',  streak: 24, isYou: true,  crown: false, avatar: 'AM', avatarBg: 'bg-[#4a7c7c]/20' },
  { rank: 3, name: 'Sarah Chen', subtitle: 'Elite Rank',   streak: 19, isYou: false, crown: false, avatar: 'SC', avatarBg: 'bg-slate-500' },
  { rank: 4, name: 'Jamie Fox',  subtitle: 'Growing Fast', streak: 12, isYou: false, crown: false, avatar: 'JF', avatarBg: 'bg-slate-600' },
];

const achievements = [
  { title: 'Quick Learner', subtitle: '5 tasks in one day' },
  { title: 'Quick Learner', subtitle: '5 tasks in one day' },
];

export function Dashboard() {
  const [displayProgress, setDisplayProgress] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setDisplayProgress(68), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#eef1f7] relative">
      <Navbar />

      <div className="pt-24 px-8 pb-8">
        <div className="max-w-7xl mx-auto">

          {/* Header */}
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-slate-700">Dashboard</h1>
            <p className="text-sm text-slate-400 mt-1">Welcome back, Alex</p>
          </div>

          {/* ── Top Row: 4 stat cards ── */}
          <div className="grid grid-cols-12 gap-4 mb-6">

            {/* 1. Current Roadmap - small */}
            <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-1">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Current Roadmap</p>
              <p className="text-base font-bold text-slate-700 leading-tight">Front End</p>
              <p className="text-xs text-slate-400">Developer Path</p>
            </div>

            {/* 2. 40 Skills - small */}
            <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center gap-1">
              <div className="text-[#4a7c7c]"><CircleCheckIcon /></div>
              <p className="text-xs font-medium text-slate-500">Completed</p>
              <p className="text-xl font-bold text-slate-700">40 Skills</p>
            </div>

            {/* 3. Achievements - wide */}
            <div className="col-span-6 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-[#4a7c7c] fill-[#4a7c7c]" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Achievements</p>
              </div>
              <div className="flex gap-3">
                {achievements.map((a, idx) => (
                  <div key={idx} className="flex-1 bg-[#eef1f7] rounded-xl px-3 py-2 border border-slate-200">
                    <p className="font-semibold text-slate-700 text-xs">{a.title}</p>
                    <p className="text-slate-400 text-[10px]">{a.subtitle}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* 4. Progress Circle - small */}
            <div className="col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col items-center justify-center gap-1">
              <div className="relative w-20 h-20">
                <svg className="w-full h-full" viewBox="0 0 200 200">
                  <circle cx="100" cy="100" r="85" fill="none" stroke="#e2e8f0" strokeWidth="14" />
                  <circle
                    cx="100" cy="100" r="85"
                    fill="none"
                    stroke="#4a7c7c"
                    strokeWidth="14"
                    strokeDasharray={`${displayProgress * 5.34} 534`}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dasharray 1s ease-out' }}
                    transform="rotate(-90 100 100)"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-slate-700">{displayProgress}%</span>
                </div>
              </div>
              <p className="text-xs font-medium text-slate-500">Progress</p>
            </div>

          </div>

          {/* ── Bottom Row ── */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

            {/* LEFT: Streak Leaderboard */}
            <div className="lg:col-span-1 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center">
                    <FireIcon />
                  </div>
                  <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wider">Streak Leaderboard</h2>
                </div>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wide">Today</span>
              </div>
              <div className="space-y-3">
                {leaderboard.map((user) => (
                  <div
                    key={user.rank}
                    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all
                      ${user.isYou ? 'bg-white border border-slate-200 shadow-sm' : 'hover:bg-slate-50'}`}
                  >
                    <span className={`text-sm font-bold w-5 text-center ${user.isYou ? 'text-[#4a7c7c]' : 'text-slate-300'}`}>
                      {user.rank}
                    </span>
                    <div className={`relative w-9 h-9 rounded-xl ${user.avatarBg} flex items-center justify-center flex-shrink-0`}>
                      <span className={`text-xs font-bold ${user.isYou ? 'text-[#4a7c7c]' : 'text-white'}`}>
                        {user.avatar}
                      </span>
                      {user.crown && <span className="absolute -top-2 -right-1 text-sm">👑</span>}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 truncate">{user.name}</p>
                      <p className="text-[10px] text-slate-400">{user.subtitle}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`text-sm font-bold ${user.isYou ? 'text-slate-700' : 'text-slate-500'}`}>
                        {user.streak}
                      </span>
                      <FireIcon />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* RIGHT: Front End Developer donut — stretches full height */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col">
              <h2 className="text-base font-bold text-slate-700 mb-5">Front End Developer</h2>

              {/* Donut + legend centered, grows to fill card */}
              <div className="flex-1 flex items-center justify-center gap-12">
                <div className="relative w-56 h-56 flex-shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 200 200">
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#4a7c7c" strokeWidth="20"
                      strokeDasharray="502.65 502.65" strokeDashoffset="0" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#6fa8a8" strokeWidth="20"
                      strokeDasharray="100.53 502.65" strokeDashoffset="-502.65" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#93bfbf" strokeWidth="20"
                      strokeDasharray="150.795 502.65" strokeDashoffset="-603.18" />
                    <circle cx="100" cy="100" r="80" fill="none" stroke="#d0e6e6" strokeWidth="20"
                      strokeDasharray="0 502.65" strokeDashoffset="-753.975" />
                    <circle cx="100" cy="100" r="100" fill="white" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center text-center">
                    <div>
                      <p className="text-slate-700 font-bold text-base">Front End</p>
                      <p className="text-[#4a7c7c] text-xs">Developer</p>
                    </div>
                  </div>
                </div>

                {/* Legend */}
                <div className="space-y-4">
                  {[
                    { color: '#4a7c7c', label: 'HTML and CSS Basics',     pct: '100%' },
                    { color: '#6fa8a8', label: 'JavaScript Fundamentals', pct: '20%'  },
                    { color: '#93bfbf', label: 'Advanced CSS',            pct: '30%'  },
                    { color: '#d0e6e6', label: 'React & Frameworks',      pct: '0%'   },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: item.color }} />
                      <div>
                        <p className="text-sm font-semibold text-slate-700">{item.label}</p>
                        <p className="text-xs text-slate-400">{item.pct}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;