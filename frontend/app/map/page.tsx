'use client';
import QuizConfetti from '../../components/ui/quiz-confetti';
import React, { useState, useCallback, useEffect, useRef } from 'react';
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

function toFlowNodes(checkpoints: Checkpoint[], jumpingLabel: string | null = null, manualCurrentOverride: string | null = null) {
  const currentCP = checkpoints.find(cp => !cp.locked && cp.progress < 100);
  return checkpoints.map(cp => ({
    id: cp.id,
    type: 'roadmap' as const,
    data: {
      label: cp.label,
      progress: cp.progress,
      locked: cp.locked,
      kind: cp.kind,
      isCurrent: manualCurrentOverride ? cp.label === manualCurrentOverride : cp === currentCP,
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

// ─── Jumping Character Overlay ────────────────────────────────────────────────
function JumpingCharacterOverlay({ jumpPath, char }: { jumpPath: JumpPath; char: SavedChar }) {
  const { flowToScreenPosition } = useReactFlow();
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const [opacity, setOpacity] = useState(1);
  const startTimeRef = useRef<number | null>(null);
  const DURATION = 1750;
  const FADE_DURATION = 200; // ms fade at the end

  useEffect(() => {
    // Debug: Get exact coordinates for comparison
    const from = flowToScreenPosition(jumpPath.from);
    const to = flowToScreenPosition(jumpPath.to);
    console.log('jump from (screen):', from);
    console.log('jump to (screen):', to);
    
    // Also find the actual node DOM element to compare
    const nodeEls = document.querySelectorAll('.react-flow__node');
    nodeEls.forEach(el => {
      const rect = el.getBoundingClientRect();
      console.log('node DOM rect:', rect, el.textContent?.slice(0, 20));
    });

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
      
      // Debug: log flowToScreenPosition output for comparison
      console.log('Jumping character flow positions:', { from, to });

      const fx = from.x + 128, fy = from.y - 120; // node x center (256/2=128), character top (matches CharacterMascot)
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
        // Snap to destination, then fade out
        const finalTo = flowToScreenPosition(jumpPath.to);
        setPos({ x: finalTo.x + 128, y: finalTo.y - 120 });
        setOpacity(0); // triggers CSS transition fade
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
      <div style={{
        position: 'absolute',
        left: pos.x,
        top: pos.y,
        opacity,
        transition: `opacity ${FADE_DURATION}ms ease-out`,
        transform: `translateX(-50%) scaleX(${facingRight ? 1 : -1})`,
        willChange: 'left, top, opacity',
      }}>
        <CharacterPreview
          size={104}
          showLegs
          jump
          skin={char.skin} eyes={char.eyes} clothes={char.clothes}
          pants={char.pants} shoes={char.shoes} hair={char.hair}
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

  useEffect(() => {
    (window as any).triggerConfetti = (nodeLabel?: string) => {
      const targetNode = nodes.find(n => n.data.label === nodeLabel);
      if (targetNode) {
        console.log(`Triggering confetti for ${nodeLabel} at position:`, targetNode.position);
        console.log('Node position for confetti calculation:', {
          x: targetNode.position.x + 64,
          y: targetNode.position.y + 35
        });
        setJumpingNodeLabel(nodeLabel);
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 3000);
      }
    };
  }, [nodes]);

  // Load saved character
  useEffect(() => {
    try {
      const raw = localStorage.getItem('character_saved');
      if (raw) setSavedChar(JSON.parse(raw));
    } catch {}
  }, []);

  // Reusable fetch function — called on mount and again after jump animation ends
  const fetchRoadmap = useCallback((jumpLabel: string | null = null) => {
    api.dashboard()
      .then(d => api.roadmapMap(d.active_roadmap.id))
      .then(data => {
        setCheckpoints(data.checkpoints);

        const flowNodes = toFlowNodes(data.checkpoints, jumpLabel, manualCurrentNode);
        const flowEdges = toFlowEdges(data.edges, data.checkpoints);
        const laidOutNodes = applyDagreLayout(flowNodes, flowEdges);

        setNodes(laidOutNodes);
        setEdges(flowEdges);

        // If a node just completed, set up the jump animation
        if (jumpLabel) {
          const completedIndex = laidOutNodes.findIndex(n => n.data.label === jumpLabel);
          const completedNode = laidOutNodes[completedIndex];
          const nextNode = laidOutNodes[completedIndex + 1];

          if (completedNode && nextNode) {
            // Small delay so ReactFlow viewport is ready
            setTimeout(() => {
              setJumpPath({ from: completedNode.position, to: nextNode.position });

              // After animation ends, immediately clear jumping state and set next node as current
              const jumpLabelClosure = jumpLabel; // Preserve jumpLabel in closure
              setTimeout(() => {
                // Clear jumping state immediately
                setJumpPath(null);
                setJumpingNodeLabel(null);
                
                // Update nodes to make next node current immediately
                setNodes(prevNodes => {
                  const completedIndex = prevNodes.findIndex(n => n.data.label === jumpLabelClosure);
                  const nextNode = prevNodes[completedIndex + 1];
                  
                  if (nextNode) {
                    // Set manual override to prevent backend from changing current node
                    setManualCurrentNode(nextNode.data.label);
                    
                    return prevNodes.map((node, index) => ({
                      ...node,
                      data: {
                        ...node.data,
                        isCurrent: index === completedIndex + 1
                      }
                    }));
                  }
                  return prevNodes;
                });
                
                // Clear daily_done on backend and refresh data after a delay to allow backend to update
                api.advanceTasks()
                  .catch(console.error)
                  .finally(() => {
                    // Wait a bit for backend to update before refreshing
                    setTimeout(() => {
                      fetchRoadmap(null);
                      // Clear manual override after a short delay to let backend sync complete
                      setTimeout(() => {
                        setManualCurrentNode(null);
                      }, 1000);
                    }, 500);
                  });
              }, 2000); // 1750ms animation + 200ms fade + ~50ms buffer
            }, 200); // down from 500 - start sooner after data loads
          }
        }

        // Auto-center on current node
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
      .catch(err => {
        console.error(err);
        setLoadError('Failed to load roadmap. Please try again.');
      })
      .finally(() => setLoading(false));
  }, [setCenter, fitView, setNodes, setEdges]); // eslint-disable-line react-hooks/exhaustive-deps

  // On mount — check for completed node flag and kick off fetch
  useEffect(() => {
    const justCompleted = localStorage.getItem('node_just_completed');
    if (justCompleted) {
      localStorage.removeItem('node_just_completed');
      setJumpingNodeLabel(justCompleted);
      
      // Trigger confetti immediately when node is marked as completed
      console.log('Node just completed, triggering confetti!');
      setShowConfetti(true);
      setTimeout(() => setShowConfetti(false), 3000);
    }
    fetchRoadmap(justCompleted);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (loadError) {
    return (
      <div className="h-screen w-screen bg-[#eef1f7] flex items-center justify-center">
        <Navbar />
        <p className="text-red-400">{loadError}</p>
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

        {jumpPath && savedChar && (
          <JumpingCharacterOverlay jumpPath={jumpPath} char={savedChar} />
        )}
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

      {showConfetti && (
        <QuizConfetti 
          key={jumpingNodeLabel} // Force re-render when node changes
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