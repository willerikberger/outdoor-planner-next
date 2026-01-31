'use client'

import { usePlannerStore } from '@/lib/store'
import { cn } from '@/lib/utils'

export function Toolbar() {
  const mode = usePlannerStore((s) => s.mode)
  const pixelsPerMeter = usePlannerStore((s) => s.pixelsPerMeter)

  const modeLabel = (() => {
    switch (mode) {
      case 'calibrating':
        return 'Calibrating'
      case 'drawing-line':
        return 'Drawing Line'
      case 'drawing-mask':
        return 'Drawing Mask'
      case 'cleanup':
        return 'Cleanup Mode'
      default:
        return pixelsPerMeter ? 'Ready' : 'No Scale Set'
    }
  })()

  const modeClass = cn(
    'px-3 py-1.5 rounded text-xs font-semibold',
    mode === 'calibrating' && 'bg-[#f39c12] animate-mode-pulse',
    mode === 'drawing-line' && 'bg-[#f39c12] animate-mode-pulse',
    mode === 'drawing-mask' && 'bg-[#9b59b6] animate-mode-pulse',
    mode === 'cleanup' && 'bg-[#9b59b6] animate-mode-pulse',
    mode === 'normal' && 'bg-[#e94560]',
  )

  return (
    <div className="flex items-center gap-3 px-5 py-3 bg-[#16213e] border-b border-[#0f3460]">
      <span className={modeClass}>{modeLabel}</span>
      <span className="text-sm text-[#888]">
        {pixelsPerMeter ? (
          <>
            Scale: <strong className="text-[#4ade80]">1m = {Math.round(pixelsPerMeter)}px</strong>
          </>
        ) : (
          'Scale: Not set'
        )}
      </span>
      <span className="flex-1" />
      <span className="text-sm text-[#888]">Scroll to zoom &bull; Drag canvas to pan</span>
    </div>
  )
}
