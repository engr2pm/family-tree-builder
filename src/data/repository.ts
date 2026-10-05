import type { CoupleNode, Person, TreeMeta } from './types'

export type BoxIndex = 0 | 1

export interface PersonInput {
  name: string
  photoBlob?: Blob | null
}

export interface TreeRepository {
  /** Creates the tree + anchor node on first run if needed. Call once; not for live queries. */
  ensureTreeExists(): Promise<void>

  /** Pure read of the single tree's metadata. Safe to call from a live query. */
  getTreeMeta(): Promise<TreeMeta | undefined>

  getPerson(id: string): Promise<Person | undefined>

  /** Creates or updates the person occupying a node's box (0 = first box, 1 = second box). */
  setNodePerson(nodeId: string, box: BoxIndex, input: PersonInput): Promise<Person>

  getPhotoBlob(id: string): Promise<Blob | undefined>

  getNode(id: string): Promise<CoupleNode | undefined>
  getAllNodes(treeId: string): Promise<CoupleNode[]>
  /** Nodes where some box's occupant is a child of this node (either box). */
  getChildren(nodeId: string): Promise<CoupleNode[]>

  /** Adds a parent node for one box's occupant. That box must be filled and not already have a parent. */
  addParent(nodeId: string, box: BoxIndex): Promise<CoupleNode>
  /** Adds a child node; the new node's box 0 is the child, box 1 is left open for their future spouse. */
  addChild(parentNodeId: string): Promise<CoupleNode>
  /** Adds a sibling for one box's occupant (another child of that box's parents). Synthesizes a shared parent first if none exists yet. */
  addSibling(nodeId: string, box: BoxIndex): Promise<CoupleNode>

  /** Deletes the node; if it has descendants, deletes the whole subtree beneath it too. */
  deleteNodeCascade(nodeId: string): Promise<void>

  searchPersonsByName(
    treeId: string,
    query: string,
  ): Promise<Array<{ person: Person; nodeId: string }>>
}
