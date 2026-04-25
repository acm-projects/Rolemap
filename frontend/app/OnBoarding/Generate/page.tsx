"use client";
<<<<<<< HEAD
import React, { useState, useEffect, useRef } from "react";
=======
import React, { useState, useEffect } from "react";
>>>>>>> 0f62b321a83728b06b8499cfcf6886f94ee0a2c8
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

function MapAnimation({ active, done }: { active: boolean; done: boolean }) {
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
    <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '16px 0' }}>
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
              stroke={done ? '#4a9696' : '#7ab3b3'}
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
          const fill = done && isLast ? '#3d7a7a' : done ? '#eaf4f4' : i === 0 ? '#3d7a7a' : '#ffffff';
          const stroke = done && isLast ? '#2e6666' : '#7ab3b3';
          const textColor = (done && isLast) || i === 0 ? '#ffffff' : '#4a7c7c';
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
                  fill={isLast ? '#f7d22e' : '#4a9696'}
                  style={isLast ? { animation: 'nodePulse 1.2s ease-in-out infinite' } : undefined} />
              )}
            </g>
          );
        })}
      </svg>
      <div style={{ fontFamily: "'Press Start 2P', monospace", fontSize: 9, color: done ? '#3d7a7a' : '#7ab3b3', letterSpacing: 1 }}>
        {done ? '▶ MAP READY' : `BUILDING MAP${'.'.repeat((visibleNodes % 3) + 1)}`}
      </div>
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
    <div className="relative h-screen overflow-hidden w-full bg-[#f0f8f8] p-3 flex flex-col">
      <div className="scanlines" />

      <div className="max-w-5xl mx-auto w-full flex flex-col flex-1">
        <div className="mb-4">
          <PixelProgress value={100} showLabel={true} step={5} totalSteps={5} />
          <div className="min-h-[5rem]">
            <TypewriterText text="Almost there" speed={20} delay={400} className="text-5xl text-[#2d5050] leading-relaxed block" />
          </div>
          <div className="min-h-[5rem]">
            <TypewriterText
              text="We'll build a personalized career roadmap tailored to your selected role and background."
              speed={10}
              delay={800}
              className="text-2xl text-[#4e8888] leading-relaxed max-w-2xl block mb-4"
            />
          </div>
        </div>

        <div className="mb-4" style={{ height: "260px" }}>
          <div
            className={`
              pixel-border h-full flex flex-col items-center justify-center gap-4 p-6 transition-all duration-100
              ${
                done
                  ? "border-t-[#7ab3b3] border-l-[#7ab3b3] border-r-[#4e8888] border-b-[#4e8888] bg-[#e8f4f4]"
                  : generating
                    ? "border-t-[#d4e8e8] border-l-[#d4e8e8] border-r-[#7ab3b3] border-b-[#7ab3b3] bg-white"
                    : "border-t-[#d4e8e8] border-l-[#d4e8e8] border-r-[#7ab3b3] border-b-[#7ab3b3] bg-white"
              }
            `}
          >
            {(generating || done) ? (
              <MapAnimation active={generating} done={done} />
            ) : (
              <>
                <div className="w-14 h-14 flex items-center justify-center pixel-border text-3xl select-none border-t-[#d4e8e8] border-l-[#d4e8e8] border-r-[#7ab3b3] border-b-[#7ab3b3] bg-[#f0f8f8]">
                  <span className="text-[#4e8888]">✦</span>
                </div>
                <span className="text-xl text-[#2d5050] font-jersey text-center">Ready to generate?</span>
                <span className="text-md text-[#4e8888] font-jersey text-center">
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
<<<<<<< HEAD
                <p className="text-xs text-[#4e8888] font-jersey text-center mt-2">{PROGRESS_STEPS[stepIdx]}</p>
              </div>
            )}
=======
              </div>
            )}

            <span className="text-xl text-[#2d5050] font-jersey text-center">
              {done ? (error ? "Partial success" : "Roadmap Generated!") : generating ? "Generating..." : "Ready to generate?"}
            </span>

            <span className="text-md text-[#4e8888] font-jersey text-center">
              {done
                ? error
                  ? error
                  : result
                    ? `Generated ${result.steps_count} learning steps for ${result.role}.`
                    : "Your personalized path awaits."
                : generating
                  ? PROGRESS_STEPS[stepIdx]
                  : "Based on your profile, we will map out everything you need to land your dream role."}
            </span>

            {!done && (
              <PixelButton variant="primary" onClick={handleGenerate} disabled={generating} size="md">
                <span className="font-jersey">{generating ? "Generating..." : "Generate Roadmap"}</span>
              </PixelButton>
            )}
>>>>>>> 0f62b321a83728b06b8499cfcf6886f94ee0a2c8
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
