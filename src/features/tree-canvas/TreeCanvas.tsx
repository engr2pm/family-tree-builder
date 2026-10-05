import { useEffect } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  type Edge,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useTreeData } from '../../hooks/useTreeData'
import { computeLayout, CARD_SIZES, upKey, downKey } from '../../layout/computeLayout'
import { CoupleNodeCard, type CoupleFlowNode } from './CoupleNodeCard'
import { useAppStore } from '../../state/useAppStore'
import type { TreeMeta } from '../../data/types'
import './tree-canvas.css'

const nodeTypes = { couple: CoupleNodeCard }

export function TreeCanvas({ treeMeta }: { treeMeta: TreeMeta }) {
  const data = useTreeData(treeMeta.treeId)
  const collapsedEdges = useAppStore((s) => s.collapsedEdges)
  const cardDensity = useAppStore((s) => s.cardDensity)
  const focusNodeId = useAppStore((s) => s.focusNodeId)
  const maxGenerations = useAppStore((s) => s.maxGenerations)

  // useNodesState/useEdgesState (rather than plain controlled props) matter here:
  // React Flow reports measured node dimensions back through onNodesChange, and
  // without a handler wired to that, nodes never leave their initial
  // visibility:hidden measurement pass and edges never render.
  const [nodes, setNodes, onNodesChange] = useNodesState<CoupleFlowNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])
  const { fitView } = useReactFlow()

  useEffect(() => {
    if (!data || data.nodes.length === 0) {
      setNodes([])
      setEdges([])
      return
    }
    const { width, height } = CARD_SIZES[cardDensity]
    const { positions, edges: layoutEdges, depthLimitedKeys } = computeLayout(
      data.nodes,
      treeMeta.anchorNodeId,
      {
        collapsedEdges,
        nodeWidth: width,
        nodeHeight: height,
        focusNodeId,
        maxGenerations: focusNodeId ? maxGenerations : null,
      },
    )

    const hasChildren = new Set<string>()
    for (const n of data.nodes) {
      for (const parentId of n.parentNodeIds) {
        if (parentId) hasChildren.add(parentId)
      }
    }

    setNodes((prev) => {
      const prevById = new Map(prev.map((n) => [n.id, n]))
      return data.nodes
        .filter((n) => positions.has(n.id))
        .map((n) => {
          const existing = prevById.get(n.id)
          return {
            id: n.id,
            type: 'couple',
            position: positions.get(n.id) ?? { x: 0, y: 0 },
            data: {
              node: n,
              personsById: data.personsById,
              hasChildren: hasChildren.has(n.id),
              depthLimited: {
                up0: depthLimitedKeys.has(upKey(n.id, 0)),
                up1: depthLimitedKeys.has(upKey(n.id, 1)),
                down: depthLimitedKeys.has(downKey(n.id)),
              },
            },
            draggable: false,
            measured: existing?.measured,
          }
        })
    })

    setEdges(
      layoutEdges.map((e) => ({
        id: e.id,
        source: e.source,
        target: e.target,
        sourceHandle: 'out',
        targetHandle: `in-${e.targetBox}`,
        // Explicit color rather than React Flow's default CSS-variable-based
        // stroke: html-to-image clones just the viewport for PNG/PDF export,
        // and a variable defined on an ancestor outside that subtree doesn't
        // resolve in the clone — the edges rendered invisible (same color as
        // the white export background) even though they looked fine live.
        style: { stroke: '#9b98a8', strokeWidth: 1.5 },
      })),
    )
  }, [
    data,
    treeMeta.anchorNodeId,
    collapsedEdges,
    cardDensity,
    focusNodeId,
    maxGenerations,
    setNodes,
    setEdges,
  ])

  // Entering/leaving focus (or widening the generation window) moves the
  // layout's coordinate origin to a different node, but the camera stays put
  // — without this, the tree shifts under the viewport with no visible cue
  // that focusing did anything. React Flow needs a tick to sync its internal
  // store from the nodes we just set before fitView reads current positions.
  useEffect(() => {
    const t = setTimeout(() => fitView({ duration: 400, padding: 0.2 }), 50)
    return () => clearTimeout(t)
  }, [focusNodeId, maxGenerations, fitView])

  return (
    <div className="tree-canvas">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        fitView
        minZoom={0.2}
        maxZoom={2}
      >
        <Background gap={24} />
        <Controls showInteractive={false} />
        <MiniMap pannable zoomable />
      </ReactFlow>
    </div>
  )
}
