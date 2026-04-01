"use client";
import React, { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";

const companies = [
    { id: "google", name: "Google", logo: "https://www.google.com/s2/favicons?domain=google.com&sz=128" },
    { id: "microsoft", name: "Microsoft", logo: "https://www.google.com/s2/favicons?domain=microsoft.com&sz=128" },
    { id: "meta", name: "Meta", logo: "https://www.google.com/s2/favicons?domain=meta.com&sz=128" },
    { id: "amazon", name: "Amazon", logo: "https://www.google.com/s2/favicons?domain=amazon.com&sz=128" },
    { id: "apple", name: "Apple", logo: "https://www.google.com/s2/favicons?domain=apple.com&sz=128" },
    { id: "netflix", name: "Netflix", logo: "https://www.google.com/s2/favicons?domain=netflix.com&sz=128" },
    { id: "airbnb", name: "Airbnb", logo: "https://www.google.com/s2/favicons?domain=airbnb.com&sz=128" },
    { id: "nvidia", name: "Nvidia", logo: "https://www.google.com/s2/favicons?domain=nvidia.com&sz=128" },
];

//for drop down add more later
const searchableCompanies = [
    { id: "google", name: "Google" },
    { id: "microsoft", name: "Microsoft" },
    { id: "meta", name: "Meta" },
    { id: "amazon", name: "Amazon" },
    { id: "apple", name: "Apple" },
    { id: "netflix", name: "Netflix" },
    { id: "airbnb", name: "Airbnb" },
    { id: "nvidia", name: "Nvidia" },
];

const TOTAL_STEPS = 5;
const CURRENT_STEP = 2;
const PROGRESS = Math.round((CURRENT_STEP / TOTAL_STEPS) * 100);

const CompanySelection: React.FC = () => {
    const router = useRouter();
    const [selected, setSelected] = useState<string[]>([]);
    const [showDropdown, setShowDropdown] = useState(false);
    const searchRef = useRef<HTMLDivElement>(null);

    const toggle = (id: string) => {
        setSelected((prev) =>
            prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
        );
    };

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
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <p className="text-xs font-bold tracking-widest text-[#508484] uppercase mb-1">
                            Onboarding
                        </p>
                        <h1 className="text-[28px] font-extrabold text-[#1B1B1B]">
                            Where do you want to work?
                        </h1>
                        <p className="text-sm text-[#555555] mt-1 max-w-[480px]">
                            Select your target companies. We'll use this to customize your
                            personalized learning path and interview preparation roadmap.
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

                {/* Search Bar */}
            <div ref={searchRef} className="relative mb-6">
                <div
                 onClick={() => setShowDropdown(!showDropdown)}
                 className="flex items-center bg-white border-2 border-[#d4d4d4] rounded-xl px-4 py-3 gap-2 focus-within:border-[#508484] transition-colors duration-200 cursor-pointer"
    >
            <span className="text-[#a0b8b8] text-sm">🔍</span>
            <span className="flex-1 text-sm text-[#a0b8b8]">
            Search for a company...
            </span>
                <span className="text-[#a0b8b8] text-xs">{showDropdown ? "▲" : "▼"}</span>
            </div>

                {/* Dropdown */}
            {showDropdown && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#d4d4d4] rounded-xl shadow-lg z-10 overflow-hidden">
                {searchableCompanies.map((c) => {
                const isSelected = selected.includes(c.id);
                return (
                    <div
                        key={c.id}
                        onClick={() => toggle(c.id)}
                        className="flex items-center justify-between px-4 py-3 hover:bg-[#E4E4E4] cursor-pointer transition-colors duration-150"
                    >
                        <span className="text-sm text-[#1B1B1B]">{c.name}</span>
                        {isSelected && (
                            <span className="text-[#508484] text-xs font-bold">✓</span>
                        )}
                    </div>
                );
            })}
        </div>
    )}
</div>
                    {/* Selected Tags */}
    {selected.length > 0 && (
        <div className="mb-4">
            <p className="text-xs font-bold tracking-widest text-[#a0b8b8] uppercase mb-2">
                Selected Companies
            </p>
            <div className="flex flex-wrap gap-2">
                {selected.map((id) => {
                    const company = companies.find((c) => c.id === id);
                    if (!company) return null;
                    return (
                        <div
                            key={id}
                            className="flex items-center gap-2 bg-[#508484] text-white text-xs font-semibold px-3 py-1.5 rounded-lg"
                        >
                            <img
                                src={`https://www.google.com/s2/favicons?domain=${id}.com&sz=128`}
                                alt={company.name}
                                className="w-3 h-3 object-contain"
                            />
                            <span>{company.name}</span>
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

                {/* Grid */}
                <div className="grid grid-cols-4 gap-4">
                    {companies.map((c) => {
                        const isSelected = selected.includes(c.id);
                        return (
                            <div
                                key={c.id}
                                onClick={() => toggle(c.id)}
                                className={`
                                    bg-white rounded-xl p-5 cursor-pointer relative
                                    border-2 transition-all duration-200 shadow-sm
                                    flex flex-col items-center text-center gap-3
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
                                <div className="w-14 h-14 rounded-xl bg-white flex items-center justify-center overflow-hidden p-1">
                                    <img
                                        src={c.logo}
                                        alt={c.name}
                                        className="w-full h-full object-contain"
                                    />
                                </div>
                                <div>
                                    <p className="text-sm font-bold text-[#1B1B1B]">{c.name}</p>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </main>

            {/* Footer */}
            <footer className="max-w-[1040px] mx-auto w-full px-6 py-8">
                <div className="border-t border-[#d4d4d4] pt-6 flex justify-between items-center">
                    <button
                        onClick={() => router.push("/OnBoarding/Major")}
                        className="flex items-center gap-2 text-sm text-[#555555] font-medium hover:text-[#1B1B1B] transition-colors duration-200"
                    >
                        ← Back
                    </button>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => router.push("/OnBoarding/Preferences")}
                            className="px-5 py-2 rounded-lg border-2 border-[#a0b8b8] text-[#508484] font-semibold text-sm hover:bg-[#d4d4d4] transition-all duration-200"
                        >
                            Skip for now
                        </button>
                        <button
                            onClick={() => {
                                if (selected.length > 0) localStorage.setItem("ob_companies", JSON.stringify(selected));
                                router.push("/OnBoarding/Preferences");
                            }}
                            disabled={selected.length === 0}
                            className={`px-6 py-2 rounded-lg font-semibold text-sm transition-all duration-200
                                ${selected.length > 0 ? "bg-[#508484] text-white hover:bg-[#6a9e9e]" : "bg-[#d4d4d4] text-[#a0b8b8] cursor-not-allowed"}`}
                        >
                            Continue →
                        </button>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default CompanySelection;