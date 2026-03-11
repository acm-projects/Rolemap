//custom node component for the roadmap graph, 
//which displays skill name, progress, and lock status. 
//It also defines connection points for the graph edges.
import { Handle, Position } from '@xyflow/react';

// SVG Icons as components
const CheckIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
  </svg>
);

const ProgressIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
  </svg>
);

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z" />
  </svg>
);

type RoadmapNodeData = {
  label: string;
  progress: number;  
  locked: boolean; 
};

//Custom node component 
export function RoadmapNode({ data }: { data: RoadmapNodeData }) {
  const isLocked = data.locked;
  const isCompleted = data.progress === 100;
  const isInProgress = data.progress > 0 && data.progress < 100;
  const isActive = isInProgress; // "active" = teal dark card

  return (
    <div className={`px-4 py-3 rounded-2xl w-56 shadow-sm transition-all border
      ${isActive
        ? 'bg-[#3d7a7a] border-[#2e6666] text-white'
        : isLocked
        ? 'bg-white/70 border-[#d0d7e3] text-slate-400'
        : 'bg-white border-[#d0d7e3] text-slate-700'
      }
    `}>
      <Handle type="target" position={Position.Left} className="opacity-0!" />

      <div className="flex flex-col gap-2">
        {/* Header row */}
        <div className="flex items-center gap-2">
          {isLocked
            ? <LockIcon />
            : isCompleted
            ? <CheckIcon />
            : <ProgressIcon />
          }
          <span className={`font-semibold text-sm ${isActive ? 'text-white' : ''}`}>
            {data.label}
          </span>
          {isActive && (
            <div className="ml-auto w-2 h-2 rounded-full bg-slate-300/60" />
          )}
        </div>

        {/* Progress bar */}
        {!isLocked && (
          <div className="flex flex-col gap-1">
            <div className="w-full h-1.5 rounded-full bg-slate-200/40 overflow-hidden">
              <div
                className={`h-full rounded-full ${isActive ? 'bg-white/80' : 'bg-[#3d7a7a]'}`}
                style={{ width: `${data.progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              {isActive
                ? <span className="text-[10px] text-white/70">Part 2 of 4</span>
                : <span className="text-[10px] text-slate-400"></span>
              }
              <span className={`text-[10px] font-bold ml-auto 
                ${isActive ? 'text-white/80' : 'text-slate-400'}`}>
                {isActive ? 'IN PROGRESS' : `${data.progress}%`}
              </span>
            </div>
          </div>
        )}

        {/* Locked label */}
        {isLocked && (
          <span className="text-[10px] text-slate-400 uppercase tracking-wide">Locked</span>
        )}
      </div>

      <Handle type="source" position={Position.Right} className="opacity-0!" />
    </div>
  );
}