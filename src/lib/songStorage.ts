import type { GameView, ImportedSong } from '../types'

export interface SongPreferences {
  targetTrackId?: string
  view?: GameView
  speed?: number
}

interface StoredSong {
  song: ImportedSong
  preferences?: SongPreferences
}

const databaseName = 'minilab-playground'
const storeName = 'songs'
const fallbackKey = 'minilab-song-library'

function openDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(storeName, { keyPath: 'song.id' })
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

function fallbackRead(): StoredSong[] {
  try {
    return JSON.parse(localStorage.getItem(fallbackKey) ?? '[]') as StoredSong[]
  } catch {
    return []
  }
}

function fallbackWrite(songs: StoredSong[]) {
  localStorage.setItem(fallbackKey, JSON.stringify(songs))
}

export const songStorage = {
  async list(): Promise<StoredSong[]> {
    try {
      const db = await openDatabase()
      return await new Promise<StoredSong[]>((resolve, reject) => {
        const request = db.transaction(storeName, 'readonly').objectStore(storeName).getAll()
        request.onsuccess = () => resolve((request.result as StoredSong[]).sort((a, b) => b.song.importedAt - a.song.importedAt))
        request.onerror = () => reject(request.error)
      })
    } catch {
      return fallbackRead()
    }
  },

  async save(record: StoredSong) {
    try {
      const db = await openDatabase()
      await new Promise<void>((resolve, reject) => {
        const request = db.transaction(storeName, 'readwrite').objectStore(storeName).put(record)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch {
      const songs = fallbackRead().filter((item) => item.song.id !== record.song.id)
      fallbackWrite([record, ...songs])
    }
  },

  async remove(id: string) {
    try {
      const db = await openDatabase()
      await new Promise<void>((resolve, reject) => {
        const request = db.transaction(storeName, 'readwrite').objectStore(storeName).delete(id)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch {
      fallbackWrite(fallbackRead().filter((item) => item.song.id !== id))
    }
  },
}

export type { StoredSong }
