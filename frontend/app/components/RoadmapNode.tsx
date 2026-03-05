//custom node component for the roadmap graph, 
//which displays skill name, progress, and lock status. 
//It also defines connection points for the graph edges.
import { Handle, Position } from '@xyflow/react';
import { Lock } from 'lucide-react';

type RoadmapNodeData = {
  label: string;
  progress: number;  
  locked: boolean; 
};

//Custom node component 
export function RoadmapNode({ data }: { data: RoadmapNodeData }) {
  //Stores whether node is locked
    const isLocked = data.locked;

  return (
    /*If the node is locked, then it appeared greyed out and progress bar is hidden*/
    <div className={`px-5 py-4 rounded-2xl border-2 w-64 shadow-sm transition-all
      ${isLocked 
        /*If locked -> gray background + faded text*/
        ? 'bg-zinc-200 border-zinc-300 text-zinc-400' 
        /*If unlocked -> blue theme*/
        : 'bg-node-blue border-node-border text-slate-900'} 
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
          {isLocked && <Lock size={14} className="text-zinc-600" />}
        </div>

        {!isLocked && (
          <div className="flex items-end gap-1">
            <div className="flex gap-1">
              {[...Array(10)].map((_, i) => (
                <div 
                  key={i} 
                  className={`h-4 w-3  ${
                    i < (data.progress / 10) 
                        ? 'bg-[#1a5f7a]' 
                        : 'bg-white'}`} 
                />
              ))}
            </div>
            {/*Displays progress percentage*/}
            <span className="ml-auto text-[10px] font-bold text-[#1a5f7a]">
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