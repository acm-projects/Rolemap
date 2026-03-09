//Client component needed for interactivity and hooks.
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
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

// SVG Profile Icon Component
const ProfileIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-6 h-6">
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.982 18.725A7.488 7.488 0 0 0 12 15.75a7.488 7.488 0 0 0-5.982 2.975m11.963 0a9 9 0 1 0-11.963 0m11.963 0A8.966 8.966 0 0 1 12 21a8.966 8.966 0 0 1-5.982-2.275M15 9.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
  </svg>
);

//Nav Bar component with links to different sections of the app. 
export function Navbar() {
  const pathname = usePathname();

  const navItems = ['Dashboard', 'Map', 'Daily', 'Social'];

  return (
    //Floating container for the navbar, centered at the top of the screen with some padding and a semi-transparent background
    <nav className="absolute top-5 left-1/2 -translate-x-1/2 z-10 w-[90%] max-w-5xl">
      {/*Glassmorphic styled navbar with rounded corners, border, and shadow. Contains navigation links.*/}
      <div className="bg-[#508484]/90 backdrop-blur-md border border-white/40 h-12 rounded-2xl flex items-center justify-start px-6 shadow-sm gap-4">
        
        {/* Navigation Items */}
        <div className="flex items-center gap-6">
          {navItems.map((item) => {
            const isActive = pathname === `/${item.toLowerCase()}`;
            return (
              <Link 
                key={item} 
                href={`/${item.toLowerCase()}`} 
                className={`relative font-bold text-sm transition-opacity cursor-pointer group
                  ${isActive 
                    ? 'text-[white] opacity-100' 
                    : 'text-[white] hover:opacity-70'
                  }
                `}
              >
                {item}
                {/* Active page underline indicator */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[white] rounded-full transition-all duration-300"></span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Separator */}
        <div className="ml-auto h-6 w-px bg-white/30"></div>

        {/* Profile Icon */}
        <button 
          className="ml-2 p-1 rounded-full bg-white hover:shadow-md hover:scale-105 transition-all duration-200 flex items-center justify-center text-[#508484]"
          aria-label="Profile"
        >
          <ProfileIcon />
        </button>
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
//old blue -> #00adef
//dark teal -> #508484

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', style: { stroke: 'black', strokeWidth: 3 } },
  { id: 'e2-3', source: '2', target: '3', style: { stroke: 'black', strokeWidth: 3 } },
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
          color="#d1d5db" 
          gap={30} 
          style={{ opacity: 0.3}}
        />

        {/* Roadmap preview */}
        <MiniMap 
          position="bottom-left"
          nodeColor={(n) => {
          if (n.data?.locked) return '#d4d4d8'; //Gray
            return '#1a1a1a'; //Black
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