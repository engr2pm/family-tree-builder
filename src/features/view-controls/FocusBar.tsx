import { useLiveQuery } from 'dexie-react-hooks'
import { useAppStore } from '../../state/useAppStore'
import { repo } from '../../data'
import './view-controls.css'

export function FocusBar() {
  const focusNodeId = useAppStore((s) => s.focusNodeId)
  const maxGenerations = useAppStore((s) => s.maxGenerations)
  const setMaxGenerations = useAppStore((s) => s.setMaxGenerations)
  const clearFocus = useAppStore((s) => s.clearFocus)

  const label = useLiveQuery(async () => {
    if (!focusNodeId) return null
    const focusNode = await repo.getNode(focusNodeId)
    if (!focusNode) return null
    const names = await Promise.all(
      focusNode.personIds.map((id) => (id ? repo.getPerson(id) : undefined)),
    )
    return names.filter(Boolean).map((p) => p!.name).join(' & ') || 'this node'
  }, [focusNodeId])

  if (!focusNodeId) return null

  return (
    <div className="focus-bar">
      <span className="focus-bar-label">Focused on {label ?? '…'}</span>
      <div className="focus-bar-stepper">
        <button
          type="button"
          onClick={() => setMaxGenerations(maxGenerations - 1)}
          disabled={maxGenerations <= 1}
          aria-label="Fewer generations"
        >
          −
        </button>
        <span>{maxGenerations} gen</span>
        <button
          type="button"
          onClick={() => setMaxGenerations(maxGenerations + 1)}
          disabled={maxGenerations >= 10}
          aria-label="More generations"
        >
          +
        </button>
      </div>
      <button type="button" className="focus-bar-clear" onClick={clearFocus}>
        Show whole tree
      </button>
    </div>
  )
}
