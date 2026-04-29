'use client';
import { useState, useEffect, useRef } from "react";
import { Navbar } from "../components/NavBar";
import { useCharacter } from "../context/CharacterContext";
import Image from "next/image";
import pic6 from "../tasks/target.png";
import PixelButton from "../components/PixelButton";
import { api, type Task, type SkillDecayEntry } from "@/lib/api";
import { setStoredTaskProgress } from "@/lib/taskProgress";
import { useRouter } from "next/navigation";
import { Zap } from 'lucide-react';

const DECAY_STYLE: Record<string, { borderColor: string; badgeBg: string; badgeText: string; label: string; headerBg: string }> = {
  review_soon: { borderColor: '#f59e0b', badgeBg: '#fef3c7', badgeText: '#92400e', label: 'Review Soon',  headerBg: '#fffbeb' },
  decaying:    { borderColor: '#f97316', badgeBg: '#ffedd5', badgeText: '#9a3412', label: 'Needs Review', headerBg: '#fff7ed' },
  forgotten:   { borderColor: '#ef4444', badgeBg: '#fee2e2', badgeText: '#991b1b', label: 'Decayed',      headerBg: '#fef2f2' },
};

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
      <div style={{ borderWidth: 3, borderStyle: 'solid', borderTopColor: '#4a5f7a', borderLeftColor: '#4a5f7a', borderRightColor: '#1e2d3d', borderBottomColor: '#1e2d3d', backgroundColor: '#E1FAFF', padding: 3 }}>
        <div className="flex gap-[3px] h-5">
          {Array.from({ length: segments }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                backgroundColor: i < filled ? '#84BC2F' : '#E1FAFF',
                borderWidth: 2,
                borderStyle: 'solid',
                borderTopColor: i < filled ? '#a0d44f' : '#4a5f7a',
                borderLeftColor: i < filled ? '#a0d44f' : '#4a5f7a',
                borderRightColor: i < filled ? '#5a8a1e' : '#1e2d3d',
                borderBottomColor: i < filled ? '#5a8a1e' : '#1e2d3d',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────
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
const CHAR_LEFT_OFFSET = -100; // px from card left edge — positions character outside the panel against its outer left border
const FLIP_THRESHOLD = 230;        // if character top (px from screen top) is above this, flip horizontally
const FLIP_BOTTOM_THRESHOLD = 550; // if character top (px from screen top) is below this, flip horizontally
const FLIP_TOP_OFFSET = 0;     // additional px added to top when flipped (positive = lower)
const FLIP_LEFT_OFFSET = 100;    // additional px added to left when flipped (positive = further right)

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
  const mountTime = useRef(0);
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => { mountTime.current = Date.now(); }, []);

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
      left: rect.left + CHAR_LEFT_OFFSET,
    };
  };

  useEffect(() => {
    if (!taskId) {
      prevTaskId.current = null;
      queueMicrotask(() => {
        setPhase('hidden');
        setFixedPos(null);
      });
      return;
    }

    const isFirst = prevTaskId.current === null;
    prevTaskId.current = taskId;

    if (isFirst) {
      const elapsed = Date.now() - mountTime.current;
      const delay = Math.max(0, 550 - elapsed);
      const t = setTimeout(() => {
        requestAnimationFrame(() => {
          const pos = getCardFixed(taskId);
          if (!pos) return;
          setFixedPos(pos);
          setAnimKey(k => k + 1);
          setPhase('falling-in');
          setTimeout(() => setPhase('sleeping'), 700);
        });
      }, delay);
      return () => clearTimeout(t);
    } else {
      const pos = getCardFixed(taskId);
      queueMicrotask(() => {
        if (pos) setFixedPos(pos);
        setPhase('sleeping');
      });
    }
  }, [taskId]);

  useEffect(() => {
    if (falling && phase === 'sleeping' && taskId) {
      const pos = getCardFixed(taskId);
      queueMicrotask(() => {
        if (pos) setFixedPos(pos);
        setAnimKey(k => k + 1);
        setPhase('falling-to-next');
      });
    }
  }, [falling]);

  // Keep sleeping character in sync with card via RAF; hide when card scrolls out of the task list
  useEffect(() => {
    if (phase !== 'sleeping' || !taskId) return;
    let rafId: number;
    const loop = () => {
      const el = document.querySelector(`[data-task-id="${taskId}"]`) as HTMLElement | null;
      const scrollContainer = document.getElementById('task-scroll');
      if (el && anchorRef.current) {
        const cardRect = el.getBoundingClientRect();
        const containerRect = scrollContainer?.getBoundingClientRect();
        const inView = containerRect
          ? cardRect.bottom > containerRect.top && cardRect.top < containerRect.bottom
          : true;
        if (!inView) {
          anchorRef.current.style.visibility = 'hidden';
        } else {
          const pos = { top: cardRect.top + CHAR_TOP_OFFSET, left: cardRect.left + CHAR_LEFT_OFFSET };
          const flipped = pos.top < FLIP_THRESHOLD || pos.top > FLIP_BOTTOM_THRESHOLD;
          if (flipped) {
            anchorRef.current.style.visibility = 'hidden';
          } else {
            anchorRef.current.style.visibility = 'visible';
            anchorRef.current.style.top = pos.top + 'px';
            anchorRef.current.style.left = pos.left + 'px';
            anchorRef.current.style.transform = 'rotate(-90deg)';
          }
        }
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
    const ft = fixedPos.top;
    kfStr = `@keyframes dfi${k}{0%{top:-200px;}72%{top:${ft+12}px;}87%{top:${ft-5}px;}100%{top:${ft}px;}}`;
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
          zIndex: phase === 'sleeping' ? 9990 : 10000,
          pointerEvents: 'none',
          transform: R,
          transformOrigin: 'center center',
          ...(phase !== 'sleeping' ? { visibility: 'visible' } : {}),
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
  const [loadError, setLoadError] = useState<string | null>(null);

  // Sleeping character state
  const [charTaskId, setCharTaskId] = useState<string | null>(null);
  const [charFalling, setCharFalling] = useState(false);
  const [charFallDelta, setCharFallDelta] = useState(0);
  const charInitialized = useRef(false);
  const fallTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function loadTasks() {
    setLoadError(null);
    try {
      const d = await api.tasks();
      setTasks(d.tasks);
      setCompleted(d.tasks.filter(t => t.status === 'completed').map(t => t.id));
      setActiveTask(d.tasks.length > 0 ? d.tasks[0].id : null);
      setSubtopicLabel(d.current_subtopic);
      setCheckpointLabel(d.current_checkpoint_label);
      setSubtopicIndex(d.subtopic_index);
      setTotalSubtopics(d.total_subtopics);
    } catch {
      setLoadError('Could not reach the Rolemap API. Make sure the backend is running on port 8000.');
    }

    try {
      setDecayTasks(await api.skillDecay());
    } catch {
      setDecayTasks([]);
    }
  }

  // Filter decayTasks to show only top 2 by urgency (forgotten > decaying > review_soon)
  const getUrgencyScore = (decay_level: string) => {
    switch (decay_level) {
      case 'forgotten': return 3;
      case 'decaying': return 2;
      case 'review_soon': return 1;
      default: return 0;
    }
  };
  const filteredDecayTasks = decayTasks
    .sort((a, b) => getUrgencyScore(b.decay_level) - getUrgencyScore(a.decay_level))
    .slice(0, 2);

  const activeTaskObj = tasks.find(t => t.id === activeTask) ?? null;
  const allDone = tasks.length > 0 && completed.length >= tasks.length;

  useEffect(() => {
    loadTasks();
    if (allDone && checkpointLabel) {
      localStorage.setItem('node_just_completed', checkpointLabel);
    }
  }, [allDone, checkpointLabel]);

  // Initialize charTaskId on first tasks load
  useEffect(() => {
    if (tasks.length > 0 && !charInitialized.current) {
      charInitialized.current = true;
      const first = tasks.find(t => !completed.includes(t.id));
      queueMicrotask(() => setCharTaskId(first?.id ?? null));
      if (first) {
        setTimeout(() => {
          const container = document.getElementById('task-scroll');
          const el = document.querySelector(`[data-task-id="${first.id}"]`) as HTMLElement | null;
          if (container && el) {
            const offset = el.getBoundingClientRect().top - container.getBoundingClientRect().top;
            container.scrollTop += offset - 8;
          }
        }, 200);
      }
    }
  }, [tasks]);

  function handleMarkComplete() {
    if (!activeTask || completed.includes(activeTask)) return;

    const newCompleted = [...completed, activeTask];
    setCompleted(newCompleted);
    api.updateTask(activeTask, 'completed').catch(() => {
      setLoadError('Could not save task progress. Please check the backend and try again.');
    });

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

  function handleSelectTask(taskId: string) {
    if (activeTask === taskId) return;
    setActiveTask(taskId);
    setActiveDecayTask(null);

    if (charTaskId && charTaskId !== taskId) {
      const curEl = document.querySelector(`[data-task-id="${charTaskId}"]`) as HTMLElement | null;
      const nextEl = document.querySelector(`[data-task-id="${taskId}"]`) as HTMLElement | null;
      if (curEl && nextEl) {
        const d = nextEl.getBoundingClientRect().top - curEl.getBoundingClientRect().top;
        setCharFallDelta(d);
      }
      setCharFalling(true);
      if (fallTimerRef.current) clearTimeout(fallTimerRef.current);
      fallTimerRef.current = setTimeout(() => {
        setCharFalling(false);
        setCharTaskId(taskId);
      }, 550);
    } else if (!charTaskId) {
      setCharTaskId(taskId);
    }
  }

  function handleSelectDecayTask(decayTaskId: string) {
    if (activeDecayTask?.id === decayTaskId) return;
    setActiveTask(null);
    
    const decayTask = filteredDecayTasks.find(t => t.id === decayTaskId);
    if (!decayTask) return;
    setActiveDecayTask(decayTask);

    // Slide character to this decay task
    if (charTaskId) {
      const curEl = document.querySelector(`[data-task-id="${charTaskId}"]`) as HTMLElement | null;
      const nextEl = document.querySelector(`[data-decay-task-id="${decayTaskId}"]`) as HTMLElement | null;
      if (curEl && nextEl) {
        const d = nextEl.getBoundingClientRect().top - curEl.getBoundingClientRect().top;
        setCharFallDelta(d);
      }
      setCharFalling(true);
      if (fallTimerRef.current) clearTimeout(fallTimerRef.current);
      fallTimerRef.current = setTimeout(() => {
        setCharFalling(false);
        setCharTaskId(decayTaskId);
      }, 550);
    } else if (!charTaskId) {
      setCharTaskId(decayTaskId);
    }
  }

  function handleMarkIncomplete() {
    if (!activeTask || !completed.includes(activeTask)) return;
    setCompleted(prev => prev.filter(id => id !== activeTask));
    api.updateTask(activeTask, 'in_progress').catch(() => {
      setLoadError('Could not save task progress. Please check the backend and try again.');
    });
    if (!charTaskId) setCharTaskId(activeTask);
  }

  function handleMoreTasks() {
    api.advanceTasks()
      .then(() => loadTasks())
      .catch(() => setLoadError('Could not load more tasks. Please check the backend and try again.'));
  }

  const completionPct = tasks.length > 0
    ? Math.round((completed.length / tasks.length) * 100)
    : 0;

  useEffect(() => {
    if (tasks.length > 0) setStoredTaskProgress(completionPct);
  }, [completionPct, tasks.length]);

  const isDone = activeTaskObj ? completed.includes(activeTaskObj.id) : false;

  return (
    <div className="min-h-screen bg-linear-to-b from-[#7EC8E3] to-[#E1FAFF]" style={{ fontFamily: "'Press Start 2P', monospace", imageRendering: 'pixelated' }}>
      <DieCharacter taskId={charTaskId} falling={charFalling} fallDelta={charFallDelta} />
      <Navbar />

      <div className="w-[95%] max-w-6xl mx-auto pt-[104px] pb-8 flex gap-8 h-screen">
        {loadError && (
          <div className="fixed left-1/2 top-24 z-50 -translate-x-1/2 border-4 border-[#334155] bg-white px-4 py-3 text-center text-xs text-[#334155] shadow-lg">
            <p>{loadError}</p>
            <button className="mt-2 text-[#04A0FF]" onClick={loadTasks}>Retry</button>
          </div>
        )}

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
            <div id="task-scroll" className="flex flex-col gap-2 flex-1 overflow-y-auto" style={{ overscrollBehavior: 'none' }}>

              {/* Decay review tasks */}
              {filteredDecayTasks.map((entry) => {
                const style = DECAY_STYLE[entry.decay_level] ?? DECAY_STYLE.decaying;
                const isSelected = activeDecayTask?.id === entry.id;
                return (
                  <div
                    key={`decay-${entry.id}`}
                    data-decay-task-id={entry.id}
                    onClick={() => handleSelectDecayTask(entry.id)}
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

              {tasks.map((task) => {
                const isActive = activeTask === task.id;
                const isDoneItem = completed.includes(task.id);
                const isLearning = task.type === 'Learning';

                return (
                  <div
                    key={task.id}
                    data-task-id={task.id}
                    onClick={() => handleSelectTask(task.id)}
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

            {/* Progress bar */}
            <div className="pt-4 mt-4" style={{ borderTopWidth: 3, borderTopStyle: 'solid', borderTopColor: '#334155' }}>
              <TaskProgress value={completionPct} />
            </div>

          </PixelPanel>
        </div>

        {/* ── Right Panel ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <PixelPanel className="flex-1 bg-white p-10 flex flex-col h-full overflow-y-auto">

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

            : allDone ? (
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
                <div className="mt-8 flex items-center gap-4">
                  {!isDone ? (
                    <button
                      onClick={handleMarkComplete}
                      className="active:translate-y-0.5 transition-all duration-100"
                      style={{
                        fontFamily: "'Press Start 2P', monospace",
                        imageRendering: 'pixelated',
                        backgroundColor: '#334155',
                        color: '#F9EC72',
                        borderWidth: 4,
                        borderStyle: 'solid',
                        borderTopColor: '#4a5f7a',
                        borderLeftColor: '#4a5f7a',
                        borderRightColor: '#1e2d3d',
                        borderBottomColor: '#1e2d3d',
                        padding: '8px 14px',
                        fontSize: '10px',
                      }}
                    >
                      Mark Complete
                    </button>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <PixelCheckIcon size={20} color="#84BC2F" />
                        <span className="text-base uppercase tracking-widest text-[#84BC2F]" style={{ fontWeight: 400 }}>Complete</span>
                      </div>
                      <PixelButton variant="ghost" size="sm" onClick={handleMarkIncomplete}>
                        <span className="text-xs">Undo</span>
                      </PixelButton>
                    </>
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
