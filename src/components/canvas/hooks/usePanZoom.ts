'use client'

import { useRef, useEffect } from 'react'
import { Point as FabricPoint } from 'fabric'
import type { Canvas, TPointerEventInfo } from 'fabric'
import { ZOOM_MIN, ZOOM_MAX } from '@/lib/constants'
import { usePlannerStore } from '@/lib/store'

export function usePanZoom(fabricCanvasRef: React.RefObject<Canvas | null>) {
  const isPanningRef = useRef(false)
  const lastPosRef = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return

    const handleWheel = (opt: TPointerEventInfo<WheelEvent>) => {
      const e = opt.e
      const delta = e.deltaY
      let zoom = canvas.getZoom()
      zoom *= 0.999 ** delta
      zoom = Math.min(Math.max(ZOOM_MIN, zoom), ZOOM_MAX)
      canvas.zoomToPoint(new FabricPoint(e.offsetX, e.offsetY), zoom)
      e.preventDefault()
      e.stopPropagation()

      const pct = Math.round(zoom * 100)
      const store = usePlannerStore.getState()
      const count = Array.from(store.objects.values()).filter(
        (o) => o.type === 'shape' || o.type === 'line' || o.type === 'overlayImage',
      ).length
      store.setStatusMessage(`Zoom: ${pct}% | ${count} object(s)`)
    }

    canvas.on('mouse:wheel', handleWheel as never)
    return () => {
      canvas.off('mouse:wheel', handleWheel as never)
    }
  }, [fabricCanvasRef])

  const startPan = (clientX: number, clientY: number) => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    isPanningRef.current = true
    canvas.selection = false
    lastPosRef.current = { x: clientX, y: clientY }
  }

  const movePan = (clientX: number, clientY: number) => {
    const canvas = fabricCanvasRef.current
    if (!canvas || !isPanningRef.current) return
    const vpt = canvas.viewportTransform!
    vpt[4] += clientX - lastPosRef.current.x
    vpt[5] += clientY - lastPosRef.current.y
    canvas.requestRenderAll()
    lastPosRef.current = { x: clientX, y: clientY }
  }

  const endPan = () => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    isPanningRef.current = false
    canvas.selection = true
  }

  return { isPanningRef, startPan, movePan, endPan }
}
