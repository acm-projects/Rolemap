"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Headphones, BookOpen, Wrench, ArrowLeft, ArrowRight } from "lucide-react";
import PixelButton from "../../components/PixelButton";
import PixelCard from "../../components/PixelCard";
import PixelProgress from "../../components/PixelProgress";
import TypewriterText from "../../components/Typewriter";

const preferences = [
  {
    id: "visual",
    label: "Visual",
    description: "Diagrams, flowcharts, and video demos.",
    icon: <Eye size={100} />,
  },
  {
    id: "auditory",
    label: "Auditory",
    description: "Podcasts, discussions, verbal explanations.",
    icon: <Headphones size={100} />,
  },
  {
    id: "reading",
    label: "Reading",
    description: "Docs, technical articles, written notes.",
    icon: <BookOpen size={100} />,
  },
  {
    id: "kinesthetic",
    label: "Kinesthetic",
    description: "Labs, live coding, building prototypes.",
    icon: <Wrench size={100} />,
  },
];

export default function LearningPreferences() {
  const router = useRouter();
  const [selected, setSelected] = useState<string>(""); // single select
  const [otherText, setOtherText] = useState("");

  const toggle = (id: string) => {
    setSelected((prev) => (prev === id ? "" : id));
  };

  const canContinue = selected !== "" || otherText.trim().length > 0;

  return (
    <div className="relative h-screen overflow-hidden w-full bg-[#f0f8f8] p-3 flex flex-col">
      <div className="scanlines" />

      <div className="max-w-5xl mx-auto w-full flex flex-col justify-between flex-1">
        {/* Header */}
        <div className="mb-1">
          <PixelProgress value={60} showLabel={true} />
          <TypewriterText
            text="How do you learn best?"
            speed={40}
            delay={400}
            className="text-5xl text-[#2d5050] leading-relaxed block"
          />
          <TypewriterText
            text="Select the modalities that help you absorb complex technical concepts most effectively."
            speed={20}
            delay={1600}
            className="text-2xl text-[#4e8888] leading-relaxed max-w-2xl block"
          />
        </div>

        {/* Preference Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-2">
          {preferences.map((p) => {
            const isSelected = selected === p.id;
            return (
              <PixelCard key={p.id} onClick={() => toggle(p.id)} selected={isSelected}>
                <div
                  className={`flex justify-center items-center p-3 flex flex-col gap-2 h-full transition-all duration-100
                    ${isSelected ? "bg-[#3a6666] translate-y-[4px]" : "bg-transparent translate-y-0"}
                  `}
                >
                  <div
                    className={`w-10 h-10 flex items-center justify-center transition-colors duration-100
                      ${isSelected ? "text-white" : "text-[#4e8888]"}
                    `}
                  >
                    {p.icon}
                  </div>
                  <span
                    className={`text-3xl font-jersey transition-colors duration-100
                      ${isSelected ? "text-white" : "text-[#2d5050]"}
                    `}
                  >
                    {p.label}
                  </span>
                </div>
              </PixelCard>
            );
          })}
        </div>

        {/* Other Preferences */}
        <div className="mb-2 flex-1 flex flex-col pt-3">
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

        {/* Actions */}
        <div className="flex items-center justify-between mt-2">
          <PixelButton variant="ghost" onClick={() => router.push("../OnBoarding/Company")} size="md">
            <div className="flex items-center gap-2 text-xl">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </div>
          </PixelButton>
          <div className="flex items-center gap-4 text-xl">
            <PixelButton
              variant="primary"
              onClick={() => router.push("../OnBoarding/Resume")}
              size="md"
              disabled={!canContinue}
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