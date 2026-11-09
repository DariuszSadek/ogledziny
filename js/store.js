// Bufor roboczy w IndexedDB (wyłącznie autozapis; źródłem prawdy jest plik sprawy).
const DB = 'ogledziny', STORE = 'kv', BLOBS = 'blobs';
function open() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB, 2);
    r.onupgradeneeded = () => { const db = r.result; if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE); if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS); };
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  });
}
export async function kvGet(key) {
  const db = await open();
  return new Promise((res, rej) => {
    const q = db.transaction(STORE).objectStore(STORE).get(key);
    q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error);
  });
}
export async function kvPut(key, val) {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(val, key);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error);
  });
}

// Załączniki (obrazy z akt): osobny magazyn, żeby autozapis sprawy nie przepisywał obrazów.
// Zapis jako ArrayBuffer (pewniejszy w Safari niż Blob).
export async function blobPut(key, blob) {
  const buf = await blob.arrayBuffer();
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction(BLOBS, 'readwrite');
    tx.objectStore(BLOBS).put({ buf, type: blob.type, size: buf.byteLength }, key);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); tx.onabort = () => rej(tx.error || new Error('abort'));
  });
}
export async function blobGet(key) {
  const db = await open();
  return new Promise((res, rej) => {
    const q = db.transaction(BLOBS).objectStore(BLOBS).get(key);
    q.onsuccess = () => res(q.result ? new Blob([q.result.buf], { type: q.result.type }) : null); q.onerror = () => rej(q.error);
  });
}
export async function blobDel(key) {
  const db = await open();
  return new Promise((res, rej) => {
    const tx = db.transaction(BLOBS, 'readwrite'); tx.objectStore(BLOBS).delete(key);
    tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error);
  });
}
export async function blobKeys() {
  const db = await open();
  return new Promise((res, rej) => { const q = db.transaction(BLOBS).objectStore(BLOBS).getAllKeys(); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); });
}
