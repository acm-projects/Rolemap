import dagre from '@dagrejs/dagre';
import type { Node, Edge } from '@xyflow/react';

const NODE_DIMS: Record<string, { w: number; h: number }> = {
  lesson:  { w: 256, h: 140 },
  quiz:    { w: 160, h: 160 },
  project: { w: 256, h: 160 },
};

export function applyDagreLayout(nodes: Node[], edges: Edge[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'LR', ranksep: 120, nodesep: 60, marginx: 80, marginy: 80 });

  for (const node of nodes) {
    const dim = NODE_DIMS[(node.data?.kind as string) ?? 'lesson'] ?? NODE_DIMS.lesson;
    g.setNode(node.id, { width: dim.w, height: dim.h });
  }
  for (const edge of edges) {
    g.setEdge(edge.source, edge.target);
  }

  dagre.layout(g);

  return nodes.map(node => {
    const pos = g.node(node.id);
    const dim = NODE_DIMS[(node.data?.kind as string) ?? 'lesson'] ?? NODE_DIMS.lesson;
    return { ...node, position: { x: pos.x - dim.w / 2, y: pos.y - dim.h / 2 } };
  });
}
