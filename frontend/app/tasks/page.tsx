'use client';
import { useState } from "react";
import { Navbar } from "../components/NavBar";
import Image from "next/image";
import pic3 from "../tasks/html.png";
import pic4 from "../tasks/css.png";
import pic5 from "../tasks/js.png";
import { TaskBreakdownPanel } from "../components/TaskBreakdownTab";

const modules = [
  {
    id: 'html',
    name: 'HTML Elements',
    icon: pic3,
    accentColor: '#E8593C',
    tag: 'HTML',
  },
  {
    id: 'css',
    name: 'CSS Styling',
    icon: pic4,
    accentColor: '#3B8BD4',
    tag: 'CSS',
  },
  {
    id: 'js',
    name: 'Javascript Components',
    icon: pic5,
    accentColor: '#F0C040',
    tag: 'JS',
  },
];

export default function DailyPage() {
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [animKey, setAnimKey] = useState(0);

  const activeModule = modules.find((m) => m.id === activeTask);

  return (
    <div className="p-8 bg-[#f4f7f7] min-h-screen">
      <Navbar />

      <style>{`
        @keyframes stagger-in {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .stagger > * {
          opacity: 0;
          animation: stagger-in 0.35s ease forwards;
        }
        .stagger > *:nth-child(1) { animation-delay: 0.00s; }
        .stagger > *:nth-child(2) { animation-delay: 0.08s; }
        .stagger > *:nth-child(3) { animation-delay: 0.16s; }
        .stagger > *:nth-child(4) { animation-delay: 0.24s; }

        @keyframes pulse-border {
          0%, 100% { box-shadow: 0 0 0 0px rgba(80,132,132,0.2); }
          50%       { box-shadow: 0 0 0 6px rgba(80,132,132,0.08); }
        }
        .drop-target-active {
          animation: pulse-border 1.2s ease-in-out infinite;
          border: 2px dashed rgba(80,132,132,0.4) !important;
        }
      `}</style>

      {/* Main Layout */}
      <div className="flex justify-end gap-5 mt-20">

        {/* ── Left Panel (Module Cupboard) ── */}
        <div className="flex flex-col bg-white w-[400px] min-h-screen rounded-3xl shadow-sm border border-[#e4eeee] p-6">
          <p className="text-xs font-semibold tracking-widest text-[#508484]/60 uppercase mb-4 text-center">
            Module Cupboard
          </p>

          {modules.map((mod) => (
            <div
              key={mod.id}
              draggable
              onDragStart={(e) => e.dataTransfer.setData('text/plain', mod.id)}
              className={`
                relative overflow-hidden
                flex w-full h-[90px] rounded-2xl p-4 mt-4
                cursor-grab bg-white
                border border-[#e8f0f0]
                hover:-translate-y-0.5 hover:shadow-md hover:border-[#c8dede]
                transition-all duration-200
                ${activeTask === mod.id ? 'border-[#508484] shadow-sm bg-[#f0f8f8]' : ''}
              `}
            >
              {/* Colored left accent bar */}
              <div
                className="absolute left-0 top-0 h-full w-1 rounded-l-2xl"
                style={{ backgroundColor: mod.accentColor }}
              />

              <div className="flex items-center gap-4 pl-3 w-full">
                <div className="flex-shrink-0 h-10 w-10 rounded-xl bg-[#f0f8f8] flex items-center justify-center">
                  <Image src={mod.icon} alt={`${mod.name} icon`} className="h-6 w-6" />
                </div>
                <div className="flex flex-col">
                  <span
                    className="text-[10px] font-bold tracking-widest uppercase"
                    style={{ color: mod.accentColor }}
                  >
                    {mod.tag}
                  </span>
                  <h1 className="text-base text-[#2d5c5c] font-semibold leading-tight">{mod.name}</h1>
                </div>
              </div>

              {activeTask === mod.id && (
                <div
                  className="absolute top-3 right-3 h-5 w-5 rounded-full flex items-center justify-center text-white text-[10px] font-bold"
                  style={{ backgroundColor: mod.accentColor }}
                >
                  ✓
                </div>
              )}
            </div>
          ))}

          {/* Global Path Status */}
          <div className="mt-auto pt-8">
            <p className="text-xs font-semibold tracking-widest text-[#508484]/50 uppercase mb-3">
              Global Path Status
            </p>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#508484]/70">Path Completion</span>
              <span className="text-sm font-bold text-[#508484]">
                {activeTask ? '33%' : '0%'}
              </span>
            </div>
            <div className="w-full h-2 bg-[#e4eeee] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#508484] rounded-full transition-all duration-700"
                style={{ width: activeTask ? '33%' : '0%' }}
              />
            </div>
          </div>
        </div>

        {/* ── Right Panel ── */}
        <div
          className={`
            w-[1100px] min-h-screen rounded-3xl relative
            flex flex-col items-start justify-start p-10
            transition-all duration-300
            ${isDragOver
              ? 'drop-target-active bg-[#eaf4f4]'
              : 'bg-[#edf6f6] border-2 border-transparent'}
          `}
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragOver(false);
            const id = e.dataTransfer.getData('text/plain');
            setActiveTask(id);
            setAnimKey((k) => k + 1);
          }}
        >

          {/* ── Empty state ── */}
          {!activeTask && (
            <div className="flex flex-col items-center justify-center w-full h-full gap-4">
              <div className={`
                flex items-center justify-center
                h-16 w-16 rounded-2xl
                bg-[#508484] text-white text-4xl shadow-md
                transition-transform duration-300
                ${isDragOver ? 'scale-125' : 'scale-100'}
              `}>
                +
              </div>
              <p className={`
                text-[#508484] text-base tracking-widest uppercase font-medium
                transition-opacity duration-300
                ${isDragOver ? 'opacity-100' : 'opacity-40'}
              `}>
                {isDragOver ? 'Release to open' : 'Drop a module here'}
              </p>
            </div>
          )}

          {/* ── Filled state ── */}
          {activeTask && activeModule && (
            <TaskBreakdownPanel
              animKey={animKey}
              activeModule={activeModule}
              onMarkComplete={() => setActiveTask(null)}
            />
          )}

        </div>
      </div>
    </div>
  );
}