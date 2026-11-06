import test from 'node:test'
import assert from 'node:assert/strict'
import { PHOTO_CACHE_KEY, PHOTO_CHANNEL, PHOTO_CACHE_CHARACTERS, persistPhotoCache, readPhotoCache, readPhotoFile } from '../src/productPhotos.ts'
import { ProductPhotoStore } from '../src/productPhotoSync.ts'
import { productWithPhoto } from '../src/productPhotoProducts.ts'

const id = '11111111-1111-4111-8111-111111111111'
const version = '22222222-2222-4222-8222-222222222222'
const nextVersion = '33333333-3333-4333-8333-333333333333'
const src = 'data:image/png;base64,iVBORw0KGgo='
const meta = { item_id: id, version, mime: 'image/png' }
const photo = { ...meta, src }

function browserGlobals(t, storage = new Map()) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: key => storage.get(key) ?? null,
    setItem: (key, value) => storage.set(key, value),
  } })
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'localStorage', previous); else delete globalThis.localStorage })
  return storage
}

function fileReader(t) {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'FileReader')
  Object.defineProperty(globalThis, 'FileReader', { configurable: true, value: class {
    readAsDataURL(blob) {
      blob.arrayBuffer().then(bytes => { this.result = `data:${blob.type};base64,${Buffer.from(bytes).toString('base64')}`; this.onload() })
    }
  } })
  t.after(() => { if (previous) Object.defineProperty(globalThis, 'FileReader', previous); else delete globalThis.FileReader })
}

test('cached image survives a new store instance after reload', t => {
  // Given: an image previously persisted by another page.
  browserGlobals(t)
  persistPhotoCache({ [id]: photo })
  // When: a new page initializes its store.
  const store = new ProductPhotoStore('')
  // Then: the full image is immediately available without a network request.
  assert.deepEqual(store.getSnapshot()[id], photo)
})

test('persistent cache evicts older large images and stays bounded', t => {
  // Given: two individually valid images larger than the cache together.
  const storage = browserGlobals(t)
  const second = { ...photo, item_id: nextVersion, src: `data:image/png;base64,${'A'.repeat(1_000_000)}` }
  // When: both are cached in insertion order.
  persistPhotoCache({ [id]: { ...photo, src: `data:image/png;base64,${'B'.repeat(1_000_000)}` }, [nextVersion]: second })
  // Then: only the newer image survives and the serialized cache is bounded.
  assert.ok(storage.get(PHOTO_CACHE_KEY).length <= PHOTO_CACHE_CHARACTERS)
  assert.deepEqual(Object.keys(readPhotoCache()), [nextVersion])
})

test('corrupt and untrusted cached images cannot become image sources', t => {
  // Given: cache content from an earlier or untrusted client.
  const storage = browserGlobals(t)
  for (const value of ['broken-json', JSON.stringify([{ ...photo, src: 'javascript:alert(1)' }])]) {
    storage.set(PHOTO_CACHE_KEY, value)
    // When: the browser loads the cache. Then: unsafe content is discarded.
    assert.deepEqual(readPhotoCache(), {})
  }
})

test('security and quota failures preserve usable in-memory photos', async t => {
  // Given: browser policy blocks storage and the server accepts a photo.
  browserGlobals(t)
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, get() { throw new DOMException('blocked', 'SecurityError') } })
  const store = new ProductPhotoStore('')
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { setItem() { throw new DOMException('full', 'QuotaExceededError') } } })
  t.mock.method(globalThis, 'fetch', async () => Response.json(meta))
  // When: an admin uploads with unavailable persistent storage.
  await store.upload(id, src)
  // Then: successful sharing still exposes the uploaded bytes to the UI.
  assert.equal(store.getSnapshot()[id].src, src)
})

test('public manifest discovers another device upload and downloads its bytes', async t => {
  // Given: another client uploaded a photo to the server.
  browserGlobals(t); fileReader(t)
  const calls = []
  t.mock.method(globalThis, 'fetch', async request => {
    calls.push({ path: new URL(request.url).pathname, method: request.method, cache: request.cache })
    return request.url.includes('/inventory/photos') ? Response.json([meta]) : new Response(Buffer.from('iVBORw0KGgo=', 'base64'), { headers: { 'Content-Type': 'image/png' } })
  })
  const store = new ProductPhotoStore('')
  // When: the shopper polls the shared manifest.
  await store.refresh()
  // Then: server bytes are displayed and cached without shopper authentication.
  assert.equal(store.getSnapshot()[id].src, src)
  assert.equal(readPhotoCache()[id].version, version)
  assert.deepEqual(calls.map(call => call.path), ['/api/v1/inventory/photos', `/api/v1/inventory/${id}/photo`])
  assert.ok(calls.every(call => call.cache === 'no-store' && call.method === 'GET'))
})

test('failed photo download retries next poll while retaining the server URL', async t => {
  // Given: a manifest entry whose initial binary request temporarily fails.
  browserGlobals(t); fileReader(t)
  let downloads = 0
  t.mock.method(globalThis, 'fetch', async request => {
    if (request.url.includes('/inventory/photos')) return Response.json([meta])
    downloads++
    return downloads === 1 ? new Response(null, { status: 503 }) : new Response(Buffer.from('iVBORw0KGgo=', 'base64'), { headers: { 'Content-Type': 'image/png' } })
  })
  const store = new ProductPhotoStore('')
  await store.refresh()
  assert.match(store.getSnapshot()[id].src, /\/photo\?v=/)
  // When: a later poll retries the same version.
  await store.refresh()
  // Then: the successful bytes replace the URL and become durable.
  assert.equal(store.getSnapshot()[id].src, src)
  assert.equal(downloads, 2)
})

test('slow image downloads do not block the next manifest check', async t => {
  // Given: a pending binary response on an otherwise healthy server.
  browserGlobals(t); fileReader(t)
  let release
  let started
  let manifests = 0
  const downloading = new Promise(resolve => { started = resolve })
  t.mock.method(globalThis, 'fetch', async request => {
    if (request.url.includes('/inventory/photos')) { manifests++; return Response.json([meta]) }
    started()
    return new Promise(resolve => { release = () => resolve(new Response(Buffer.from('iVBORw0KGgo=', 'base64'), { headers: { 'Content-Type': 'image/png' } })) })
  })
  const store = new ProductPhotoStore('')
  const pending = store.refresh()
  await downloading
  // When: another manifest tick runs before the image completes.
  await store.refresh()
  // Then: the shared manifest is checked again without duplicating the binary request.
  assert.equal(manifests, 2)
  release()
  await pending
})

test('upload posts cookie-authenticated JSON exactly once and exposes HTTP auth failure', async t => {
  // Given: an expired admin session.
  browserGlobals(t)
  const calls = []
  t.mock.method(globalThis, 'fetch', async request => { calls.push({ credentials: request.credentials, body: await request.json() }); return new Response(null, { status: 401 }) })
  const store = new ProductPhotoStore('')
  // When: uploading. Then: auth failure is visible and no automatic POST retry occurs.
  await assert.rejects(store.upload(id, src), error => error.status === 401)
  assert.equal(calls.length, 1)
  assert.equal(calls[0].credentials, 'same-origin')
  assert.deepEqual(calls[0].body, { image_data_url: src })
  assert.deepEqual(store.getSnapshot(), {})
})

test('same-origin BroadcastChannel replaces a photo immediately without another manifest poll', { timeout: 2000 }, async t => {
  // Given: an active shopper and a real same-origin channel.
  browserGlobals(t)
  t.mock.method(globalThis, 'fetch', async () => Response.json([]))
  const store = new ProductPhotoStore('')
  const channel = new BroadcastChannel(PHOTO_CHANNEL)
  let unsubscribe = () => {}
  t.after(() => { unsubscribe(); channel.close() })
  const received = new Promise(resolve => {
    unsubscribe = store.subscribe(() => { if (store.getSnapshot()[id]?.version === nextVersion) resolve() })
  })
  // When: an admin broadcasts server-confirmed image bytes.
  channel.postMessage({ ...photo, version: nextVersion })
  await received
  // Then: the shopper state changes with the full bytes immediately.
  assert.equal(store.getSnapshot()[id].src, src)
})

test('new photo replaces both static detail artwork and existing cart object artwork', () => {
  // Given: a product object already held in cart/selection before upload.
  const product = { id, name: '과자', image: '/old.png', detailImage: '/old-detail.png', price: 100, stock: 1, category: '과자', description: '' }
  // When: rendering it against the current shared photo snapshot.
  const visible = productWithPhoto(product, { [id]: photo })
  // Then: all artwork uses the uploaded photo while the source object stays stable.
  assert.equal(visible.image, src)
  assert.equal(visible.detailImage, src)
  assert.equal(product.image, '/old.png')
  assert.equal(productWithPhoto(product, {}), product)
})

test('oversized or unsupported files fail before FileReader is created', async () => {
  // Given: invalid image inputs. When: chosen. Then: rejected before preview/upload.
  await assert.rejects(readPhotoFile(new Blob(['<svg/>'], { type: 'image/svg+xml' })))
  await assert.rejects(readPhotoFile(new Blob([new Uint8Array(1024 * 1024 + 1)], { type: 'image/png' })))
})
