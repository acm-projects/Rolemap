"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Headphones, BookOpen, Wrench, ArrowLeft, ArrowRight, X } from "lucide-react";
import PixelButton from "../../components/PixelButton";
import PixelCard from "../../components/PixelCard";
import PixelProgress from "../../components/PixelProgress";
import TypewriterText from "../../components/Typewriter";

const preferences = [
  { id: "visual", label: "Visual", description: "Diagrams, flowcharts, and video demos.", icon: <Eye size={100} /> },
  { id: "auditory", label: "Auditory", description: "Podcasts, discussions, verbal explanations.", icon: <Headphones size={100} /> },
  { id: "reading", label: "Reading", description: "Docs, technical articles, written notes.", icon: <BookOpen size={100} /> },
  { id: "kinesthetic", label: "Kinesthetic", description: "Labs, live coding, building prototypes.", icon: <Wrench size={100} /> },
];

export default function LearningPreferences() {
  const router = useRouter();
  const [selected, setSelected] = useState<string[]>([]);
  const [otherText, setOtherText] = useState("");

  const toggle = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  const canContinue = selected.length > 0 || otherText.trim().length > 0;

  const handleContinue = () => {
    localStorage.setItem("ob_preferences", JSON.stringify({ preferences: selected, other: otherText }));
    router.push("/OnBoarding/Resume");
  };

  return (
    <div className="relative h-screen overflow-hidden w-full bg-[#f0f8f8] p-3 flex flex-col">
      <div className="scanlines" />

      <div className="max-w-5xl mx-auto w-full flex flex-col justify-between flex-1">
        <div className="mb-1">
          <PixelProgress value={60} showLabel={true} step={3} totalSteps={5} />
          <div className="min-h-[5rem]">
            <TypewriterText
              text="How do you learn best?"
              speed={20}
              delay={400}
              className="text-5xl text-[#2d5050] leading-relaxed block"
            />
          </div>
          <div className="min-h-[5rem]">
            <TypewriterText
              text="Select the modalities that help you absorb complex technical concepts most effectively."
              speed={10}
              delay={800}
              className="text-2xl text-[#4e8888] leading-relaxed max-w-2xl block"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
          {preferences.map((p) => {
            const isSelected = selected.includes(p.id);
            return (
              <PixelCard key={p.id} onClick={() => toggle(p.id)} selected={isSelected}>
                <div
                  className={`flex justify-center items-center p-3 flex flex-col gap-2 h-full transition-all duration-100 ${
                    isSelected ? "bg-[#3a6666] translate-y-[4px]" : "bg-transparent translate-y-0"
                  }`}
                >
                  <div
                    className={`w-10 h-10 flex items-center justify-center transition-colors duration-100 ${
                      isSelected ? "text-white" : "text-[#4e8888]"
                    }`}
                  >
                    {p.icon}
                  </div>
                  <span
                    className={`text-3xl font-jersey transition-colors duration-100 ${
                      isSelected ? "text-white" : "text-[#2d5050]"
                    }`}
                  >
                    {p.label}
                  </span>
                </div>
              </PixelCard>
            );
          })}
        </div>

        {/* Selected tags */}
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-2">
            {selected.map((id) => {
              const pref = preferences.find((p) => p.id === id);
              if (!pref) return null;
              return (
                <div
                  key={id}
                  className="flex items-center gap-1.5 bg-[#3a6666] text-white text-sm font-jersey px-3 py-1 cursor-pointer hover:bg-[#2d5050] transition-colors"
                  style={{ borderWidth: 2, borderStyle: 'solid', borderTopColor: '#4e8888', borderLeftColor: '#4e8888', borderRightColor: '#1e3838', borderBottomColor: '#1e3838' }}
                  onClick={() => toggle(id)}
                >
                  {pref.label}
                  <X size={12} />
                </div>
              );
            })}
          </div>
        )}

        <div className="mb-2 flex-1 flex flex-col pt-2">
          <span className="text-3xl text-[#4e8888] font-jersey uppercase tracking-widest mb-1">
            Other Preferences
          </span>
          <div className="pixel-border border-[#7ab3b3] bg-white flex-1">
            <textarea
              value={otherText}
              onChange={(e) => setOtherText(e.target.value)}
              placeholder="E.g., I prefer focused 2-hour sprints with 15-minute breaks..."
              className="w-full h-full text-sm text-[#2d5050] placeholder-[#9fc9c9] bg-transparent outline-none resize-none p-3 font-jersey leading-relaxed"
              style={{ fontFamily: "'Press Start 2P', monospace", fontSize: "16px" }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between mt-2">
          <PixelButton variant="ghost" onClick={() => router.push("/OnBoarding/Company")} size="md">
            <div className="flex items-center gap-2 text-xl">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </div>
          </PixelButton>
          <div className="flex items-center gap-4 text-xl">
            <PixelButton variant="primary" onClick={handleContinue} size="md" disabled={!canContinue}>
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
