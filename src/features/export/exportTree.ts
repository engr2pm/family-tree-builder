import { toPng } from 'html-to-image'
import { getNodesBounds, getViewportForBounds, type Node } from '@xyflow/react'
import { jsPDF } from 'jspdf'

const EXPORT_PADDING = 0.1
const MAX_DIMENSION = 4000
const MIN_DIMENSION = 400

function computeExportSize(bounds: { width: number; height: number }) {
  const paddedWidth = bounds.width * (1 + EXPORT_PADDING * 2)
  const paddedHeight = bounds.height * (1 + EXPORT_PADDING * 2)
  const scale = Math.min(1, MAX_DIMENSION / Math.max(paddedWidth, paddedHeight, 1))
  return {
    width: Math.max(MIN_DIMENSION, Math.round(paddedWidth * scale)),
    height: Math.max(MIN_DIMENSION, Math.round(paddedHeight * scale)),
  }
}

/**
 * Rasterizes the whole tree (every node, not just what's currently panned/
 * zoomed into view) by temporarily overriding the viewport's transform for
 * the capture only — html-to-image applies these to a clone, so the live
 * app never visibly changes. Capturing `.react-flow__viewport` specifically
 * (rather than the whole `.react-flow` container) naturally excludes the
 * background dots, minimap, controls, and our own overlay UI, since those
 * render as siblings of the viewport, not inside it.
 */
async function captureTreePng(
  nodes: Node[],
): Promise<{ dataUrl: string; width: number; height: number }> {
  if (nodes.length === 0) throw new Error('Nothing to export yet')

  const viewportEl = document.querySelector('.react-flow__viewport')
  if (!(viewportEl instanceof HTMLElement)) throw new Error('Tree canvas not found')

  const bounds = getNodesBounds(nodes)
  const { width, height } = computeExportSize(bounds)
  const viewport = getViewportForBounds(bounds, width, height, 0.1, 2, EXPORT_PADDING)

  const dataUrl = await toPng(viewportEl, {
    backgroundColor: '#ffffff',
    width,
    height,
    pixelRatio: 2,
    style: {
      width: `${width}px`,
      height: `${height}px`,
      transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
    },
  })

  return { dataUrl, width, height }
}

export async function exportTreeAsPng(nodes: Node[], filename = 'family-tree.png'): Promise<void> {
  const { dataUrl } = await captureTreePng(nodes)
  const a = document.createElement('a')
  a.href = dataUrl
  a.download = filename
  a.click()
}

export async function exportTreeAsPdf(nodes: Node[], filename = 'family-tree.pdf'): Promise<void> {
  const { dataUrl, width, height } = await captureTreePng(nodes)
  const pdf = new jsPDF({
    orientation: width >= height ? 'landscape' : 'portrait',
    unit: 'px',
    format: [width, height],
  })
  pdf.addImage(dataUrl, 'PNG', 0, 0, width, height)
  pdf.save(filename)
}
