'use client'

import { Button } from '@/components/ui/button'
import { FileInput } from '@/components/ui/FileInput'
import { usePlannerStore } from '@/lib/store'

interface CleanupPanelProps {
  onDrawMask: () => void
  onExitCleanup: () => void
  onAddCleanupImage: (file: File) => void
}

export function CleanupPanel({
  onDrawMask,
  onExitCleanup,
  onAddCleanupImage,
}: CleanupPanelProps) {
  const mode = usePlannerStore((s) => s.mode)

  return (
    <div className="bg-[#2d1f3d] border-2 border-[#9b59b6] rounded-lg p-4 mb-4">
      <h3 className="text-[#9b59b6] text-sm font-semibold mb-3">Cleanup Mode Active</h3>
      <p className="text-xs text-[#aaa] mb-3">
        Draw rectangles to hide unwanted parts of the image, or add images that become part of the background.
      </p>
      <div className="flex gap-2 mb-3">
        <Button
          variant="outline"
          className="bg-[#f39c12] hover:bg-[#f1c40f] text-black border-0"
          onClick={onDrawMask}
          disabled={mode === 'drawing-mask'}
        >
          {mode === 'drawing-mask' ? 'Drawing... Click & Drag' : 'Draw Mask Rectangle'}
        </Button>
      </div>
      <div className="mb-3">
        <label className="text-[#aaa] text-xs block mb-1.5">Add Background Image</label>
        <FileInput accept="image/*" onChange={onAddCleanupImage} label="Choose Image" />
      </div>
      <Button
        className="bg-[#27ae60] hover:bg-[#2ecc71] text-white"
        onClick={onExitCleanup}
      >
        Exit Cleanup Mode
      </Button>
    </div>
  )
}
