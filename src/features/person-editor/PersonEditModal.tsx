import { useEffect, useState } from 'react'
import { useAppStore } from '../../state/useAppStore'
import { repo } from '../../data'
import type { BoxIndex } from '../../data'
import { PhotoPicker } from './PhotoPicker'
import '../../styles/dialog.css'
import './person-editor.css'

interface BoxFormState {
  name: string
  photoBlob: Blob | null
  photoPreviewUrl: string | null
}

function emptyForm(): BoxFormState {
  return { name: '', photoBlob: null, photoPreviewUrl: null }
}

export function PersonEditModal() {
  const editTarget = useAppStore((s) => s.editTarget)
  const closePersonEditor = useAppStore((s) => s.closePersonEditor)

  const [forms, setForms] = useState<Record<number, BoxFormState>>({})

  useEffect(() => {
    if (!editTarget) return
    let cancelled = false

    async function load() {
      const node = await repo.getNode(editTarget!.nodeId)
      if (!node || cancelled) return
      const next: Record<number, BoxFormState> = {}
      for (const box of editTarget!.boxes) {
        const personId = node.personIds[box]
        if (personId) {
          const person = await repo.getPerson(personId)
          const photoBlob = person?.photoBlobId ? await repo.getPhotoBlob(person.photoBlobId) : undefined
          next[box] = {
            name: person?.name ?? '',
            photoBlob: null,
            photoPreviewUrl: photoBlob ? URL.createObjectURL(photoBlob) : null,
          }
        } else {
          next[box] = emptyForm()
        }
      }
      if (!cancelled) setForms(next)
    }

    load()
    return () => {
      cancelled = true
    }
  }, [editTarget])

  if (!editTarget) return null

  function updateForm(box: number, patch: Partial<BoxFormState>) {
    setForms((prev) => ({ ...prev, [box]: { ...(prev[box] ?? emptyForm()), ...patch } }))
  }

  async function handleSave() {
    for (const box of editTarget!.boxes) {
      const form = forms[box]
      if (!form || !form.name.trim()) continue
      await repo.setNodePerson(editTarget!.nodeId, box as BoxIndex, {
        name: form.name.trim(),
        photoBlob: form.photoBlob,
      })
    }
    closePersonEditor()
  }

  return (
    <div className="dialog-overlay" onClick={closePersonEditor}>
      <div className="dialog person-editor" onClick={(e) => e.stopPropagation()}>
        <h2>{editTarget.boxes.length > 1 ? 'Update this node' : 'Edit person'}</h2>
        <div className="person-editor-forms">
          {editTarget.boxes.map((box) => {
            const form = forms[box] ?? emptyForm()
            return (
              <div className="person-editor-form" key={box}>
                <PhotoPicker
                  previewUrl={form.photoPreviewUrl}
                  onPick={(blob, previewUrl) => updateForm(box, { photoBlob: blob, photoPreviewUrl: previewUrl })}
                />
                <input
                  type="text"
                  placeholder="Name"
                  value={form.name}
                  onChange={(e) => updateForm(box, { name: e.target.value })}
                />
              </div>
            )
          })}
        </div>
        <div className="dialog-actions">
          <button type="button" onClick={closePersonEditor}>
            Cancel
          </button>
          <button type="button" className="primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
