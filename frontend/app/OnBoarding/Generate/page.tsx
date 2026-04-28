"use client";
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";
import { ArrowLeft, ArrowRight } from "lucide-react";
import PixelButton from "../../components/PixelButton";
import PixelProgress from "../../components/PixelProgress";
import TypewriterText from "../../components/Typewriter";

const PROGRESS_STEPS = [
  "Fetching GitHub profile...",
  "Analyzing repositories...",
  "Parsing resume...",
  "Mapping skills to knowledge graph...",
  "Running topological sort...",
  "Finalizing your roadmap...",
];

// Pixel-art map growing animation shown while generating / when done
const MAP_NODES = [
  { x: 60,  y: 110, label: 'START' },
  { x: 180, y: 60,  label: 'SKILL' },
  { x: 300, y: 110, label: 'LEARN' },
  { x: 420, y: 60,  label: 'BUILD' },
  { x: 540, y: 110, label: 'GROW'  },
  { x: 660, y: 60,  label: 'GOAL'  },
];
const MAP_EDGES = [[0,1],[1,2],[2,3],[3,4],[4,5]];

function MapAnimation({ active, done, stepIdx }: { active: boolean; done: boolean; stepIdx: number }) {
  const [visibleNodes, setVisibleNodes] = useState(0);
  const [visibleEdges, setVisibleEdges] = useState(0);
  const mountRef = useRef(false);

  useEffect(() => {
    if (!active && !done) { setVisibleNodes(0); setVisibleEdges(0); return; }
    if (mountRef.current) return;
    mountRef.current = true;
    const timers: ReturnType<typeof setTimeout>[] = [];
    MAP_NODES.forEach((_, i) => {
      timers.push(setTimeout(() => setVisibleNodes(i + 1), i * 380));
      if (i < MAP_EDGES.length) timers.push(setTimeout(() => setVisibleEdges(i + 1), i * 380 + 200));
    });
    return () => timers.forEach(clearTimeout);
  }, [active, done]);

  const W = 740, H = 180;
  const NW = 72, NH = 36, R = 6;

  return (
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '16px 0' }}>
      <style>{`
        @keyframes nodeIn { 0%{transform:scale(0) translate(-50%,-50%);opacity:0} 60%{transform:scale(1.12) translate(-50%,-50%);opacity:1} 100%{transform:scale(1) translate(-50%,-50%);opacity:1} }
        @keyframes edgeDraw { 0%{stroke-dashoffset:300} 100%{stroke-dashoffset:0} }
        @keyframes nodePulse { 0%,100%{opacity:1} 50%{opacity:0.6} }
      `}</style>
      <svg width={W} height={H} style={{ imageRendering: 'pixelated', overflow: 'visible' }}>
        {MAP_EDGES.map(([a, b], i) => {
          if (i >= visibleEdges) return null;
          const na = MAP_NODES[a], nb = MAP_NODES[b];
          const len = Math.hypot(nb.x - na.x, nb.y - na.y);
          return (
            <line key={i}
              x1={na.x} y1={na.y} x2={nb.x} y2={nb.y}
              stroke={done ? '#04A0FF' : '#8ED4FF'}
              strokeWidth={4}
              strokeDasharray={`${len} ${len}`}
              strokeDashoffset={0}
              style={{ animation: `edgeDraw 0.3s linear forwards` }}
            />
          );
        })}
        {MAP_NODES.map((n, i) => {
          if (i >= visibleNodes) return null;
          const isLast = i === MAP_NODES.length - 1;
          const fill = done && isLast ? '#04A0FF' : done ? '#E1FAFF' : i === 0 ? '#334155' : '#ffffff';
          const stroke = done && isLast ? '#0060aa' : '#8ED4FF';
          const textColor = (done && isLast) || i === 0 ? '#ffffff' : '#78ADCF';
          return (
            <g key={i} style={{ transformOrigin: `${n.x}px ${n.y}px`, animation: `nodeIn 0.35s cubic-bezier(.34,1.56,.64,1) forwards`, animationDelay: '0ms' }}>
              <rect
                x={n.x - NW/2} y={n.y - NH/2}
                width={NW} height={NH} rx={R} ry={R}
                fill={fill} stroke={stroke} strokeWidth={3}
                style={{ shapeRendering: 'crispEdges' }}
              />
              {/* pixel shadow */}
              <rect x={n.x - NW/2 + 3} y={n.y + NH/2} width={NW} height={4} rx={0} fill="rgba(0,0,0,0.15)" />
              <text x={n.x} y={n.y + 1} textAnchor="middle" dominantBaseline="middle"
                style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 7, fill: textColor, imageRendering: 'pixelated' }}>
                {n.label}
              </text>
              {done && !active && (
                <circle cx={n.x + NW/2 - 6} cy={n.y - NH/2 + 6} r={5}
                  fill={isLast ? '#F9EC72' : '#04A0FF'}
                  style={isLast ? { animation: 'nodePulse 1.2s ease-in-out infinite' } : undefined} />
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: done ? '#04A0FF' : '#8ED4FF', letterSpacing: 1 }}>
        {done ? '▶ MAP READY' : `BUILDING MAP${'.'.repeat((visibleNodes % 3) + 1)}`}
      </div>
      {active && (
        <div style={{ width: '100%', maxWidth: 320 }}>
          <PixelProgress value={((stepIdx + 1) / PROGRESS_STEPS.length) * 100} showLabel={false} />
          <p style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: '#78ADCF', textAlign: 'center', marginTop: 8 }}>{PROGRESS_STEPS[stepIdx]}</p>
        </div>
      )}
    </div>
  );
}

export default function GenerateRoadmap() {
  const router = useRouter();
  const { data: session } = useSession();
  const [generating, setGenerating] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stepIdx, setStepIdx] = useState(0);
  const [result, setResult] = useState<{ steps_count: number; role: string } | null>(null);

  useEffect(() => {
    if (!generating) return;
    const timer = setInterval(() => {
      setStepIdx((i) => (i + 1) % PROGRESS_STEPS.length);
    }, 2500);
    return () => clearInterval(timer);
  }, [generating]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Enter") return;
      if (done) {
        router.push("/map");
      } else if (!generating) {
        handleGenerate();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [done, generating]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setStepIdx(0);
    try {
      const role = localStorage.getItem("ob_role") ?? "software engineer";
      const githubUsername = ((session?.user as Record<string, unknown>)?.githubUsername as string) ?? "";

      const res = await api.generateRoadmap({ role, github_username: githubUsername });
      setResult({ steps_count: res.steps_count, role: res.role });
      ["ob_role", "ob_companies", "ob_preferences"].forEach((k) => localStorage.removeItem(k));
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed. You can still continue.");
      setDone(true);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="relative h-screen overflow-hidden w-full bg-linear-to-b from-[#7EC8E3] to-[#E1FAFF] p-3 flex flex-col">
      <div className="scanlines" />

      <div className="max-w-5xl mx-auto w-full flex flex-col flex-1">
        <div className="mb-4">
          <PixelProgress value={100} showLabel={true} step={5} totalSteps={5} />
          <div className="min-h-[5rem]">
            <TypewriterText text="Almost there" speed={20} delay={400} className="text-5xl text-[#334155] leading-relaxed block" />
          </div>
          <div className="min-h-[5rem]">
            <TypewriterText
              text="We'll build a personalized career roadmap tailored to your selected role and background."
              speed={10}
              delay={800}
              className="text-2xl text-[#78ADCF] leading-relaxed max-w-2xl block mb-4"
            />
          </div>
        </div>

        <div className="mb-4" style={{ height: done ? "auto" : "260px" }}>
          <div
            className={`
              pixel-border flex flex-col items-center justify-center gap-4 p-6 transition-all duration-100
              ${done ? "h-auto" : "h-full"}
              ${
                done
                  ? "border-t-[#8ED4FF] border-l-[#8ED4FF] border-r-[#04A0FF] border-b-[#04A0FF] bg-[#BEF8FF]"
                  : "border-t-[#DEF2FF] border-l-[#DEF2FF] border-r-[#8ED4FF] border-b-[#8ED4FF] bg-white"
              }
            `}
          >
            {(generating || done) ? (
              <MapAnimation active={generating} done={done} stepIdx={stepIdx} />
            ) : (
              <>
                <div className="w-14 h-14 flex items-center justify-center pixel-border text-3xl select-none border-t-[#DEF2FF] border-l-[#DEF2FF] border-r-[#8ED4FF] border-b-[#8ED4FF] bg-[#E1FAFF]">
                  <span className="text-[#04A0FF]">✦</span>
                </div>
                <span className="text-xl text-[#334155] font-jersey text-center">Ready to generate?</span>
                <span className="text-md text-[#78ADCF] font-jersey text-center">
                  Based on your profile, we will map out everything you need to land your dream role.
                </span>
                <PixelButton variant="primary" onClick={handleGenerate} disabled={generating} size="md">
                  <span className="font-jersey">Generate Roadmap</span>
                </PixelButton>
              </>
            )}
            {generating && (
              <div className="w-full max-w-xs">
                <PixelProgress value={((stepIdx + 1) / PROGRESS_STEPS.length) * 100} showLabel={false} />
                <p className="text-xs text-[#78ADCF] font-jersey text-center mt-2">{PROGRESS_STEPS[stepIdx]}</p>
              </div>
            )}

            {/* Completion banner */}
            {done && !generating && (
              <div className="w-full flex flex-col items-center gap-4 pt-2 border-t-2 border-[#8ED4FF]">
                <div className="flex items-center gap-3">
                  <span className="text-3xl select-none" style={{ imageRendering: "pixelated" }}>🗺️</span>
                  <TypewriterText
                    text={error ? "Generated with warnings" : "Roadmap has been generated!"}
                    speed={30}
                    delay={200}
                    className={`text-3xl font-jersey ${error ? "text-[#78ADCF]" : "text-[#334155]"}`}
                  />
                </div>
                {result && !error && (
                  <div className="flex gap-6">
                    <div className="flex flex-col items-center pixel-border px-5 py-2 border-t-[#8ED4FF] border-l-[#8ED4FF] border-r-[#04A0FF] border-b-[#04A0FF] bg-white">
                      <span className="text-3xl text-[#04A0FF] font-jersey">{result.steps_count}</span>
                      <span className="text-xs text-[#78ADCF] font-jersey mt-1">CHECKPOINTS</span>
                    </div>
                    <div className="flex flex-col items-center pixel-border px-5 py-2 border-t-[#8ED4FF] border-l-[#8ED4FF] border-r-[#04A0FF] border-b-[#04A0FF] bg-white">
                      <span className="text-base text-[#334155] font-jersey uppercase tracking-wide">{result.role}</span>
                      <span className="text-xs text-[#78ADCF] font-jersey mt-1">TARGET ROLE</span>
                    </div>
                  </div>
                )}
                {error && (
                  <p className="text-xs text-[#78ADCF] font-jersey text-center max-w-xs">{error}</p>
                )}
                <p className="text-xs text-[#78ADCF] font-jersey">Press Enter or Continue to view your map</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-auto flex items-center justify-between">
          <PixelButton variant="ghost" onClick={() => router.push("/OnBoarding/Resume")} size="md">
            <div className="flex items-center gap-2 text-xl">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </div>
          </PixelButton>
          <div className="flex items-center gap-4 text-xl">
            <PixelButton variant="primary" onClick={() => router.push("/map")} size="md" disabled={!done}>
              <div className="flex items-center gap-2 text-xl">
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </div>
            </PixelButton>
          </div>
        </div>
      </div>

      <style>{`
        .pixel-border {
          border-width: 4px;
          border-style: solid;
          box-shadow: 0 4px 0 0 rgba(0,0,0,0.3), inset 0 -2px 0 0 rgba(0,0,0,0.2);
          image-rendering: pixelated;
        }
        .pixel-border:active {
          box-shadow: 0 2px 0 0 rgba(0,0,0,0.3), inset 0 2px 0 0 rgba(0,0,0,0.2);
        }
        * { image-rendering: pixelated; -webkit-font-smoothing: none; }
      `}</style>
    </div>
  );
}
