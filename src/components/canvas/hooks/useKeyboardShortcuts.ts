'use client'

import { useEffect } from 'react'
import type { Canvas } from 'fabric'
import { usePlannerStore } from '@/lib/store'

export function useKeyboardShortcuts(
  fabricCanvasRef: React.RefObject<Canvas | null>,
  actions: {
    cancelCalibration: () => void
    cancelLineDrawing: () => void
    deleteSelected: () => void
  },
) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const canvas = fabricCanvasRef.current
      if (!canvas) return
      const target = e.target as HTMLElement

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA') {
          e.preventDefault()
          actions.deleteSelected()
        }
      }

      if (e.key === 'Escape') {
        const mode = usePlannerStore.getState().mode
        if (mode === 'calibrating') actions.cancelCalibration()
        if (mode === 'drawing-line') actions.cancelLineDrawing()
        if (mode === 'drawing-mask') {
          usePlannerStore.getState().setMode('cleanup')
          canvas.defaultCursor = 'default'
          canvas.selection = true
        }
        canvas.discardActiveObject()
        canvas.renderAll()
      }
    }

    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [fabricCanvasRef, actions])
}
