"use client";
import React, { useState, useEffect } from "react";
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
            <div
              className={`w-14 h-14 flex items-center justify-center pixel-border text-3xl select-none transition-all duration-300 ${
                done
                  ? "border-t-[#7ab3b3] border-l-[#7ab3b3] border-r-[#4e8888] border-b-[#4e8888] bg-[#e8f4f4]"
                  : "border-t-[#d4e8e8] border-l-[#d4e8e8] border-r-[#7ab3b3] border-b-[#7ab3b3] bg-[#f0f8f8]"
              }`}
            >
              {done ? "??" : generating ? <span className="text-[#4e8888] font-jersey text-xl animate-pulse">···</span> : <span className="text-[#4e8888]">?</span>}
            </div>

            {generating && (
              <div className="w-full max-w-xs">
                <PixelProgress value={((stepIdx + 1) / PROGRESS_STEPS.length) * 100} showLabel={false} />
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
            <PixelButton variant="primary" onClick={() => router.push("/dashboard")} size="md" disabled={!done}>
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
