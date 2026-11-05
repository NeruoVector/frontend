import test from 'node:test'
import assert from 'node:assert/strict'
import { waitForIceGathering } from '../src/webrtc.ts'

class Peer extends EventTarget {
  iceGatheringState = 'gathering'
  connectionState = 'new'
  complete() { this.iceGatheringState = 'complete'; this.dispatchEvent(new Event('icegatheringstatechange')) }
  close() { this.connectionState = 'closed'; this.dispatchEvent(new Event('connectionstatechange')) }
}

test('non-trickle offer waits for TURN candidates that arrive after three seconds', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const peer = new Peer()
  let settled = false
  const pending = waitForIceGathering(peer).then(() => { settled = true })
  t.mock.timers.tick(3500)
  await Promise.resolve()
  assert.equal(settled, false, 'unfinished SDP must not be posted')
  peer.complete()
  await pending
  assert.equal(settled, true)
})

test('gathering timeout rejects instead of returning an incomplete offer', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const pending = assert.rejects(waitForIceGathering(new Peer()), /ICE/)
  t.mock.timers.tick(10000)
  await pending
})

test('closed peer cannot proceed to the WHEP request', async t => {
  t.mock.timers.enable({ apis: ['setTimeout'] })
  const peer = new Peer()
  const pending = assert.rejects(waitForIceGathering(peer), /ICE/)
  peer.close()
  t.mock.timers.tick(10000)
  await pending
})

test('already completed gathering resolves without a timer', async () => {
  const peer = new Peer()
  peer.complete()
  await waitForIceGathering(peer)
})
