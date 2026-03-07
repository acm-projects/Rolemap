//Client component needed for interactivity and hooks.
'use client';

import React from 'react';
import Link from 'next/link';
// Importing core components and hooks from the XYFlow (React Flow) library
import { 
  ReactFlow, 
  Background,
  BackgroundVariant, 
  useNodesState, 
  useEdgesState,
  MiniMap 
} from '@xyflow/react';
//Required default CSS for React Flow to render nodes and edges correctly
import '@xyflow/react/dist/style.css';

//Importing your custom node design created in the other file
import { RoadmapNode } from '@/app/components/RoadmapNode';

//Nav Bar component with links to different sections of the app. 
export function Navbar() {
  return (
    //Floating container for the navbar, centered at the top of the screen with some padding and a semi-transparent background
    <nav className="absolute top-6 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-5xl">
      {/*Glassmorphic styled navbar with rounded corners, border, and shadow. Contains navigation links.*/}
      <div className="bg-[#dcf2ff]/80 backdrop-blur-md border border-white/40 h-12 rounded-xl flex items-center justify-around px-8 shadow-sm">
        {['Dashboard', 'Map', 'Social', 'Daily'].map((item) => (
          <Link 
            key={item} 
            href={`/${item.toLowerCase()}`} 
            className="text-[#0a1f27] font-bold text-sm hover:opacity-70 transition-opacity cursor-pointer"
          >
            {item}
          </Link>
        ))}
      </div>
    </nav>
  );
}


const nodeTypes = {
  roadmap: RoadmapNode, 
};

//Initial data (learning skills)
const initialNodes = [
  { id: '1', type: 'roadmap', data: { label: 'HTML & CSS Basics', progress: 100, locked: false}, position: { x: 250, y: 0 } },
  { id: '2', type: 'roadmap', data: { label: 'JavaScript Fundamentals', progress: 100, locked: false}, position: { x: 250, y: 150 } },
  { id: '3', type: 'roadmap', data: { label: 'Advanced CSS', progress: 30, locked: false}, position: { x: 500, y: 300 } },
  { id: '4', type: 'roadmap', data: { label: 'React & Frameworks', progress: 0, locked: true}, position: { x: 0, y: 300 } },
  { id: '5', type: 'roadmap', data: { label: 'API Integration & Data', progress: 0, locked: true}, position: { x: 250, y: 450 } },
];
 
//How nodes are connected.
const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', style: { stroke: '#00adef', strokeWidth: 3 } },
  { id: 'e2-3', source: '2', target: '3', style: { stroke: '#00adef', strokeWidth: 3 } },
  { id: 'e2-4', source: '2', target: '4', style: { stroke: '#cbd5e1', strokeWidth: 2 } },
  { id: 'e3-5', source: '3', target: '5', style: { stroke: '#cbd5e1', strokeWidth: 2 } },
  { id: 'e4-5', source: '4', target: '5', style: { stroke: '#cbd5e1', strokeWidth: 2 } },
];

export default function RoadmapPage() {
  //reactive state for nodes and edges
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="h-screen w-screen bg-white dark:bg-black relative">
      
      <Navbar />
      
      <ReactFlow
        nodes={nodes} //Pass the nodes state
        edges={edges} //Pass the edges state
        onNodesChange={onNodesChange} //Enable dragging nodes
        onEdgesChange={onEdgesChange} //Enable edge updates
        nodeTypes={nodeTypes} //Tell it to use RoadmapNode for 'roadmap' types
        fitView //Centers the roadmap on the screen automatically
      >
          {/*Background grid. Light gray lines with some opacity.*/}
        <Background 
          variant={BackgroundVariant.Lines}
          color="#C1B0B0" 
          gap={40} 
          style={{ opacity: 0.4}}
        />

        {/* Roadmap preview */}
        <MiniMap 
          position="bottom-left"
          nodeColor={(n) => {
          if (n.data?.locked) return '#d4d4d8'; //Gray
            return '#C8EAFB'; //Blue
          }}
          
          //The color of the "view" rectangle in the minimap
          maskColor="rgba(240, 240, 240, 0.6)"
          style={{
            backgroundColor: '#f4f4f5',
            borderRadius: '16px',
            border: '2px solid #d4d4d8',
            width: 150,
            height: 100
          }}
        />
      </ReactFlow>
    </div>
  );
}