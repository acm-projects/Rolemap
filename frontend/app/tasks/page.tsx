'use client';
import { useState, useEffect, useRef } from "react";
import { Navbar } from "../components/NavBar";
import { useCharacter } from "../context/CharacterContext";
import Image from "next/image";
import pic6 from "../tasks/target.png";
import PixelCard from "../components/PixelCard";
import PixelButton from "../components/PixelButton";
import PixelProgress from "../components/PixelProgress";
import { useRouter } from "next/navigation";
import { api, type Task, type SkillDecayEntry } from "@/lib/api";
import { BookOpen, CheckCircle, ExternalLink, Code2, Trophy, Zap } from 'lucide-react';

const DECAY_STYLE: Record<string, { borderColor: string; badgeBg: string; badgeText: string; label: string; headerBg: string }> = {
  review_soon: { borderColor: '#f59e0b', badgeBg: '#fef3c7', badgeText: '#92400e', label: 'Review Soon',  headerBg: '#fffbeb' },
  decaying:    { borderColor: '#f97316', badgeBg: '#ffedd5', badgeText: '#9a3412', label: 'Needs Review', headerBg: '#fff7ed' },
  forgotten:   { borderColor: '#ef4444', badgeBg: '#fee2e2', badgeText: '#991b1b', label: 'Decayed',      headerBg: '#fef2f2' },
};

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

// ── Sleeping character on task card ──────────────────────────────────────────

const DIE_SIZE = 100;

const DEFAULT_EQUIPPED_DIE = {
  skin: 'char1.png', eyes: 'eyes.png', clothes: 'suit.png',
  pants: 'pants.png', shoes: 'shoes.png', hair: 'buzzcut.png', accessories: '',
};

function getDiePath(cat: string, file: string): string | null {
  if (!file) return null;
  const base = file.replace('.png', '_die.png');
  switch (cat) {
    case 'skin':         return `die/${base}`;
    case 'clothes':      return `die/clothes/${base}`;
    case 'pants':        return `die/clothes/${base}`;
    case 'shoes':        return `die/clothes/${base}`;
    case 'hair':         return `die/hair/${base}`;
    case 'eyes':         return `die/eyes/${file === 'blush_all.png' ? 'blush_die.png' : base}`;
    case 'accessories':  return `die/acc/${base}`;
    default:             return null;
  }
}

// Tune these to adjust sleeping character position on the card
const CHAR_TOP_OFFSET = -18;   // px from card top (increase = lower)
const CHAR_RIGHT_OFFSET = 235; // px from card right edge (increase = further left)

function DieCharacter({ taskId, falling, fallDelta }: {
  taskId: string | null;
  falling: boolean;
  fallDelta: number;
}) {
  const { charState } = useCharacter();
  const [equipped, setEquipped] = useState(DEFAULT_EQUIPPED_DIE);
  const [colorVariants, setColorVariants] = useState<Record<string, number>>({});
  const [phase, setPhase] = useState<'hidden' | 'falling-in' | 'sleeping' | 'falling-to-next'>('hidden');
  const [fixedPos, setFixedPos] = useState<{ top: number; left: number } | null>(null);
  const [animKey, setAnimKey] = useState(0);
  const prevTaskId = useRef<string | null>(null);
  const mountTime = useRef(Date.now());
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const load = () => {
      try {
        const eq = localStorage.getItem('character_saved');
        const cv = localStorage.getItem('character_saved_variants');
        if (eq) setEquipped(p => ({ ...p, ...JSON.parse(eq) }));
        if (cv) setColorVariants(JSON.parse(cv));
      } catch {}
    };
    load();
    window.addEventListener('character-saved', load);
    return () => window.removeEventListener('character-saved', load);
  }, []);

  const getCardFixed = (id: string) => {
    const el = document.querySelector(`[data-task-id="${id}"]`) as HTMLElement | null;
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      top: rect.top + CHAR_TOP_OFFSET,
      left: rect.left + rect.width - DIE_SIZE - CHAR_RIGHT_OFFSET,
    };
  };

  useEffect(() => {
    if (!taskId) {
      prevTaskId.current = null;
      setPhase('hidden');
      setFixedPos(null);
      return;
    }

    const isFirst = prevTaskId.current === null;
    prevTaskId.current = taskId;

    if (isFirst) {
      const elapsed = Date.now() - mountTime.current;
      const delay = Math.max(0, 450 - elapsed);
      const t = setTimeout(() => {
        const pos = getCardFixed(taskId);
        if (!pos) return;
        setFixedPos(pos);
        setAnimKey(k => k + 1);
        setPhase('falling-in');
        setTimeout(() => setPhase('sleeping'), 700);
      }, delay);
      return () => clearTimeout(t);
    } else {
      const pos = getCardFixed(taskId);
      if (pos) setFixedPos(pos);
      setPhase('sleeping');
    }
  }, [taskId]);

  useEffect(() => {
    if (falling && phase === 'sleeping' && taskId) {
      // Capture current viewport position before switching to fixed animation
      const pos = getCardFixed(taskId);
      if (pos) setFixedPos(pos);
      setAnimKey(k => k + 1);
      setPhase('falling-to-next');
    }
  }, [falling]);

  // Keep invisible anchor in sync with card via RAF (for NavBar getBoundingClientRect on data-die-char)
  useEffect(() => {
    if (phase !== 'sleeping' || !taskId) return;
    let rafId: number;
    const loop = () => {
      const pos = getCardFixed(taskId);
      if (pos && anchorRef.current) {
        anchorRef.current.style.top = pos.top + 'px';
        anchorRef.current.style.left = pos.left + 'px';
      }
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [phase, taskId]);

  if (charState.phase === 'departing') return null;
  if (phase === 'hidden') return null;

  const S = DIE_SIZE;
  const layers: [string, string][] = [
    [equipped.skin, 'skin'],
    [equipped.pants, 'pants'],
    [equipped.shoes, 'shoes'],
    [equipped.clothes, 'clothes'],
    [equipped.eyes, 'eyes'],
    [equipped.hair, 'hair'],
    [equipped.accessories, 'accessories'],
  ];
  const layerData = layers
    .filter(([f]) => f)
    .map(([f, cat]) => { const path = getDiePath(cat, f); return path ? { path, v: colorVariants[f] ?? 0, cat } : null; })
    .filter(Boolean) as { path: string; v: number; cat: string }[];

  const animatedV = [...new Set(layerData.filter(d => d.cat !== 'eyes' && d.cat !== 'skin').map(d => d.v))];
  const sleepKf = (v: number) => `ds${v}s${S}`;
  const makeSleepKf = (v: number) =>
    `@keyframes ${sleepKf(v)}{0%{background-position:${-v*2*S}px 0px;}50%{background-position:${-(v*2+1)*S}px 0px;}100%{background-position:${-v*2*S}px 0px;}}`;

  const R = 'rotate(-90deg)';
  const k = animKey;
  let containerAnim: string | undefined;
  let kfStr = '';

  if (phase === 'falling-in' && fixedPos) {
    const up = fixedPos.top + S;
    kfStr = `@keyframes dfi${k}{0%{transform:${R} translateX(${up}px);}72%{transform:${R} translateX(-10px);}87%{transform:${R} translateX(5px);}100%{transform:${R} translateX(0);}}`;
    containerAnim = `dfi${k} 0.65s linear forwards`;
  } else if (phase === 'falling-to-next' && fixedPos) {
    const d = fallDelta;
    kfStr = `@keyframes dfn${k}{0%{transform:${R} translateX(0);}25%{transform:${R} translateX(${-Math.round(d*0.1)}px);}55%{transform:${R} translateX(${-Math.round(d*0.4)}px);}80%{transform:${R} translateX(${-(d+10)}px);}90%{transform:${R} translateX(${-(d-4)}px);}100%{transform:${R} translateX(${-d}px);}}`;
    containerAnim = `dfn${k} 0.5s linear forwards`;
  }

  const layerDivs = layerData.map(({ path, v }, i) => (
    <div key={i} style={{
      position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
      backgroundImage: `url(/characters/${path})`,
      backgroundRepeat: 'no-repeat',
      backgroundSize: `auto ${S}px`,
      backgroundPosition: `${-v * 2 * S}px 0px`,
      imageRendering: 'pixelated',
    }} />
  ));

  const styleEl = <style>{animatedV.map(makeSleepKf).join('') + kfStr}</style>;

  if (!fixedPos) return null;

  const isSleeping = phase === 'sleeping';
  return (
    <>
      {styleEl}
      <div
        ref={isSleeping ? anchorRef : undefined}
        {...(isSleeping ? { 'data-die-char': '' } : {})}
        style={{
          position: 'fixed',
          top: fixedPos.top,
          left: fixedPos.left,
          width: S,
          height: S,
          imageRendering: 'pixelated',
          zIndex: 9990,
          pointerEvents: 'none',
          transform: R,
          transformOrigin: 'center center',
          ...(containerAnim ? { animation: containerAnim } : {}),
        }}
      >
        {layerDivs}
      </div>
    </>
  );
}


export default function DailyPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [completed, setCompleted] = useState<string[]>([]);
  const [subtopicLabel, setSubtopicLabel] = useState<string | null>(null);
  const [checkpointLabel, setCheckpointLabel] = useState<string | null>(null);
  const [subtopicIndex, setSubtopicIndex] = useState(0);
  const [totalSubtopics, setTotalSubtopics] = useState(0);
  const [decayTasks, setDecayTasks] = useState<SkillDecayEntry[]>([]);
  const [activeDecayTask, setActiveDecayTask] = useState<SkillDecayEntry | null>(null);

  // Sleeping character state
  const [charTaskId, setCharTaskId] = useState<string | null>(null);
  const [charFalling, setCharFalling] = useState(false);
  const [charFallDelta, setCharFallDelta] = useState(0);
  const charInitialized = useRef(false);
  const fallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const activeTaskObj = tasks.find(t => t.id === activeTask) ?? null;
  const allDone = tasks.length > 0 && completed.length >= tasks.length;
  useEffect(() => { loadTasks();
    if (allDone && checkpointLabel) {
    localStorage.setItem('node_just_completed', checkpointLabel);
  }

  }, [allDone, checkpointLabel]);

  // Initialize charTaskId on first tasks load
  useEffect(() => {
    if (tasks.length > 0 && !charInitialized.current) {
      charInitialized.current = true;
      const first = tasks.find(t => !completed.includes(t.id));
      setCharTaskId(first?.id ?? null);
    }
  }, [tasks]);

  function handleMarkComplete() {
    if (!activeTask || completed.includes(activeTask)) return;

    const newCompleted = [...completed, activeTask];
    setCompleted(newCompleted);
    api.updateTask(activeTask, 'completed').catch(console.error);

    // Trigger fall if character is on this task
    if (charTaskId === activeTask) {
      const nextTask = tasks.find(t => !newCompleted.includes(t.id));
      if (nextTask) {
        const curEl = document.querySelector(`[data-task-id="${activeTask}"]`) as HTMLElement | null;
        const nextEl = document.querySelector(`[data-task-id="${nextTask.id}"]`) as HTMLElement | null;
        if (curEl && nextEl) {
          const d = nextEl.getBoundingClientRect().top - curEl.getBoundingClientRect().top;
          setCharFallDelta(d);
        }
      }
      setCharFalling(true);
      if (fallTimerRef.current) clearTimeout(fallTimerRef.current);
      fallTimerRef.current = setTimeout(() => {
        setCharFalling(false);
        setCharTaskId(nextTask?.id ?? null);
      }, 550);
    }
  }

  function handleMarkIncomplete() {
    if (!activeTask || !completed.includes(activeTask)) return;
    setCompleted(prev => prev.filter(id => id !== activeTask));
    api.updateTask(activeTask, 'in_progress').catch(console.error);
    // Move character back to this task if it has no current target
    if (!charTaskId) setCharTaskId(activeTask);
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
      <DieCharacter taskId={charTaskId} falling={charFalling} fallDelta={charFallDelta} />
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
            <div id="task-scroll" className="flex flex-col gap-2 flex-1 overflow-y-auto" style={{ overscrollBehavior: 'none' }}>

              {/* Decay review tasks */}
              {decayTasks.map((entry) => {
                const style = DECAY_STYLE[entry.decay_level] ?? DECAY_STYLE.decaying;
                const isSelected = activeDecayTask?.id === entry.id;
                return (
                  <div
                    key={`decay-${entry.id}`}
                    onClick={() => { setActiveDecayTask(entry); setActiveTask(null); }}
                    style={{
                      borderWidth: 4,
                      borderStyle: 'solid',
                      borderColor: isSelected ? style.borderColor : '#e5c97a',
                      backgroundColor: isSelected ? style.headerBg : '#fffdf5',
                      cursor: 'pointer',
                    }}
                  >
                    <div className="flex items-center gap-3 p-3">
                      <div className="flex-shrink-0 w-9 h-9 flex items-center justify-center border-2" style={{ backgroundColor: style.badgeBg, borderColor: style.borderColor }}>
                        <Zap size={14} style={{ color: style.borderColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[10px] uppercase truncate leading-tight mb-0.5 font-medium" style={{ color: style.borderColor }}>⚡ REVIEW</p>
                        <h3 className="text-xs truncate text-[#2d5050] leading-tight">{entry.skill}</h3>
                        <div className="mt-1 h-1 w-full bg-gray-200" style={{ borderRadius: 0 }}>
                          <div className="h-full" style={{ width: `${entry.health}%`, backgroundColor: style.borderColor, borderRadius: 0 }} />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Separator if both decay and regular tasks exist */}
              {decayTasks.length > 0 && tasks.length > 0 && (
                <div className="h-[4px] bg-[#d4e8e8] -mx-0 my-1" />
              )}

              {tasks.map((task) => {
                const isActive = activeTask === task.id;
                const isDoneItem = completed.includes(task.id);

                return (
                  <div key={task.id} data-task-id={task.id}>
                    <PixelCard
                      onClick={() => { setActiveTask(task.id); setActiveDecayTask(null); }}
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
                  </div>
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

            {/* Decay task detail */}
            {activeDecayTask ? (() => {
              const entry = activeDecayTask;
              const style = DECAY_STYLE[entry.decay_level] ?? DECAY_STYLE.decaying;
              return (
                <div className="flex flex-col h-full">
                  <div className="flex items-center gap-3 mb-6">
                    <span
                      className="text-xs text-white uppercase tracking-widest px-2.5 py-1 font-medium"
                      style={{ backgroundColor: style.borderColor, borderWidth: 2, borderStyle: 'solid', borderColor: style.borderColor }}
                    >
                      ⚡ SKILL REVIEW
                    </span>
                    <span
                      className="text-xs uppercase tracking-widest px-2 py-1"
                      style={{ backgroundColor: style.badgeBg, color: style.badgeText, borderWidth: 2, borderStyle: 'solid', borderColor: style.borderColor }}
                    >
                      {style.label}
                    </span>
                  </div>

                  <div className="mb-8">
                    <h1 className="text-3xl md:text-4xl text-[#2d5050] leading-tight mb-4">{entry.skill}</h1>
                    <div className="w-full h-3 bg-gray-200 mb-2" style={{ borderRadius: 0 }}>
                      <div className="h-full" style={{ width: `${entry.health}%`, backgroundColor: style.borderColor, borderRadius: 0 }} />
                    </div>
                    <p className="text-xs text-[#4e8888] uppercase tracking-widest">{entry.health}% health · {entry.times_practiced} practice{entry.times_practiced !== 1 ? 's' : ''}</p>
                    <div className="w-16 h-1 mt-4" style={{ backgroundColor: style.borderColor }} />
                  </div>

                  <div className="space-y-4 text-[#3a6666] flex-1">
                    <p className="text-base leading-relaxed">
                      Your knowledge of <strong>{entry.skill}</strong> is {entry.decay_level === 'forgotten' ? 'fading fast' : entry.decay_level === 'decaying' ? 'starting to decay' : 'due for a refresh'}.
                      Take a quick quiz to reinforce it and reset the review clock.
                    </p>
                    {entry.days_until_review < 0 && (
                      <p className="text-sm" style={{ color: style.borderColor }}>
                        {Math.abs(Math.round(entry.days_until_review))} day{Math.abs(Math.round(entry.days_until_review)) !== 1 ? 's' : ''} overdue
                      </p>
                    )}
                  </div>

                  <div className="mt-8">
                    <PixelButton
                      variant="primary"
                      size="md"
                      onClick={() => router.push(`/quiz?checkpoint=${entry.id}&label=${encodeURIComponent(entry.skill)}&review=true`)}
                    >
                      <span className="text-sm">⚡ Take Quiz</span>
                    </PixelButton>
                  </div>
                </div>
              );
            })()

            /* All resources done — "Done for the day" */
            : allDone ? (
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
                  <h1 className="text-3xl md:text-4xl text-[#2d5050] tracking-normal font-normal leading-tight mb-4">
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
                <div className="mt-8 flex items-center gap-4">
                  {!isDone ? (
                    <PixelButton variant="primary" size="md" onClick={handleMarkComplete}>
                      <span className="text-sm">Mark Complete</span>
                    </PixelButton>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-[#10B981]">
                        <CheckCircle size={14} />
                        <span className="text-sm uppercase tracking-widest">Complete</span>
                      </div>
                      <PixelButton variant="ghost" size="sm" onClick={handleMarkIncomplete}>
                        <span className="text-xs text-[#4e8888]">Undo</span>
                      </PixelButton>
                    </>
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
