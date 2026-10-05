import { useRef } from 'react'
import type { PointerEvent as ReactPointerEvent, MouseEvent as ReactMouseEvent } from 'react'

const LONG_PRESS_MS = 500
const MOVE_CANCEL_THRESHOLD_PX = 10

/**
 * Unifies long-press (touch/pen) and right-click (mouse) into one
 * "open context menu at this point" trigger, so callers implement the menu once.
 */
export function useContextMenuTrigger(onTrigger: (x: number, y: number) => void) {
  const timerRef = useRef<number | null>(null)
  const startPos = useRef<{ x: number; y: number } | null>(null)

  const clearTimer = () => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current)
      timerRef.current = null
    }
  }

  const onPointerDown = (e: ReactPointerEvent) => {
    if (e.pointerType === 'mouse') return
    startPos.current = { x: e.clientX, y: e.clientY }
    clearTimer()
    const { clientX, clientY } = e
    timerRef.current = window.setTimeout(() => {
      onTrigger(clientX, clientY)
    }, LONG_PRESS_MS)
  }

  const onPointerMove = (e: ReactPointerEvent) => {
    if (!startPos.current) return
    const dx = e.clientX - startPos.current.x
    const dy = e.clientY - startPos.current.y
    if (Math.hypot(dx, dy) > MOVE_CANCEL_THRESHOLD_PX) clearTimer()
  }

  const onPointerUp = () => clearTimer()
  const onPointerCancel = () => clearTimer()

  const onContextMenu = (e: ReactMouseEvent) => {
    e.preventDefault()
    onTrigger(e.clientX, e.clientY)
  }

  return { onContextMenu, onPointerDown, onPointerMove, onPointerUp, onPointerCancel }
}
