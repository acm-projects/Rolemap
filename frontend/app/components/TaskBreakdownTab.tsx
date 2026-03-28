'use client';
import Image, { StaticImageData } from "next/image";
import pic1 from "../tasks/target.png";
import pic2 from "../tasks/idea.png";

interface Module {
  id: string;
  name: string;
  icon: StaticImageData;
  accentColor: string;
  tag: string;
}

interface TaskBreakdownTab {
  animKey: number;
  activeModule: Module;
  onMarkComplete: () => void;
}

export function TaskBreakdownPanel({ animKey, activeModule, onMarkComplete }: TaskBreakdownTab) {
  return (
    <div key={animKey} className="stagger w-full flex flex-col gap-0">

      {/* Section 1 — Header */}
      <div className="flex w-full items-start">
        <div className="flex-shrink-0 h-14 w-14 rounded-2xl bg-white shadow-sm border border-[#d8eded] flex items-center justify-center">
          <Image src={activeModule.icon} alt={`${activeModule.name} icon`} className="h-8 w-8" />
        </div>

        <div className="ml-5 flex-1">
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-bold tracking-widest uppercase text-[#508484]/50 bg-[#508484]/10 px-2 py-0.5 rounded-full">
              Module in Progress
            </span>
            <span className="text-xs text-[#508484]/40 tracking-wide">Estimated Time: 45m</span>
          </div>
          <h1 className="text-3xl text-[#1e4444] font-bold">{activeModule.name}</h1>
          <p className="text-sm text-[#508484]/60 font-normal pt-2 max-w-[600px] tracking-wide leading-relaxed">
            Design high-impact element framework for website structure and user
            experience, ensuring consistency and scalability across all pages.
          </p>
        </div>

        <button
          className="flex-shrink-0 bg-[#508484] hover:bg-[#3d6b6b] active:scale-95 text-white h-[44px] px-6 rounded-xl shadow-sm flex items-center justify-center cursor-pointer transition-all duration-150"
          onClick={onMarkComplete}
        >
          <span className="text-sm font-semibold tracking-wide">Mark Complete</span>
        </button>
      </div>

      {/* Divider */}
      <div className="w-full h-px bg-[#508484]/10 mt-8 mb-8" />

      {/* Section 2 — Objectives + Takeaways */}
      <div className="flex flex-row justify-between w-full gap-6">

        <div className="flex flex-col bg-white w-full h-[280px] rounded-2xl shadow-sm border border-[#d8eded] p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-8 w-8 rounded-lg bg-[#f0f8f8] border border-[#d0e8e8] flex items-center justify-center">
              <Image src={pic1} alt="Learning Objectives icon" className="h-4 w-4" />
            </div>
            <h2 className="text-xs font-bold tracking-widest text-[#508484]/60 uppercase">
              Learning Objectives
            </h2>
          </div>
          <ol className="list-decimal list-inside text-[#2d5c5c] text-sm space-y-3 opacity-80 leading-relaxed">
            <li>Understand how element design impacts user experience</li>
            <li>Learn how to create a consistent and scalable element system</li>
            <li>Explore best practices for designing high-impact interfaces</li>
          </ol>
        </div>

        <div className="flex flex-col bg-white w-full h-[280px] rounded-2xl shadow-sm border border-[#d8eded] p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="h-8 w-8 rounded-lg bg-[#f0f8f8] border border-[#d0e8e8] flex items-center justify-center">
              <Image src={pic2} alt="Key Takeaways icon" className="h-4 w-4" />
            </div>
            <h2 className="text-xs font-bold tracking-widest text-[#508484]/60 uppercase">
              Key Takeaways
            </h2>
          </div>
          <div className="bg-[#f4fafa] w-full rounded-xl p-4">
            <ul className="list-disc list-inside text-[#2d5c5c] text-sm space-y-3 opacity-80 leading-relaxed">
              <li>Understand how element design impacts the user</li>
              <li>Learn how to create a consistent and scalable system</li>
              <li>Explore best practices for designing interfaces</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Section 3 — Curated Resources */}
      <div className="flex flex-col w-full mt-8">
        <div className="flex items-center gap-3 mb-5">
          <div className="h-8 w-8 rounded-lg bg-[#f0f8f8] border border-[#d0e8e8] flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#508484]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7h18M3 12h18M3 17h18" />
            </svg>
          </div>
          <h2 className="text-xs font-bold tracking-widest text-[#508484]/60 uppercase">
            Curated Resources
          </h2>
        </div>

        <div className="flex flex-row gap-5 w-full">

          {/* Readings */}
          <div className="flex flex-col flex-1 gap-3">
            <p className="text-[10px] font-bold tracking-widest text-[#508484]/40 uppercase mb-1">Readings</p>
            {['Editorial Calendar Guide', 'Style Guide Template'].map((title) => (
              <div key={title} className="group flex items-center gap-3 bg-white rounded-xl p-4 cursor-pointer border border-[#e4eeee] hover:border-[#508484]/30 hover:shadow-sm transition-all duration-150">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#508484]/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <rect x="4" y="3" width="16" height="18" rx="2" ry="2" />
                  <line x1="8" y1="8" x2="16" y2="8" /><line x1="8" y1="12" x2="16" y2="12" /><line x1="8" y1="16" x2="12" y2="16" />
                </svg>
                <span className="text-[#2d5c5c] text-sm font-medium">{title}</span>
                <span className="ml-auto text-[#508484]/30 group-hover:text-[#508484] group-hover:translate-x-0.5 transition-all duration-150 text-sm">→</span>
              </div>
            ))}
          </div>

          {/* Videos */}
          <div className="flex flex-col flex-1 gap-3">
            <p className="text-[10px] font-bold tracking-widest text-[#508484]/40 uppercase mb-1">Videos</p>
            {['Brand Storytelling 101', 'Content Lifecycle'].map((title) => (
              <div key={title} className="group flex items-center gap-3 bg-white rounded-xl p-4 cursor-pointer border border-[#e4eeee] hover:border-[#508484]/30 hover:shadow-sm transition-all duration-150">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#508484]/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <rect x="2" y="6" width="20" height="14" rx="2" />
                  <polygon points="10,10 16,13 10,16" fill="currentColor" stroke="none" />
                </svg>
                <span className="text-[#2d5c5c] text-sm font-medium">{title}</span>
                <span className="ml-auto text-[#508484]/30 group-hover:text-[#508484] group-hover:translate-x-0.5 transition-all duration-150 text-sm">→</span>
              </div>
            ))}
          </div>

          {/* Tools */}
          <div className="flex flex-col flex-1 gap-3">
            <p className="text-[10px] font-bold tracking-widest text-[#508484]/40 uppercase mb-1">Tools</p>
            {['Topic Map Builder', 'ROI Calculator'].map((title) => (
              <div key={title} className="group flex items-center gap-3 bg-white rounded-xl p-4 cursor-pointer border border-[#e4eeee] hover:border-[#508484]/30 hover:shadow-sm transition-all duration-150">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-[#508484]/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <path d="M3 9h18M9 21V9" />
                </svg>
                <span className="text-[#2d5c5c] text-sm font-medium">{title}</span>
                <span className="ml-auto text-[#508484]/30 group-hover:text-[#508484] group-hover:translate-x-0.5 transition-all duration-150 text-sm">→</span>
              </div>
            ))}
          </div>

        </div>
      </div>

    </div>
  );
}