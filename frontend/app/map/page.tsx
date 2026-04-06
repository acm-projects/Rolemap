'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import { Navbar } from '@/app/components/NavBar';
import { api, type Checkpoint, type RoadmapEdge } from '@/lib/api';
import { applyDagreLayout } from '@/lib/layout';

const nodeTypes = { roadmap: RoadmapNode };

function toFlowNodes(checkpoints: Checkpoint[]) {
  const currentCP = checkpoints.find(cp => !cp.locked && cp.progress < 100);
  return checkpoints.map(cp => ({
    id: cp.id,
    type: 'roadmap' as const,
    data: { label: cp.label, progress: cp.progress, locked: cp.locked, kind: cp.kind, isCurrent: cp === currentCP },
    position: cp.position,
  }));
}

function toFlowEdges(edges: RoadmapEdge[], checkpoints: Checkpoint[]) {
  return edges.map(e => {
    const sourceCP = checkpoints.find(cp => cp.id === e.source);
    const unlocked = sourceCP && !sourceCP.locked;
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      type: 'smoothstep' as const,
      animated: false,
      style: {
        stroke: unlocked ? '#4a7c7c' : '#c8d0dc',
        strokeWidth: 1.5,
        strokeDasharray: '6 4',
      },
    };
  });
}

function RoadmapContent() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [activePanel, setActivePanel] = useState<NodePanelData | null>(null);
  const [activePanelPos, setActivePanelPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingCenter, setPendingCenter] = useState<{ x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const { setCenter, fitView } = useReactFlow();

  useEffect(() => {
    api.roadmapMap('rm-generated')
      .then(data => {
        setCheckpoints(data.checkpoints);

        const flowNodes = toFlowNodes(data.checkpoints);
        const flowEdges = toFlowEdges(data.edges, data.checkpoints);
        const laidOutNodes = applyDagreLayout(flowNodes, flowEdges);

        setNodes(laidOutNodes);
        setEdges(flowEdges);

        // Auto-center on first in-progress node using dagre-computed position
        const activeCP = data.checkpoints.find(cp => !cp.locked && cp.progress < 100);
        if (activeCP) {
          const laidOutNode = laidOutNodes.find(n => n.id === activeCP.id);
          const pos = laidOutNode?.position ?? activeCP.position;
          setTimeout(() => {
            setCenter(pos.x + 128, pos.y + 70, { zoom: 1.2, duration: 1000 });
          }, 200);
        } else {
          setTimeout(() => fitView({ duration: 1000 }), 200);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pendingCenter) return;
    const timer = setTimeout(() => {
      setCenter(pendingCenter.x, pendingCenter.y, { zoom: 1.1, duration: 800 });
      setPendingCenter(null);
    }, 50);
    return () => clearTimeout(timer);
  }, [pendingCenter, setCenter]);

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    const data = node.data as { label: string; progress: number; locked: boolean; kind?: string };

    setPendingCenter({ x: node.position.x + 300, y: node.position.y + 85 });
    setActivePanelPos({ x: node.position.x + 300, y: node.position.y + 85 });

    if (!data.locked && data.kind === 'quiz') {
      router.push(`/quiz?checkpoint=${node.id}&label=${encodeURIComponent(data.label)}`);
      return;
    }

    const cp = checkpoints.find(c => c.id === node.id);
    if (cp) {
      setActivePanel({
        label: cp.label,
        progress: cp.progress,
        locked: cp.locked,
        kind: cp.kind,
        description: cp.description,
        learningGoals: cp.learning_goals,
        subtopicCompletion: cp.subtopic_completion ?? [],
      });
    }
  }, [checkpoints, router]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#eef1f7] flex items-center justify-center">
        <Navbar />
        <p className="text-slate-400">Loading roadmap...</p>
      </div>
    );
  }

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
      {activePanel && (
        <NodePanel
          data={activePanel}
          onClose={() => {
            setActivePanel(null);
            if (activePanelPos) {
              setCenter(activePanelPos.x, activePanelPos.y, { zoom: 0.5, duration: 800 });
            }
          }}
        />
      )}
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
