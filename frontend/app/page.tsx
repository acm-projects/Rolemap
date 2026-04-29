"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { signIn } from "next-auth/react";

const PATHS = {
  check:
    "M5.01667 8.51667L2.5375 6.0375L3.35417 5.22083L5.01667 6.88333L10.85 1.03542L11.6667 1.85208L5.01667 8.51667V8.51667",
  lock: "M2 16C1.45 16 0.979167 15.8042 0.5875 15.4125C0.195833 15.0208 0 14.55 0 14V2C0 1.45 0.195833 0.979167 0.5875 0.5875C0.979167 0.195833 1.45 0 2 0H18C18.55 0 19.0208 0.195833 19.4125 0.5875C19.8042 0.979167 20 1.45 20 2V14C20 14.55 19.8042 15.0208 19.4125 15.4125C19.0208 15.8042 18.55 16 18 16H2V16M2 14H18V4H2V14M5.5 13L4.1 11.6L6.675 9L4.075 6.4L5.5 5L9.5 9L5.5 13V13M10 13V11H16V13H10V13",
  trendUp:
    "M1.4 12L0 10.6L7.4 3.15L11.4 7.15L16.6 2H14V0H20V6H18V3.4L11.4 10L7.4 6L1.4 12V12",
  person:
    "M8 8C6.9 8 5.95833 7.60833 5.175 6.825C4.39167 6.04167 4 5.1 4 4C4 2.9 4.39167 1.95833 5.175 1.175C5.95833 0.391667 6.9 0 8 0C9.1 0 10.0417 0.391667 10.825 1.175C11.6083 1.95833 12 2.9 12 4C12 5.1 11.6083 6.04167 10.825 6.825C10.0417 7.60833 9.1 8 8 8V8M0 16V13.2C0 12.6333 0.145833 12.1125 0.4375 11.6375C0.729167 11.1625 1.11667 10.8 1.6 10.55C2.63333 10.0333 3.68333 9.64583 4.75 9.3875C5.81667 9.12917 6.9 9 8 9C9.1 9 10.1833 9.12917 11.25 9.3875C12.3167 9.64583 13.3667 10.0333 14.4 10.55C14.8833 10.8 15.2708 11.1625 15.5625 11.6375C15.8542 12.1125 16 12.6333 16 13.2V16H0V16",
  trophy:
    "M0.25 18L0 15.8L2.85 7.95C3.1 8.18333 3.37083 8.37917 3.6625 8.5375C3.95417 8.69583 4.26667 8.81667 4.6 8.9L1.85 16.45L0.25 18V18M10.75 18L9.15 16.45L6.4 8.9C6.73333 8.81667 7.04583 8.69583 7.3375 8.5375C7.62917 8.37917 7.9 8.18333 8.15 7.95L11 15.8L10.75 18V18M5.5 8C4.66667 8 3.95833 7.70833 3.375 7.125C2.79167 6.54167 2.5 5.83333 2.5 5C2.5 4.35 2.6875 3.77083 3.0625 3.2625C3.4375 2.75417 3.91667 2.4 4.5 2.2V0H6.5V2.2C7.08333 2.4 7.5625 2.75417 7.9375 3.2625C8.3125 3.77083 8.5 4.35 8.5 5C8.5 5.83333 8.20833 6.54167 7.625 7.125C7.04167 7.70833 6.33333 8 5.5 8V8M5.5 6C5.78333 6 6.02083 5.90417 6.2125 5.7125C6.40417 5.52083 6.5 5.28333 6.5 5C6.5 4.71667 6.40417 4.47917 6.2125 4.2875C6.02083 4.09583 5.78333 4 5.5 4C5.21667 4 4.97917 4.09583 4.7875 4.2875C4.59583 4.47917 4.5 4.71667 4.5 5C4.5 5.28333 4.59583 5.52083 4.7875 5.7125C4.97917 5.90417 5.21667 6 5.5 6V6",
} as const;

interface IconProps {
  path: string;
  size?: number;
  color?: string;
  viewBox?: string;
  className?: string;
}

function Icon({
  path,
  size = 20,
  color = "currentColor",
  viewBox = "0 0 20 20",
  className,
}: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox={viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <path d={path} fill={color} />
    </svg>
  );
}

function ProgressBar({ pct, dark = false }: { pct: number; dark?: boolean }) {
  return (
    <div
      className={`h-1 w-full overflow-hidden rounded-full ${
        dark ? "bg-white/20" : "bg-slate-200"
      }`}
    >
      <div
        className={`h-full rounded-full ${dark ? "bg-white" : "bg-[#4e8888]"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

function CompletedNode({ label, pct }: { label: string; pct: number }) {
  return (
    <div className="w-36 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="mb-2 flex items-center gap-1.5">
        <div className="flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-[#4e8888]">
          <Icon path={PATHS.check} size={8} color="white" viewBox="0 0 12 12" />
        </div>
        <span className="text-sm text-slate-800">{label}</span>
      </div>
      <ProgressBar pct={pct} />
      <p className="mt-1 text-right text-xs text-[#4e8888]">{pct}%</p>
    </div>
  );
}

function LockedNode({ label }: { label: string }) {
  return (
    <div className="w-28 rounded-lg border border-slate-200 bg-white px-3 py-2 opacity-60">
      <div className="flex items-center gap-1.5">
        <Icon path={PATHS.lock} size={9} color="#94a3b8" viewBox="0 0 20 16" />
        <span className="text-xs text-slate-400">{label}</span>
      </div>
      <p className="mt-0.5 text-[10px] text-slate-300">Locked</p>
    </div>
  );
}

const PIXEL: React.CSSProperties = { imageRendering: "pixelated" };

function LandingParallax() {
  return (
    <>
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none bg-[#7ccdf6]"
      />
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          ...PIXEL,
          backgroundImage: "url('/assets/sky2.png')",
          backgroundSize: "512px 100vh",
          backgroundRepeat: "repeat-x",
          backgroundPosition: "top left",
        }}
      />
      <div
        aria-hidden="true"
        className="fixed top-0 z-[1] pointer-events-none"
        style={{
          ...PIXEL,
          width: "200%",
          height: "78vh",
          backgroundImage: "url('/assets/clouds-back.png')",
          backgroundSize: "512px 78vh",
          backgroundRepeat: "repeat-x",
          backgroundPosition: "top left",
          opacity: 0.85,
          animation: "driftClouds 120s linear infinite",
        }}
      />
      <div
        aria-hidden="true"
        className="fixed top-0 z-[2] pointer-events-none"
        style={{
          ...PIXEL,
          width: "200%",
          height: "78vh",
          backgroundImage: "url('/assets/clouds-front.png')",
          backgroundSize: "512px 78vh",
          backgroundRepeat: "repeat-x",
          backgroundPosition: "top left",
          animation: "driftClouds 60s linear infinite",
        }}
      />
      <div
        aria-hidden="true"
        className="fixed inset-x-0 bottom-0 z-[1] pointer-events-none h-[36vh]"
        style={{
          background:
            "linear-gradient(180deg, rgba(124,205,246,0) 0%, rgba(124,205,246,0.2) 38%, rgba(124,205,246,0.78) 100%)",
        }}
      />
    </>
  );
}

function RoadmapCanvas() {
  return (
    <div className="relative h-[470px] overflow-hidden px-3 pt-6 md:px-6 lg:h-[540px] lg:px-8">
      {/* Cloud blobs */}
      <div className="absolute left-[6%] top-10 h-24 w-24 rounded-full bg-white/70 blur-sm lg:h-28 lg:w-28" />
      <div className="absolute left-[16%] top-6 h-28 w-36 rounded-full bg-white/85 lg:h-36 lg:w-44" />
      <div className="absolute left-[31%] top-14 h-24 w-28 rounded-full bg-white/80 lg:h-28 lg:w-32" />
      <div className="absolute right-[12%] top-18 h-24 w-24 rounded-full bg-white/65 lg:h-28 lg:w-28" />
      <div className="absolute right-[20%] top-8 h-28 w-36 rounded-full bg-white/82 lg:h-36 lg:w-44" />
      <div className="absolute right-[34%] top-18 h-20 w-24 rounded-full bg-white/72 lg:h-24 lg:w-28" />

      <div className="absolute inset-x-0 top-16 mx-auto h-[350px] max-w-[600px] rounded-[3rem] border border-white/70 bg-white/75 shadow-[0_24px_80px_rgba(54,102,132,0.18)] backdrop-blur-[2px] lg:h-[400px] lg:max-w-[700px]">
        <div className="absolute -left-10 top-12 h-28 w-28 rounded-full bg-white/85 lg:h-32 lg:w-32" />
        <div className="absolute -right-10 top-16 h-32 w-32 rounded-full bg-white/82 lg:h-36 lg:w-36" />
        <div className="absolute left-16 -top-12 h-24 w-28 rounded-full bg-white/82 lg:h-28 lg:w-32" />
        <div className="absolute left-36 -top-14 h-28 w-32 rounded-full bg-white/90 lg:h-32 lg:w-36" />
        <div className="absolute right-24 -top-12 h-24 w-28 rounded-full bg-white/84 lg:h-28 lg:w-32" />

        {/* Inner canvas */}
        <div className="relative mx-4 my-4 h-[320px] overflow-hidden rounded-[2.5rem] border border-[#d6ebf4] bg-[#f7fcff] shadow-inner lg:mx-5 lg:my-5 lg:h-[360px]">
          <div className="absolute inset-0 bg-gradient-to-br from-white/80 via-transparent to-[#9ddcf8]/30" />

          {/* Dot grid */}
          <svg
            className="absolute inset-0 h-full w-full opacity-35"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="cloudDots"
                x="0"
                y="0"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1.5" cy="1.5" r="1" fill="#cbd5e1" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#cloudDots)" />
          </svg>

          {/* SVG canvas — nodes + connectors in one coordinate space */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 600 320"
            preserveAspectRatio="xMidYMid meet"
            fill="none"
            aria-hidden="true"
          >
            <defs>
              <pattern
                id="dots2"
                x="0"
                y="0"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
              >
                <circle cx="1.5" cy="1.5" r="1" fill="#cbd5e1" />
              </pattern>
            </defs>

            {/* ── Connectors (drawn first, behind nodes) ── */}

            {/* HTML → JavaScript */}
            <path
              d="M 196 160 C 253 160, 253 100, 260 100"
              stroke="#4e8888"
              strokeWidth="1.5"
              strokeDasharray="5 4"
              strokeLinecap="round"
              opacity="0.7"
            />

            {/* HTML → CSS */}
            <path
              d="M 196 160 C 253 160, 253 215, 260 215"
              stroke="#4e8888"
              strokeWidth="1.5"
              strokeDasharray="5 4"
              strokeLinecap="round"
              opacity="0.55"
            />

            {/* CSS → React */}
            <path
              d="M 390 205 C 430 205, 430 130, 440 130"
              stroke="#9dc7d7"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              strokeLinecap="round"
              opacity="0.65"
            />

            {/* CSS → Next.js */}
            <path
              d="M 390 225 C 430 225, 430 240, 440 240"
              stroke="#9dc7d7"
              strokeWidth="1.5"
              strokeDasharray="4 4"
              strokeLinecap="round"
              opacity="0.55"
            />

            {/* ── HTML Node — completed (centre ~130, 160) ── */}
            <g>
              <rect
                x="64"
                y="122"
                width="132"
                height="76"
                rx="14"
                fill="white"
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <circle cx="88" cy="143" r="9" fill="#4e8888" />
              <path
                d="M84 143L87 146L93 140"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text
                x="102"
                y="148"
                fontFamily="system-ui,sans-serif"
                fontSize="13"
                fill="#1e293b"
                fontWeight="500"
              >
                HTML
              </text>
              <rect
                x="80"
                y="172"
                width="100"
                height="4"
                rx="2"
                fill="#e2e8f0"
              />
              <rect
                x="80"
                y="172"
                width="100"
                height="4"
                rx="2"
                fill="#4e8888"
              />
              <text
                x="180"
                y="186"
                fontFamily="system-ui,sans-serif"
                fontSize="10"
                fill="#4e8888"
                textAnchor="end"
              >
                100%
              </text>
            </g>

            {/* ── JavaScript Node — completed (centre ~325, 100) ── */}
            <g>
              <rect
                x="260"
                y="62"
                width="150"
                height="76"
                rx="14"
                fill="white"
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <circle cx="284" cy="83" r="9" fill="#4e8888" />
              <path
                d="M280 83L283 86L289 80"
                stroke="white"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <text
                x="298"
                y="88"
                fontFamily="system-ui,sans-serif"
                fontSize="13"
                fill="#1e293b"
                fontWeight="500"
              >
                Javascript
              </text>
              <rect
                x="276"
                y="112"
                width="118"
                height="4"
                rx="2"
                fill="#e2e8f0"
              />
              <rect
                x="276"
                y="112"
                width="118"
                height="4"
                rx="2"
                fill="#4e8888"
              />
              <text
                x="394"
                y="126"
                fontFamily="system-ui,sans-serif"
                fontSize="10"
                fill="#4e8888"
                textAnchor="end"
              >
                100%
              </text>
            </g>

            {/* ── CSS Node — active / in progress (centre ~325, 215) ── */}
            <g>
              <rect
                x="260"
                y="178"
                width="150"
                height="82"
                rx="14"
                fill="#4e8888"
              />
              <text
                x="280"
                y="202"
                fontFamily="system-ui,sans-serif"
                fontSize="14"
                fill="white"
                fontWeight="500"
              >
                CSS
              </text>
              <circle cx="392" cy="198" r="7" fill="rgba(255,255,255,0.18)" />
              <circle
                cx="392"
                cy="198"
                r="3"
                fill="none"
                stroke="white"
                strokeWidth="1.2"
              />
              <circle cx="392" cy="198" r="1" fill="white" />
              <text
                x="280"
                y="218"
                fontFamily="system-ui,sans-serif"
                fontSize="10"
                fill="rgba(255,255,255,0.6)"
              >
                Part 2 of 4
              </text>
              <rect
                x="276"
                y="228"
                width="118"
                height="4"
                rx="2"
                fill="rgba(255,255,255,0.2)"
              />
              <rect x="276" y="228" width="53" height="4" rx="2" fill="white" />
              <text
                x="394"
                y="246"
                fontFamily="system-ui,sans-serif"
                fontSize="10"
                fill="rgba(255,255,255,0.9)"
                textAnchor="end"
              >
                IN PROGRESS
              </text>
            </g>

            {/* ── React Node — locked (centre ~505, 130) ── */}
            <g opacity="0.55">
              <rect
                x="440"
                y="100"
                width="118"
                height="54"
                rx="10"
                fill="white"
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <rect
                x="457"
                y="120"
                width="10"
                height="8"
                rx="1"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.2"
              />
              <path
                d="M459 120V117a3 3 0 016 0v3"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <text
                x="474"
                y="129"
                fontFamily="system-ui,sans-serif"
                fontSize="12"
                fill="#64748b"
                fontWeight="500"
              >
                React
              </text>
              <text
                x="474"
                y="143"
                fontFamily="system-ui,sans-serif"
                fontSize="10"
                fill="#94a3b8"
              >
                Locked
              </text>
            </g>

            {/* ── Next.js Node — locked (centre ~505, 240) ── */}
            <g opacity="0.55">
              <rect
                x="440"
                y="210"
                width="118"
                height="54"
                rx="10"
                fill="white"
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              <rect
                x="457"
                y="230"
                width="10"
                height="8"
                rx="1"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.2"
              />
              <path
                d="M459 230V227a3 3 0 016 0v3"
                fill="none"
                stroke="#94a3b8"
                strokeWidth="1.2"
                strokeLinecap="round"
              />
              <text
                x="474"
                y="239"
                fontFamily="system-ui,sans-serif"
                fontSize="12"
                fill="#64748b"
                fontWeight="500"
              >
                Next.js
              </text>
              <text
                x="474"
                y="253"
                fontFamily="system-ui,sans-serif"
                fontSize="10"
                fill="#94a3b8"
              >
                Locked
              </text>
            </g>
          </svg>

          {/* Map Legend */}
          <div className="absolute bottom-3 left-3 flex flex-col gap-1 rounded-lg border border-slate-200 bg-white p-2 sm:p-2.5">
            <p className="mb-1 text-[10px] uppercase tracking-widest text-slate-400">
              Map Legend
            </p>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full bg-[#4e8888]" />
              <span className="text-xs text-slate-500">Completed</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-2.5 w-2.5 rounded-full border-2 border-[#4e8888]" />
              <span className="text-xs text-slate-500">Active Node</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Icon
                path={PATHS.lock}
                size={9}
                color="#cbd5e1"
                viewBox="0 0 20 16"
              />
              <span className="text-xs text-slate-500">Locked Stage</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface LinePoint {
  x: number;
  y: number;
}

interface Line {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

function cubicPath(x1: number, y1: number, x2: number, y2: number): string {
  const mx = (x1 + x2) / 2;
  return `M ${x1} ${y1} C ${mx} ${y1}, ${mx} ${y2}, ${x2} ${y2}`;
}

function branchPath(x1: number, y1: number, x2: number, y2: number): string {
  const bend = Math.max(28, Math.abs(x2 - x1) * 0.28);
  return `M ${x1} ${y1} C ${x1 + bend} ${y1}, ${x2 - bend} ${y2}, ${x2} ${y2}`;
}

function getRightMid(
  el: HTMLElement,
  container: HTMLElement,
  inset = 0,
): LinePoint {
  const er = el.getBoundingClientRect();
  const cr = container.getBoundingClientRect();
  return { x: er.right - cr.left - inset, y: er.top - cr.top + er.height / 2 };
}

function getLeftMid(
  el: HTMLElement,
  container: HTMLElement,
  inset = 0,
): LinePoint {
  const er = el.getBoundingClientRect();
  const cr = container.getBoundingClientRect();
  return { x: er.left - cr.left + inset, y: er.top - cr.top + er.height / 2 };
}

function PathRoadmap() {
  const containerRef = useRef<HTMLDivElement>(null);
  const githubRef = useRef<HTMLDivElement>(null);
  const resumeRef = useRef<HTMLDivElement>(null);
  const processorRef = useRef<HTMLDivElement>(null);
  const out0Ref = useRef<HTMLDivElement>(null);
  const out1Ref = useRef<HTMLDivElement>(null);
  const out2Ref = useRef<HTMLDivElement>(null);
  const dreamRef = useRef<HTMLDivElement>(null);

  const [lines, setLines] = useState<Line[]>([]);

  useEffect(() => {
    function measure() {
      const c = containerRef.current;
      if (
        !c ||
        !githubRef.current ||
        !resumeRef.current ||
        !processorRef.current ||
        !out0Ref.current ||
        !out1Ref.current ||
        !out2Ref.current ||
        !dreamRef.current
      ) {
        return;
      }

      const gh = getRightMid(githubRef.current, c);
      const re = getRightMid(resumeRef.current, c);
      const pL = getLeftMid(processorRef.current, c);
      const pR = getRightMid(processorRef.current, c);
      const o0L = getLeftMid(out0Ref.current, c);
      const o1L = getLeftMid(out1Ref.current, c);
      const o2L = getLeftMid(out2Ref.current, c);
      const o0R = getRightMid(out0Ref.current, c);
      const o1R = getRightMid(out1Ref.current, c);
      const o2R = getRightMid(out2Ref.current, c);
      const dr = getLeftMid(dreamRef.current, c);

      setLines([
        { x1: gh.x, y1: gh.y, x2: pL.x, y2: pL.y },
        { x1: re.x, y1: re.y, x2: pL.x, y2: pL.y },
        { x1: pR.x, y1: pR.y, x2: o0L.x, y2: o0L.y },
        { x1: pR.x, y1: pR.y, x2: o1L.x, y2: o1L.y },
        { x1: pR.x, y1: pR.y, x2: o2L.x, y2: o2L.y },
        { x1: o0R.x, y1: o0R.y, x2: dr.x, y2: dr.y },
        { x1: o1R.x, y1: o1R.y, x2: dr.x, y2: dr.y },
        { x1: o2R.x, y1: o2R.y, x2: dr.x, y2: dr.y },
      ]);
    }

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-[2rem] border border-white/60 bg-white/70 p-10 shadow-[0_20px_60px_rgba(72,122,148,0.18)] backdrop-blur-sm"
    >
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full opacity-35"
        style={{ zIndex: 0 }}
      >
        <defs>
          <pattern
            id="dotsRoadmap"
            x="0"
            y="0"
            width="24"
            height="24"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1.5" cy="1.5" r="1.2" fill="#94a3b8" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#dotsRoadmap)" />
      </svg>

      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        fill="none"
        style={{ zIndex: 2 }}
      >
        {lines.map((line, index) => (
          <path
            key={index}
            d={cubicPath(line.x1, line.y1, line.x2, line.y2)}
            stroke="#4e8888"
            strokeWidth="2"
            strokeDasharray="7 5"
            opacity="0.5"
            strokeLinecap="round"
          />
        ))}
      </svg>

      <div
        className="relative flex flex-col items-center justify-between gap-8 xl:flex-row"
        style={{ zIndex: 3 }}
      >
        <div className="flex flex-col gap-5">
          <div
            ref={githubRef}
            className="flex w-36 flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100 ring-1 ring-slate-200">
              <Image
                src="/assets/Github.svg"
                alt="Github"
                width={30}
                height={30}
                className="h-[30px] w-[30px] object-contain"
              />
            </div>
            <span className="text-base text-slate-800">Github</span>
          </div>
          <div
            ref={resumeRef}
            className="flex w-36 flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#4e8888]/12 ring-1 ring-[#4e8888]/15">
              <Image
                src="/assets/Copy.svg"
                alt="Resume"
                width={28}
                height={28}
                className="h-7 w-10 object-contain"
              />
            </div>
            <span className="text-base text-slate-800">Resume</span>
          </div>
        </div>

        <div ref={processorRef} className="relative flex-shrink-0">
          <div className="absolute inset-0 scale-110 rounded-2xl bg-[#4e8888] opacity-20 blur-2xl" />
          <div className="relative flex h-28 w-28 flex-col items-center justify-center gap-2 rounded-2xl border-2 border-[#4e8888] bg-white shadow-xl">
            <Image
              src="/assets/file.svg"
              alt="Logo"
              className="h-10 w-13 object-contain"
              width={10}
              height={10}
            />
            <span className="text-center text-xs uppercase tracking-widest text-[#4e8888]">
              Rolemap
              <br />
              AI
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div
            ref={out0Ref}
            className="flex w-60 items-center justify-center gap-3 rounded-2xl border border-[#4e8888]/20 bg-white/70 px-5 py-3 shadow-sm"
          >
            <span className="text-base text-slate-700">Daily Tasks</span>
          </div>
          <div
            ref={out1Ref}
            className="flex w-60 items-center justify-center gap-3 rounded-2xl border border-[#4e8888]/20 bg-white/70 px-5 py-3 shadow-sm"
          >
            <span className="text-base text-slate-700">
              Personalized Roadmaps
            </span>
          </div>
          <div
            ref={out2Ref}
            className="flex w-60 items-center justify-center gap-3 rounded-2xl border border-[#4e8888]/20 bg-white/70 px-5 py-3 shadow-sm"
          >
            <span className="text-base text-slate-700">Gamified Process</span>
          </div>
        </div>

        <div
          ref={dreamRef}
          className="flex flex-shrink-0 flex-col items-center gap-2"
        >
          <div className="mt-10 flex flex-col items-center gap-1.5 rounded-2xl bg-[#4e8888] px-6 py-5 shadow-lg">
            <span className="whitespace-nowrap text-base text-white">
              Dream Role
            </span>
          </div>
          <p className="max-w-[100px] text-center text-sm leading-snug text-slate-400">
            Your career destination
          </p>
        </div>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden text-slate-900">
      <LandingParallax />

      <main className="relative z-10">
        <section className="px-5 pb-20 pt-14 sm:px-8 sm:pt-16 lg:px-16 lg:pb-24 lg:pt-18">
          <div className="grid min-h-[calc(100vh-5rem)] items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(480px,720px)] lg:gap-12">
            <div className="max-w-3xl">
              <div className="inline-flex items-center rounded-full border border-white/70 bg-white/55 px-4 py-2.5 text-sm text-slate-700 shadow-sm backdrop-blur-sm sm:text-base lg:text-lg">
                Build your path one checkpoint at a time
              </div>
              <h1 className="mt-6 text-5xl leading-none text-slate-900 sm:text-6xl lg:text-[5.35rem]">
                Rolemap:
                <br />
                Your Career,
                <span className="text-[#2f6f88]"> Gamified.</span>
              </h1>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <button
                  onClick={() =>
                    signIn("google", { callbackUrl: "/OnBoarding/Major" })
                  }
                  className="h-13 rounded-xl bg-[#0270b2] px-8 text-lg text-white shadow-lg transition-colors hover:bg-[#3d7070] sm:h-14 sm:text-xl"
                >
                  Get Started
                </button>
                <button
                  onClick={() =>
                    document
                      .getElementById("how-it-works")
                      ?.scrollIntoView({ behavior: "smooth" })
                  }
                  className="h-13 rounded-xl border-2 border-white/70 bg-white/35 px-8 text-lg text-[#2f6f88] backdrop-blur-sm transition-colors hover:bg-white/55 sm:h-14 sm:text-xl"
                >
                  Learn More
                </button>
              </div>
            </div>
            <RoadmapCanvas />
          </div>
        </section>

        <section id="how-it-works" className="px-6 py-20 sm:px-10 lg:px-20">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-12">
            <div className="text-center">
              <h2 className="text-4xl text-slate-900 sm:text-5xl">
                How Your Path Is Built
              </h2>
              <p className="mx-auto mt-4 max-w-4xl text-lg leading-relaxed text-slate-700 sm:text-xl">
                We analyze your professional footprint to craft a focused
                journey around the role you actually want.
              </p>
            </div>
            <div className="w-full">
              <PathRoadmap />
            </div>
          </div>
        </section>

        <section className="px-6 py-20 sm:px-10 lg:px-20">
          <div className="mx-auto flex max-w-6xl flex-col items-center gap-12">
            <div className="text-center">
              <h2 className="text-4xl text-slate-900 sm:text-5xl">
                The Roadmap to Success
              </h2>
              <p className="mx-auto mt-4 max-w-4xl text-lg text-slate-700 sm:text-xl">
                Everything you need to go from where you are to where you want
                to be.
              </p>
            </div>
            <div className="grid w-full gap-6 lg:grid-cols-3">
              {[
                {
                  imageSrc: "/assets/Trending.svg",
                  title: "Daily Tasks",
                  desc: "Small, manageable steps every day. We break complex career goals into 15-minute actions.",
                },
                {
                  imageSrc: "/assets/User.svg",
                  title: "Personalized Flow",
                  desc: "A visual guide tailored to your background, with AI spotting gaps and filling them in.",
                },
                {
                  imageSrc: "/assets/Gaming.svg",
                  title: "Gamified Progress",
                  desc: "Earn rewards, track milestones, and watch your profile level up in real time.",
                },
              ].map(({ imageSrc, title, desc }) => (
                <div
                  key={title}
                  className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-[0_16px_40px_rgba(80,130,155,0.14)] backdrop-blur-sm"
                >
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#4e8888]/10 ring-1 ring-[#4e8888]/12">
                    <Image
                      src={imageSrc}
                      alt={title}
                      width={28}
                      height={28}
                      className="h-7 w-7 object-contain"
                    />
                  </div>
                  <p className="mt-4 text-2xl text-slate-900">{title}</p>
                  <p className="mt-3 text-base leading-relaxed text-slate-600">
                    {desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="relative mt-6 min-h-[76vh] px-6 pb-[12vh] pt-28 sm:px-10 lg:px-20">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[42vh]"
            style={{
              ...PIXEL,
              backgroundImage: "url('/assets/ground.png')",
              backgroundSize: "1796px 42vh",
              backgroundRepeat: "repeat-x",
              backgroundPosition: "bottom left",
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-[26vh] z-0 h-[28vh]"
            style={{
              background:
                "linear-gradient(180deg, rgba(124,205,246,0) 0%, rgba(124,205,246,0.52) 42%, rgba(124,205,246,0.96) 100%)",
            }}
          />
          <div className="relative z-10 mx-auto max-w-5xl pt-[16vh]">
            <div className="relative overflow-hidden rounded-[2.5rem] border border-[#4e8888]/20 bg-[#72b781]/88 px-8 py-14 text-center shadow-[0_30px_60px_rgba(78,136,136,0.28)] sm:px-12 lg:px-16">
              <div className="absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-white/20 to-transparent" />
              <div className="absolute -left-12 bottom-0 h-28 w-36 rounded-full bg-[#629b69]/78 blur-sm" />
              <div className="absolute -right-12 bottom-0 h-32 w-40 rounded-full bg-[#5e9564]/78 blur-sm" />
              <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#5f9767]/45 to-transparent" />
              <div className="relative">
                <h2 className="text-5xl text-white sm:text-6xl">
                  Ready to level up your career?
                </h2>
                <p className="mx-auto mt-5 max-w-3xl text-xl text-white/90 sm:text-2xl">
                  Start where you are, sync your profile, and let the first path
                  open up.
                </p>
                <button
                  onClick={() =>
                    signIn("google", { callbackUrl: "/OnBoarding/Major" })
                  }
                  className="mt-10 h-16 rounded-xl bg-white px-10 text-xl text-[#4e8888] shadow-md transition-colors hover:bg-slate-50"
                >
                  Start My Journey Now
                </button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
