'use client';

import QuizConfetti from '../../components/ui/quiz-confetti';
import React, { useState, useCallback, useEffect, useRef } from 'react';
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
import { CharacterPreview } from '@/app/components/CharacterPreview';

interface SavedChar {
  skin: string; eyes: string; clothes: string;
  pants: string; shoes: string; hair: string; accessories: string;
}

interface JumpPath {
  from: { x: number; y: number };
  to: { x: number; y: number };
}

const nodeTypes = { roadmap: RoadmapNode };

// ─── Confirmed asset dimensions (read from file headers):
//   sky.png          256×240  → 2× = 512×480
//   clouds-back.png  256×240  → 2× = 512×480
//   clouds-front.png 256×240  → 2× = 512×480
//   ground.png       898×106  → 2× = 1796×212
const PIXEL: React.CSSProperties = { imageRendering: 'pixelated' };

// ─── Parallax Background ──────────────────────────────────────────────────────
function ParallaxLayers() {
  return (
    <>
      {/* Sky — stretched to full viewport height, tiles only horizontally */}
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
      {/* Back clouds — fills exactly the sky area above the ground (100vh - 20vh = 80vh) */}
      <div
        aria-hidden="true"
        className="fixed top-0 z-1 pointer-events-none"
        style={{
          ...PIXEL,
          width: '200%',
          height: '80vh',
          backgroundImage: "url('/assets/clouds-back.png')",
          backgroundSize: '512px 80vh',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'top left',
          opacity: 0.85,
          animation: 'driftClouds 120s linear infinite',
        }}
      />
      {/* Front clouds — same sky area */}
      <div
        aria-hidden="true"
        className="fixed top-0 z-2 pointer-events-none"
        style={{
          ...PIXEL,
          width: '200%',
          height: '80vh',
          backgroundImage: "url('/assets/clouds-front.png')",
          backgroundSize: '512px 80vh',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'top left',
          animation: 'driftClouds 60s linear infinite',
        }}
      />
      {/* Ground — 20vh, top of ground tile meets bottom of cloud layers */}
      <div
        aria-hidden="true"
        className="fixed bottom-0 z-3 pointer-events-none"
        style={{
          ...PIXEL,
          left: '-2px',
          width: 'calc(100% + 4px)',
          height: '20vh',
          backgroundImage: "url('/assets/ground.png')",
          backgroundSize: '1796px 20vh',
          backgroundRepeat: 'repeat-x',
          backgroundPosition: 'top left',
        }}
      />
    </>
  );
}

// ─── Node helpers ─────────────────────────────────────────────────────────────
function toFlowNodes(
  checkpoints: Checkpoint[],
  jumpingLabel: string | null = null,
  manualCurrentOverride: string | null = null,
) {
  const currentCP = checkpoints.find(cp => !cp.locked && cp.progress < 100);
  return checkpoints.map(cp => ({
    id: cp.id,
    type: 'roadmap' as const,
    data: {
      label: cp.label,
      progress: cp.progress,
      locked: cp.locked,
      kind: cp.kind,
      isCurrent: manualCurrentOverride
        ? cp.label === manualCurrentOverride
        : cp === currentCP,
      isJumping: cp.label === jumpingLabel,
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

// ─── Jumping Character Overlay ────────────────────────────────────────────────
function JumpingCharacterOverlay({
  jumpPath,
  char,
}: {
  jumpPath: JumpPath;
  char: SavedChar;
}) {
  const { flowToScreenPosition } = useReactFlow();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [opacity, setOpacity] = useState(1);
  const startTimeRef = useRef<number | null>(null);
  const DURATION = 1750;
  const FADE_DURATION = 200;

  useEffect(() => {
    let rafId: number;
    startTimeRef.current = null;
    setOpacity(1);

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const t = Math.min(elapsed / DURATION, 1);
      const eased = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

      const from = flowToScreenPosition(jumpPath.from);
      const to = flowToScreenPosition(jumpPath.to);

      // node x center (256/2=128), character top (matches CharacterMascot)
      const fx = from.x + 128, fy = from.y - 120;
      const tx = to.x + 128,   ty = to.y - 120;

      const arcHeight = 160;
      const cx1x = fx + (tx - fx) * 0.25, cx1y = Math.min(fy, ty) - arcHeight;
      const cx2x = fx + (tx - fx) * 0.5,  cx2y = Math.min(fy, ty) - arcHeight * 1.2;
      const cx3x = fx + (tx - fx) * 0.75, cx3y = Math.min(fy, ty) - arcHeight * 0.5;

      let x: number, y: number;
      if (eased < 0.25) {
        const s = eased / 0.25;
        x = fx + (cx1x - fx) * s; y = fy + (cx1y - fy) * s;
      } else if (eased < 0.5) {
        const s = (eased - 0.25) / 0.25;
        x = cx1x + (cx2x - cx1x) * s; y = cx1y + (cx2y - cx1y) * s;
      } else if (eased < 0.75) {
        const s = (eased - 0.5) / 0.25;
        x = cx2x + (cx3x - cx2x) * s; y = cx2y + (cx3y - cx2y) * s;
      } else {
        const s = (eased - 0.75) / 0.25;
        x = cx3x + (tx - cx3x) * s; y = cx3y + (ty - cx3y) * s;
      }

      setPos({ x, y });

      if (t < 1) {
        rafId = requestAnimationFrame(animate);
      } else {
        const finalTo = flowToScreenPosition(jumpPath.to);
        setPos({ x: finalTo.x + 128, y: finalTo.y - 120 });
        setOpacity(0);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [jumpPath, flowToScreenPosition]);

  if (!pos) return null;

  const fromScreen = flowToScreenPosition(jumpPath.from);
  const toScreen = flowToScreenPosition(jumpPath.to);
  const facingRight = toScreen.x >= fromScreen.x;

  return (
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
      <div
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          opacity,
          transition: `opacity ${FADE_DURATION}ms ease-out`,
          transform: `translateX(-50%) scaleX(${facingRight ? 1 : -1})`,
          willChange: 'left, top, opacity',
        }}
      >
        <CharacterPreview
          size={104}
          showLegs
          jump
          skin={char.skin}
          eyes={char.eyes}
          clothes={char.clothes}
          pants={char.pants}
          shoes={char.shoes}
          hair={char.hair}
          accessory={char.accessories}
          variants={{}}
        />
      </div>
    </div>
  );
}

// ─── Main Roadmap Content ─────────────────────────────────────────────────────
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

  const [showConfetti, setShowConfetti] = useState(false);
  const [jumpingNodeLabel, setJumpingNodeLabel] = useState<string | null>(null);
  const [jumpPath, setJumpPath] = useState<JumpPath | null>(null);
  const [savedChar, setSavedChar] = useState<SavedChar | null>(null);
  const [manualCurrentNode, setManualCurrentNode] = useState<string | null>(null);

  // Expose triggerConfetti to window for external calls
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).triggerConfetti = (nodeLabel?: string) => {
      const targetNode = nodes.find((n: any) => n.data.label === nodeLabel);
      if (targetNode) {
        setJumpingNodeLabel(nodeLabel ?? null);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    };
  }, [nodes]);

  // Load saved character from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('character_saved');
      if (raw) setSavedChar(JSON.parse(raw));
    } catch {}
  }, []);

  // Reusable fetch — called on mount and after jump animation ends
  const fetchRoadmap = useCallback(
    (jumpLabel: string | null = null) => {
      const load = roadmapParam
        ? api.roadmapMap(roadmapParam)
        : api.dashboard().then(d => api.roadmapMap(d.active_roadmap.id));

      load
        .then(data => {
          setCheckpoints(data.checkpoints);

          const flowNodes = toFlowNodes(data.checkpoints, jumpLabel, manualCurrentNode);
          const flowEdges = toFlowEdges(data.edges, data.checkpoints);
          const laidOutNodes = applyDagreLayout(flowNodes, flowEdges);

          setNodes(laidOutNodes);
          setEdges(flowEdges);

          // Set up jump animation when a node was just completed
          if (jumpLabel) {
            const completedIndex = laidOutNodes.findIndex(n => n.data.label === jumpLabel);
            const completedNode = laidOutNodes[completedIndex];
            const nextNode = laidOutNodes[completedIndex + 1];

            if (completedNode && nextNode) {
              setTimeout(() => {
                setJumpPath({ from: completedNode.position, to: nextNode.position });

                setTimeout(() => {
                  setJumpPath(null);
                  setJumpingNodeLabel(null);

                  setNodes(prevNodes => {
                    const cIdx = prevNodes.findIndex(n => n.data.label === jumpLabel);
                    const nNext = prevNodes[cIdx + 1];
                    if (nNext) {
                      setManualCurrentNode(nNext.data.label);
                      return prevNodes.map((node, index) => ({
                        ...node,
                        data: { ...node.data, isCurrent: index === cIdx + 1 },
                      }));
                    }
                    return prevNodes;
                  });

                  api.advanceTasks()
                    .catch(console.error)
                    .finally(() => {
                      setTimeout(() => {
                        fetchRoadmap(null);
                        setTimeout(() => setManualCurrentNode(null), 1000);
                      }, 500);
                    });
                }, 2000); // 1750ms animation + 200ms fade + buffer
              }, 200);
            }
          }

          // Auto-center on current in-progress node
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
    },
    [roadmapParam, manualCurrentNode, setCenter, fitView, setNodes, setEdges], // eslint-disable-line react-hooks/exhaustive-deps
  );

  // On mount — check for completed node flag and kick off fetch
  useEffect(() => {
    const justCompleted = localStorage.getItem('node_just_completed');
    if (justCompleted) {
      localStorage.removeItem('node_just_completed');
      setJumpingNodeLabel(justCompleted);
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    fetchRoadmap(justCompleted);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!pendingCenter) return;
    const timer = setTimeout(() => {
      setCenter(pendingCenter.x, pendingCenter.y, { zoom: 1.5, duration: 800 });
      setPendingCenter(null);
    }, 50);
    return () => clearTimeout(timer);
  }, [pendingCenter, setCenter]);

  const handleNodeClick: NodeMouseHandler = useCallback(
    (_event, node) => {
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
    },
    [checkpoints, router],
  );

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

        {/* Character jump overlay — inside same stacking context as ReactFlow */}
        {jumpPath && savedChar && (
          <JumpingCharacterOverlay jumpPath={jumpPath} char={savedChar} />
        )}
      </div>

      {/* z-index 20: above ReactFlow and navbar */}
      {activePanel && (
        <div style={{ position: 'relative', zIndex: 20 }}>
          <NodePanel
            data={activePanel}
            onClose={() => {
              setActivePanel(null);
              if (activePanelPos) {
                setCenter(activePanelPos.x, activePanelPos.y, { zoom: 0.5, duration: 800 });
              }
            }}
          />
        </div>
      )}

      {/* Confetti — above everything */}
      {showConfetti && (
        <QuizConfetti
          key={jumpingNodeLabel}
          x={jumpingNodeLabel ? nodes.find((n: any) => n.data.label === jumpingNodeLabel)?.position?.x : 0}
          y={jumpingNodeLabel ? nodes.find((n: any) => n.data.label === jumpingNodeLabel)?.position?.y : 0}
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