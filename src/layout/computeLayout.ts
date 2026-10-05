import type { CoupleNode } from '../data/types'

export interface LayoutEdge {
  id: string
  source: string
  target: string
  /** Which of the target node's two boxes this ancestry edge belongs to. */
  targetBox: 0 | 1
}

export interface LayoutResult {
  positions: Map<string, { x: number; y: number }>
  edges: LayoutEdge[]
  /** Edges cut off by the generation limit (focus mode), as opposed to a
   * manual collapse — the UI shows these differently since "expand" isn't the
   * right action (widening the generation window, or refocusing, is). */
  depthLimitedKeys: Set<string>
}

export const CARD_SIZES = {
  normal: { width: 220, height: 116 },
  compact: { width: 150, height: 78 },
} as const
export type CardDensity = keyof typeof CARD_SIZES

// Backward-compatible defaults (e.g. for SearchBar's fallback measurements).
export const NODE_WIDTH = CARD_SIZES.normal.width
export const NODE_HEIGHT = CARD_SIZES.normal.height

const HORIZONTAL_GUTTER = 32
const VERTICAL_GUTTER = 64

export function upKey(nodeId: string, box: 0 | 1): string {
  return `${nodeId}:up:${box}`
}
export function downKey(nodeId: string): string {
  return `${nodeId}:down`
}

export interface LayoutOptions {
  /** Keys from `upKey`/`downKey` for branches the user has hidden. */
  collapsedEdges: Set<string>
  nodeWidth: number
  nodeHeight: number
  /** When set, lay out starting from this node instead of the tree's anchor. */
  focusNodeId?: string | null
  /** Max hops (up or down) from the focus node to render. `null`/unset = unlimited. */
  maxGenerations?: number | null
}

/**
 * Lays out the tree as a two-sided pedigree chart: starting from an arbitrary
 * anchor node, ancestors fan out upward independently on each box's own side
 * (a node can have up to two parent nodes, one per spouse — married people
 * aren't usually related to each other), while descendants fan out downward as
 * usual. Since remarriage and cousin-marriage aren't modeled, the graph
 * reachable from any node is a tree, so one traversal that never steps back
 * into the node it just arrived from reaches every node exactly once.
 *
 * The one subtlety: walking "up" to a co-parent and then finding that
 * co-parent's *other* children means finding this node's own siblings. Those
 * siblings belong in this node's row (same y, positioned beside it), not one
 * level further down from the co-parent — treating that as a generic
 * "children of the co-parent" row would recenter it under the co-parent and
 * land it right back on top of this node. `layoutCoParentSiblings` places
 * those explicitly, and a visited co-parent's own generic down-traversal is
 * skipped (`skipDown`) so it doesn't also try to lay the same siblings out
 * itself.
 *
 * A collapsed edge (`options.collapsedEdges`) simply isn't traversed — the
 * node it would have led to (and everything beyond it) is left out of
 * `positions` entirely, so it doesn't render and doesn't consume space. The
 * underlying data is untouched; this is a view-only cut of the same traversal.
 * Focus mode (`focusNodeId`/`maxGenerations`) cuts the same way, just based on
 * hop-distance from the focus node rather than a manually toggled edge.
 */
export function computeLayout(
  nodes: CoupleNode[],
  anchorNodeId: string,
  options: LayoutOptions,
): LayoutResult {
  const { collapsedEdges, nodeWidth, nodeHeight, focusNodeId, maxGenerations = null } = options
  const rootId = focusNodeId ?? anchorNodeId
  const unitWidth = nodeWidth + HORIZONTAL_GUTTER
  const levelHeight = nodeHeight + VERTICAL_GUTTER
  const depthLimitedKeys = new Set<string>()

  const nodesById = new Map(nodes.map((n) => [n.id, n]))
  const childrenByParent = new Map<string, CoupleNode[]>()
  for (const n of nodes) {
    for (const parentId of n.parentNodeIds) {
      if (!parentId) continue
      const list = childrenByParent.get(parentId) ?? []
      list.push(n)
      childrenByParent.set(parentId, list)
    }
  }
  for (const list of childrenByParent.values()) {
    list.sort((a, b) => a.createdAt - b.createdAt)
  }

  function downNeighbors(nodeId: string, exclude: string | null): string[] {
    if (collapsedEdges.has(downKey(nodeId))) return []
    return (childrenByParent.get(nodeId) ?? [])
      .map((c) => c.id)
      .filter((id) => id !== exclude)
  }

  // Horizontal space a node needs is driven only by its own downward descendant
  // fan-out, never by ancestors: ancestors are always centered directly above
  // (or split across two sides by layoutCoParentSiblings) regardless of how
  // wide *their* own ancestry is — that complexity lives a row further up, not
  // sideways at this row. Folding "up" into this metric was the bug: a node's
  // *other* parent (purely upward) and its own children (rightly downward)
  // both inflated how far away a sibling in the same row got pushed.
  const widthCache = new Map<string, number>()
  function computeWidth(nodeId: string, exclude: string | null): number {
    const cached = widthCache.get(nodeId)
    if (cached !== undefined) return cached
    widthCache.set(nodeId, unitWidth) // guards a cycle (shouldn't occur) against infinite recursion

    const down = downNeighbors(nodeId, exclude)
    const width =
      down.length === 0
        ? unitWidth
        : Math.max(unitWidth, down.reduce((sum, id) => sum + computeWidth(id, nodeId), 0))

    widthCache.set(nodeId, width)
    return width
  }

  const positions = new Map<string, { x: number; y: number }>()

  function layoutRow(
    ids: string[],
    fromId: string,
    centerX: number,
    y: number,
    skipDown: boolean,
    depth: number,
  ) {
    if (ids.length === 0) return
    const widths = ids.map((id) => computeWidth(id, fromId))
    const totalWidth = widths.reduce((a, b) => a + b, 0)
    let cursor = centerX - totalWidth / 2
    ids.forEach((id, i) => {
      const w = widths[i]
      assignPositions(id, fromId, cursor + w / 2, y, skipDown, depth)
      cursor += w
    })
  }

  /**
   * Places a newly-positioned ancestor's *other* children beside the node we
   * came from, not below the ancestor. `side` matches which box (0 or 1) this
   * ancestor belongs to — box 0's ancestor row sits to the left, box 1's to
   * the right (see the `up` handling below), so that side's other children
   * extend further in the *same* direction rather than crossing over to the
   * other spouse's side.
   */
  function layoutCoParentSiblings(
    parentId: string,
    fixedChildId: string,
    rowY: number,
    side: 'left' | 'right',
    depth: number,
  ) {
    const siblings = (childrenByParent.get(parentId) ?? []).filter((s) => s.id !== fixedChildId)
    if (siblings.length === 0) return
    const fixedPos = positions.get(fixedChildId)
    if (!fixedPos) return
    const fixedWidth = computeWidth(fixedChildId, parentId)

    if (side === 'right') {
      let cursor = fixedPos.x + fixedWidth / 2
      for (const s of siblings) {
        const w = computeWidth(s.id, parentId)
        if (!positions.has(s.id)) assignPositions(s.id, parentId, cursor + w / 2, rowY, false, depth)
        cursor += w
      }
    } else {
      let cursor = fixedPos.x - fixedWidth / 2
      for (let i = siblings.length - 1; i >= 0; i--) {
        const s = siblings[i]
        const w = computeWidth(s.id, parentId)
        cursor -= w
        if (!positions.has(s.id)) assignPositions(s.id, parentId, cursor + w / 2, rowY, false, depth)
      }
    }
  }

  function assignPositions(
    nodeId: string,
    exclude: string | null,
    x: number,
    y: number,
    skipDown: boolean,
    depth: number,
  ) {
    if (positions.has(nodeId)) return // cycle guard
    positions.set(nodeId, { x, y })

    const node = nodesById.get(nodeId)
    if (!node) return

    const canRecurse = maxGenerations === null || depth < maxGenerations

    const upEntries: Array<{ id: string; box: 0 | 1 }> = []
    node.parentNodeIds.forEach((parentId, box) => {
      if (!parentId || parentId === exclude) return
      const key = upKey(nodeId, box as 0 | 1)
      if (collapsedEdges.has(key)) return
      if (!canRecurse) {
        depthLimitedKeys.add(key)
        return
      }
      upEntries.push({ id: parentId, box: box as 0 | 1 })
    })

    layoutRow(
      upEntries.map((e) => e.id),
      nodeId,
      x,
      y - levelHeight,
      true,
      depth + 1,
    )
    // Box 0's ancestor row is laid out left-of-center, box 1's right-of-center
    // (layoutRow places array items left-to-right in order) — so a box's
    // other children must extend the same direction as that box's own
    // ancestor row.
    for (const { id: parentId, box } of upEntries) {
      layoutCoParentSiblings(parentId, nodeId, y, box === 0 ? 'left' : 'right', depth)
    }

    if (skipDown) return // this node's children are this row's siblings, laid out above instead

    if (!canRecurse) {
      const dKey = downKey(nodeId)
      if (!collapsedEdges.has(dKey) && (childrenByParent.get(nodeId)?.length ?? 0) > 0) {
        depthLimitedKeys.add(dKey)
      }
      return
    }

    const down = downNeighbors(nodeId, exclude)
    const freshDown = down.filter((id) => !positions.has(id))
    layoutRow(freshDown, nodeId, x, y + levelHeight, false, depth + 1)
  }

  assignPositions(rootId, null, 0, 0, false, 0)

  const edges: LayoutEdge[] = []
  for (const node of nodes) {
    if (!positions.has(node.id)) continue
    node.parentNodeIds.forEach((parentId, box) => {
      if (!parentId || !positions.has(parentId)) return
      edges.push({
        id: `${parentId}-${node.id}`,
        source: parentId,
        target: node.id,
        targetBox: box as 0 | 1,
      })
    })
  }

  return { positions, edges, depthLimitedKeys }
}
