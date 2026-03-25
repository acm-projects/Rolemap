"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Headphones, BookOpen, Wrench } from "lucide-react";

const preferences = [
    {
        id: "visual",
        label: "Visual",
        description: "Diagrams, flowcharts, and video demonstrations.",
        icon: <Eye size={20} />,
    },
    {
        id: "auditory",
        label: "Auditory",
        description: "Podcasts, group discussions, and verbal explanations.",
        icon: <Headphones size={20} />,
    },
    {
        id: "reading",
        label: "Reading/Notes",
        description: "Documentation, technical articles, and synthesis through writing.",
        icon: <BookOpen size={20} />,
    },
    {
        id: "kinesthetic",
        label: "Kinesthetic",
        description: "Hands-on labs, live coding, and building prototypes.",
        icon: <Wrench size={20} />,
    },
];

const TOTAL_STEPS = 5;
const CURRENT_STEP = 3;
const PROGRESS = Math.round((CURRENT_STEP / TOTAL_STEPS) * 100);

const LearningPreferences: React.FC = () => {
    const router = useRouter();
    const [selected, setSelected] = useState<string[]>([]);
    const [otherText, setOtherText] = useState("");

    const toggle = (id: string) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
        );
    };

    // Continue enabled if at least one card selected OR other text filled in
    const canContinue = selected.length > 0 || otherText.trim().length > 0;

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
                {/* Header */}
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-xs font-bold tracking-widest text-[#508484] uppercase mb-1">
                            Onboarding
                        </p>
                        <h1 className="text-[28px] font-extrabold text-[#1B1B1B]">
                            Learning Preferences
                        </h1>
                        <p className="text-sm text-[#555555] mt-1 max-w-[520px]">
                            Tailor your RoleMap experience. Select the modalities that help
                            you absorb complex technical concepts most effectively.
                        </p>
                    </div>
                    <div className="text-right shrink-0 ml-8">
                        <p className="text-sm font-bold text-[#1B1B1B]">{PROGRESS}% Complete</p>
                        <p className="text-xs text-[#a0b8b8] mt-0.5">Step {CURRENT_STEP} of {TOTAL_STEPS}</p>
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-1 bg-[#d4d4d4] rounded-full mb-8 overflow-hidden">
                    <div
                        className="h-full bg-[#508484] rounded-full transition-all duration-500"
                        style={{ width: `${PROGRESS}%` }}
                    />
                </div>

                {/* Preference Cards */}
                <div className="grid grid-cols-4 gap-4 mb-6">
                    {preferences.map((p) => {
                        const isSelected = selected.includes(p.id);
                        return (
                            <div
                                key={p.id}
                                onClick={() => toggle(p.id)}
                                className={`
                                    bg-white rounded-xl p-6 cursor-pointer relative
                                    border-2 transition-all duration-200 shadow-sm
                                    flex flex-col gap-3
                                    ${isSelected
                                        ? "border-[#508484] shadow-[0_0_0_4px_#50848420]"
                                        : "border-transparent hover:border-[#a0b8b8] hover:shadow-md"
                                    }
                                `}
                            >
                                {/* Check badge */}
                                {isSelected && (
                                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#508484] flex items-center justify-center">
                                        <span className="text-white text-[10px] font-bold">✓</span>
                                    </div>
                                )}

                                {/* Icon */}
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200
                                    ${isSelected ? "bg-[#508484] text-white" : "bg-[#d4d4d4] text-[#508484]"}`}
                                >
                                    {p.icon}
                                </div>

                                <p className="text-[15px] font-bold text-[#1B1B1B]">{p.label}</p>
                                <p className="text-[13px] text-[#555555] leading-relaxed">{p.description}</p>

                                {isSelected && (
                                    <p className="text-xs font-semibold text-[#508484]">Selected ✓</p>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Selected Tags */}
                {selected.length > 0 && (
                    <div className="mb-6">
                        <p className="text-xs font-bold tracking-widest text-[#a0b8b8] uppercase mb-2">
                            Selected Preferences
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {selected.map((id) => {
                                const pref = preferences.find((p) => p.id === id);
                                if (!pref) return null;
                                return (
                                    <div
                                        key={id}
                                        className="flex items-center gap-2 bg-[#508484] text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                                    >
                                        <span>{pref.label}</span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggle(id);
                                            }}
                                            className="ml-1 hover:text-[#d4d4d4] transition-colors"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Other Preferences Text Box */}
                <div className="bg-white rounded-xl border-2 border-[#d4d4d4] p-5 focus-within:border-[#508484] transition-colors duration-200">
                    <p className="text-xs font-bold tracking-widest text-[#a0b8b8] uppercase mb-3">
                        Other Preferences
                    </p>
                    <textarea
                        value={otherText}
                        onChange={(e) => setOtherText(e.target.value)}
                        placeholder="E.g., I prefer focused 2-hour sprints with 15-minute breaks, or I learn best through peer-reviewing others' code..."
                        className="w-full text-sm text-[#1B1B1B] placeholder-[#a0b8b8] bg-transparent outline-none resize-none h-24 leading-relaxed"
                    />
                </div>
            </main>

            {/* Footer */}
            <footer className="max-w-[1040px] mx-auto w-full px-6 py-8">
                <div className="border-t border-[#d4d4d4] pt-6 flex justify-between items-center">
                    <button
                        onClick={() => router.push("/OnBoarding/Company")}
                        className="flex items-center gap-2 text-sm text-[#555555] font-medium hover:text-[#1B1B1B] transition-colors duration-200"
                    >
                        ← Back
                    </button>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/OnBoarding/Resume")}
                            className="px-5 py-2 rounded-lg border-2 border-[#a0b8b8] text-[#508484] font-semibold text-sm hover:bg-[#d4d4d4] transition-all duration-200"
                        >
                            Skip for now
                        </button>
                        <button
                            onClick={() => router.push("/OnBoarding/Resume")}
                            disabled={!canContinue}
                            className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200
                                ${canContinue ? "bg-[#508484] text-white hover:bg-[#6a9e9e]" : "bg-[#d4d4d4] text-[#a0b8b8] cursor-not-allowed"}`}
                        >
                            Continue →
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default LearningPreferences;