import { useEffect, useState } from 'react'
import { useAppStore } from '../../state/useAppStore'
import { repo } from '../../data'
import '../../styles/dialog.css'

export function DeleteConfirmDialog() {
  const deleteTarget = useAppStore((s) => s.deleteTarget)
  const closeDeleteConfirm = useAppStore((s) => s.closeDeleteConfirm)
  const [childCount, setChildCount] = useState<number | null>(null)

  useEffect(() => {
    if (!deleteTarget) {
      setChildCount(null)
      return
    }
    let cancelled = false
    repo.getChildren(deleteTarget.nodeId).then((children) => {
      if (!cancelled) setChildCount(children.length)
    })
    return () => {
      cancelled = true
    }
  }, [deleteTarget])

  if (!deleteTarget || childCount === null) return null

  const hasChildren = childCount > 0

  return (
    <div className="dialog-overlay" onClick={closeDeleteConfirm}>
      <div className="dialog" onClick={(e) => e.stopPropagation()}>
        <h2>Delete this node?</h2>
        <p>
          {hasChildren
            ? 'This node has descendants. Deleting it will permanently delete this node and everyone beneath it in the tree.'
            : 'This will permanently delete this node.'}
        </p>
        <div className="dialog-actions">
          <button type="button" onClick={closeDeleteConfirm}>
            Cancel
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => {
              repo.deleteNodeCascade(deleteTarget.nodeId).catch(console.error)
              closeDeleteConfirm()
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
