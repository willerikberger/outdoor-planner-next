import { describe, it, expect, beforeEach } from 'vitest'
import 'fake-indexeddb/auto'
import {
  saveProject,
  loadProject,
  clearProject,
  checkProjectExists,
} from '@/lib/storage/indexeddb'
import type { SerializedProject } from '@/lib/types'

const testProject: SerializedProject = {
  version: 2,
  pixelsPerMeter: 50,
  backgroundImage: 'data:image/png;base64,abc',
  savedAt: new Date().toISOString(),
  objects: [
    {
      id: 0,
      type: 'shape',
      name: 'Test',
      left: 100,
      top: 200,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      widthM: 2,
      heightM: 3,
      color: 'red',
      baseWidthPx: 100,
      baseHeightPx: 150,
      width: 100,
      height: 150,
    },
  ],
}

beforeEach(async () => {
  // Clear all databases between tests
  const databases = await indexedDB.databases()
  for (const db of databases) {
    if (db.name) indexedDB.deleteDatabase(db.name)
  }
})

describe('IndexedDB storage', () => {
  it('saves and loads a project', async () => {
    await saveProject(testProject)
    const loaded = await loadProject()
    expect(loaded).not.toBeNull()
    expect(loaded?.version).toBe(2)
    expect(loaded?.pixelsPerMeter).toBe(50)
    expect(loaded?.objects).toHaveLength(1)
  })

  it('returns null when no project saved', async () => {
    const loaded = await loadProject()
    expect(loaded).toBeNull()
  })

  it('clears a saved project', async () => {
    await saveProject(testProject)
    await clearProject()
    const loaded = await loadProject()
    expect(loaded).toBeNull()
  })

  it('checkProjectExists returns project when saved', async () => {
    await saveProject(testProject)
    const exists = await checkProjectExists()
    expect(exists).not.toBeNull()
  })

  it('checkProjectExists returns null when empty', async () => {
    const exists = await checkProjectExists()
    expect(exists).toBeNull()
  })

  it('overwrites existing project on save', async () => {
    await saveProject(testProject)
    const updated = { ...testProject, pixelsPerMeter: 100 }
    await saveProject(updated)
    const loaded = await loadProject()
    expect(loaded?.pixelsPerMeter).toBe(100)
  })
})
