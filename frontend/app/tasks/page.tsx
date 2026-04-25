'use client';
import { useState, useEffect } from "react";
import { Navbar } from "../components/NavBar";
import Image from "next/image";
import pic6 from "../tasks/target.png";
import PixelButton from "../components/PixelButton";
import { api, type Task } from "@/lib/api";

// ── Pixel-art icons ──────────────────────────────────────────────────────────

const PixelCheckIcon = ({ color = '#84BC2F', size = 18 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ imageRendering: 'pixelated', flexShrink: 0 }}>
    <polygon points="22 4 22 6 21 6 21 7 20 7 20 8 19 8 19 9 18 9 18 10 17 10 17 11 16 11 16 12 15 12 15 13 14 13 14 14 13 14 13 15 12 15 12 16 11 16 11 17 10 17 10 18 8 18 8 17 7 17 7 16 6 16 6 15 5 15 5 14 4 14 4 13 3 13 3 12 2 12 2 10 4 10 4 11 5 11 5 12 6 12 6 13 7 13 7 14 8 14 8 15 10 15 10 14 11 14 11 13 12 13 12 12 13 12 13 11 14 11 14 10 15 10 15 9 16 9 16 8 17 8 17 7 18 7 18 6 19 6 19 5 20 5 20 4 22 4"/>
  </svg>
);

function PixelBookIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ imageRendering: 'pixelated', flexShrink: 0 }}>
      <rect x="0" y="2" width="24" height="20" fill="#334155"/>
      <rect x="1" y="3" width="22" height="18" fill="#04A0FF"/>
      <rect x="2" y="4" width="9" height="16" fill="#E1FAFF"/>
      <rect x="13" y="4" width="9" height="16" fill="#E1FAFF"/>
      <rect x="11" y="3" width="2" height="18" fill="#334155"/>
      <rect x="3" y="7"  width="7" height="2" fill="#8ED4FF"/>
      <rect x="3" y="11" width="7" height="2" fill="#8ED4FF"/>
      <rect x="3" y="15" width="5" height="2" fill="#8ED4FF"/>
      <rect x="14" y="7"  width="7" height="2" fill="#8ED4FF"/>
      <rect x="14" y="11" width="7" height="2" fill="#8ED4FF"/>
      <rect x="14" y="15" width="5" height="2" fill="#8ED4FF"/>
    </svg>
  );
}

function PixelCodeIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="#334155" style={{ imageRendering: 'pixelated', flexShrink: 0 }}>
      <rect x="9"  y="0"  width="6" height="4"/>
      <rect x="3"  y="5"  width="6" height="4"/>
      <rect x="15" y="5"  width="6" height="4"/>
      <rect x="0"  y="10" width="4" height="4"/>
      <rect x="20" y="10" width="4" height="4"/>
      <rect x="3"  y="15" width="6" height="4"/>
      <rect x="15" y="15" width="6" height="4"/>
      <rect x="9"  y="20" width="6" height="4"/>
    </svg>
  );
}

const PixelLinkIcon = ({ color = '#04A0FF', size = 18 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ imageRendering: 'pixelated', flexShrink: 0 }}>
    <polygon points="3 5 3 21 19 21 19 13 17 13 17 19 5 19 5 7 11 7 11 5"/>
    <polygon points="13 3 13 5 16 5 10 11 11.5 12.5 18 6 18 9 20 9 20 3"/>
  </svg>
);

const PixelTrophyIcon = ({ color = '#F9EC72', size = 36 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ imageRendering: 'pixelated', flexShrink: 0 }}>
    <path d="m18,2v-1h-12v1h-3v1h-1v6h1v1h2v1h1v1h1v1h2v1h1v2h-2v1h-1v1h-1v2h12v-2h-1v-1h-2v-1h1v-2h1v-1h2v-1h1v-1h2v-6h-1v-1h-3Zm-10,9h-2v-5h2v5Zm12,0h-2v-5h2v5Zm-4,-2h-4v-7h4v7Z"/>
  </svg>
);

// ── Panel Component ──────────────────────────────────────────────────────────

function PixelPanel({ children, className, style }: { children: React.ReactNode; className?: string; style?: React.CSSProperties }) {
  return (
    <div className="relative w-full h-full">
      <div className={className} style={{
        borderWidth: 4,
        borderStyle: 'solid',
        borderColor: '#334155',
        ...style
      }}>{children}</div>
      <div className="absolute top-0 left-0 w-[6px] h-[6px] bg-[#E1FAFF] pointer-events-none z-10" />
      <div className="absolute top-0 right-0 w-[6px] h-[6px] bg-[#E1FAFF] pointer-events-none z-10" />
      <div className="absolute bottom-0 left-0 w-[6px] h-[6px] bg-[#E1FAFF] pointer-events-none z-10" />
      <div className="absolute bottom-0 right-0 w-[6px] h-[6px] bg-[#E1FAFF] pointer-events-none z-10" />
    </div>
  );
}

// ── Segmented progress bar ───────────────────────────────────────────────────

function TaskProgress({ value }: { value: number }) {
  const segments = 10;
  const filled = Math.floor((Math.min(Math.max(value, 0), 100) / 100) * segments);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-base uppercase tracking-wide text-[#334155]" style={{ fontWeight: 400 }}>Progress</span>
        <span className="text-base text-[#84BC2F]" style={{ fontWeight: 400 }}>{Math.round(value)}%</span>
      </div>
      <div style={{ border: '3px solid #334155', backgroundColor: '#E1FAFF', padding: 3 }}>
        <div className="flex gap-[3px] h-5">
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                backgroundColor: i < filled ? '#84BC2F' : '#E1FAFF',
                border: '2px solid #334155',
                boxShadow: i < filled
                  ? 'inset 0 2px 0 rgba(255,255,255,0.25), inset 0 -2px 0 rgba(0,0,0,0.15)'
                  : 'none',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export default function DailyPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [subtopicLabel, setSubtopicLabel] = useState<string | null>(null);
  const [checkpointLabel, setCheckpointLabel] = useState<string | null>(null);
  const [subtopicIndex, setSubtopicIndex] = useState(0);
  const [totalSubtopics, setTotalSubtopics] = useState(0);

  function loadTasks() {
    api.tasks().then(d => {
      setTasks(d.tasks);
      setCompleted(d.tasks.filter(t => t.status === 'completed').map(t => t.id));
      setActiveTask(d.tasks.length > 0 ? d.tasks[0].id : null);
      setSubtopicLabel(d.current_subtopic);
      setCheckpointLabel(d.current_checkpoint_label);
      setSubtopicIndex(d.subtopic_index);
      setTotalSubtopics(d.total_subtopics);
    }).catch(console.error);
  }

  useEffect(() => { loadTasks(); }, []);

  const activeTaskObj = tasks.find(t => t.id === activeTask) ?? null;
  const allDone = tasks.length > 0 && completed.length >= tasks.length;

  function handleMarkComplete() {
    if (activeTask && !completed.includes(activeTask)) {
      setCompleted(prev => [...prev, activeTask]);
      api.updateTask(activeTask, 'completed').catch(console.error);
    }
  }

  function handleMoreTasks() {
    api.advanceTasks().then(() => loadTasks()).catch(console.error);
  }

  const completionPct = tasks.length > 0
    ? Math.round((completed.length / tasks.length) * 100)
    : 0;

  const isDone = activeTaskObj ? completed.includes(activeTaskObj.id) : false;

  return (
    <div className="min-h-screen bg-linear-to-b from-[#7EC8E3] to-[#E1FAFF]" style={{ fontFamily: "'Press Start 2P', monospace" }}>
      <Navbar />

      <div className="w-[95%] max-w-6xl mx-auto pt-[104px] pb-8 flex gap-8 h-screen">

        {/* ── Left Panel ── */}
        <div className="w-[320px] flex-shrink-0 flex flex-col">
          <PixelPanel className="flex flex-col bg-white p-5 overflow-hidden h-full">

            {/* Today's Challenge box */}
            {checkpointLabel && (
              <div
                className="-mx-5 -mt-5 mb-4"
                style={{ borderBottomWidth: 4, borderBottomStyle: 'solid', borderBottomColor: '#334155', backgroundColor: 'white' }}
              >
                <div className="px-4 py-2" style={{ backgroundColor: '#334155' }}>
                  <p className="text-[18px] text-[#F9EC72] uppercase tracking-widest" style={{ fontWeight: 400 }}>Today&apos;s Challenge</p>
                </div>
                <div className="px-4 pt-2 pb-1">
                  <div className="flex items-center gap-3">
                    <div
                      className="flex-shrink-0 w-8 h-8 bg-[#E1FAFF] flex items-center justify-center"
                      style={{ border: '2px solid #334155' }}
                    >
                      <Image src={pic6} alt="node" className="h-4 w-4" style={{ imageRendering: 'pixelated' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl truncate uppercase text-[#334155] leading-tight" style={{ fontWeight: 400 }}>{checkpointLabel}</h3>
                      <p className="text-sm text-[#04A0FF] uppercase mt-0.5 truncate" style={{ fontWeight: 400 }}>
                        Subtopic {subtopicIndex + 1}/{totalSubtopics}
                      </p>
                    </div>
                  </div>
                </div>
                {subtopicLabel && (
                  <div className="px-4 pb-3 pt-1">
                    <p className="text-base text-[#334155] leading-snug" style={{ fontWeight: 400 }}>{subtopicLabel}</p>
                  </div>
                )}
              </div>
            )}

            {/* Task list */}
            <div className="flex flex-col gap-3 flex-1 overflow-y-auto">
              {tasks.map((task) => {
                const isActive = activeTask === task.id;
                const isDoneItem = completed.includes(task.id);
                const isLearning = task.type === 'Learning';

                return (
                  <div
                    key={task.id}
                    onClick={() => setActiveTask(task.id)}
                    className="cursor-pointer transition-all duration-100 active:translate-y-[1px]"
                    style={{
                      borderWidth: 2,
                      borderStyle: 'solid',
                      borderColor: '#334155',
                      backgroundColor: isActive ? '#BEF8FF' : 'white',
                      borderLeftWidth: 8,
                      borderLeftColor: isDoneItem ? '#84BC2F' : '#334155',
                    }}
                  >
                    <div className="flex items-center gap-3 p-3">
                      <div
                        className="flex-shrink-0 w-9 h-9 flex items-center justify-center overflow-hidden"
                        style={{ border: '2px solid #334155', backgroundColor: '#E1FAFF' }}
                      >
                        {isDoneItem
                          ? <PixelCheckIcon size={22} color="#84BC2F" />
                          : task.type === 'Coding'
                            ? <PixelCodeIcon size={22} />
                            : <PixelBookIcon size={22} />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <span
                          className="text-[10px] uppercase tracking-wide px-2 py-0.5 leading-tight"
                          style={{
                            backgroundColor: isLearning ? '#84BC2F' : '#334155',
                            color: isLearning ? 'white' : '#F9EC72',
                            fontWeight: 400
                          }}
                        >
                          {task.type}
                        </span>
                        <h3 className="text-base truncate text-[#334155] leading-tight mt-1" style={{ fontWeight: 400 }}>{task.title}</h3>
                        {isDoneItem && (
                          <div className="flex items-center gap-1 mt-0.5">
                            <PixelCheckIcon size={10} color="#84BC2F" />
                            <p className="text-sm text-[#84BC2F] uppercase" style={{ fontWeight: 400 }}>Done</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Progress bar section */}
            <div className="pt-4 mt-4" style={{ borderTopWidth: 3, borderTopStyle: 'solid', borderTopColor: '#334155' }}>
              <TaskProgress value={completionPct} />
            </div>

          </PixelPanel>
        </div>

        {/* ── Right Panel ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <PixelPanel className="flex-1 bg-white p-10 flex flex-col h-full overflow-y-auto">

            {allDone ? (
              <div className="flex flex-col items-center justify-center h-full gap-6">
                <div
                  className="w-20 h-20 flex items-center justify-center"
                  style={{ borderWidth: 4, borderStyle: 'solid', borderColor: '#334155', backgroundColor: '#BEF8FF' }}
                >
                  <PixelTrophyIcon size={40} color="#F9EC72" />
                </div>
                <h1 className="text-4xl text-[#334155] text-center" style={{ fontWeight: 400 }}>Done for the day!</h1>
                <p className="text-xl text-[#334155] text-center max-w-md" style={{ fontWeight: 400 }}>
                  You completed all resources for this subtopic. Come back tomorrow or continue with more tasks.
                </p>
                {subtopicIndex + 1 < totalSubtopics && (
                  <PixelButton variant="primary" size="md" onClick={handleMoreTasks}>
                    <span className="text-base">More Tasks</span>
                  </PixelButton>
                )}
              </div>

            ) : activeTaskObj ? (
              <div className="flex flex-col h-full">

                {/* Type badge */}
                <div className="flex items-center gap-3 mb-6">
                  <span
                    className="text-base uppercase tracking-widest px-3 py-1.5"
                    style={{
                        backgroundColor: activeTaskObj.type === 'Coding' ? '#334155' : '#84BC2F',
                        color: activeTaskObj.type === 'Coding' ? '#F9EC72' : 'white',
                        fontWeight: 400
                    }}
                  >
                    {activeTaskObj.type}
                  </span>
                </div>

                {/* Title and Divider */}
                <div className="mb-8">
                  <h1 className="text-5xl text-[#334155] leading-tight mb-4" style={{ fontWeight: 400 }}>
                    {activeTaskObj.title}
                  </h1>
                  <div className="w-16 h-1.5" style={{ backgroundColor: '#84BC2F' }} />
                </div>

                {/* Content Section */}
                <div className="space-y-8 flex-1">
                  <div>
                    <h2 className="text-3xl text-[#334155] mb-3 flex items-center gap-2" style={{ fontWeight: 400 }}>
                      <PixelBookIcon size={26} />
                      About
                    </h2>
                    <p className="text-xl text-[#334155] leading-relaxed" style={{ fontWeight: 400 }}>
                      {activeTaskObj.description || 'Review this resource to progress.'}
                    </p>
                  </div>

                  {activeTaskObj.objectives?.length > 0 && (
                    <div>
                      <h2 className="text-3xl text-[#334155] mb-3 flex items-center gap-2" style={{ fontWeight: 400 }}>
                        <PixelCheckIcon size={26} color="#84BC2F" />
                        Objectives
                      </h2>
                      <ul className="space-y-3">
                        {activeTaskObj.objectives.map((obj, i) => (
                          <li key={i} className="flex items-start gap-3 text-xl text-[#334155] leading-relaxed" style={{ fontWeight: 400 }}>
                            <div className="flex-shrink-0 mt-2.5 w-2 h-2" style={{ backgroundColor: '#84BC2F' }} />
                            {obj}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {activeTaskObj.url && (
                    <a
                      href={activeTaskObj.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-xl group"
                      style={{ color: '#04A0FF', fontWeight: 400 }}
                    >
                      <PixelLinkIcon size={20} color="#04A0FF" />
                      <span className="group-hover:underline">Open Resource</span>
                    </a>
                  )}
                </div>

                {/* Footer / Status */}
                <div className="mt-8">
                  {!isDone ? (
                    <PixelButton variant="primary" size="md" onClick={handleMarkComplete}>
                      <span className="text-base">Mark Complete</span>
                    </PixelButton>
                  ) : (
                    <div className="flex items-center gap-2">
                      <PixelCheckIcon size={20} color="#84BC2F" />
                      <span className="text-base uppercase tracking-widest text-[#84BC2F]" style={{ fontWeight: 400 }}>Complete</span>
                    </div>
                  )}
                </div>

              </div>

            ) : (
              <div className="flex flex-col items-center justify-center h-full">
                <PixelBookIcon size={48} />
                <p className="text-xl uppercase tracking-widest mt-3 text-[#334155]" style={{ fontWeight: 400 }}>Select a resource to get started</p>
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
        * { image-rendering: pixelated; -webkit-font-smoothing: none; }
        ::-webkit-scrollbar { display: none; }
      `}</style>
    </div>
  );
}
