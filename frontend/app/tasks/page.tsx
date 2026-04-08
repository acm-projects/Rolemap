'use client';
import { useState, useEffect } from "react";
import { Navbar } from "../components/NavBar";
import Image from "next/image";
import pic6 from "../tasks/target.png";
import PixelCard from "../components/PixelCard";
import PixelButton from "../components/PixelButton";
import PixelProgress from "../components/PixelProgress";
import { api, type Task } from "@/lib/api";
import { BookOpen, CheckCircle, ExternalLink, Code2, Trophy } from 'lucide-react';

function CheckCircleOutline({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ imageRendering: 'pixelated' }} fill="currentColor">
      <polygon points="19 9 19 10 18 10 18 11 17 11 17 12 16 12 16 13 15 13 15 14 14 14 14 15 13 15 13 16 12 16 12 17 10 17 10 16 9 16 9 15 8 15 8 14 7 14 7 13 6 13 6 12 7 12 7 11 8 11 8 12 9 12 9 13 10 13 10 14 12 14 12 13 13 13 13 12 14 12 14 11 15 11 15 10 16 10 16 9 17 9 17 8 18 8 18 9 19 9"/>
      <path d="m22,9v-2h-1v-2h-1v-1h-1v-1h-2v-1h-2v-1h-6v1h-2v1h-2v1h-1v1h-1v2h-1v2h-1v6h1v2h1v2h1v1h1v1h2v1h2v1h6v-1h2v-1h2v-1h1v-1h1v-2h1v-2h1v-6h-1Zm-2,6v2h-1v2h-2v1h-2v1h-6v-1h-2v-1h-2v-2h-1v-2h-1v-6h1v-2h1v-2h2v-1h2v-1h6v1h2v1h2v2h1v2h1v6h-1Z"/>
    </svg>
  );
}

function CheckCircleSolid({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={{ imageRendering: 'pixelated' }} fill="currentColor">
      <path d="m22,9v-2h-1v-2h-1v-1h-1v-1h-2v-1h-2v-1h-6v1h-2v1h-2v1h-1v1h-1v2h-1v2h-1v6h1v2h1v2h1v1h1v1h2v1h2v1h6v-1h2v-1h2v-1h1v-1h1v-2h1v-2h1v-6h-1Zm-4,3h-1v1h-1v1h-1v1h-1v1h-1v1h-1v1h-2v-1h-1v-1h-1v-1h-1v-1h-1v-2h1v-1h2v1h1v1h2v-1h1v-1h1v-1h1v-1h1v-1h2v1h1v2h-1v1Z"/>
    </svg>
  );
}

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
    <div className="min-h-screen bg-[#f0f8f8]" style={{ imageRendering: 'pixelated' }}>
      <Navbar />

      <div className="w-[95%] max-w-6xl mx-auto pt-[104px] pb-8 flex gap-8 h-screen">

        {/* ── Left Panel ── */}
        <div className="w-[300px] flex-shrink-0 flex flex-col">
          <PixelPanel className="flex flex-col bg-white p-5 overflow-hidden h-full">
            {/* Header: current node + subtopic */}
            {checkpointLabel && (
              <div
                className="-mx-5 -mt-5 mb-4"
                style={{ borderBottomWidth: 4, borderBottomStyle: 'solid', borderBottomColor: '#2d5050', backgroundColor: '#4e8888' }}
              >
                <div className="flex items-center gap-3 px-4 pt-4 pb-2">
                  <div className="flex-shrink-0 w-8 h-8 bg-[#3a6666] flex items-center justify-center" style={{ borderWidth: 2, borderStyle: 'solid', borderTopColor: '#5a9999', borderLeftColor: '#5a9999', borderRightColor: '#2d5050', borderBottomColor: '#2d5050' }}>
                    <Image src={pic6} alt="node" className="h-4 w-4" style={{ imageRendering: 'pixelated' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm truncate uppercase text-white leading-tight">{checkpointLabel}</h3>
                    <p className="text-[10px] text-[#a8d4d4] uppercase mt-0.5 truncate">
                      Subtopic {subtopicIndex + 1}/{totalSubtopics}
                    </p>
                  </div>
                </div>
                {subtopicLabel && (
                  <div className="px-4 pb-3">
                    <p className="text-xs text-[#d4e8e8] leading-snug">{subtopicLabel}</p>
                  </div>
                )}
              </div>
            )}

            {/* Resource cards */}
            <div className="flex flex-col gap-2 flex-1 overflow-y-auto">
              {tasks.map((task) => {
                const isActive = activeTask === task.id;
                const isDoneItem = completed.includes(task.id);

                return (
                  <PixelCard
                    key={task.id}
                    onClick={() => setActiveTask(task.id)}
                    selected={isActive}
                    hover
                  >
                    <div className="flex items-center gap-3 p-3">
                      <div className="flex-shrink-0 w-9 h-9 bg-[#f0f8f8] flex items-center justify-center border-2 border-[#d4e8e8]">
                        {isDoneItem
                          ? <CheckCircle size={14} className="text-[#10B981]" />
                          : task.type === 'Coding'
                            ? <Code2 size={14} className="text-[#4e8888]" />
                            : <BookOpen size={14} className="text-[#4e8888]" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] text-[#7ab3b3] uppercase truncate leading-tight mb-0.5">{task.type}</p>
                        <h3 className="text-xs truncate text-[#2d5050] leading-tight">
                          {task.title}
                        </h3>
                        {isDoneItem && (
                          <p className="text-xs text-[#10B981] uppercase mt-0.5">Done</p>
                        )}
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

        {/* ── Right Panel ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <PixelPanel className="flex-1 bg-[#e8f4f4] p-10 flex flex-col h-full overflow-y-auto">

            {/* All resources done — "Done for the day" */}
            {allDone ? (
              <div className="flex flex-col items-center justify-center h-full gap-6">
                <div
                  className="w-20 h-20 flex items-center justify-center bg-[#4e8888]"
                  style={{ borderWidth: 4, borderStyle: 'solid', borderTopColor: '#7ab3b3', borderLeftColor: '#7ab3b3', borderRightColor: '#2d5050', borderBottomColor: '#2d5050' }}
                >
                  <Trophy size={36} className="text-white" />
                </div>
                <h1 className="text-4xl text-[#2d5050] text-center">Done for the day!</h1>
                <p className="text-base text-[#4e8888] text-center max-w-md">
                  You completed all resources for this subtopic. Come back tomorrow or continue with more tasks.
                </p>
                {subtopicIndex + 1 < totalSubtopics && (
                  <PixelButton variant="primary" size="md" onClick={handleMoreTasks}>
                    <span className="text-sm">More Tasks</span>
                  </PixelButton>
                )}
              </div>

            /* Active resource detail */
            ) : activeTaskObj ? (
              <div className="flex flex-col h-full">
                {/* Tag badge */}
                <div className="flex items-center gap-3 mb-6">
                  <span
                    className="text-xs text-white uppercase tracking-widest px-2.5 py-1 bg-[#4e8888]"
                    style={{ borderWidth: 2, borderStyle: 'solid', borderTopColor: '#7ab3b3', borderLeftColor: '#7ab3b3', borderRightColor: '#2d5050', borderBottomColor: '#2d5050' }}
                  >
                    {activeTaskObj.type}
                  </span>
                </div>

                {/* Title */}
                <div className="mb-8">
                  <h1 className="text-3xl md:text-4xl text-[#2d5050] tracking-tight leading-tight mb-4">
                    {activeTaskObj.title}
                  </h1>
                  <div className="w-16 h-1 bg-[#4e8888]" />
                </div>

                {/* Description */}
                <div className="space-y-8 text-[#3a6666] flex-1">
                  <div>
                    <h2 className="text-xl text-[#2d5050] mb-3 flex items-center gap-2">
                      <BookOpen size={18} className="text-[#4e8888]" />
                      About
                    </h2>
                    <p className="text-base leading-relaxed">
                      {activeTaskObj.description || 'Review this resource to progress.'}
                    </p>
                  </div>

                  {/* Objectives */}
                  {activeTaskObj.objectives?.length > 0 && (
                    <div>
                      <h2 className="text-xl text-[#2d5050] mb-3 flex items-center gap-2">
                        <CheckCircle size={18} className="text-[#4e8888]" />
                        Objectives
                      </h2>
                      <ul className="space-y-2">
                        {activeTaskObj.objectives.map((obj, i) => (
                          <li key={i} className="flex items-start gap-2 text-base leading-relaxed">
                            <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 bg-[#4e8888]" />
                            {obj}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Link to resource */}
                  {activeTaskObj.url && (
                    <a
                      href={activeTaskObj.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 text-[#4e8888] hover:text-[#2d5050] text-base group"
                    >
                      <ExternalLink size={16} />
                      <span className="group-hover:underline">Open Resource</span>
                    </a>
                  )}
                </div>

                {/* Mark complete */}
                <div className="mt-8">
                  {!isDone ? (
                    <PixelButton variant="primary" size="md" onClick={handleMarkComplete}>
                      <span className="text-sm">Mark Complete</span>
                    </PixelButton>
                  ) : (
                    <div className="flex items-center gap-2 text-[#10B981]">
                      <CheckCircle size={14} />
                      <span className="text-sm uppercase tracking-widest">Complete</span>
                    </div>
                  )}
                </div>
              </div>

            ) : (
              <div className="flex flex-col items-center justify-center h-full text-[#4e8888]/60">
                <BookOpen size={36} className="mb-3" />
                <p className="text-base uppercase tracking-widest">Select a resource to get started</p>
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
