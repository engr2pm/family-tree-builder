import Dexie, { type Table } from 'dexie'
import type { CoupleNode, Person, PhotoRecord, TreeMeta } from './types'

export class FamilyTreeDB extends Dexie {
  persons!: Table<Person, string>
  nodes!: Table<CoupleNode, string>
  photos!: Table<PhotoRecord, string>
  meta!: Table<TreeMeta, string>

  constructor() {
    super('FamilyTreeDB')
    this.version(1).stores({
      persons: 'id, treeId, name',
      nodes: 'id, treeId, parentNodeId',
      photos: 'id',
      meta: 'treeId',
    })
    // v2: ancestry moved from one parentNodeId per node to one per box
    // (parentNodeIds), since two spouses generally have independent parents.
    // This is a breaking shape change made during early development, before
    // any real user data exists, so the upgrade just clears the old test data
    // rather than migrating it.
    this.version(2)
      .stores({
        persons: 'id, treeId, name',
        nodes: 'id, treeId, *parentNodeIdsFlat',
        photos: 'id',
        meta: 'treeId',
      })
      .upgrade(async (tx) => {
        await tx.table('nodes').clear()
        await tx.table('persons').clear()
        await tx.table('photos').clear()
        await tx.table('meta').clear()
      })
  }
}

export const db = new FamilyTreeDB()
