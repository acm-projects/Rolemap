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
  //Stores whether node is locked
  const isLocked = data.locked;
  const isCompleted = data.progress === 100;
  const isInProgress = data.progress > 0 && data.progress < 100;

  return (
    /*If the node is locked, then it appears greyed out and progress bar is hidden*/
    <div className={`px-5 py-4 rounded-2xl border-2 w-64 shadow-sm transition-all
      ${isLocked 
        ? 'border-zinc-800 text-zinc-500 opacity-60' 
        : 'border-black bg-white/5 text-black backdrop-blur-sm'} 
    `}>   
      {/*Top-down roadmap approach. Top (incoming).
      Docking ports for connection lines. The opacity-0! class makes the handles invisible but still functional*/}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="opacity-0!" 
      />
      
      {/*Displays the node title (skill)*/}
      <div className="flex flex-col gap-2">
        <div className="flex justify-between items-center">
          <span className="font-bold text-sm tracking-tight">{data.label}</span>
          {isLocked && <div className="text-zinc-500"><LockIcon /></div>}
          {!isLocked && isInProgress && <div className="text-black"><ProgressIcon /></div>}
          {!isLocked && isCompleted && <div className="text-black"><CheckIcon /></div>}
        </div>

        {!isLocked && (
          <div className="flex items-end gap-1">
            <div className="flex gap-1">
              {[...Array(10)].map((_, i) => (
                <div 
                  key={i} 
                  className={`h-4 w-3 rounded-sm ${
                    i < Math.ceil(data.progress / 10) 
                        ? 'bg-[#508484]' 
                        : 'bg-white/30'}`} 
                />
              ))}
            </div>
            {/*Displays progress percentage*/}
            <span className="ml-auto text-[10px] font-bold text-black">
                {data.progress}%
            </span>
          </div>
        )}
      </div>

      {/*Top-down roadmap approach. Bottom (outgoing) from the bottom. The node can create outgoing connections*/}
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="opacity-0!" 
      />
    </div>
  );
}