import { useLiveQuery } from 'dexie-react-hooks'
import { repo } from '../data'
import type { CoupleNode, Person } from '../data/types'

export interface TreeData {
  nodes: CoupleNode[]
  personsById: Map<string, Person>
}

export function useTreeData(treeId: string | undefined): TreeData | undefined {
  return useLiveQuery(async () => {
    if (!treeId) return undefined
    const nodes = await repo.getAllNodes(treeId)
    const personIds = Array.from(
      new Set(nodes.flatMap((n) => n.personIds.filter((id): id is string => !!id))),
    )
    const persons = await Promise.all(personIds.map((id) => repo.getPerson(id)))
    const personsById = new Map<string, Person>()
    for (const p of persons) if (p) personsById.set(p.id, p)
    return { nodes, personsById }
  }, [treeId])
}
