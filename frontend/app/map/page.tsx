'use client';

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

const nodeTypes = { roadmap: RoadmapNode };

// Confirmed asset dimensions (read from file headers):
//   sky.png         256×240  → 2× = 512×480
//   clouds-back.png 256×240  → 2× = 512×480
//   clouds-front.png 256×240 → 2× = 512×480
//   ground.png      898×106  → 2× = 1796×212
const PIXEL: React.CSSProperties = { imageRendering: 'pixelated' };

function ParallaxLayers() {
  return (
    <>
      {/* Sky — stretched to full viewport height, tiles only horizontally — no vertical seam */}
      <div
        aria-hidden="true"
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          ...PIXEL,
          backgroundImage: "url('/assets/sky.png')",
          backgroundSize: '512px 100vh',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'top left',
        }}
      />
      {/* Back clouds — fade bottom edge into sky with mask gradient */}
      <div
        aria-hidden="true"
        className="fixed top-0 z-1 pointer-events-none"
        style={{
          ...PIXEL,
          width: '200%',
          height: '67vh',
          backgroundImage: "url('/assets/clouds-back.png')",
          backgroundSize: '512px 67vh',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'top left',
          opacity: 0.85,
          animation: 'driftClouds 120s linear infinite',
          WebkitMaskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)',
        }}
      />
      {/* Front clouds — anchored above grass line, fades into sky */}
      <div
        aria-hidden="true"
        className="fixed z-2 pointer-events-none"
        style={{
          ...PIXEL,
          bottom: '18vh',
          width: '200%',
          height: '67vh',
          backgroundImage: "url('/assets/clouds-front.png')",
          backgroundSize: '512px 67vh',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'top left',
          animation: 'driftClouds 60s linear infinite',
          WebkitMaskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 55%, transparent 100%)',
        }}
      />
      {/* Ground — 33vh, fills bottom third of screen; z-[6] sits above ReactFlow canvas (z:5) to cover edge artifacts */}
      <div
        aria-hidden="true"
        className="fixed bottom-0 pointer-events-none"
        style={{
          ...PIXEL,
          zIndex: 6,
          left: '-2px',
          width: 'calc(100% + 4px)',
          height: '33vh',
          backgroundImage: "url('/assets/ground.png')",
          backgroundSize: '1796px 33vh',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'top left',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 8%)',
          maskImage: 'linear-gradient(to bottom, transparent 0%, black 8%)',
        }}
      />
    </>
  );
}

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
      type: 'step' as const,
      animated: false,
      style: {
        stroke: unlocked ? '#548080' : '#c8d0dc',
        strokeWidth: 7,
        strokeDasharray: '8 14',
        strokeLinecap: 'square',
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
  const { setCenter, fitView } = useReactFlow();

  useEffect(() => {
    const load = roadmapParam
      ? api.roadmapMap(roadmapParam)
      : api.dashboard().then(d => api.roadmapMap(d.active_roadmap.id));

    load.then(data => {
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
            setCenter(pos.x + 128, pos.y + 70, { zoom: 1.5, duration: 1000 });
          }, 200);
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
      <ParallaxLayers />
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
            onClose={() => {
              setActivePanel(null);
              if (activePanelPos) {
                setCenter(activePanelPos.x, activePanelPos.y, { zoom: 1.5, duration: 800 });
              }
            }}
          />
        </div>
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
