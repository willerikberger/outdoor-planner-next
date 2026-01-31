'use client'

import { useEffect, useRef, useImperativeHandle, forwardRef, useCallback } from 'react'
import type { Canvas, Rect, Line } from 'fabric'
import { useFabricCanvas } from './hooks/useFabricCanvas'
import { usePanZoom } from './hooks/usePanZoom'
import { useCalibration } from './hooks/useCalibration'
import { useShapes } from './hooks/useShapes'
import { useLines } from './hooks/useLines'
import { useImages } from './hooks/useImages'
import { useCleanup } from './hooks/useCleanup'
import { useCanvasEvents } from './hooks/useCanvasEvents'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { usePlannerStore } from '@/lib/store'
import type { ShapeFabricRefs, LineFabricRefs, MaskFabricRefs, ImageFabricRefs, SerializedObject } from '@/lib/types'
import { AUTOSAVE_DEBOUNCE_MS } from '@/lib/constants'
import { serializeProject, deserializeProject } from '@/components/canvas/utils/serialization'
import { saveProject as saveToIDB, loadProject as loadFromIDB, clearProject as clearIDB } from '@/lib/storage/indexeddb'
import { downloadProjectAsJson, importProjectFromFile } from '@/lib/storage/json-export'

export interface PlannerCanvasHandle {
  // Calibration
  startCalibration: () => void
  cancelCalibration: () => void
  applyCalibration: (meters: number) => void
  // Shapes
  addShape: (name: string, widthM: number, heightM: number) => void
  // Lines
  startLineDrawing: () => void
  cancelLineDrawing: () => void
  // Images
  loadBackgroundImage: (file: File) => void
  addOverlayImage: (file: File) => void
  // Cleanup
  enterCleanupMode: () => void
  exitCleanupMode: () => void
  startDrawingMask: () => void
  addCleanupImage: (file: File) => void
  // Objects
  selectObject: (id: number) => void
  deleteObject: (id: number) => void
  deleteSelected: () => void
  clearAll: () => void
  moveObjectUp: (id: number) => void
  moveObjectDown: (id: number) => void
  selectedObjectId: () => number | null
  // Storage
  save: () => Promise<void>
  load: () => Promise<void>
  clearStorage: () => Promise<void>
  exportJson: () => void
  importJson: (file: File) => Promise<void>
  toggleAutoSave: () => void
  // Reorder
  reorderObjects: () => void
}

// Union type for all fabric refs
type AnyFabricRefs = ShapeFabricRefs | LineFabricRefs | MaskFabricRefs | ImageFabricRefs

export const PlannerCanvas = forwardRef<PlannerCanvasHandle>(function PlannerCanvas(_, ref) {
  const { canvasElRef, containerRef, fabricCanvasRef, initCanvas } = useFabricCanvas()

  // Single shared Map for all fabric refs, cast as needed by hooks
  const allFabricRefsRef = useRef(new Map<number, AnyFabricRefs>())

  // Auto-save timer ref
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initialize canvas on mount
  useEffect(() => {
    initCanvas()
  }, [initCanvas])

  // Hooks (pass fabricCanvasRef + fabricRefsRef)
  const panZoom = usePanZoom(fabricCanvasRef)
  const calibration = useCalibration(fabricCanvasRef)
  const shapes = useShapes(
    fabricCanvasRef,
    allFabricRefsRef as React.RefObject<Map<number, ShapeFabricRefs>>,
  )
  const lines = useLines(
    fabricCanvasRef,
    allFabricRefsRef as React.RefObject<Map<number, LineFabricRefs>>,
  )
  const images = useImages(
    fabricCanvasRef,
    allFabricRefsRef as React.RefObject<Map<number, ImageFabricRefs>>,
  )
  const cleanup = useCleanup(
    fabricCanvasRef,
    allFabricRefsRef as React.RefObject<Map<number, MaskFabricRefs | ImageFabricRefs>>,
  )

  // Object management
  const deleteObject = useCallback(
    (id: number) => {
      const canvas = fabricCanvasRef.current
      if (!canvas) return
      const refs = allFabricRefsRef.current.get(id)
      if (refs) {
        if ('rect' in refs) canvas.remove(refs.rect)
        if ('label' in refs) canvas.remove(refs.label)
        if ('dims' in refs) canvas.remove(refs.dims)
        if ('line' in refs) {
          canvas.remove(refs.line)
          if ('label' in refs) canvas.remove(refs.label)
        }
        if ('image' in refs) canvas.remove(refs.image)
        allFabricRefsRef.current.delete(id)
      }
      usePlannerStore.getState().removeObject(id)
      canvas.renderAll()
      triggerAutoSave()
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fabricCanvasRef],
  )

  const deleteSelected = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    const active = canvas.getActiveObjects()
    for (const fo of active) {
      const foAny = fo as unknown as Record<string, unknown>
      if (foAny.objectType === 'background') continue
      const id = foAny.objectId as number | undefined
      if (id != null) {
        deleteObject(id)
      }
    }
    canvas.discardActiveObject()
    canvas.renderAll()
  }, [fabricCanvasRef, deleteObject])

  const clearAll = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    const store = usePlannerStore.getState()
    const toRemove: number[] = []
    for (const [id, obj] of store.objects) {
      if (obj.type === 'shape' || obj.type === 'overlayImage' || obj.type === 'line') {
        toRemove.push(id)
      }
    }
    for (const id of toRemove) {
      deleteObject(id)
    }
    canvas.renderAll()
  }, [fabricCanvasRef, deleteObject])

  const selectObject = useCallback(
    (id: number) => {
      const canvas = fabricCanvasRef.current
      if (!canvas) return
      const refs = allFabricRefsRef.current.get(id)
      if (refs) {
        const obj = 'rect' in refs ? refs.rect : 'line' in refs ? refs.line : 'image' in refs ? refs.image : null
        if (obj) {
          canvas.setActiveObject(obj)
          canvas.renderAll()
        }
      }
    },
    [fabricCanvasRef],
  )

  const reorderObjects = useCallback(() => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    let idx = 0

    // Background image first
    if (images.backgroundRef.current) {
      canvas.moveObjectTo(images.backgroundRef.current, 0)
      idx = 1
    }

    const store = usePlannerStore.getState()
    // Masks
    for (const obj of store.objects.values()) {
      if (obj.type === 'mask') {
        const refs = allFabricRefsRef.current.get(obj.id)
        if (refs && 'rect' in refs) {
          canvas.moveObjectTo(refs.rect, idx++)
        }
      }
    }
    // Background images
    for (const obj of store.objects.values()) {
      if (obj.type === 'backgroundImage') {
        const refs = allFabricRefsRef.current.get(obj.id)
        if (refs && 'image' in refs) {
          canvas.moveObjectTo(refs.image, idx++)
        }
      }
    }
    canvas.renderAll()
  }, [fabricCanvasRef, images.backgroundRef])

  const moveObjectUp = useCallback(
    (id: number) => {
      const canvas = fabricCanvasRef.current
      if (!canvas) return
      const refs = allFabricRefsRef.current.get(id)
      if (!refs) return
      const obj = 'rect' in refs ? refs.rect : 'line' in refs ? refs.line : 'image' in refs ? refs.image : null
      if (!obj) return
      const objects = canvas.getObjects()
      const currentIdx = objects.indexOf(obj)
      if (currentIdx < objects.length - 1) {
        canvas.moveObjectTo(obj, currentIdx + 1)
        canvas.renderAll()
      }
    },
    [fabricCanvasRef],
  )

  const moveObjectDown = useCallback(
    (id: number) => {
      const canvas = fabricCanvasRef.current
      if (!canvas) return
      const refs = allFabricRefsRef.current.get(id)
      if (!refs) return
      const obj = 'rect' in refs ? refs.rect : 'line' in refs ? refs.line : 'image' in refs ? refs.image : null
      if (!obj) return
      const objects = canvas.getObjects()
      const currentIdx = objects.indexOf(obj)
      const store = usePlannerStore.getState()
      const minIdx = Array.from(store.objects.values()).filter(
        (o) => o.type === 'mask' || o.type === 'backgroundImage',
      ).length + (images.backgroundRef.current ? 1 : 0)
      if (currentIdx > minIdx) {
        canvas.moveObjectTo(obj, currentIdx - 1)
        canvas.renderAll()
      }
    },
    [fabricCanvasRef, images.backgroundRef],
  )

  // Auto-save
  const triggerAutoSave = useCallback(() => {
    const store = usePlannerStore.getState()
    if (!store.autoSaveEnabled) return
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current)
    autoSaveTimerRef.current = setTimeout(async () => {
      const s = usePlannerStore.getState()
      const objects = Array.from(s.objects.values())
      const data = serializeProject(
        s.pixelsPerMeter,
        s.backgroundImageData,
        objects,
        (id) => getFabricState(id),
      )
      await saveToIDB(data)
      s.setStatusMessage('Saved to browser storage')
    }, AUTOSAVE_DEBOUNCE_MS)
  }, [])

  const getFabricState = (id: number) => {
    const refs = allFabricRefsRef.current.get(id)
    if (!refs) return null
    if ('rect' in refs && !('label' in refs)) {
      // mask
      const r = refs.rect
      return {
        left: r.left ?? 0,
        top: r.top ?? 0,
        scaleX: r.scaleX ?? 1,
        scaleY: r.scaleY ?? 1,
        angle: r.angle ?? 0,
        width: r.width,
        height: r.height,
      }
    }
    if ('rect' in refs && 'label' in refs) {
      // shape
      const r = refs.rect
      const rAny = r as unknown as Record<string, unknown>
      return {
        left: r.left ?? 0,
        top: r.top ?? 0,
        scaleX: r.scaleX ?? 1,
        scaleY: r.scaleY ?? 1,
        angle: r.angle ?? 0,
        width: r.width,
        height: r.height,
        baseWidthPx: rAny.baseWidthPx as number,
        baseHeightPx: rAny.baseHeightPx as number,
      }
    }
    if ('line' in refs) {
      const l = refs.line
      return {
        left: l.left ?? 0,
        top: l.top ?? 0,
        scaleX: l.scaleX ?? 1,
        scaleY: l.scaleY ?? 1,
        angle: l.angle ?? 0,
        x1: l.x1,
        y1: l.y1,
        x2: l.x2,
        y2: l.y2,
        strokeWidth: l.strokeWidth,
      }
    }
    if ('image' in refs) {
      const img = refs.image
      return {
        left: img.left ?? 0,
        top: img.top ?? 0,
        scaleX: img.scaleX ?? 1,
        scaleY: img.scaleY ?? 1,
        angle: img.angle ?? 0,
        originX: String(img.originX ?? 'left'),
        originY: String(img.originY ?? 'top'),
      }
    }
    return null
  }

  // Storage operations
  const save = useCallback(async () => {
    const s = usePlannerStore.getState()
    const objects = Array.from(s.objects.values())
    const data = serializeProject(s.pixelsPerMeter, s.backgroundImageData, objects, getFabricState)
    await saveToIDB(data)
    s.setStatusMessage('Saved to browser storage')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const loadProjectFromData = useCallback(
    async (serializedObjects: SerializedObject[]) => {
      for (const sObj of serializedObjects) {
        switch (sObj.type) {
          case 'shape':
            shapes.loadShape(sObj)
            break
          case 'line':
            lines.loadLine(sObj)
            break
          case 'mask':
            cleanup.loadMask(sObj)
            break
          case 'backgroundImage':
          case 'overlayImage':
            await images.loadImageObject(sObj)
            break
        }
      }
      reorderObjects()
      fabricCanvasRef.current?.renderAll()
    },
    [shapes, lines, cleanup, images, reorderObjects, fabricCanvasRef],
  )

  const load = useCallback(async () => {
    const data = await loadFromIDB()
    if (!data) {
      usePlannerStore.getState().setStatusMessage('No saved project found')
      return
    }
    // Clear current
    const canvas = fabricCanvasRef.current
    if (!canvas) return
    // Remove all objects
    for (const [id] of allFabricRefsRef.current) {
      deleteObject(id)
    }
    if (images.backgroundRef.current) {
      canvas.remove(images.backgroundRef.current)
      images.backgroundRef.current = null
    }
    usePlannerStore.getState().clearObjects()

    const deserialized = deserializeProject(data)
    usePlannerStore.getState().setPixelsPerMeter(deserialized.pixelsPerMeter)

    if (deserialized.backgroundImageData) {
      usePlannerStore.getState().setBackgroundImageData(deserialized.backgroundImageData)
      await images.loadBackgroundFromData(deserialized.backgroundImageData, () => {
        loadProjectFromData(deserialized.serializedObjects)
      })
    } else {
      await loadProjectFromData(deserialized.serializedObjects)
    }
    usePlannerStore.getState().setStatusMessage('Loaded from browser storage')
  }, [fabricCanvasRef, deleteObject, images, loadProjectFromData])

  const clearStorage = useCallback(async () => {
    await clearIDB()
    usePlannerStore.getState().setStatusMessage('Browser storage cleared')
  }, [])

  const exportJson = useCallback(() => {
    const s = usePlannerStore.getState()
    const objects = Array.from(s.objects.values())
    const data = serializeProject(s.pixelsPerMeter, s.backgroundImageData, objects, getFabricState)
    downloadProjectAsJson(data)
    s.setStatusMessage('Project exported successfully')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const importJson = useCallback(
    async (file: File) => {
      const data = await importProjectFromFile(file)
      const canvas = fabricCanvasRef.current
      if (!canvas) return
      // Clear current
      for (const [id] of allFabricRefsRef.current) {
        deleteObject(id)
      }
      if (images.backgroundRef.current) {
        canvas.remove(images.backgroundRef.current)
        images.backgroundRef.current = null
      }
      usePlannerStore.getState().clearObjects()

      const deserialized = deserializeProject(data)
      usePlannerStore.getState().setPixelsPerMeter(deserialized.pixelsPerMeter)

      if (deserialized.backgroundImageData) {
        usePlannerStore.getState().setBackgroundImageData(deserialized.backgroundImageData)
        await images.loadBackgroundFromData(deserialized.backgroundImageData, () => {
          loadProjectFromData(deserialized.serializedObjects)
        })
      } else {
        await loadProjectFromData(deserialized.serializedObjects)
      }
      usePlannerStore.getState().setStatusMessage('Project imported')
    },
    [fabricCanvasRef, deleteObject, images, loadProjectFromData],
  )

  const toggleAutoSave = useCallback(() => {
    const store = usePlannerStore.getState()
    const next = !store.autoSaveEnabled
    store.setAutoSaveEnabled(next)
    if (next) {
      triggerAutoSave()
    }
  }, [triggerAutoSave])

  const getSelectedObjectId = useCallback((): number | null => {
    const canvas = fabricCanvasRef.current
    if (!canvas) return null
    const active = canvas.getActiveObject()
    if (!active) return null
    return (active as unknown as Record<string, unknown>).objectId as number ?? null
  }, [fabricCanvasRef])

  // Canvas events
  useCanvasEvents(fabricCanvasRef, {
    handleCalibrationClick: calibration.handleCalibrationClick,
    updateCalibrationLine: calibration.updateCalibrationLine,
    finishCalibrationLine: calibration.finishCalibrationLine,
    startPointRef: calibration.startPointRef,
    handleLineDrawStart: lines.handleLineDrawStart,
    updateDrawingLine: lines.updateDrawingLine,
    finishDrawingLine: lines.finishDrawingLine,
    lineStartRef: lines.lineStartRef,
    updateLineLabel: lines.updateLineLabel,
    handleMaskDrawStart: cleanup.handleMaskDrawStart,
    updateMaskRect: cleanup.updateMaskRect,
    finishMaskRect: cleanup.finishMaskRect,
    updateShapeLabels: shapes.updateShapeLabels,
    updateShapeDimensions: shapes.updateShapeDimensions,
    startPan: panZoom.startPan,
    movePan: panZoom.movePan,
    endPan: panZoom.endPan,
    isPanningRef: panZoom.isPanningRef,
    deleteSelected,
    reorderObjects,
    triggerAutoSave,
  })

  // Keyboard shortcuts
  useKeyboardShortcuts(fabricCanvasRef, {
    cancelCalibration: calibration.cancelCalibration,
    cancelLineDrawing: lines.cancelLineDrawing,
    deleteSelected,
  })

  // Expose imperative handle
  useImperativeHandle(ref, () => ({
    startCalibration: calibration.startCalibration,
    cancelCalibration: calibration.cancelCalibration,
    applyCalibration: calibration.applyCalibration,
    addShape: shapes.addShape,
    startLineDrawing: lines.startLineDrawing,
    cancelLineDrawing: lines.cancelLineDrawing,
    loadBackgroundImage: images.loadBackgroundImage,
    addOverlayImage: images.addOverlayImage,
    enterCleanupMode: cleanup.enterCleanupMode,
    exitCleanupMode: cleanup.exitCleanupMode,
    startDrawingMask: cleanup.startDrawingMask,
    addCleanupImage: cleanup.addCleanupImage,
    selectObject,
    deleteObject,
    deleteSelected,
    clearAll,
    moveObjectUp,
    moveObjectDown,
    selectedObjectId: getSelectedObjectId,
    save,
    load,
    clearStorage,
    exportJson,
    importJson,
    toggleAutoSave,
    reorderObjects,
  }))

  return (
    <div ref={containerRef} className="flex-1 relative overflow-hidden">
      <canvas ref={canvasElRef} />
    </div>
  )
})
