'use client';
import { useRef, useEffect, useState } from "react";
import { signIn } from "next-auth/react";

// ─── Icon paths (only those used in this file) ───────────────────────────────
const PATHS = {
  check:   "M5.01667 8.51667L2.5375 6.0375L3.35417 5.22083L5.01667 6.88333L10.85 1.03542L11.6667 1.85208L5.01667 8.51667V8.51667",
  lock:    "M2 16C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H18C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2V14C20 14.55 19.8042 15.0208 19.4125 15.4125C19.0208 15.8042 18.55 16 18 16H2V16M2 14H18V4H2V14M5.5 13L4.1 11.6L6.675 9L4.075 6.4L5.5 5L9.5 9L5.5 13V13M10 13V11H16V13H10V13",
  trendUp: "M1.4 12L0 10.6L7.4 3.15L11.4 7.15L16.6 2H14V0H20V6H18V3.4L11.4 10L7.4 6L1.4 12V12",
  person:  "M8 8C6.9 8 5.95833 7.60833 5.175 6.825C4.39167 6.04167 4 5.1 4 4C4 2.9 4.39167 1.95833 5.175 1.175C5.95833 0.391667 6.9 0 8 0C9.1 0 10.0417 0.391667 10.825 1.175C11.6083 1.95833 12 2.9 12 4C12 5.1 11.6083 6.04167 10.825 6.825C10.0417 7.60833 9.1 8 8 8V8M0 16V13.2C0 12.6333 0.145833 12.1125 0.4375 11.6375C0.729167 11.1625 1.11667 10.8 1.6 10.55C2.63333 10.0333 3.68333 9.64583 4.75 9.3875C5.81667 9.12917 6.9 9 8 9C9.1 9 10.1833 9.12917 11.25 9.3875C12.3167 9.64583 13.3667 10.0333 14.4 10.55C14.8833 10.8 15.2708 11.1625 15.5625 11.6375C15.8542 12.1125 16 12.6333 16 13.2V16H0V16",
  trophy:  "M0.25 18L0 15.8L2.85 7.95C3.1 8.18333 3.37083 8.37917 3.6625 8.5375C3.95417 8.69583 4.26667 8.81667 4.6 8.9L1.85 16.45L0.25 18V18M10.75 18L9.15 16.45L6.4 8.9C6.73333 8.81667 7.04583 8.69583 7.3375 8.5375C7.62917 8.37917 7.9 8.18333 8.15 7.95L11 15.8L10.75 18V18M5.5 8C4.66667 8 3.95833 7.70833 3.375 7.125C2.79167 6.54167 2.5 5.83333 2.5 5C2.5 4.35 2.6875 3.77083 3.0625 3.2625C3.4375 2.75417 3.91667 2.4 4.5 2.2V0H6.5V2.2C7.08333 2.4 7.5625 2.75417 7.9375 3.2625C8.3125 3.77083 8.5 4.35 8.5 5C8.5 5.83333 8.20833 6.54167 7.625 7.125C7.04167 7.70833 6.33333 8 5.5 8V8M5.5 6C5.78333 6 6.02083 5.90417 6.2125 5.7125C6.40417 5.52083 6.5 5.28333 6.5 5C6.5 4.71667 6.40417 4.47917 6.2125 4.2875C6.02083 4.09583 5.78333 4 5.5 4C5.21667 4 4.97917 4.09583 4.7875 4.2875C4.59583 4.47917 4.5 4.71667 4.5 5C4.5 5.28333 4.59583 5.52083 4.7875 5.7125C4.97917 5.90417 5.21667 6 5.5 6V6",
} as const;

// ─── Icon component ───────────────────────────────────────────────────────────
interface IconProps {
  path: string;
  size?: number;
  color?: string;
  viewBox?: string;
  className?: string;
}
function Icon({ path, size = 20, color = "currentColor", viewBox = "0 0 20 20", className }: IconProps) {
  return (
    <svg width={size} height={size} viewBox={viewBox} fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d={path} fill={color} />
    </svg>
  );
}

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ pct, dark = false }: { pct: number; dark?: boolean }) {
  return (
    <div className={`w-full h-1 rounded-full overflow-hidden ${dark ? "bg-white/20" : "bg-slate-200"}`}>
      <div
        className={`h-full rounded-full ${dark ? "bg-white" : "bg-[#4e8888]"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

// ─── Completed roadmap node ───────────────────────────────────────────────────
function CompletedNode({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-3 w-36 shadow-sm">
      <div className="flex items-center gap-1.5 mb-2">
        <div className="w-4 h-4 rounded-full bg-[#4e8888] flex items-center justify-center flex-shrink-0">
          <Icon path={PATHS.check} size={8} color="white" viewBox="0 0 12 12" />
        </div>
        <span className="text-xs font-bold text-slate-800">{label}</span>
      </div>
      <ProgressBar pct={pct} />
      <p className="text-[9px] text-[#4e8888] font-semibold mt-1 text-right">{pct}%</p>
    </div>
  );
}

// ─── Locked roadmap node ──────────────────────────────────────────────────────
function LockedNode({ label }: { label: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg px-3 py-2 w-28 opacity-60">
      <div className="flex items-center gap-1.5">
        <Icon path={PATHS.lock} size={9} color="#94a3b8" viewBox="0 0 20 16" />
        <span className="text-[10px] font-semibold text-slate-400">{label}</span>
      </div>
      <p className="text-[8px] text-slate-300 mt-0.5">Locked</p>
    </div>
  );
}

// ─── Roadmap canvas (hero right panel) ───────────────────────────────────────
function RoadmapCanvas() {
  return (
    <div className="bg-slate-100 rounded-2xl border border-slate-200 shadow-2xl h-[400px] p-2 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-[#4e8888]/10 to-transparent rounded-2xl pointer-events-none z-0" />
      <div className="bg-white rounded-xl h-full relative z-10 overflow-hidden shadow-inner">
        {/* Browser chrome */}
        <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex gap-1.5">
            {["#f87171", "#facc15", "#4ade80"].map((c) => (
              <div key={c} className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
            ))}
          </div>
          <div className="bg-slate-100 rounded w-24 h-3" />
        </div>
        {/* Canvas */}
        <div className="relative w-full h-[calc(100%-40px)] bg-slate-50 overflow-hidden">
          <svg className="absolute inset-0 w-full h-full opacity-40">
            <defs>
              <pattern id="dots2" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
                <circle cx="1.5" cy="1.5" r="1" fill="#cbd5e1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#dots2)" />
          </svg>
          <svg className="absolute inset-0 w-full h-full" fill="none">
            <path d="M 155 160 C 200 160, 200 120, 250 120" stroke="#4e8888" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
            <path d="M 155 160 C 200 160, 200 220, 250 220" stroke="#4e8888" strokeWidth="1.5" opacity="0.7" />
            <path d="M 360 120 C 390 120, 390 80, 420 80"   stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
            <path d="M 360 120 C 390 120, 390 145, 420 145" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
            <path d="M 360 220 C 390 220, 390 210, 420 210" stroke="#cbd5e1" strokeWidth="1.5" strokeDasharray="4 3" opacity="0.6" />
          </svg>
          <div className="absolute" style={{ left: 20, top: 130 }}><CompletedNode label="HTML" pct={100} /></div>
          <div className="absolute" style={{ left: 250, top: 92 }}><CompletedNode label="Javascript" pct={100} /></div>
          <div className="absolute bg-[#4e8888] rounded-xl p-3 w-32 shadow-lg" style={{ left: 245, top: 190 }}>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs font-bold text-white">CSS</span>
              <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                <svg width="8" height="8" viewBox="0 0 8 8"><circle cx="4" cy="4" r="3" stroke="white" strokeWidth="1.2" fill="none"/><circle cx="4" cy="4" r="1" fill="white"/></svg>
              </div>
            </div>
            <p className="text-[9px] text-white/60 mb-1.5">Part 2 of 4</p>
            <ProgressBar pct={45} dark />
            <p className="text-[9px] text-white/90 font-bold mt-1 text-right">IN PROGRESS</p>
          </div>
          <div className="absolute" style={{ right: 18, top: 55 }}><LockedNode label="React" /></div>
          <div className="absolute" style={{ right: 18, top: 120 }}><LockedNode label="React Native" /></div>
          <div className="absolute" style={{ right: 18, top: 185 }}><LockedNode label="Tailwind CSS" /></div>
          {/* Legend */}
          <div className="absolute bottom-3 left-3 bg-white border border-slate-200 rounded-lg p-2.5 flex flex-col gap-1">
            <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mb-1">Map Legend</p>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full bg-[#4e8888]" /><span className="text-[9px] text-slate-500 font-medium">Completed</span></div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-full border-2 border-[#4e8888]" /><span className="text-[9px] text-slate-500 font-medium">Active Node</span></div>
            <div className="flex items-center gap-1.5"><Icon path={PATHS.lock} size={9} color="#cbd5e1" viewBox="0 0 20 16" /><span className="text-[9px] text-slate-500 font-medium">Locked Stage</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── "How Your Path Is Built" — node-graph roadmap ───────────────────────────
interface LinePoint { x: number; y: number; }
interface Line { x1: number; y1: number; x2: number; y2: number; }

function cubicPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

function getRightMid(el: HTMLElement, container: HTMLElement): LinePoint {
  const er = el.getBoundingClientRect();
  const cr = container.getBoundingClientRect();
  return { x: er.right - cr.left, y: er.top - cr.top + er.height / 2 };
}

function getLeftMid(el: HTMLElement, container: HTMLElement): LinePoint {
  const er = el.getBoundingClientRect();
  const cr = container.getBoundingClientRect();
  return { x: er.left - cr.left, y: er.top - cr.top + er.height / 2 };
}

function PathRoadmap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const githubRef    = useRef<HTMLDivElement>(null);
  const resumeRef    = useRef<HTMLDivElement>(null);
  const processorRef = useRef<HTMLDivElement>(null);
  const out0Ref      = useRef<HTMLDivElement>(null);
  const out1Ref      = useRef<HTMLDivElement>(null);
  const out2Ref      = useRef<HTMLDivElement>(null);
  const dreamRef     = useRef<HTMLDivElement>(null);

  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    function measure() {
      const c = containerRef.current;
      if (!c || !githubRef.current || !resumeRef.current ||
          !processorRef.current || !out0Ref.current ||
          !out1Ref.current || !out2Ref.current || !dreamRef.current) return;

      const gh  = getRightMid(githubRef.current,    c);
      const re  = getRightMid(resumeRef.current,    c);
      const pL  = getLeftMid (processorRef.current, c);
      const pR  = getRightMid(processorRef.current, c);
      const o0L = getLeftMid (out0Ref.current,      c);
      const o1L = getLeftMid (out1Ref.current,      c);
      const o2L = getLeftMid (out2Ref.current,      c);
      const o0R = getRightMid(out0Ref.current,      c);
      const o1R = getRightMid(out1Ref.current,      c);
      const o2R = getRightMid(out2Ref.current,      c);
      const dr  = getLeftMid (dreamRef.current,     c);

      setLines([
        { x1: gh.x,  y1: gh.y,  x2: pL.x,  y2: pL.y  },
        { x1: re.x,  y1: re.y,  x2: pL.x,  y2: pL.y  },
        { x1: pR.x,  y1: pR.y,  x2: o0L.x, y2: o0L.y },
        { x1: pR.x,  y1: pR.y,  x2: o1L.x, y2: o1L.y },
        { x1: pR.x,  y1: pR.y,  x2: o2L.x, y2: o2L.y },
        { x1: o0R.x, y1: o0R.y, x2: dr.x,  y2: dr.y  },
        { x1: o1R.x, y1: o1R.y, x2: dr.x,  y2: dr.y  },
        { x1: o2R.x, y1: o2R.y, x2: dr.x,  y2: dr.y  },
      ]);
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <div ref={containerRef} className="relative bg-[#edf6f6] rounded-3xl border border-[#d0e8e8] p-10 overflow-hidden">
      {/* Dot grid */}
      <svg className="absolute inset-0 w-full h-full opacity-40 pointer-events-none" style={{ zIndex: 0 }}>
        <defs>
          <pattern id="dotsRoadmap" x="0" y="0" width="24" height="24" patternUnits="userSpaceOnUse">
            <circle cx="1.5" cy="1.5" r="1.2" fill="#94a3b8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dotsRoadmap)" />
      </svg>

      {/* Dynamic connector lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" fill="none" style={{ zIndex: 2 }}>
        {lines.map((l, i) => (
          <path
            key={i}
            d={cubicPath(l.x1, l.y1, l.x2, l.y2)}
            stroke="#4e8888"
            strokeWidth="2"
            strokeDasharray="7 5"
            opacity="0.5"
            strokeLinecap="round"
          />
        ))}
      </svg>

      {/* Layout row */}
      <div className="relative flex items-center justify-between gap-8" style={{ zIndex: 3 }}>

        {/* INPUTS */}
        <div className="flex flex-col gap-5">
          <div ref={githubRef} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col items-center gap-3 w-32 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>
            </div>
            <span className="text-sm font-bold text-slate-800">Github</span>
          </div>
          <div ref={resumeRef} className="bg-white border border-slate-200 rounded-2xl p-5 flex flex-col items-center gap-3 w-32 shadow-sm">
            <div className="w-12 h-12 rounded-full bg-[#4e8888] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8l-6-6zm-1 1.5L18.5 9H13V3.5zM6 20V4h5v7h7v9H6z"/></svg>
            </div>
            <span className="text-sm font-bold text-slate-800">Resume</span>
          </div>
        </div>

        {/* PROCESSOR */}
        <div ref={processorRef} className="relative flex-shrink-0">
          <div className="absolute inset-0 bg-[#4e8888] blur-2xl opacity-20 rounded-2xl scale-110" />
          <div className="relative bg-white border-2 border-[#4e8888] rounded-2xl w-28 h-28 flex flex-col items-center justify-center gap-2 shadow-xl">
            <svg width="28" height="28" viewBox="0 0 27 27" fill="none">
              <path d="M13.5 2L16.5 9H24L18 13.5L20.5 20.5L13.5 16L6.5 20.5L9 13.5L3 9H10.5L13.5 2Z" fill="#4e8888"/>
            </svg>
            <span className="text-[10px] font-black text-[#4e8888] tracking-widest uppercase text-center leading-tight">
              Rolemap<br />AI
            </span>
          </div>
        </div>

        {/* OUTPUTS */}
        <div className="flex flex-col gap-4">
          <div ref={out0Ref} className="bg-white/70 border border-[#4e8888]/20 justify-center rounded-2xl px-5 py-3 flex items-center gap-3 w-60 shadow-sm">
            <span className="text-sm font-bold text-slate-700">Daily Tasks</span>
          </div>
          <div ref={out1Ref} className="bg-white/70 border border-[#4e8888]/20 justify-center rounded-2xl px-5 py-3 flex items-center gap-3 w-60 shadow-sm">
            <span className="text-sm font-bold text-slate-700">Personalized Roadmaps</span>
          </div>
          <div ref={out2Ref} className="bg-white/70 border border-[#4e8888]/20 justify-center  rounded-2xl px-5 py-3 flex items-center gap-3 w-60 shadow-sm">
            <span className="text-sm font-bold text-slate-700">Gamified Process</span>
          </div>
        </div>

        {/* DREAM ROLE */}
        <div ref={dreamRef} className="flex flex-col items-center gap-2 flex-shrink-0">
          <div className="bg-[#4e8888] rounded-2xl px-6 py-5 shadow-lg flex flex-col items-center gap-1.5">
            <span className="text-sm font-black text-white whitespace-nowrap">Dream Role</span>
          </div>
          <p className="text-xs text-slate-400 font-medium text-center max-w-[100px] leading-snug">Your career destination</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div className="font-sans bg-[#f6f7f7] w-full min-h-screen">

      {/* HERO */}
      <div className="px-20 pt-24 pb-20">
        <div className="grid grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-4">
              <h1 className="text-6xl font-black leading-none tracking-tight text-slate-900">
                Rolemap: Your<br />
                <span>Career, </span>
                <span className="text-[#4e8888]">Gamified.</span>
              </h1>
              <p className="text-xl text-slate-500 leading-relaxed max-w-xl">
                Connect your Github and Resume to generate a personalized, daily-task-based roadmap to your dream role. Turn the job hunt into a quest.
              </p>
            </div>
            <div className="flex gap-4">
              <button onClick={() => signIn("google", { callbackUrl: "/OnBoarding/Major" })} className="bg-[#4e8888] text-white rounded-lg h-12 px-7 text-base font-bold cursor-pointer hover:bg-[#3d7070] transition-colors">
                Get Started
              </button>
              <button className="bg-transparent text-[#4e8888] border-2 border-[#4e8888]/25 rounded-lg h-12 px-7 text-base font-bold cursor-pointer hover:border-[#4e8888]/50 transition-colors">
                Learn More
              </button>
            </div>
          </div>
          <RoadmapCanvas />
        </div>
      </div>

      {/* HOW YOUR PATH IS BUILT */}
      <div className="bg-slate-50 py-20">
        <div className="px-20 flex flex-col items-center gap-12">
          <div className="flex flex-col items-center gap-4 text-center">
            <h2 className="text-5xl font-bold text-slate-900 tracking-tight">How Your Path is Built</h2>
            <p className="text-xl text-slate-500 leading-relaxed max-w-2xl">
              We analyze your professional footprint to craft an optimized journey specifically for your ambitions.
            </p>
          </div>
          <div className="w-full">
            <PathRoadmap />
          </div>
        </div>
      </div>

      {/* ROADMAP TO SUCCESS */}
      <div className="px-20 py-20 flex flex-col items-center gap-12">
        <div className="flex flex-col items-center gap-4 text-center">
          <h2 className="text-5xl font-bold text-slate-900 tracking-tight">The Roadmap to Success</h2>
          <p className="text-xl text-slate-500 max-w-xl">
            Everything you need to go from where you are to where you want to be.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-6 w-full">
          {[
            { pathKey: "trendUp" as const, viewBox: "0 0 20 12", title: "Daily Tasks",       desc: "Small, manageable steps to take every day. We break down complex career goals into 15-minute actions." },
            { pathKey: "person"  as const, viewBox: "0 0 16 16", title: "Personalized Flow", desc: "A visual guide tailored to your specific background. Our AI detects gaps in your profile and fills them." },
            { pathKey: "trophy"  as const, viewBox: "0 0 11 18", title: "Gamified Progress", desc: "Earn rewards and track progress as you level up your career. See your profile power-up in real-time." },
          ].map(({ pathKey, viewBox, title, desc }) => (
            <div key={title} className="bg-[#f6f7f7] border border-slate-200 rounded-2xl p-6 flex flex-col gap-4">
              <div className="w-12 h-12 bg-[#4e8888]/15 rounded-xl flex items-center justify-center">
                <Icon path={PATHS[pathKey]} size={22} color="#4e8888" viewBox={viewBox} />
              </div>
              <p className="text-xl font-bold text-slate-900">{title}</p>
              <p className="text-base text-slate-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="px-20 pb-20">
        <div className="bg-[#4e8888] rounded-3xl p-12 flex flex-col items-center gap-8 shadow-2xl text-center">
          <h2 className="text-5xl font-black text-white">Ready to level up your career?</h2>
          <button onClick={() => signIn("google", { callbackUrl: "/OnBoarding/Major" })} className="bg-white text-[#4e8888] rounded-xl h-14 px-8 text-lg font-bold cursor-pointer hover:bg-slate-50 transition-colors">
            Start My Journey Now
          </button>
        </div>
      </div>

    </div>
  );
}