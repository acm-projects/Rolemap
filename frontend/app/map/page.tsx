'use client';

import QuizConfetti from '../../components/ui/quiz-confetti';
import React, { useState, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  ReactFlow,
  useNodesState,
  useEdgesState,
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
import { useCharacter } from '@/app/context/CharacterContext';

const nodeTypes = { roadmap: RoadmapNode };

function BackgroundGif() {
  return (
    <img
      aria-hidden="true"
      src="/assets/background.gif"
      alt=""
      className="fixed inset-0 z-0 pointer-events-none w-full h-full"
      style={{ objectFit: 'fill' }}
    />
  );
}

function toFlowNodes(checkpoints: Checkpoint[], decayMap: Record<string, number> = {}) {
  const currentCP = checkpoints.find(cp => !cp.locked && cp.progress < 100);
  return checkpoints.map(cp => ({
    id: cp.id,
    type: 'roadmap' as const,
    data: {
      label: cp.label,
      progress: cp.progress,
      locked: cp.locked,
      kind: cp.kind,
      isCurrent: cp === currentCP,
      decayHealth: decayMap[cp.id],
    },
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
      type: 'step' as const,
      animated: false,
      style: {
        stroke: unlocked ? '#548080' : '#c8d0dc',
        strokeWidth: 7,
        strokeDasharray: '8 14',
        strokeLinecap: 'square' as const,
        animation: unlocked ? 'stones-fwd 2.4s linear infinite' : 'none',
      },
    };
  });
}

function RoadmapContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const roadmapParam = searchParams.get('roadmap');
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [nodes, setNodes, onNodesChange] = useNodesState<any>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [edges, setEdges, onEdgesChange] = useEdgesState<any>([]);
  const [checkpoints, setCheckpoints] = useState<Checkpoint[]>([]);
  const [activePanel, setActivePanel] = useState<NodePanelData | null>(null);
  const [activePanelPos, setActivePanelPos] = useState<{ x: number; y: number } | null>(null);
  const [pendingCenter, setPendingCenter] = useState<{ x: number; y: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // State for confetti celebration effect
  const [showConfetti, setShowConfetti] = useState(false);
  const [jumpingNodeLabel, setJumpingNodeLabel] = useState<string | null>(null);

  const { setCenter, fitView } = useReactFlow();
  const { notifyMapReady } = useCharacter();

  useEffect(() => {
    let mapData: Awaited<ReturnType<typeof api.roadmapMap>>;
    api.dashboard()
      .then(d => api.roadmapMap(d.active_roadmap.id))
      .then(data => {
        mapData = data;
        return api.skillDecay();
      })
      .then(decayRows => {
        const data = mapData;
        const decayMap: Record<string, number> = {};
        for (const row of decayRows) decayMap[row.id] = row.health;

        setCheckpoints(data.checkpoints);

        const flowNodes = toFlowNodes(data.checkpoints, decayMap);
        const flowEdges = toFlowEdges(data.edges, data.checkpoints);
        const laidOutNodes = applyDagreLayout(flowNodes, flowEdges);

        setNodes(laidOutNodes);
        setEdges(flowEdges);

        // Auto-center on first in-progress node using dagre-computed position
        const activeCP = data.checkpoints.find(cp => !cp.locked && cp.progress < 100);
        if (activeCP) {
          const laidOutNode = laidOutNodes.find(n => n.id === activeCP.id);
          const pos = laidOutNode?.position ?? activeCP.position;
          // Start camera animation
          setTimeout(() => {
            setCenter(pos.x + 128, pos.y + 80, { zoom: 1.5, duration: 1000 });
          }, 200);
          // After camera settles + 600ms beat, trigger CharacterMascot fall-in
          setTimeout(() => {
            notifyMapReady();
          }, 1800);
        } else {
          setTimeout(() => fitView({ duration: 1000 }), 200);
        }
      })
      .catch(err => {
        console.error(err);
        setLoadError('Failed to load roadmap. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [roadmapParam]);  // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pendingCenter) return;
    const timer = setTimeout(() => {
      setCenter(pendingCenter.x, pendingCenter.y, { zoom: 1.5, duration: 800 });
      setPendingCenter(null);
    }, 50);
    return () => clearTimeout(timer);
  }, [pendingCenter, setCenter]);

  const triggerMascotJump = useCallback((nodeId: string) => {
    setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isMascotJumping: true } } : n));
    setTimeout(() => {
      setNodes(ns => ns.map(n => n.id === nodeId ? { ...n, data: { ...n.data, isMascotJumping: false } } : n));
    }, 1200);
  }, [setNodes]);

  const handleNodeClick: NodeMouseHandler = useCallback((_event, node) => {
    const data = node.data as { label: string; progress: number; locked: boolean; kind?: string; isCurrent?: boolean };

    setPendingCenter({ x: node.position.x + 300, y: node.position.y + 85 });
    setActivePanelPos({ x: node.position.x + 300, y: node.position.y + 85 });

    if (data.isCurrent) {
      triggerMascotJump(node.id);

      // Trigger confetti on the current active node
      setJumpingNodeLabel(data.label);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }

    if (!data.locked && data.kind === 'quiz') {
      router.push(`/quiz?checkpoint=${node.id}&label=${encodeURIComponent(data.label)}`);
      return;
    }

    const cp = checkpoints.find(c => c.id === node.id);
    if (cp) {
      setActivePanel({
        id: cp.id,
        label: cp.label,
        progress: cp.progress,
        locked: cp.locked,
        kind: cp.kind,
        description: cp.description,
        learningGoals: cp.learning_goals,
        subtopicCompletion: cp.subtopic_completion ?? [],
      });
    }
  }, [checkpoints, router, triggerMascotJump]);

  if (loading) {
    return (
      <div className="h-screen w-screen bg-[#eef1f7] flex items-center justify-center">
        <Navbar />
        <p className="text-slate-400">Loading roadmap...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-screen w-screen bg-[#eef1f7] flex items-center justify-center">
        <Navbar />
        <p className="text-red-400">{loadError}</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen relative overflow-hidden">
      <Navbar />
      <BackgroundGif />
      {/* z-index 5: above ground (z-3) and clouds (z-1/2), below navbar (z-10) */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 5 }}>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          onNodeClick={handleNodeClick}
          className="map-flow"
          style={{ background: 'transparent' }}
        >
          <Controls position="bottom-right" />
        </ReactFlow>
      </div>
      {/* z-index 20: above ReactFlow and navbar */}
      {activePanel && (
        <div style={{ position: 'relative', zIndex: 20 }}>
          <NodePanel
            data={activePanel}
            onStart={() => triggerMascotJump(activePanel.id)}
            onClose={() => {
              setActivePanel(null);
              if (activePanelPos) {
                setCenter(activePanelPos.x, activePanelPos.y, { zoom: 1.5, duration: 800 });
              }
            }}
          />
        </div>
      )}

      {/* Confetti — above everything */}
      {showConfetti && (
        <QuizConfetti
          key={jumpingNodeLabel}
          x={jumpingNodeLabel ? nodes.find(n => n.data.label === jumpingNodeLabel)?.position?.x : 0}
          y={jumpingNodeLabel ? nodes.find(n => n.data.label === jumpingNodeLabel)?.position?.y : 0}
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
