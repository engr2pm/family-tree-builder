import { create } from 'zustand'
import type { BoxIndex } from '../data'

interface ContextMenuState {
  nodeId: string
  x: number
  y: number
}

interface EditTargetState {
  nodeId: string
  boxes: BoxIndex[]
}

interface DeleteTargetState {
  nodeId: string
}

export type CardDensity = 'normal' | 'compact'

interface AppState {
  contextMenu: ContextMenuState | null
  openContextMenu: (nodeId: string, x: number, y: number) => void
  closeContextMenu: () => void

  editTarget: EditTargetState | null
  openPersonEditor: (nodeId: string, boxes: BoxIndex[]) => void
  closePersonEditor: () => void

  deleteTarget: DeleteTargetState | null
  openDeleteConfirm: (nodeId: string) => void
  closeDeleteConfirm: () => void

  /** Session-only view state: which branches are hidden. Keys are
   * `${nodeId}:up:${box}` or `${nodeId}:down`. Not persisted — resets to
   * fully-expanded on reload, since this is a viewing convenience, not data. */
  collapsedEdges: Set<string>
  toggleCollapsed: (key: string) => void

  cardDensity: CardDensity
  setCardDensity: (density: CardDensity) => void

  /** When set, the tree shows only nodes within `maxGenerations` hops of this
   * node (both up and down) instead of the whole tree — the standard fix for
   * pedigree-chart sprawl, since ancestor fan-out doubles every generation
   * regardless of packing. Session-only, like `collapsedEdges`. */
  focusNodeId: string | null
  maxGenerations: number
  setFocus: (nodeId: string) => void
  clearFocus: () => void
  setMaxGenerations: (n: number) => void
}

export const useAppStore = create<AppState>((set) => ({
  contextMenu: null,
  openContextMenu: (nodeId, x, y) => set({ contextMenu: { nodeId, x, y } }),
  closeContextMenu: () => set({ contextMenu: null }),

  editTarget: null,
  openPersonEditor: (nodeId, boxes) => set({ editTarget: { nodeId, boxes } }),
  closePersonEditor: () => set({ editTarget: null }),

  deleteTarget: null,
  openDeleteConfirm: (nodeId) => set({ deleteTarget: { nodeId } }),
  closeDeleteConfirm: () => set({ deleteTarget: null }),

  collapsedEdges: new Set(),
  toggleCollapsed: (key) =>
    set((state) => {
      const next = new Set(state.collapsedEdges)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return { collapsedEdges: next }
    }),

  cardDensity: 'normal',
  setCardDensity: (density) => set({ cardDensity: density }),

  focusNodeId: null,
  maxGenerations: 3,
  setFocus: (nodeId) => set({ focusNodeId: nodeId }),
  clearFocus: () => set({ focusNodeId: null }),
  setMaxGenerations: (n) => set({ maxGenerations: Math.max(1, Math.min(10, n)) }),
}))
