'use client';
import { useState, useEffect } from "react";
import { Navbar } from "../components/NavBar";
import Image, { type StaticImageData } from "next/image";
import pic3 from "../tasks/html.png";
import pic4 from "../tasks/css.png";
import pic5 from "../tasks/js.png";
import pic6 from "../tasks/target.png";
import quests from '../../icons/quests.png';
import PixelCard from "../components/PixelCard";
import PixelButton from "../components/PixelButton";
import PixelProgress from "../components/PixelProgress";
import { api, type Task } from "@/lib/api";
import { BookOpen, CheckCircle, Lock } from 'lucide-react';

const TAG_ICONS: Record<string, StaticImageData> = {
  HTML: pic3,
  CSS: pic4,
  JS: pic5,
  Python: pic6,
};

const PIXEL_BORDER: React.CSSProperties = {
  borderWidth: 4,
  borderStyle: 'solid',
  borderTopColor: '#d4e8e8',
  borderLeftColor: '#d4e8e8',
  borderRightColor: '#7ab3b3',
  borderBottomColor: '#7ab3b3',
};

function PixelPanel({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="relative w-full h-full">
      <div className={className} style={PIXEL_BORDER}>
        {children}
      </div>
      {/* Notched pixel corners */}
      <div className="absolute top-0 left-0 w-[6px] h-[6px] bg-[#f0f8f8] pointer-events-none z-10" />
      <div className="absolute top-0 right-0 w-[6px] h-[6px] bg-[#f0f8f8] pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 w-[6px] h-[6px] bg-[#f0f8f8] pointer-events-none z-10" />
      <div className="absolute bottom-0 right-0 w-[6px] h-[6px] bg-[#f0f8f8] pointer-events-none z-10" />
    </div>
  );
}

export default function DailyPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    api.tasks()
      .then(d => {
        setTasks(d.tasks);
        const done = d.tasks.filter(t => t.status === 'completed').map(t => t.id);
        setCompleted(done);
        if (d.tasks.length > 0) setActiveTask(d.tasks[0].id);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    localStorage.setItem('completedTasks', JSON.stringify(completed));
  }, [completed]);

  const activeTaskObj = tasks.find(t => t.id === activeTask) ?? null;

  function handleMarkComplete() {
    if (activeTask && !completed.includes(activeTask)) {
      setCompleted(prev => [...prev, activeTask]);
      api.updateTask(activeTask, 'completed').catch(console.error);
    }
  }

  function toggleComplete(taskId: string) {
    const isCompleted = completed.includes(taskId);
    setCompleted(prev =>
      isCompleted ? prev.filter(id => id !== taskId) : [...prev, taskId]
    );
    api.updateTask(taskId, isCompleted ? 'not_started' : 'completed').catch(console.error);
  }

  const completionPct = tasks.length > 0
    ? Math.round((completed.length / tasks.length) * 100)
    : 0;

  const isDone = activeTaskObj ? completed.includes(activeTaskObj.id) : false;

  return (
    <div className="min-h-screen bg-[#f0f8f8]" style={{ imageRendering: 'pixelated' }}>
      <Navbar />

      {/* Aligned to navbar: w-[95%] max-w-6xl, starts just below navbar */}
      <div className="w-[95%] max-w-6xl mx-auto pt-[104px] pb-8 flex gap-8 h-screen">

        {/* ── Left Panel: Module Cupboard ── */}
        <div className="w-[300px] flex-shrink-0 flex flex-col">
          <PixelPanel className="flex flex-col bg-white p-5 overflow-hidden h-full">
            <div className="flex items-center gap-3 mb-5">
              <Image src={quests} alt="Quest Icon" className="h-9 w-9" style={{ imageRendering: 'pixelated' }} />
              <p className="text-base text-[#4e8888] uppercase tracking-widest">Daily Quests</p>
            </div>

            <div className="flex flex-col gap-2 flex-1">
              {tasks.map((task, i) => {
                const isActive = activeTask === task.id;
                const isDoneItem = completed.includes(task.id);
                const isLocked = i > completed.length && !isActive && !isDoneItem;

                return (
                  <PixelCard
                    key={task.id}
                    onClick={!isLocked ? () => setActiveTask(task.id) : undefined}
                    selected={isActive}
                    hover={!isLocked}
                  >
                    <div className={`flex items-center gap-3 p-3 ${isLocked ? 'opacity-50' : ''}`}>
                      <div className="flex-shrink-0 w-9 h-9 bg-[#f0f8f8] flex items-center justify-center border-2 border-[#d4e8e8]">
                        {isLocked
                          ? <Lock size={14} className="text-[#7ab3b3]" />
                          : <Image src={TAG_ICONS[task.tag] ?? pic6} alt={task.tag} className="h-5 w-5" style={{ imageRendering: 'pixelated' }} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className={`text-sm truncate uppercase ${isActive ? 'text-[#2d5050]' : 'text-[#2d5050]'}`}>
                          {task.title}
                        </h3>
                        <p className={`text-xs uppercase mt-0.5 ${
                          isLocked ? 'text-[#7ab3b3]'
                          : isDoneItem ? 'text-[#10B981]'
                          : isActive ? 'text-[#d4e8e8]'
                          : 'text-[#4e8888]'
                        }`}>
                          {isLocked ? 'Locked' : isDoneItem ? '✓ Done' : isActive ? '▶ Active' : task.tag}
                        </p>
                      </div>
                    </div>
                  </PixelCard>
                );
              })}
            </div>

            <div className="pt-4 mt-4 border-t-4 border-[#d4e8e8]">
              <PixelProgress value={completionPct} showLabel={true} />
            </div>
          </PixelPanel>
        </div>

        {/* ── Right Panel: Module Content ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <PixelPanel className="flex-1 bg-[#e8f4f4] p-10 flex flex-col h-full overflow-y-auto">
            {activeTaskObj ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-10 h-full">

                {/* Left column: title + description + objectives */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-3 mb-6">
                    <span
                      className="text-xs text-white uppercase tracking-widest px-2.5 py-1 bg-[#4e8888]"
                      style={{ borderWidth: 2, borderStyle: 'solid', borderTopColor: '#7ab3b3', borderLeftColor: '#7ab3b3', borderRightColor: '#2d5050', borderBottomColor: '#2d5050' }}
                    >
                      Module in Progress
                    </span>
                    <span className="text-xs text-[#4e8888]">Est. 45m</span>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                      <h1 className="text-4xl md:text-5xl text-[#2d5050] tracking-tight leading-tight">
                        {activeTaskObj.title}
                      </h1>
                      <Image
                        src={TAG_ICONS[activeTaskObj.tag] ?? pic6}
                        alt={activeTaskObj.tag}
                        className="h-10 w-10 flex-shrink-0"
                        style={{ imageRendering: 'pixelated' }}
                      />
                    </div>
                    <div className="w-16 h-1 bg-[#4e8888]" />
                  </div>

                  <div className="space-y-8 text-[#3a6666]">
                    <div>
                      <h2 className="text-xl text-[#2d5050] mb-3 flex items-center gap-2">
                        <BookOpen size={18} className="text-[#4e8888]" />
                        Task Description
                      </h2>
                      <p className="text-base leading-relaxed">
                        {activeTaskObj.description || 'Complete the objectives listed for this module to progress along your learning path.'}
                      </p>
                    </div>

                    <div>
                      <h2 className="text-xl text-[#2d5050] mb-4">Key Objectives</h2>
                      <ul className="space-y-3">
                        {[
                          'Understand how this concept applies to your target role.',
                          'Build a working implementation or complete the assigned reading.',
                          'Apply learnings to your roadmap checkpoint.',
                        ].map((obj) => (
                          <li key={obj} className="flex items-start gap-3">
                            <span className="text-[#4e8888] mt-0.5 flex-shrink-0 text-sm">▶</span>
                            <span className="text-base leading-relaxed">{obj}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Right column: checklist */}
                <div className="flex flex-col gap-6 xl:pt-14">
                  <div className="relative">
                    <div className="bg-white p-6" style={PIXEL_BORDER}>
                      <h3 className="text-base text-[#2d5050] mb-5 uppercase tracking-widest">Checklist</h3>
                      <div className="space-y-4">
                        <div className={`flex items-start gap-3 ${isDone ? 'opacity-50' : ''}`}>
                          <CheckCircle size={16} className="text-[#4e8888] mt-0.5 flex-shrink-0" />
                          <p className="text-[#3a6666] text-base">Review task description and objectives.</p>
                        </div>
                        <div className="flex items-start gap-3 cursor-pointer" onClick={() => toggleComplete(activeTaskObj.id)}>
                          <div
                            className={`w-4 h-4 mt-0.5 flex-shrink-0 flex items-center justify-center transition-colors ${isDone ? 'bg-[#4e8888]' : 'bg-white'}`}
                            style={{ borderWidth: 2, borderStyle: 'solid', borderTopColor: '#7ab3b3', borderLeftColor: '#7ab3b3', borderRightColor: isDone ? '#2d5050' : '#4e8888', borderBottomColor: isDone ? '#2d5050' : '#4e8888' }}
                          >
                            {isDone && (
                              <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={4}>
                                <path strokeLinecap="square" strokeLinejoin="miter" d="M5 13l4 4L19 7" />
                              </svg>
                            )}
                          </div>
                          <p className="text-[#3a6666] text-base">Complete the module and mark as done.</p>
                        </div>
                      </div>

                      {!isDone && (
                        <div className="mt-6">
                          <PixelButton variant="primary" size="md" onClick={handleMarkComplete}>
                            <span className="text-sm">Mark Complete</span>
                          </PixelButton>
                        </div>
                      )}

                      {isDone && (
                        <div className="mt-6 flex items-center gap-2 text-[#10B981]">
                          <CheckCircle size={14} />
                          <span className="text-sm uppercase tracking-widest">Module Complete</span>
                        </div>
                      )}
                    </div>
                    {/* Checklist card pixel corners */}
                    <div className="absolute top-0 left-0 w-[6px] h-[6px] bg-[#e8f4f4] pointer-events-none z-10" />
                    <div className="absolute top-0 right-0 w-[6px] h-[6px] bg-[#e8f4f4] pointer-events-none z-10" />
                    <div className="absolute bottom-0 left-0 w-[6px] h-[6px] bg-[#e8f4f4] pointer-events-none z-10" />
                    <div className="absolute bottom-0 right-0 w-[6px] h-[6px] bg-[#e8f4f4] pointer-events-none z-10" />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[#4e8888]/60">
                <BookOpen size={36} className="mb-3" />
                <p className="text-base uppercase tracking-widest">Select a module to get started</p>
              </div>
            )}
          </PixelPanel>
        </div>

      </div>

      <style>{`
        .pixel-border {
          border-width: 4px;
          border-style: solid;
          box-shadow: 0 4px 0 0 rgba(0,0,0,0.15), inset 0 -2px 0 0 rgba(0,0,0,0.08);
          image-rendering: pixelated;
        }
        .pixel-border:active {
          box-shadow: 0 2px 0 0 rgba(0,0,0,0.15), inset 0 2px 0 0 rgba(0,0,0,0.08);
        }
        * { image-rendering: pixelated; -webkit-font-smoothing: none; }
      `}</style>
    </div>
  );
}
