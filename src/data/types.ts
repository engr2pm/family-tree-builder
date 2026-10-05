export interface Person {
  id: string
  treeId: string
  name: string
  photoBlobId?: string
  createdAt: number
  updatedAt: number
}

/**
 * A couple node: up to two people (spouses/partners) sharing one card in the tree.
 *
 * Ancestry is per-box, not per-node: `parentNodeIds[i]` is the CoupleNode that
 * whoever occupies box `i` was born into. Two married people are (almost always)
 * unrelated, so each box tracks its own independent parent lineage — a node can
 * have up to two "parent" nodes, one per box, growing the tree upward on both
 * sides. `parentNodeIdsFlat` is a derived, denormalized copy of the non-null
 * entries of `parentNodeIds` used only for an IndexedDB multiEntry index (Dexie
 * can't index into fixed array positions), so "children of node X" can be found
 * with a single indexed query instead of a full table scan.
 */
export interface CoupleNode {
  id: string
  treeId: string
  personIds: [string | null, string | null]
  parentNodeIds: [string | null, string | null]
  parentNodeIdsFlat: string[]
  createdAt: number
  updatedAt: number
}

export interface TreeMeta {
  treeId: string
  /** An arbitrary starting node for laying out the tree — not necessarily the "top" of it. */
  anchorNodeId: string
}

export interface PhotoRecord {
  id: string
  blob: Blob
}
