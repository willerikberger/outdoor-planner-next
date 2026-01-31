import { describe, it, expect } from 'vitest'
import {
  distance,
  snapTo45Degrees,
  pixelsToMeters,
  metersToPixels,
  roundToDecimal,
  midpoint,
  fitImageScale,
  overlayImageScale,
} from '@/components/canvas/utils/geometry'

describe('distance', () => {
  it('returns 0 for the same point', () => {
    expect(distance({ x: 5, y: 5 }, { x: 5, y: 5 })).toBe(0)
  })

  it('computes horizontal distance', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 0 })).toBe(3)
  })

  it('computes diagonal distance (3-4-5 triangle)', () => {
    expect(distance({ x: 0, y: 0 }, { x: 3, y: 4 })).toBe(5)
  })
})

describe('snapTo45Degrees', () => {
  it('snaps near 0° to 0°', () => {
    const result = snapTo45Degrees(0, 0, 100, 5)
    expect(result.angle).toBeCloseTo(0, 5)
    expect(result.y).toBeCloseTo(0, 0)
  })

  it('snaps near 45° to 45°', () => {
    const result = snapTo45Degrees(0, 0, 100, 95)
    expect(result.angle).toBeCloseTo(Math.PI / 4, 5)
  })

  it('snaps near 90° to 90°', () => {
    const result = snapTo45Degrees(0, 0, 5, 100)
    expect(result.angle).toBeCloseTo(Math.PI / 2, 5)
    expect(result.x).toBeCloseTo(0, 0)
  })

  it('snaps near 180° to 180°', () => {
    const result = snapTo45Degrees(0, 0, -100, 5)
    expect(result.angle).toBeCloseTo(Math.PI, 5)
  })

  it('snaps near -45° to -45°', () => {
    const result = snapTo45Degrees(0, 0, 100, -95)
    expect(result.angle).toBeCloseTo(-Math.PI / 4, 5)
  })

  it('preserves distance after snapping', () => {
    const result = snapTo45Degrees(0, 0, 100, 100)
    const dist = Math.sqrt(result.x * result.x + result.y * result.y)
    const originalDist = Math.sqrt(100 * 100 + 100 * 100)
    expect(dist).toBeCloseTo(originalDist, 5)
  })

  it('handles exact boundary angle (22.5°) by rounding', () => {
    // At exactly 22.5°, should snap to either 0° or 45° (Math.round behavior)
    const angle = Math.PI / 8 // 22.5°
    const result = snapTo45Degrees(0, 0, Math.cos(angle) * 100, Math.sin(angle) * 100)
    const snapped = result.angle
    // Should be one of the 45° increments
    const normalized = snapped / (Math.PI / 4)
    expect(Math.abs(normalized - Math.round(normalized))).toBeLessThan(0.001)
  })
})

describe('pixelsToMeters / metersToPixels', () => {
  it('converts pixels to meters', () => {
    expect(pixelsToMeters(100, 50)).toBe(2)
  })

  it('converts meters to pixels', () => {
    expect(metersToPixels(2, 50)).toBe(100)
  })

  it('round-trips correctly', () => {
    const ppm = 73.5
    const meters = 5.2
    const px = metersToPixels(meters, ppm)
    expect(pixelsToMeters(px, ppm)).toBeCloseTo(meters, 10)
  })
})

describe('roundToDecimal', () => {
  it('rounds to 1 decimal place', () => {
    expect(roundToDecimal(3.456, 1)).toBe(3.5)
  })

  it('rounds to 0 decimal places', () => {
    expect(roundToDecimal(3.456, 0)).toBe(3)
  })

  it('rounds to 2 decimal places', () => {
    expect(roundToDecimal(3.456, 2)).toBe(3.46)
  })
})

describe('midpoint', () => {
  it('computes midpoint', () => {
    const result = midpoint({ x: 0, y: 0 }, { x: 10, y: 20 })
    expect(result.x).toBe(5)
    expect(result.y).toBe(10)
  })

  it('handles negative coordinates', () => {
    const result = midpoint({ x: -10, y: -20 }, { x: 10, y: 20 })
    expect(result.x).toBe(0)
    expect(result.y).toBe(0)
  })
})

describe('fitImageScale', () => {
  it('scales a large image down to fit', () => {
    const scale = fitImageScale(2000, 1000, 800, 600)
    // canvas * 0.9 = 720x540; 720/2000=0.36, 540/1000=0.54 → min = 0.36
    expect(scale).toBeCloseTo(0.36, 2)
  })

  it('can upscale a tiny image', () => {
    const scale = fitImageScale(100, 50, 800, 600)
    // 720/100=7.2, 540/50=10.8 → 7.2
    expect(scale).toBeCloseTo(7.2, 2)
  })
})

describe('overlayImageScale', () => {
  it('caps at 50% of canvas', () => {
    const scale = overlayImageScale(100, 100, 800, 600)
    // maxSize = 300; 300/100 = 3, min(3, 1) = 1
    expect(scale).toBe(1)
  })

  it('scales down large images', () => {
    const scale = overlayImageScale(1000, 1000, 800, 600)
    // maxSize = 300; 300/1000 = 0.3
    expect(scale).toBeCloseTo(0.3, 2)
  })

  it('never upscales beyond 1', () => {
    const scale = overlayImageScale(50, 50, 800, 600)
    expect(scale).toBe(1)
  })
})
