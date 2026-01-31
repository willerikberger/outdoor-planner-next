'use client'

import { FileInput } from '@/components/ui/FileInput'

interface ImagePanelProps {
  onAddOverlayImage: (file: File) => void
}

export function ImagePanel({ onAddOverlayImage }: ImagePanelProps) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[#aaa] text-xs block mb-1.5">Add Overlay Image</label>
        <FileInput accept="image/*" onChange={onAddOverlayImage} label="Choose Image" />
      </div>
      <p className="text-xs text-[#666]">
        Images can be moved, resized, and layered with shapes
      </p>
    </div>
  )
}
