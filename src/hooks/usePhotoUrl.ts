import { useEffect, useState } from 'react'
import { repo } from '../data'

export function usePhotoUrl(photoBlobId: string | undefined): string | undefined {
  const [url, setUrl] = useState<string | undefined>(undefined)

  useEffect(() => {
    if (!photoBlobId) {
      setUrl(undefined)
      return
    }

    let cancelled = false
    let objectUrl: string | undefined

    repo.getPhotoBlob(photoBlobId).then((blob) => {
      if (cancelled || !blob) return
      objectUrl = URL.createObjectURL(blob)
      setUrl(objectUrl)
    })

    return () => {
      cancelled = true
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [photoBlobId])

  return url
}
