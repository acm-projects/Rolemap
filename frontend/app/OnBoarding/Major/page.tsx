"use client";
import React, { useState, useRef, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { Code2, BarChart2, Server, Cloud, Shield, GitBranch } from "lucide-react";

type Specialty = {
    id: string;
    label: string;
    image: React.ReactNode;
}

const specialties: Specialty[] = [
    { id: "software engineer", label: "Software Engineer", image: <Code2 size={20} /> },
    { id: "Cybersecurity Specialist", label: "Cybersecurity Specialist", image: <Shield size={20} /> },
    { id: "ML/ Data Scientist", label: "ML/ Data Scientist", image: <BarChart2 size={20} /> },
    { id: "Cloud Engineer", label: "Cloud Engineer", image: <Cloud size={20} /> },
    { id: "Product Manager", label: "Product Manager", image: <GitBranch size={20} /> },
    { id: "Dev Ops", label: "Dev Ops", image: <Server size={20} /> },
];

const allSpecialties = [
    {id: "software-engineer", label: "Software Engineer", icon: <Code2 size={16} /> },
    {id: "frontend-engineer", label: "Frontend Engineer", icon: <Code2 size={16} /> },
    {id: "backend-engineer", label: "Backend Engineer", icon: <Code2 size={16} /> },
    {id: "fullstack-engineer", label: "Fullstack Engineer", icon: <Code2 size={16} /> },
    {id: "mobile-engineer", label: "Mobile Engineer", icon: <Code2 size={16} /> },
    {id: "game-developer", label: "Game Developer", icon: <Code2 size={16} /> },
    {id: "cybersecurity-analyst", label: "Cybersecurity Analyst", icon: <Shield size={16} /> },
    {id: "penetration-tester", label: "Penetration Tester", icon: <Shield size={16} /> },
    {id: "security-engineer", label: "Security Engineer", icon: <Shield size={16} /> },
    {id: "cloud-security-engineer", label: "Cloud Security Engineer", icon: <Shield size={16} /> },
    {id: "soc-analyst", label: "SOC Analyst", icon: <Shield size={16} /> },
    {id: "appsec", label: "Application Security", icon: <Shield size={16} /> },
    {id: "grc", label: "Governance, Risk, and Compliance", icon: <Shield size={16} /> },
    {id: "ml-engineer", label: "Machine Learning Engineer", icon: <BarChart2 size={16} /> },
    {id: "data-scientist", label: "Data Scientist", icon: <BarChart2 size={16} /> },
    {id: "ai-engineer", label: "AI Engineer", icon: <BarChart2 size={16} /> },
    {id: "nlp engineer", label: "NLP Engineer", icon: <BarChart2 size={16} /> },
    {id: "computer-vision-engineer", label: "Computer Vision Engineer", icon: <BarChart2 size={16} /> },
    {id: "research-scientist", label: "Research Scientist", icon: <BarChart2 size={16} /> },
    {id: "data-viz", label: "Data Visualization ", icon: <BarChart2 size={16} /> },
    {id: "bi-diveloper", label: "BI Developer", icon: <BarChart2 size={16} /> },
    {id: "data-viz-engineer", label: "Data Visualization Engineer", icon: <BarChart2 size={16} /> },
    {id: "analytics-engineer", label: "Analytics Engineer", icon: <BarChart2 size={16} /> },
    {id: "reporting analyst", label: "Reporting Analyst", icon: <BarChart2 size={16} /> },
    {id: "cloud-infra", label: "Cloud Infrastructure Engineer", icon: <Cloud size={16} /> },
    {id: "cloud-architect", label: "Cloud Architect", icon: <Cloud size={16} /> },
    {id: "sre", label: "Site Reliability Engineer (SRE)", icon: <Cloud size={16} /> },
    {id: "platform-engineer", label: "Platform Engineer", icon: <Cloud size={16} /> },
    {id: "tpm", label: "Technical Project Manager (TPM)", icon: <GitBranch size={16} /> },
    {id: "agile-pm", label: "Agile Project Manager", icon: <GitBranch size={16} /> },
    {id: "program-manager", label: "Program Manager", icon: <GitBranch size={16} /> },
    {id: "technical-pm", label: "Technical Product Manager", icon: <GitBranch size={16} /> },
    {id: "scrum-master", label: "Scrum Master", icon: <GitBranch size={16} /> },
    {id: "devops-engineer", label: "DevOps Engineer", icon: <Server size={16} /> },
    {id: "cicd-engineer", label: "CI/CD Engineer", icon: <Server size={16} /> },
    {id: "iac-engineer", label: "Infrastructure as Code (IaC) Engineer", icon: <Server size={16} /> },
    {id: "release-engineer", label: "Release Engineer", icon: <Server size={16} /> },
    {id: "automation-engineer", label: "Automation Engineer", icon: <Server size={16} /> },
    {id: "containerization-engineer", label: "Containerization Engineer", icon: <Server size={16} /> },
];


const TOTAL_STEPS = 5;
const CURRENT_STEP = 1;
const PROGRESS = Math.round((CURRENT_STEP / TOTAL_STEPS) * 100);

const OnBoardingPage: React.FC = () => {
    const router = useRouter();
    const [selected, setSelected] = useState<string>("");
    const [selectedLabel, setSelectedLabel] = useState<string>("");
    const [query, setQuery] = useState<string>("");
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    // Filter specialties based on query
    const suggestions = query.trim().length > 0
        ? allSpecialties.filter(s => s.label.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
        : [];

    //close dropdown on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    const handleSelectSuggestion = (id: string, label: string) => {
        setSelected(id);
        setSelectedLabel(label);
        setQuery("");
        setShowDropdown(false);
    };

    const handleClearSearch = () => {
        setSelected("");
        setSelectedLabel("");
        setQuery("");
    };

    return (
        <div className="
            min-h-[100vh] font-[Inter] bg-[#E4E4E4]
            flex flex-col
        ">
            {/* Top Nav */}
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
                {/* Header Row */}
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-xs font-bold tracking-widest text-[#508484] uppercase mb-1">
                            Onboarding
                        </p>
                        <h1 className="text-[28px] font-extrabold text-[#1B1B1B]">
                            What is your specialty?
                        </h1>
                    </div>
                    <div className="text-right">
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
                {/* Search Bar */}
                <div ref={searchRef} className="relative mb-6">
                    <div className="flex items-center bg-white border-2 border-[#d4d4d4] rounded-xl px-4 py-3 gap-2 focus-within:border-[#508484] transition-colors duration-200">
                        <span className="text-[#a0b8b8] text-sm">🔍</span>
                        <input
                            type="text"
                            placeholder="Search for a specialty..."
                            value={query}
                            onChange={(e) => {
                                setQuery(e.target.value);
                                setShowDropdown(true);
                            }}
                            onFocus={() => query.trim().length > 0 && setShowDropdown(true)}
                            className="flex-1 outline-none text-sm text-[#1B1B1B] placeholder-[#a0b8b8] bg-transparent"
                        />
                    </div>

                    {/* Dropdown Suggestions */}
                    {showDropdown && suggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#d4d4d4] rounded-xl shadow-lg z-10 overflow-hidden">
                            {suggestions.map((s) => (
                                <div
                                    key={s.id}
                                    onClick={() => handleSelectSuggestion(s.id, s.label)}
                                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#E4E4E4] cursor-pointer transition-colors duration-150"
                                >
                                    <span className="text-[#508484]">{s.icon}</span>
                                    <span className="text-sm text-[#1B1B1B]">{s.label}</span>
                                    {selected === s.id && (
                                        <span className="ml-auto text-[#508484] text-xs">✓</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Selected Tag */}
                {selectedLabel && (
                    <div className="mb-4">
                        <p className="text-xs font-bold tracking-widest text-[#a0b8b8] uppercase mb-2">
                            Selected Specialty
                        </p>
                        <div className="flex items-center gap-2 bg-[#508484] text-white text-xs font-semibold px-3 py-1.5 rounded-lg w-fit">
                            <Code2 size={12} />
                            <span>{selectedLabel}</span>
                            <button
                                onClick={handleClearSearch}
                                className="ml-1 hover:text-[#d4d4d4] transition-colors"
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                )}


                {/* Grid */}
                <div className="grid grid-cols-3 gap-4">
                    {specialties.map((s) => {
                        const isSelected = selected === s.id;
                        return (
                            <div
                                key={s.id}
                                onClick={() => setSelected(s.id)}
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
                                {isSelected && (
                                    <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-[#508484] flex items-center justify-center">
                                        <span className="text-white text-[10px] font-bold">✓</span>
                                    </div>
                                )}
                                <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors duration-200 ${isSelected ? "bg-[#508484] text-white" : "bg-[#d4d4d4] text-[#508484]"}`}>
                                    {s.image}
                                </div>
                                <p className="text-[15px] font-bold text-[#1B1B1B]">{s.label}</p>
                                {isSelected && <p className="text-xs font-semibold text-[#508484]">Selected ✓</p>}
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Footer */}
            <footer className="max-w-[1040px] mx-auto w-full px-6 py-8">
                <div className="border-t border-[#d4d4d4] pt-6 flex justify-between items-center">
                    <button
                        onClick={() => router.push("/")}
                        className="flex items-center gap-2 text-sm text-[#555555] font-medium hover:text-[#1B1B1B] transition-colors duration-200"
                    >
                        ← Back
                    </button>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/OnBoarding/Company")}
                            className="px-5 py-2 rounded-lg border-2 border-[#a0b8b8] text-[#508484] font-semibold text-sm hover:bg-[#d4d4d4] transition-all duration-200"
                        >
                            Skip for now
                        </button>
                        <button
                            onClick={() => router.push("/OnBoarding/Company")}
                            disabled={!selected}
                            className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200
                                ${selected ? "bg-[#508484] text-white hover:bg-[#6a9e9e]" : "bg-[#d4d4d4] text-[#a0b8b8] cursor-not-allowed"}`}
                        >
                            Continue →
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default OnBoardingPage;