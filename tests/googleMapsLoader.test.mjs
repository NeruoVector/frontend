import test from 'node:test'
import assert from 'node:assert/strict'
import { createGoogleMapsLoader } from '../src/googleMapsLoader.ts'

function environment(timeoutMs = 1000) {
  const scripts = []
  const window = {}
  const document = {
    createElement: () => ({ removed: false, remove() { this.removed = true } }),
    head: { append: script => scripts.push(script) },
  }
  return { window, document, scripts, timeoutMs }
}

function complete(env) {
  env.window.google = { maps: { marker: { AdvancedMarkerElement: class {} } } }
  env.window.__nvGoogleMapsReady()
}

test('missing key fails without contacting Google', async () => {
  // Given a loader with no configured browser key.
  const env = environment()
  // When loading the map, then no external script is appended.
  await assert.rejects(createGoogleMapsLoader(env).load('  '), { reason: 'missing-key' })
  assert.equal(env.scripts.length, 0)
})

test('concurrent mounts share one script and resolve only on the API callback', async () => {
  // Given two map mounts requesting the same API.
  const env = environment()
  const loader = createGoogleMapsLoader(env)
  // When the provider signals that its API is ready.
  const first = loader.load('test-public-browser-key')
  const second = loader.load('test-public-browser-key')
  complete(env)
  // Then both consumers receive the shared API with no duplicate load.
  assert.equal(first, second)
  assert.equal(env.scripts.length, 1)
  assert.equal(await first, env.window.google.maps)
  assert.equal(env.window.__nvGoogleMapsReady, undefined)
  assert.equal(env.scripts[0].onerror, null)
})

test('blocked script fails cleanly instead of waiting forever', async () => {
  // Given a pending provider script.
  const env = environment()
  const result = createGoogleMapsLoader(env).load('test-public-browser-key')
  // When the network rejects the script.
  env.scripts[0].onerror()
  // Then callers receive a usable failure and the failed element is removed.
  await assert.rejects(result, { reason: 'network' })
  assert.equal(env.scripts[0].removed, true)
  assert.equal(env.window.__nvGoogleMapsReady, undefined)
})

test('unresponsive provider reaches a bounded failure state', async context => {
  // Given a provider that never invokes its callback.
  context.mock.timers.enable({ apis: ['setTimeout'] })
  const env = environment(15000)
  const result = createGoogleMapsLoader(env).load('test-public-browser-key')
  const rejection = assert.rejects(result, { reason: 'timeout' })
  // When the loading deadline expires.
  context.mock.timers.tick(15000)
  // Then the caller can show the route fallback.
  await rejection
  assert.equal(env.scripts[0].removed, true)
})

test('late authentication failure notifies mounted maps and unsubscribed maps stay detached', async () => {
  // Given one mounted and one already unmounted map after a successful API load.
  const env = environment()
  const loader = createGoogleMapsLoader(env)
  const result = loader.load('test-public-browser-key')
  complete(env)
  await result
  let activeCalls = 0
  let detachedCalls = 0
  loader.onAuthenticationFailure(() => { activeCalls += 1 })
  const unsubscribe = loader.onAuthenticationFailure(() => { detachedCalls += 1 })
  unsubscribe()
  // When Google later rejects the key or billing configuration.
  env.window.gm_authFailure()
  // Then only mounted consumers are notified and future loads reject.
  assert.equal(activeCalls, 1)
  assert.equal(detachedCalls, 0)
  await assert.rejects(loader.load('test-public-browser-key'), { reason: 'authentication' })
})
