"use client";
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { api } from "@/lib/api";

const TOTAL_STEPS = 5;
const CURRENT_STEP = 5;
const PROGRESS = Math.round((CURRENT_STEP / TOTAL_STEPS) * 100);

const PROGRESS_STEPS = [
  "Fetching GitHub profile...",
  "Analyzing repositories...",
  "Parsing resume...",
  "Mapping skills to knowledge graph...",
  "Running topological sort...",
  "Finalizing your roadmap...",
];

const GenerateRoadmap: React.FC = () => {
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
      setStepIdx(i => (i + 1) % PROGRESS_STEPS.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [generating]);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);
    setStepIdx(0);
    try {
      const role = localStorage.getItem("ob_role") ?? "software engineer";
      const githubUsername =
        ((session?.user as Record<string, unknown>)?.githubUsername as string) ?? "";

      const res = await api.generateRoadmap({ role, github_username: githubUsername });
      setResult({ steps_count: res.steps_count, role: res.role });
      ["ob_role", "ob_companies", "ob_preferences"].forEach(k =>
        localStorage.removeItem(k)
      );
      setDone(true);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Generation failed. You can still continue."
      );
      setDone(true);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-[100vh] font-[Inter] bg-[#E4E4E4] flex flex-col">
      {/* Nav */}
      <nav className="bg-white/80 backdrop-blur border-b border-[#d4d4d4] px-8 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#508484] flex items-center justify-center text-white text-xs font-bold">
            RM
          </div>
          <span className="font-bold text-[#1B1B1B] text-base">RoleMap</span>
        </div>
        <button className="text-sm text-[#508484] font-semibold hover:text-[#6a9e9e] transition-colors duration-200">
          Save & Exit
        </button>
      </nav>

      {/* Main */}
      <main className="flex-1 max-w-[1040px] mx-auto w-full px-6 pt-12">
        {/* Progress Header */}
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-xs font-bold tracking-widest text-[#508484] uppercase mb-1">
              Onboarding
            </p>
            <h1 className="text-[28px] font-extrabold text-[#1B1B1B]">
              Almost there
            </h1>
          </div>
          <div className="text-right shrink-0 ml-8">
            <p className="text-sm font-bold text-[#1B1B1B]">{PROGRESS}% Complete</p>
            <p className="text-xs text-[#a0b8b8] mt-0.5">
              Step {CURRENT_STEP} of {TOTAL_STEPS}
            </p>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-[#d4d4d4] rounded-full mb-8 overflow-hidden">
          <div
            className="h-full bg-[#508484] rounded-full transition-all duration-500"
            style={{ width: `${PROGRESS}%` }}
          />
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#d4d4d4] max-w-[580px] mx-auto p-16 flex flex-col items-center text-center gap-6">
          {/* Icon */}
          <div className="text-[#508484] text-5xl leading-none select-none">
            {done ? (error ? "⚠️" : "🎉") : generating ? "⚙️" : "✦✦"}
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-[22px] font-extrabold text-[#1B1B1B]">
              {done
                ? error
                  ? "Partial success"
                  : `Roadmap ready!`
                : generating
                ? "Building your roadmap..."
                : "Ready to generate?"}
            </h2>
            <p className="text-sm text-[#555555] max-w-[380px] leading-relaxed">
              {done
                ? error
                  ? error
                  : result
                  ? `Generated ${result.steps_count} learning steps for ${result.role}. Hit Continue to start your journey.`
                  : "Your personalized career roadmap has been created."
                : generating
                ? PROGRESS_STEPS[stepIdx]
                : "We'll analyze your GitHub profile and resume, then build a personalized learning roadmap ordered by prerequisites."}
            </p>
          </div>

          {/* Progress dots while generating */}
          {generating && (
            <div className="flex gap-1.5">
              {PROGRESS_STEPS.map((_, i) => (
                <div
                  key={i}
                  className={`w-2 h-2 rounded-full transition-all duration-500 ${
                    i === stepIdx ? "bg-[#508484] scale-125" : "bg-[#d4d4d4]"
                  }`}
                />
              ))}
            </div>
          )}

          <button
            onClick={handleGenerate}
            disabled={generating || done}
            className={`
              px-8 py-3 rounded-xl font-semibold text-sm transition-all duration-200
              ${done
                ? "bg-[#d4d4d4] text-[#a0b8b8] cursor-default"
                : generating
                  ? "bg-[#a0b8b8] text-white cursor-wait"
                  : "bg-[#508484] text-white hover:bg-[#6a9e9e] hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]"
              }
            `}
          >
            {done
              ? "✓ Roadmap Generated"
              : generating
              ? "Generating..."
              : "Generate Roadmap"}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-[1040px] mx-auto w-full px-6 py-8">
        <div className="border-t border-[#d4d4d4] pt-6 flex justify-between items-center">
          <button
            onClick={() => router.push("/OnBoarding/Resume")}
            className="flex items-center gap-2 text-sm text-[#555555] font-medium hover:text-[#1B1B1B] transition-colors duration-200"
          >
            ← Back
          </button>
          <button
            disabled={!done}
            onClick={() => router.push("/dashboard")}
            className={`
              px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200
              ${done
                ? "bg-[#508484] text-white hover:bg-[#6a9e9e]"
                : "bg-[#d4d4d4] text-[#a0b8b8] cursor-not-allowed"
              }
            `}
          >
            Continue →
          </button>
        </div>
      </footer>
    </div>
  );
};

export default GenerateRoadmap;
