'use client'

import { usePlannerStore } from '@/lib/store'

export function StatusBar() {
  const message = usePlannerStore((s) => s.statusMessage)

  return (
    <div className="px-5 py-2 bg-[#16213e] text-xs text-[#888] border-t border-[#0f3460]">
      {message}
    </div>
  )
}
