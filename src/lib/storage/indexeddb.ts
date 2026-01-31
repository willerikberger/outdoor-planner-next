import type { SerializedProject } from '@/lib/types'
import { DB_NAME, DB_VERSION, STORE_NAME, STORAGE_KEY } from '@/lib/constants'

export function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
  })
}

export async function saveProject(data: SerializedProject): Promise<void> {
  const db = await openDatabase()
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const projectData = { ...data, id: STORAGE_KEY }
    await new Promise<void>((resolve, reject) => {
      const request = store.put(projectData)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

export async function loadProject(): Promise<SerializedProject | null> {
  const db = await openDatabase()
  try {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const data = await new Promise<SerializedProject | undefined>((resolve, reject) => {
      const request = store.get(STORAGE_KEY)
      request.onsuccess = () => resolve(request.result as SerializedProject | undefined)
      request.onerror = () => reject(request.error)
    })
    return data ?? null
  } finally {
    db.close()
  }
}

export async function clearProject(): Promise<void> {
  const db = await openDatabase()
  try {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    await new Promise<void>((resolve, reject) => {
      const request = store.delete(STORAGE_KEY)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

export async function checkProjectExists(): Promise<SerializedProject | null> {
  try {
    return await loadProject()
  } catch {
    return null
  }
}
