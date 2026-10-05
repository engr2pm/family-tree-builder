import { useRef } from 'react'
import type { ChangeEvent } from 'react'
import { resizeImageToBlob } from '../../utils/image'

interface PhotoPickerProps {
  previewUrl: string | null
  onPick: (blob: Blob, previewUrl: string) => void
}

export function PhotoPicker({ previewUrl, onPick }: PhotoPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    const blob = await resizeImageToBlob(file)
    onPick(blob, URL.createObjectURL(blob))
  }

  return (
    <button type="button" className="photo-picker" onClick={() => inputRef.current?.click()}>
      {previewUrl ? <img src={previewUrl} alt="" /> : <span>Add photo</span>}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleChange} />
    </button>
  )
}
