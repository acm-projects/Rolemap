"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

const TOTAL_STEPS = 5;
const CURRENT_STEP = 5;
const PROGRESS = Math.round((CURRENT_STEP / TOTAL_STEPS) * 100);


const GenerateRoadmap: React.FC = () => {
    const router = useRouter();
    const [generating, setGenerating] = useState(false);
    const [done, setDone] = useState(false);

    const handleGenerate = () => {
        setGenerating(true);
        setTimeout(() => {
            setGenerating(false);
            setDone(true);
        }, 2000);
    };

    return (
    <div
      className="
        min-h-[100vh] font-[Inter] bg-[#E4E4E4]
        flex flex-col
      "
    >
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
          {/* Sparkle Icon */}
          <div className="text-[#508484] text-5xl leading-none select-none">
            {done ? "🎉" : "✦✦"}
          </div>

          <div className="flex flex-col gap-2">
            <h2 className="text-[22px] font-extrabold text-[#1B1B1B]">
              {done ? "Roadmap ready!" : "Ready to generate?"}
            </h2>
            <p className="text-sm text-[#555555] max-w-[380px] leading-relaxed">
              {done
                ? "Your personalized career roadmap has been created. Hit Continue to start your journey."
                : "We've analyzed your inputs. Based on your profile, we'll create a personalized career roadmap tailored to your chosen role and target companies."}
            </p>
          </div>

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
            {done ? "✓ Roadmap Generated" : generating ? "Generating..." : "Generate Roadmap"}
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