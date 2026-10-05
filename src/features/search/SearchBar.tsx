import { useState } from 'react'
import { useReactFlow } from '@xyflow/react'
import { repo } from '../../data'
import { NODE_WIDTH, NODE_HEIGHT } from '../../layout/computeLayout'
import './search-bar.css'

interface SearchResult {
  personId: string
  nodeId: string
  name: string
}

export function SearchBar({ treeId }: { treeId: string }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const { setCenter, getNode } = useReactFlow()

  async function handleChange(value: string) {
    setQuery(value)
    if (!value.trim()) {
      setResults([])
      return
    }
    const found = await repo.searchPersonsByName(treeId, value)
    setResults(found.slice(0, 8).map((r) => ({ personId: r.person.id, nodeId: r.nodeId, name: r.person.name })))
  }

  function jumpTo(nodeId: string) {
    const flowNode = getNode(nodeId)
    if (!flowNode) return
    const width = flowNode.measured?.width ?? NODE_WIDTH
    const height = flowNode.measured?.height ?? NODE_HEIGHT
    setCenter(flowNode.position.x + width / 2, flowNode.position.y + height / 2, {
      zoom: 1.2,
      duration: 600,
    })
    setResults([])
    setQuery('')
  }

  return (
    <div className="search-bar">
      <input
        type="text"
        placeholder="Search family members..."
        value={query}
        onChange={(e) => handleChange(e.target.value)}
      />
      {results.length > 0 && (
        <ul className="search-results">
          {results.map((r) => (
            <li key={r.personId}>
              <button type="button" onClick={() => jumpTo(r.nodeId)}>
                {r.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
