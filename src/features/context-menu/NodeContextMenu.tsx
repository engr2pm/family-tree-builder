import { useLiveQuery } from 'dexie-react-hooks'
import { useAppStore } from '../../state/useAppStore'
import { repo, type BoxIndex } from '../../data'
import './context-menu.css'

const MENU_WIDTH = 220
const MENU_HEIGHT = 360

export function NodeContextMenu() {
  const contextMenu = useAppStore((s) => s.contextMenu)
  const closeContextMenu = useAppStore((s) => s.closeContextMenu)
  const openPersonEditor = useAppStore((s) => s.openPersonEditor)
  const openDeleteConfirm = useAppStore((s) => s.openDeleteConfirm)
  const focusNodeId = useAppStore((s) => s.focusNodeId)
  const setFocus = useAppStore((s) => s.setFocus)
  const clearFocus = useAppStore((s) => s.clearFocus)

  const node = useLiveQuery(
    () => (contextMenu ? repo.getNode(contextMenu.nodeId) : undefined),
    [contextMenu?.nodeId],
  )

  const persons = useLiveQuery(async () => {
    if (!node) return [undefined, undefined] as const
    return Promise.all(node.personIds.map((id) => (id ? repo.getPerson(id) : undefined)))
  }, [node?.personIds[0], node?.personIds[1]])

  if (!contextMenu || !node || !persons) return null

  const hasAnyPerson = node.personIds.some(Boolean)

  const items: Array<{ label: string; disabled?: boolean; onSelect: () => void }> = []

  for (const box of [0, 1] as BoxIndex[]) {
    const person = persons[box]
    if (!person) continue
    items.push({
      label: `Add parents for ${person.name}`,
      disabled: node.parentNodeIds[box] !== null,
      onSelect: () => {
        repo.addParent(node.id, box).catch(console.error)
      },
    })
    items.push({
      label: `Add a sibling for ${person.name}`,
      onSelect: () => {
        repo.addSibling(node.id, box).catch(console.error)
      },
    })
  }

  items.push({
    label: 'Add a child',
    disabled: !hasAnyPerson,
    onSelect: () => {
      repo.addChild(node.id).catch(console.error)
    },
  })
  items.push({
    label: focusNodeId === node.id ? 'Show whole tree' : 'Focus on this node',
    onSelect: () => (focusNodeId === node.id ? clearFocus() : setFocus(node.id)),
  })
  items.push({
    label: 'Update this node',
    onSelect: () => openPersonEditor(node.id, [0, 1]),
  })
  items.push({
    label: 'Delete this node',
    onSelect: () => openDeleteConfirm(node.id),
  })

  const left = Math.min(contextMenu.x, window.innerWidth - MENU_WIDTH - 8)
  const top = Math.min(contextMenu.y, window.innerHeight - MENU_HEIGHT - 8)

  return (
    <>
      <div className="menu-overlay" onClick={closeContextMenu} />
      <div className="context-menu" style={{ left, top }}>
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            className="context-menu-item"
            disabled={item.disabled}
            onClick={() => {
              item.onSelect()
              closeContextMenu()
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </>
  )
}
