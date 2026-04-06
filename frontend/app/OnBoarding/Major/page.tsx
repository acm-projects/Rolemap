"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import {
  Code2,
  BarChart2,
  Server,
  Cloud,
  Shield,
  GitBranch,
  Search,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import PixelButton from "../../components/PixelButton";
import PixelCard from "../../components/PixelCard";
import PixelInput from "../../components/PixelInput";
import PixelProgress from "../../components/PixelProgress";
import TypewriterText from "../../components/Typewriter";

type Specialty = {
  id: string;
  label: string;
  image: React.ReactNode;
};

const specialties: Specialty[] = [
  { id: "software engineer", label: "Software Engineer", image: <Code2 size={100} /> },
  { id: "Cybersecurity Specialist", label: "Cybersecurity", image: <Shield size={100} /> },
  { id: "ML/ Data Scientist", label: "ML / Data Sci", image: <BarChart2 size={100} /> },
  { id: "Cloud Engineer", label: "Cloud Engineer", image: <Cloud size={100} /> },
  { id: "Product Manager", label: "Product Manager", image: <GitBranch size={100} /> },
  { id: "Dev Ops", label: "Dev Ops", image: <Server size={100} /> },
];

const allSpecialties = [
  { id: "software-engineer", label: "Software Engineer", icon: <Code2 size={14} /> },
  { id: "frontend-engineer", label: "Frontend Engineer", icon: <Code2 size={14} /> },
  { id: "backend-engineer", label: "Backend Engineer", icon: <Code2 size={14} /> },
  { id: "fullstack-engineer", label: "Fullstack Engineer", icon: <Code2 size={14} /> },
  { id: "mobile-engineer", label: "Mobile Engineer", icon: <Code2 size={14} /> },
  { id: "game-developer", label: "Game Developer", icon: <Code2 size={14} /> },
  { id: "cybersecurity-analyst", label: "Cybersecurity Analyst", icon: <Shield size={14} /> },
  { id: "penetration-tester", label: "Penetration Tester", icon: <Shield size={14} /> },
  { id: "security-engineer", label: "Security Engineer", icon: <Shield size={14} /> },
  { id: "ml-engineer", label: "Machine Learning Engineer", icon: <BarChart2 size={14} /> },
  { id: "data-scientist", label: "Data Scientist", icon: <BarChart2 size={14} /> },
  { id: "ai-engineer", label: "AI Engineer", icon: <BarChart2 size={14} /> },
  { id: "cloud-infra", label: "Cloud Infrastructure Engineer", icon: <Cloud size={14} /> },
  { id: "cloud-architect", label: "Cloud Architect", icon: <Cloud size={14} /> },
  { id: "sre", label: "Site Reliability Engineer (SRE)", icon: <Cloud size={14} /> },
  { id: "tpm", label: "Technical Project Manager", icon: <GitBranch size={14} /> },
  { id: "devops-engineer", label: "DevOps Engineer", icon: <Server size={14} /> },
  { id: "cicd-engineer", label: "CI/CD Engineer", icon: <Server size={14} /> },
];

export default function SpecialtyPage() {
  const router = useRouter();
  const [selected, setSelected] = useState<string>("");
  const [query, setQuery] = useState<string>("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string>("");
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api
      .currentUser()
      .then((user) => {
        if (user.onboarding_completed) router.replace("/dashboard");
      })
      .catch(() => {
        // Ignore transient API failures and allow onboarding flow.
      });
  }, [router]);

  const suggestions =
    query.trim().length > 0
      ? allSpecialties.filter((s) => s.label.toLowerCase().includes(query.toLowerCase())).slice(0, 5)
      : [];

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelectSuggestion = (id: string, label: string) => {
    setSelected(id);
    setSelectedLabel(label);
    setQuery("");
    setShowDropdown(false);
  };

  const handleCardSelect = (id: string, label: string) => {
    setSelected(id);
    setSelectedLabel(label);
  };

  const handleContinue = () => {
    if (selected) {
      localStorage.setItem("ob_role", selected);
    }
    router.push("/OnBoarding/Company");
  };

  return (
    <div className="relative h-screen overflow-hidden w-full bg-[#f0f8f8] p-3 flex flex-col">
      <div className="scanlines" />

      <div className="max-w-5xl mx-auto w-full flex flex-col justify-between flex-1">
        <div className="mb-3">
          <PixelProgress value={20} showLabel={true} step={1} totalSteps={5} />
          <div className="min-h-[5rem]">
            <TypewriterText
              text="What is your specialty?"
              speed={20}
              delay={400}
              className="text-5xl text-[#2d5050] block mt-7"
            />
          </div>
          <div className="min-h-[7rem]">
            <TypewriterText
              text="Pick your primary focus area. You can search for a specific role or choose from the categories below."
              speed={10}
              delay={800}
              className="text-2xl text-[#4e8888] max-w-2xl block mb-5"
            />
          </div>
        </div>

        <div ref={searchRef} className="relative mb-5 text-xl">
          <PixelInput
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowDropdown(true);
            }}
            placeholder="Search for a specialty..."
            icon={<Search className="w-4 h-4" />}
          />
          {showDropdown && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border-4 border-[#7ab3b3] z-20 shadow-lg">
              {suggestions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => handleSelectSuggestion(s.id, s.label)}
                  className="flex items-center gap-3 px-4 py-2 hover:bg-[#e8f4f4] cursor-pointer border-b border-[#d4e8e8] last:border-0"
                >
                  <span className="text-[#4e8888]">{s.icon}</span>
                  <span className="text-sm text-[#2d5050] font-jersey">{s.label}</span>
                  {selected === s.id && <span className="ml-auto text-[#4e8888] text-xs font-jersey">✓</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mb-2 flex-1">
          {specialties.map((s) => {
            const isSelected = selected === s.id;
            return (
              <PixelCard key={s.id} onClick={() => handleCardSelect(s.id, s.label)} selected={isSelected}>
                <div
                  className={`h-full flex flex-col items-center justify-center gap-3 transition-all duration-100 relative ${
                    isSelected ? "bg-[#3a6666] translate-y-[4px]" : "bg-transparent translate-y-0"
                  }`}
                >
                  <div
                    className={`w-12 h-12 flex items-center justify-center transition-colors duration-100 ${
                      isSelected ? "text-white" : "text-[#4e8888]"
                    }`}
                  >
                    {s.image}
                  </div>
                  <span
                    className={`text-xl text-center font-jersey leading-tight transition-colors duration-100 px-1 ${
                      isSelected ? "text-white" : "text-[#2d5050]"
                    }`}
                  >
                    {s.label}
                  </span>
                </div>
              </PixelCard>
            );
          })}
        </div>

        {selectedLabel && <div className="text-sm text-[#4e8888] font-jersey">Selected: {selectedLabel}</div>}

        <div className="flex items-center justify-between mt-3">
          <PixelButton variant="ghost" onClick={() => router.push("/")} size="md">
            <div className="flex items-center gap-2 text-xl">
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </div>
          </PixelButton>
          <div className="flex items-center gap-4 text-xl">
            <PixelButton variant="primary" onClick={handleContinue} size="md" disabled={!selected}>
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
