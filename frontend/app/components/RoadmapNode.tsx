'use client';

import { Handle, Position } from '@xyflow/react';

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

const ProjectIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-4 h-4">
    <path strokeLinecap="round" strokeLinejoin="round" d="M6.429 9.75 2.25 12l4.179 2.25m0-4.5 5.571 3 5.571-3m-11.142 0L2.25 7.5 12 2.25l9.75 5.25-4.179 2.25m0 0L21.75 12l-4.179 2.25m0 0 4.179 2.25L12 21.75 2.25 16.5l4.179-2.25m11.142 0-5.571 3-5.571-3" />
  </svg>
);

interface RoadmapNodeData {
  locked: boolean;
  progress: number;
  kind?: string;
  label: string;
}

export function RoadmapNode({ data, selected }: { data: RoadmapNodeData; selected?: boolean }) {
  const isLocked = data.locked;
  const isCompleted = data.progress === 100;
  const isActive = data.progress > 0 && data.progress < 100;
  const kind = data.kind || 'lesson';

  let shapeStyle: React.CSSProperties = {};
  
  if (kind === 'quiz') {
    shapeStyle = { borderRadius: '9999px' }; 
  } else if (kind === 'project') {
    shapeStyle = { 
      clipPath: 'polygon(10% 0%, 90% 0%, 100% 25%, 100% 75%, 90% 100%, 10% 100%, 0% 75%, 0% 25%)',
      borderRadius: '0px' 
    };
  } else {
    shapeStyle = { borderRadius: '1rem' }; 
  }

  return (
    <div 
      style={shapeStyle}
      className={`shadow-sm transition-all border-2 flex flex-col items-center justify-center relative
      ${kind === 'quiz' ? 'w-32 h-32' : 'px-5 py-4 w-56 min-h-25'}
      ${isActive ? 'bg-[#3d7a7a] text-white' : 
        isLocked ? 'bg-white/70 text-slate-400' : 
        'bg-white text-slate-700'}
      ${selected
        ? 'border-[#f7d22e] shadow-lg'
        : isActive ? 'border-[#2e6666]'
        : isLocked ? 'border-[#d0d7e3]'
        : 'border-[#d0d7e3]'
      }`}
    >
      <Handle type="target" position={Position.Left} className="opacity-0!" />

      {kind === 'quiz' ? (
        // Quiz nodes — circle with title only
        <span className="font-bold text-xs leading-tight uppercase tracking-tight text-center px-2">
          {data.label}
        </span>
      ) : (
        // All other nodes — full content
        <div className="flex flex-col gap-2 w-full">
          <div className="flex items-center gap-2">
            {isLocked ? (
              <LockIcon />
            ) : kind === 'project' ? (
              <ProjectIcon />
            ) : isCompleted ? (
              <CheckIcon />
            ) : (
              <ProgressIcon />
            )}
            <span className="font-bold text-sm leading-tight uppercase tracking-tight">
              {data.label}
            </span>
          </div>

          {!isLocked && (
            <div className="flex flex-col gap-1 w-full">
              <div className="w-full h-1.5 rounded-full bg-slate-200/40 overflow-hidden">
                <div
                  className={`h-full transition-all duration-500 ${isActive ? 'bg-white/80' : 'bg-[#3d7a7a]'}`}
                  style={{ width: `${data.progress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[10px] font-black">
                <span>{isActive ? `${data.progress}%` : ''}</span>
                <span className={isActive ? 'text-white/80' : 'text-slate-400'}>
                  {isActive ? 'IN PROGRESS' : `${data.progress}%`}
                </span>
              </div>
            </div>
          )}

          {isLocked && <span className="text-[10px] uppercase tracking-widest font-black opacity-60">Locked</span>}
        </div>
      )}

      <Handle type="source" position={Position.Right} className="opacity-0!" />
    </div>
  );
}