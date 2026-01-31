'use client'

import { cn } from '@/lib/utils'

interface ColorPickerProps {
  colors: readonly string[]
  selected: string
  onSelect: (color: string) => void
}

export function ColorPicker({ colors, selected, onSelect }: ColorPickerProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {colors.map((color) => {
        const displayColor = color.replace('0.6', '0.8')
        return (
          <button
            key={color}
            type="button"
            className={cn(
              'w-8 h-8 rounded-md cursor-pointer border-2 transition-transform hover:scale-110',
              selected === color ? 'border-white' : 'border-transparent',
            )}
            style={{ background: displayColor }}
            onClick={() => onSelect(color)}
          />
        )
      })}
    </div>
  )
}
