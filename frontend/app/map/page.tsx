'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  useNodesState,
  useEdgesState,
  MiniMap,
  Controls,
  NodeMouseHandler,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';


import { RoadmapNode } from '@/app/components/RoadmapNode';
import { NodePanel, NodePanelData } from '@/app/components/ConceptNodePanel';
import { Navbar } from '../components/NavBar';

const nodeTypes = {
  roadmap: RoadmapNode,
};

const initialNodes = [
  { id: '1', type: 'roadmap', data: { label: 'HTML5 Foundations', progress: 100, locked: false, kind: 'lesson' }, position: { x: 0, y: 150 } },
  { id: '2', type: 'roadmap', data: { label: 'Advanced CSS & Grid', progress: 100, locked: false, kind: 'lesson' }, position: { x: 300, y: 150 } },
  { id: '3', type: 'roadmap', data: { label: 'Layouts Master Quiz', progress: 100, locked: false, kind: 'quiz' }, position: { x: 600, y: 150 } },
  { id: '4', type: 'roadmap', data: { label: 'JS Logic & Variables', progress: 100, locked: false, kind: 'lesson' }, position: { x: 900, y: 50 } },
  { id: '5', type: 'roadmap', data: { label: 'DOM & Events', progress: 100, locked: false, kind: 'lesson' }, position: { x: 900, y: 250 } },
  { id: '6', type: 'roadmap', data: { label: 'Interactive Site Project', progress: 30, locked: false, kind: 'project' }, position: { x: 1250, y: 150 } },
  { id: '7', type: 'roadmap', data: { label: 'Asynchronous JS', progress: 0, locked: true, kind: 'lesson' }, position: { x: 1550, y: 150 } },
  { id: '8', type: 'roadmap', data: { label: 'React Fundamentals', progress: 0, locked: true, kind: 'lesson' }, position: { x: 1850, y: 150 } },
];

const initialEdges = [
  { id: 'e1-2', source: '1', target: '2', type: 'bezier', animated: false, style: { stroke: '#4a7c7c', strokeWidth: 1.5, strokeDasharray: '6 4' } },
  { id: 'e2-3', source: '2', target: '3', type: 'bezier', animated: false, style: { stroke: '#4a7c7c', strokeWidth: 1.5, strokeDasharray: '6 4' } },
  { id: 'e3-4', source: '3', target: '4', type: 'bezier', animated: false, style: { stroke: '#4a7c7c', strokeWidth: 1.5, strokeDasharray: '6 4' } },
  { id: 'e3-5', source: '3', target: '5', type: 'bezier', animated: false, style: { stroke: '#4a7c7c', strokeWidth: 1.5, strokeDasharray: '6 4' } },
  { id: 'e4-6', source: '4', target: '6', type: 'bezier', animated: false, style: { stroke: '#4a7c7c', strokeWidth: 1.5, strokeDasharray: '6 4' } },
  { id: 'e5-6', source: '5', target: '6', type: 'bezier', animated: false, style: { stroke: '#4a7c7c', strokeWidth: 1.5, strokeDasharray: '6 4' } },
  { id: 'e6-7', source: '6', target: '7', type: 'bezier', animated: false, style: { stroke: '#c8d0dc', strokeWidth: 1.5, strokeDasharray: '6 4' } },
  { id: 'e7-8', source: '7', target: '8', type: 'bezier', animated: false, style: { stroke: '#c8d0dc', strokeWidth: 1.5, strokeDasharray: '6 4' } },
];

const nodePanelData: Record<string, NodePanelData> = {
  '1': { 
    label: 'HTML5 Foundations', 
    progress: 100, 
    locked: false, 
    description: "Establish a strong baseline for web development by mastering semantic HTML and fundamental CSS. This module covers the core principles of document structure, accessibility, and the foundational styling techniques needed to build clean, organized web pages.", 
    learningGoals: [
      "Author well-structured, accessible HTML5 markup", 
      "Apply the CSS Box Model to control spacing and alignment", 
      "Create fluid layouts that adapt to various screen sizes", 
      "Utilize Flexbox and Grid for modern interface design"
    ] 
  },
  '2': { 
    label: 'Advanced CSS & Grid', 
    progress: 100, 
    locked: false, 
    description: "Move beyond the basics to implement complex, high-performance user interfaces. You will explore sophisticated layout systems, modern CSS features like Subgrid and Container Queries, and best practices for managing scalable design systems.", 
    learningGoals: [
      "Develop smooth UI transitions and keyframe animations", 
      "Solve intricate alignment challenges using CSS Subgrid", 
      "Build truly modular components with Container Queries", 
      "Implement CSS variables to maintain consistent theme logic"
    ] 
  },
  '3': { 
    label: 'Layouts Master Quiz', 
    progress: 100, 
    locked: false, 
    kind: 'quiz', 
    description: "Validate your proficiency in modern layout techniques. This quiz presents real-world styling scenarios to test your ability to build, scale, and debug modern web interfaces.",
    learningGoals: [
      "Solve complex positioning and alignment challenges", 
      "Build components that respond to their environment", 
      "Debug sizing issues in high-fidelity designs", 
      "Master logic for style overrides and consistency"
    ] 
  },
  '4': { 
    label: 'JS Logic & Variables', 
    progress: 100, 
    locked: false, 
    description: "Learn the core programming concepts required to add functionality to the web. This module focuses on JavaScript syntax, data manipulation, and conditional logic, teaching you how to write efficient code that processes information effectively.", 
    learningGoals: [
      "Understand variable scope and lifecycle using let and const", 
      "Construct advanced logic using comparison and logical operators", 
      "Manipulate data sets using modern ES6+ array methods", 
      "Organize code into reusable, functional units"
    ] 
  },
  '5': { 
    label: 'DOM & Events', 
    progress: 100, 
    locked: false, 
    description: "Gain control over the browser environment by interacting directly with page elements. You will learn to detect user actions and programmatically update the page content, creating a seamless and interactive experience without requiring full page reloads.", 
    learningGoals: [
      "Target and modify page elements using the DOM API", 
      "Implement efficient event listeners and delegation patterns", 
      "Generate and inject dynamic content into the live document", 
      "Sync UI states by manipulating classes and data attributes"
    ] 
  },
  '6': { 
    label: 'Interactive Site Project', 
    progress: 30, 
    locked: false, 
    description: "Apply your cumulative knowledge of HTML, CSS, and JavaScript to develop a comprehensive web application. Working from a professional design specification, you will build a functional project that demonstrates your ability to handle complex state and user interactions.", 
    learningGoals: [
      "Structure a multi-part application with clean architecture", 
      "Manage application state and persistent user data", 
      "Resolve cross-browser styling and functional discrepancies", 
      "Finalize and host a production-ready web application"
    ] 
  },
  '7': { 
    label: 'Asynchronous JS', 
    progress: 0, 
    locked: true, 
    description: "Master the techniques required to handle operations that take time to complete, such as fetching data from external APIs or interacting with databases. This module covers the evolution of asynchronous patterns in JavaScript, ensuring you can manage complex data flows without blocking the main execution thread.", 
    learningGoals: [
      "Manage asynchronous operations using Promises and callbacks", 
      "Implement clean, readable code with Async/Await syntax", 
      "Execute HTTP requests to retrieve and submit data to APIs", 
      "Handle errors and edge cases in networked environments"
    ] 
  },
  '8': { 
    label: 'React Fundamentals', 
    progress: 0, 
    locked: true, 
    description: "Transition from imperative DOM manipulation to a declarative, component-based architecture. You will learn the core concepts of the React library, focusing on how to build modular user interfaces that efficiently update in response to changing data and user input.", 
    learningGoals: [
      "Develop reusable UI components using JSX syntax", 
      "Manage local component state and application properties (props)", 
      "Utilize React Hooks for side effects and state management", 
      "Understand the component lifecycle and reconciliation process"
    ] 
  },
};

function RoadmapContent() {
  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);
  const [activePanel, setActivePanel] = useState<NodePanelData | null>(null);
  const { setCenter, fitView } = useReactFlow();


  useEffect(() => {
    const activeNode = nodes.find(n => !n.data.locked && n.data.progress < 100);

    if (activeNode) {
      const timer = setTimeout(() => {
        setCenter(activeNode.position.x, activeNode.position.y + 50, { 
          zoom: 1.2, 
          duration: 1000 
        });
      }, 100);
      return () => clearTimeout(timer);
    } else {
      fitView({ duration: 1000 });
    }
  }, []); 

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    const data = node.data as { label: string; progress: number; locked: boolean; kind?: string };
    if (data.locked) return;

    const panel = nodePanelData[node.id];
    if (panel) {
      setActivePanel(panel);
      setCenter(node.position.x + 300, node.position.y + 50, { zoom: 1.1, duration: 800 });
    }
  }, [setCenter]);

  return (
    <div className="h-screen w-screen relative bg-[#eef1f7]">
      <Navbar />
      <div style={{ position: 'absolute', top: 72, left: 0, right: 0, bottom: 0 }}>
        <ReactFlow 
          nodes={nodes} 
          edges={edges} 
          onNodesChange={onNodesChange} 
          onEdgesChange={onEdgesChange} 
          nodeTypes={nodeTypes} 
          onNodeClick={handleNodeClick}
        >
          <Background variant={BackgroundVariant.Dots} color="#d1d5db" gap={24} size={1.5} />
          <MiniMap position="bottom-left" style={{ width: 150, height: 100 }} />
          <Controls position="bottom-right" />
        </ReactFlow>
      </div>
      {activePanel && <NodePanel data={activePanel} onClose={() => setActivePanel(null)} />}
    </div>
  );
}

export default function RoadmapPage() {
  return (
    <ReactFlowProvider>
      <RoadmapContent />
    </ReactFlowProvider>
  );
}