import { db } from './db'
import type { CoupleNode, Person, TreeMeta } from './types'
import type { BoxIndex, PersonInput, TreeRepository } from './repository'

const SINGLE_TREE_ID = 'local-tree'

function newTimestamps() {
  const now = Date.now()
  return { createdAt: now, updatedAt: now }
}

function makeBlankNode(treeId: string, parentNodeIds: [string | null, string | null]): CoupleNode {
  return {
    id: crypto.randomUUID(),
    treeId,
    personIds: [null, null],
    parentNodeIds,
    parentNodeIdsFlat: parentNodeIds.filter((id): id is string => !!id),
    ...newTimestamps(),
  }
}

export class IndexedDbRepository implements TreeRepository {
  async ensureTreeExists(): Promise<void> {
    const existing = await db.meta.get(SINGLE_TREE_ID)
    if (existing) return

    const anchorNode = makeBlankNode(SINGLE_TREE_ID, [null, null])
    const meta: TreeMeta = { treeId: SINGLE_TREE_ID, anchorNodeId: anchorNode.id }

    await db.transaction('rw', db.nodes, db.meta, async () => {
      const stillMissing = await db.meta.get(SINGLE_TREE_ID)
      if (stillMissing) return
      await db.nodes.add(anchorNode)
      await db.meta.add(meta)
    })
  }

  async getTreeMeta(): Promise<TreeMeta | undefined> {
    return db.meta.get(SINGLE_TREE_ID)
  }

  async getPerson(id: string): Promise<Person | undefined> {
    return db.persons.get(id)
  }

  async setNodePerson(nodeId: string, box: BoxIndex, input: PersonInput): Promise<Person> {
    const node = await db.nodes.get(nodeId)
    if (!node) throw new Error(`Node ${nodeId} not found`)

    const existingPersonId = node.personIds[box]
    const now = Date.now()

    let person: Person
    if (existingPersonId) {
      const existing = await db.persons.get(existingPersonId)
      person = {
        ...(existing as Person),
        name: input.name,
        updatedAt: now,
      }
    } else {
      person = {
        id: crypto.randomUUID(),
        treeId: node.treeId,
        name: input.name,
        createdAt: now,
        updatedAt: now,
      }
    }

    await db.transaction('rw', db.persons, db.photos, db.nodes, async () => {
      if (input.photoBlob) {
        const photoId = person.photoBlobId ?? crypto.randomUUID()
        await db.photos.put({ id: photoId, blob: input.photoBlob as Blob })
        person.photoBlobId = photoId
      }

      await db.persons.put(person)

      const personIds: [string | null, string | null] = [...node.personIds]
      personIds[box] = person.id
      await db.nodes.update(nodeId, { personIds, updatedAt: now })
    })

    return person
  }

  async getPhotoBlob(id: string): Promise<Blob | undefined> {
    const record = await db.photos.get(id)
    return record?.blob
  }

  async getNode(id: string): Promise<CoupleNode | undefined> {
    return db.nodes.get(id)
  }

  async getAllNodes(treeId: string): Promise<CoupleNode[]> {
    return db.nodes.where('treeId').equals(treeId).toArray()
  }

  async getChildren(nodeId: string): Promise<CoupleNode[]> {
    return db.nodes.where('parentNodeIdsFlat').equals(nodeId).toArray()
  }

  async addParent(nodeId: string, box: BoxIndex): Promise<CoupleNode> {
    const node = await db.nodes.get(nodeId)
    if (!node) throw new Error(`Node ${nodeId} not found`)
    if (!node.personIds[box]) {
      throw new Error('That box has no person yet; cannot add their parents.')
    }
    if (node.parentNodeIds[box] !== null) {
      throw new Error('That person already has a parent node; cannot add another.')
    }

    const parentNode = makeBlankNode(node.treeId, [null, null])

    await db.transaction('rw', db.nodes, async () => {
      await db.nodes.add(parentNode)
      const parentNodeIds: [string | null, string | null] = [...node.parentNodeIds]
      parentNodeIds[box] = parentNode.id
      await db.nodes.update(nodeId, {
        parentNodeIds,
        parentNodeIdsFlat: parentNodeIds.filter((id): id is string => !!id),
        updatedAt: Date.now(),
      })
    })

    return parentNode
  }

  async addChild(parentNodeId: string): Promise<CoupleNode> {
    const parent = await db.nodes.get(parentNodeId)
    if (!parent) throw new Error(`Node ${parentNodeId} not found`)

    const child = makeBlankNode(parent.treeId, [parentNodeId, null])
    await db.nodes.add(child)
    return child
  }

  async addSibling(nodeId: string, box: BoxIndex): Promise<CoupleNode> {
    const node = await db.nodes.get(nodeId)
    if (!node) throw new Error(`Node ${nodeId} not found`)
    if (!node.personIds[box]) {
      throw new Error('That box has no person yet; cannot add their sibling.')
    }

    let parentId = node.parentNodeIds[box]

    await db.transaction('rw', db.nodes, async () => {
      if (parentId === null) {
        // No known parents for this box yet: synthesize a shared blank parent.
        const sharedParent = makeBlankNode(node.treeId, [null, null])
        await db.nodes.add(sharedParent)
        parentId = sharedParent.id

        const parentNodeIds: [string | null, string | null] = [...node.parentNodeIds]
        parentNodeIds[box] = parentId
        await db.nodes.update(nodeId, {
          parentNodeIds,
          parentNodeIdsFlat: parentNodeIds.filter((id): id is string => !!id),
          updatedAt: Date.now(),
        })
      }
    })

    const sibling = makeBlankNode(node.treeId, [parentId, null])
    await db.nodes.add(sibling)
    return sibling
  }

  async deleteNodeCascade(nodeId: string): Promise<void> {
    const idsToDelete: string[] = []
    const queue = [nodeId]
    while (queue.length) {
      const id = queue.shift() as string
      idsToDelete.push(id)
      const children = await db.nodes.where('parentNodeIdsFlat').equals(id).toArray()
      queue.push(...children.map((c) => c.id))
    }

    await db.transaction('rw', db.nodes, db.persons, db.photos, db.meta, async () => {
      for (const id of idsToDelete) {
        const node = await db.nodes.get(id)
        if (!node) continue
        for (const personId of node.personIds) {
          if (!personId) continue
          const person = await db.persons.get(personId)
          if (person?.photoBlobId) await db.photos.delete(person.photoBlobId)
          await db.persons.delete(personId)
        }
      }
      await db.nodes.bulkDelete(idsToDelete)

      // If the anchor node itself was among the deleted, point it at a survivor
      // (or recreate a blank node if the whole tree was wiped out).
      const allMeta = await db.meta.toArray()
      const affectedMeta = allMeta.find((m) => idsToDelete.includes(m.anchorNodeId))
      if (affectedMeta) {
        const remaining = await db.nodes.where('treeId').equals(affectedMeta.treeId).toArray()
        if (remaining.length > 0) {
          await db.meta.update(affectedMeta.treeId, { anchorNodeId: remaining[0].id })
        } else {
          const blankNode = makeBlankNode(affectedMeta.treeId, [null, null])
          await db.nodes.add(blankNode)
          await db.meta.update(affectedMeta.treeId, { anchorNodeId: blankNode.id })
        }
      }
    })
  }

  async searchPersonsByName(
    treeId: string,
    query: string,
  ): Promise<Array<{ person: Person; nodeId: string }>> {
    const q = query.trim().toLowerCase()
    if (!q) return []

    const [persons, nodes] = await Promise.all([
      db.persons.where('treeId').equals(treeId).toArray(),
      db.nodes.where('treeId').equals(treeId).toArray(),
    ])

    const nodeByPersonId = new Map<string, string>()
    for (const node of nodes) {
      for (const personId of node.personIds) {
        if (personId) nodeByPersonId.set(personId, node.id)
      }
    }

    return persons
      .filter((p) => p.name.toLowerCase().includes(q))
      .map((person) => ({ person, nodeId: nodeByPersonId.get(person.id) as string }))
      .filter((r) => !!r.nodeId)
  }
}
