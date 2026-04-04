"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import PixelButton from "../../components/PixelButton";
import PixelProgress from "../../components/PixelProgress";
import TypewriterText from "../../components/Typewriter";

export default function GenerateRoadmap() {
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
    <div className="relative h-screen overflow-hidden w-full bg-[#f0f8f8] p-3 flex flex-col">
      <div className="scanlines" />

      <div className="max-w-5xl mx-auto w-full flex flex-col flex-1">
        {/* Header */}
        <div className="mb-4">
          <PixelProgress value={100} showLabel={true} step={5} totalSteps={5} />
          <TypewriterText
            text="Almost there"
            speed={40}
            delay={400}
            className="text-5xl text-[#2d5050] leading-relaxed block"
          />
          <TypewriterText
            text="We've analyzed your inputs. We'll create a personalized career roadmap tailored to your chosen role and target companies."
            speed={20}
            delay={1600}
            className="text-2xl text-[#4e8888] leading-relaxed max-w-2xl block mb-4"
          />
        </div>

        {/* Central Card — fixed height, same pattern as ResumeUpload cards */}
        <div className="mb-4" style={{ height: "260px" }}>
          <div
            className={`
              pixel-border h-full cursor-pointer flex flex-col items-center justify-center gap-4 p-6 transition-all duration-100
              ${done
                ? "border-t-[#7ab3b3] border-l-[#7ab3b3] border-r-[#4e8888] border-b-[#4e8888] bg-[#e8f4f4]"
                : generating
                  ? "border-t-[#d4e8e8] border-l-[#d4e8e8] border-r-[#7ab3b3] border-b-[#7ab3b3] bg-white"
                  : "border-t-[#d4e8e8] border-l-[#d4e8e8] border-r-[#7ab3b3] border-b-[#7ab3b3] bg-white hover:bg-[#f0f8f8]"
              }
            `}
          >
            {/* Icon */}
            <div
              className={`w-14 h-14 flex items-center justify-center pixel-border text-3xl select-none transition-all duration-300
                ${done
                  ? "border-t-[#7ab3b3] border-l-[#7ab3b3] border-r-[#4e8888] border-b-[#4e8888] bg-[#e8f4f4]"
                  : "border-t-[#d4e8e8] border-l-[#d4e8e8] border-r-[#7ab3b3] border-b-[#7ab3b3] bg-[#f0f8f8]"
                }
              `}
            >
              {done ? "🎉" : generating ? (
                <span className="text-[#4e8888] font-jersey text-xl animate-pulse">···</span>
              ) : (
                <span className="text-[#4e8888]">✦</span>
              )}
            </div>

            {/* Generation progress bar */}
            {generating && (
              <div className="w-full max-w-xs pixel-border border-t-[#7ab3b3] border-l-[#7ab3b3] border-r-[#d4e8e8] border-b-[#d4e8e8] bg-[#f0f8f8] p-1 h-5">
                <div
                  className="h-full bg-[#4e8888]"
                  style={{ width: "100%", transition: "width 2s linear" }}
                />
              </div>
            )}

            <span className="text-xl text-[#2d5050] font-jersey text-center">
              {done ? "Roadmap Generated!" : generating ? "Generating..." : "Ready to generate?"}
            </span>

            <span className="text-md text-[#4e8888] font-jersey text-center">
              {done
                ? "Your personalized path awaits. Hit Continue below."
                : "Based on your profile, we'll map out everything you need to land your dream role."}
            </span>

            {!done && (
              <PixelButton
                variant="primary"
                onClick={handleGenerate}
                disabled={generating}
                size="md"
              >
                <span className="font-jersey">
                  {generating ? "Generating..." : "Generate Roadmap"}
                </span>
              </PixelButton>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="mt-auto flex items-center justify-between">
          <PixelButton variant="ghost" onClick={() => router.push("../OnBoarding/Resume")} size="md">
            <div className="flex items-center gap-2 text-xl">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </div>
          </PixelButton>
          <div className="flex items-center gap-4 text-xl">
            <PixelButton
              variant="primary"
              onClick={() => router.push("/dashboard")}
              size="md"
              disabled={!done}
            >
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