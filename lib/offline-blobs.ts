/**
 * IndexedDB store for files waiting to upload (photos taken offline).
 *
 * localStorage holds the queue itself, but it is small (about 5MB) and
 * strings only, so a phone photo cannot go there. IndexedDB stores the File
 * as-is and survives the app being closed.
 */

const DB_NAME = 'fieldms-offline'
const STORE = 'blobs'

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE)
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return open().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const t = db.transaction(STORE, mode)
        const req = run(t.objectStore(STORE))
        req.onsuccess = () => resolve(req.result)
        req.onerror = () => reject(req.error)
        t.oncomplete = () => db.close()
      })
  )
}

export const putBlob = (key: string, blob: Blob) => tx('readwrite', (s) => s.put(blob, key)).then(() => undefined)
export const getBlob = (key: string) => tx<Blob | undefined>('readonly', (s) => s.get(key) as IDBRequest<Blob | undefined>)
export const deleteBlob = (key: string) => tx('readwrite', (s) => s.delete(key)).then(() => undefined)
