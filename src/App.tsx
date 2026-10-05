import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { ReactFlowProvider } from '@xyflow/react'
import { repo } from './data'
import { TreeCanvas } from './features/tree-canvas/TreeCanvas'
import { SearchBar } from './features/search/SearchBar'
import { NodeContextMenu } from './features/context-menu/NodeContextMenu'
import { PersonEditModal } from './features/person-editor/PersonEditModal'
import { DeleteConfirmDialog } from './features/delete/DeleteConfirmDialog'
import { DensityToggle } from './features/view-controls/DensityToggle'
import { FocusBar } from './features/view-controls/FocusBar'
import { ExportButton } from './features/export/ExportButton'

function App() {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    repo.ensureTreeExists().then(() => setReady(true))
  }, [])

  const treeMeta = useLiveQuery(() => (ready ? repo.getTreeMeta() : undefined), [ready])

  if (!treeMeta) {
    return <div className="loading-screen">Loading your family tree…</div>
  }

  return (
    <ReactFlowProvider>
      <TreeCanvas treeMeta={treeMeta} />
      <SearchBar treeId={treeMeta.treeId} />
      <DensityToggle />
      <FocusBar />
      <ExportButton />
      <NodeContextMenu />
      <PersonEditModal />
      <DeleteConfirmDialog />
    </ReactFlowProvider>
  )
}

export default App
