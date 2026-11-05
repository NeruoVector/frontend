import test from 'node:test'
import assert from 'node:assert/strict'
import { missionSchema } from '../src/api.ts'
import { freshSimulation, matchingMission, flightDistance, flightEta, flightStep } from '../src/flightProgress.ts'

const id = '11111111-1111-4111-8111-111111111111'
const mission = { order_id: id, destination_id: 'lobby', phase: 'outbound', route_enu: [[0, 0, 18], [30, 37, 18], [0, 0, 18], [0, 0, .15]], waypoint_index: 1, remaining_distance_m: 110, eta_seconds: 115, delivery_distance_m: 42.3, delivery_eta_seconds: 43, arrived: false }
const state = { timestamp: 100, mode: 'flying', drone_id: 'test', position_enu: [3, 4, 18], armed: true, order_id: id, mission }

test('distance and arrival ETA use the destination leg rather than full return flight', () => {
  // Given a real multi-leg mission snapshot.
  const parsed = missionSchema.parse(mission)
  // When presenting destination progress.
  const distance = flightDistance(parsed.delivery_distance_m)
  const eta = flightEta(parsed.delivery_eta_seconds)
  // Then return distance does not inflate the arrival estimate.
  assert.equal(distance, '42.3 m')
  assert.equal(eta, '약 43초')
  assert.notEqual(distance, flightDistance(parsed.remaining_distance_m))
})

test('hold ETA remains pending rather than counting down while stopped', () => {
  // Given a held mission has no reliable arrival estimate.
  const parsed = missionSchema.parse({ ...mission, delivery_eta_seconds: null })
  // When showing the estimate.
  const text = flightEta(parsed.delivery_eta_seconds)
  // Then no made-up arrival time is shown.
  assert.equal(text, '대기 중')
})

test('stale or unrelated telemetry cannot show another orders distance', () => {
  // Given a snapshot for the selected order.
  assert.equal(matchingMission(state, id, 100000)?.delivery_distance_m, 42.3)
  // When time advances without fresh responses or another order is selected.
  const stale = matchingMission(state, id, 106000)
  const unrelated = matchingMission(state, 'another-order', 100000)
  // Then neither displays untrusted progress.
  assert.equal(stale, null)
  assert.equal(unrelated, null)
  assert.equal(matchingMission({ ...state, order_id: 'other-flight' }, id, 100000), null)
  assert.equal(freshSimulation(state, 97000), false)
})

test('invalid non-finite or negative mission values are rejected at the API boundary', () => {
  // Given malformed telemetry instead of valid metres.
  for (const value of [-1, Infinity, NaN]) {
    // When decoding it, then it must not reach the progress view.
    assert.equal(missionSchema.safeParse({ ...mission, delivery_distance_m: value }).success, false)
  }
})

test('an airborne safety hold keeps the flight step instead of reverting to preparation', () => {
  // Given an active paid order is already airborne and paused for an obstacle.
  // When presenting progress, then the aircraft has still reached the flight stage.
  assert.equal(flightStep('paid', false, true, true), 2)
  assert.equal(flightStep('paid', false, true, false), 1)
  assert.equal(flightStep('paid', true, false, false), 3)
})
