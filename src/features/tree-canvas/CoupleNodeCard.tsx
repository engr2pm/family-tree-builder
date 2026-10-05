import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { useAppStore } from '../../state/useAppStore'
import { useContextMenuTrigger } from '../../hooks/useContextMenuTrigger'
import { usePhotoUrl } from '../../hooks/usePhotoUrl'
import { CARD_SIZES, upKey, downKey } from '../../layout/computeLayout'
import type { CoupleNode, Person } from '../../data/types'
import './tree-canvas.css'

export interface CoupleNodeData extends Record<string, unknown> {
  node: CoupleNode
  personsById: Map<string, Person>
  hasChildren: boolean
  depthLimited: { up0: boolean; up1: boolean; down: boolean }
}

export type CoupleFlowNode = Node<CoupleNodeData, 'couple'>

function PersonBox({
  person,
  hasParentLink,
  onTap,
}: {
  person: Person | undefined
  hasParentLink: boolean
  onTap: () => void
}) {
  const photoUrl = usePhotoUrl(person?.photoBlobId)
  // A box already linked to a parent node is reserved for that side's blood
  // relative (the one this node's "Add child"/"Add sibling" action set up) —
  // label it distinctly so it's clear which box that is, since filling in the
  // wrong box would silently attach the ancestry to the wrong person.
  const placeholder = hasParentLink ? 'Add child' : 'Add person'

  return (
    <button
      type="button"
      className="person-box nodrag nopan"
      onClick={(e) => {
        e.stopPropagation()
        onTap()
      }}
    >
      <span className="person-avatar">
        {photoUrl ? (
          <img src={photoUrl} alt="" />
        ) : (
          <span className="person-avatar-placeholder">
            {person ? person.name.charAt(0).toUpperCase() : '+'}
          </span>
        )}
      </span>
      <span className="person-name">{person?.name ?? placeholder}</span>
    </button>
  )
}

type BranchState = 'expanded' | 'collapsed' | 'depth-limited'

function BranchToggle({
  state,
  onClick,
  position,
}: {
  state: BranchState
  onClick: () => void
  position: 'up-left' | 'up-right' | 'down'
}) {
  const label =
    state === 'collapsed' ? '+' : state === 'depth-limited' ? '…' : '−'
  const title =
    state === 'collapsed'
      ? 'Expand this branch'
      : state === 'depth-limited'
        ? 'More beyond the current focus — click to widen it'
        : 'Collapse this branch'

  return (
    <button
      type="button"
      className={`branch-toggle branch-toggle-${position} branch-toggle-${state} nodrag nopan`}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
      title={title}
    >
      {label}
    </button>
  )
}

function branchState(collapsed: boolean, depthLimited: boolean): BranchState {
  if (depthLimited) return 'depth-limited'
  return collapsed ? 'collapsed' : 'expanded'
}

export function CoupleNodeCard({ data }: NodeProps<CoupleFlowNode>) {
  const { node, personsById, hasChildren, depthLimited } = data
  const openContextMenu = useAppStore((s) => s.openContextMenu)
  const openPersonEditor = useAppStore((s) => s.openPersonEditor)
  const collapsedEdges = useAppStore((s) => s.collapsedEdges)
  const toggleCollapsed = useAppStore((s) => s.toggleCollapsed)
  const cardDensity = useAppStore((s) => s.cardDensity)
  const maxGenerations = useAppStore((s) => s.maxGenerations)
  const setMaxGenerations = useAppStore((s) => s.setMaxGenerations)

  const trigger = useContextMenuTrigger((x, y) => openContextMenu(node.id, x, y))

  const personA = node.personIds[0] ? personsById.get(node.personIds[0]) : undefined
  const personB = node.personIds[1] ? personsById.get(node.personIds[1]) : undefined

  const { width, height } = CARD_SIZES[cardDensity]
  const up0Key = upKey(node.id, 0)
  const up1Key = upKey(node.id, 1)
  const downKeyStr = downKey(node.id)

  return (
    <div
      className={`couple-node${cardDensity === 'compact' ? ' compact' : ''}`}
      style={{ width, height }}
      {...trigger}
    >
      {/* Separate handles per box: each spouse's ancestry edge lands above
          their own box, not a shared point, so it's clear whose parents are whose. */}
      <Handle
        id="in-0"
        type="target"
        position={Position.Top}
        className="node-handle"
        style={{ left: '25%' }}
      />
      <Handle
        id="in-1"
        type="target"
        position={Position.Top}
        className="node-handle"
        style={{ left: '75%' }}
      />
      {node.parentNodeIds[0] !== null && (
        <BranchToggle
          state={branchState(collapsedEdges.has(up0Key), depthLimited.up0)}
          onClick={() =>
            depthLimited.up0 ? setMaxGenerations(maxGenerations + 1) : toggleCollapsed(up0Key)
          }
          position="up-left"
        />
      )}
      {node.parentNodeIds[1] !== null && (
        <BranchToggle
          state={branchState(collapsedEdges.has(up1Key), depthLimited.up1)}
          onClick={() =>
            depthLimited.up1 ? setMaxGenerations(maxGenerations + 1) : toggleCollapsed(up1Key)
          }
          position="up-right"
        />
      )}
      <PersonBox
        person={personA}
        hasParentLink={node.parentNodeIds[0] !== null}
        onTap={() => openPersonEditor(node.id, [0])}
      />
      <div className="person-divider" />
      <PersonBox
        person={personB}
        hasParentLink={node.parentNodeIds[1] !== null}
        onTap={() => openPersonEditor(node.id, [1])}
      />
      {hasChildren && (
        <BranchToggle
          state={branchState(collapsedEdges.has(downKeyStr), depthLimited.down)}
          onClick={() =>
            depthLimited.down ? setMaxGenerations(maxGenerations + 1) : toggleCollapsed(downKeyStr)
          }
          position="down"
        />
      )}
      <Handle id="out" type="source" position={Position.Bottom} className="node-handle" />
    </div>
  )
}
