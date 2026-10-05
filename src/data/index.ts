import { IndexedDbRepository } from './indexedDbRepository'
import type { TreeRepository } from './repository'

// Swap point: a future cloud-backed repository can implement TreeRepository
// and be exported here instead, without touching any component code.
export const repo: TreeRepository = new IndexedDbRepository()

export * from './types'
export type { BoxIndex, PersonInput, TreeRepository } from './repository'
