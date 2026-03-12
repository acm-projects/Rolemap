'use client';

import React from 'react';
import { 
  ReactFlow,
  Background,
  BackgroundVariant, 
  useNodesState,
  useEdgesState,
  MiniMap,
  Controls
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { RoadmapNode } from '@/app/components/RoadmapNode';
import { Navbar } from '../components/NavBar';

const nodeTypes = {
  roadmap: RoadmapNode, 
};

const initialNodes = [
  { id: '1', type: 'roadmap', data: { label: 'HTML & CSS Basics',        progress: 100, locked: false }, position: { x: 0,   y: 150 } },
  { id: '2', type: 'roadmap', data: { label: 'JavaScript Fundamentals',  progress: 100, locked: false }, position: { x: 320, y: 150 } },
  { id: '3', type: 'roadmap', data: { label: 'Advanced CSS',             progress: 30,  locked: false }, position: { x: 640, y: 0   } },
  { id: '4', type: 'roadmap', data: { label: 'React & Frameworks',       progress: 0,   locked: true  }, position: { x: 640, y: 300 } },
  { id: '5', type: 'roadmap', data: { label: 'API Integration & Data',   progress: 0,   locked: true  }, position: { x: 960, y: 150 } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', style: { stroke: '#4a7c7c', strokeWidth: 1.5, strokeDasharray: '6 4' }, type: 'bezier' },
  { id: 'e2-3', source: '2', target: '3', style: { stroke: '#4a7c7c', strokeWidth: 1.5, strokeDasharray: '6 4' }, type: 'bezier' },
  { id: 'e2-4', source: '2', target: '4', style: { stroke: '#c8d0dc', strokeWidth: 1.5, strokeDasharray: '6 4' }, type: 'bezier' },
  { id: 'e3-5', source: '3', target: '5', style: { stroke: '#c8d0dc', strokeWidth: 1.5, strokeDasharray: '6 4' }, type: 'bezier' },
  { id: 'e4-5', source: '4', target: '5', style: { stroke: '#c8d0dc', strokeWidth: 1.5, strokeDasharray: '6 4' }, type: 'bezier' },
];

export default function RoadmapPage() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  return (
    <div className="h-screen w-screen bg-[#eef1f7] relative reactflow-wrapper">
      
      <Navbar />

      
      
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
      >
        <Background 
          variant={BackgroundVariant.Dots}
          color="#d1d5db" 
          gap={24}
          size={1.5}
          style={{ opacity: 0.8 }}
        />

        {/* MiniMap — bottom-left, styled to match the legend card */}
        <MiniMap 
          position="bottom-left"
          nodeColor={(n) => {
            if (n.data?.locked) return '#d4d4d8';
            return '#1a1a1a';
          }}
          maskColor="rgba(240, 240, 240, 0.6)"
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            width: 150,
            height: 100,
            marginLeft: 'calc(max(50vw - 576px, 2.5vw))',
            marginBottom: '16px',
          }}
        />

        {/* Controls — bottom-right, circular white buttons */}
        <Controls 
          position="bottom-right"
          showInteractive={false}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            background: 'transparent',
            border: 'none',
            boxShadow: 'none',
            marginBottom: '12px',
            marginRight: '12px',
          }}
          className="[&>button]:w-9 [&>button]:h-9 [&>button]:rounded-full [&>button]:bg-white 
                     [&>button]:border [&>button]:border-slate-200 [&>button]:shadow-md
                     [&>button]:text-slate-500 [&>button]:hover:bg-slate-50
                     [&>button]:flex [&>button]:items-center [&>button]:justify-center"
        />
      </ReactFlow>
    </div>
  );
}