import test from 'node:test'
import assert from 'node:assert/strict'
import { schoolCoordinate, missionDestination } from '../src/missionCoordinates.ts'

test('campus center maps to the approximate school location rather than physics origin', () => {
  // Given the campus center at ENU(30,30).
  const center = [30, 30, 18]
  // When displaying its map position.
  const coordinate = schoolCoordinate(center)
  // Then it is anchored to the school, independent of the simulator GPS origin.
  assert.deepEqual(coordinate, { lat: 37.54250, lng: 126.96639 })
})

test('east and north metres retain scale and direction near the school', () => {
  // Given a point 100m east and 100m north of the display anchor.
  const point = [130, 130, 18]
  // When projecting it onto the geographic map.
  const result = schoolCoordinate(point)
  // Then the offset is about 0.000898 latitude and 0.001133 longitude degrees.
  assert.ok(Math.abs(result.lat - 37.5433983153) < 1e-9)
  assert.ok(Math.abs(result.lng - 126.967523) < 1e-6)
})

test('altitude does not shift the horizontal map position', () => {
  // Given matching ENU horizontal positions with different altitude.
  const ground = [0, 0, .15]
  // When displaying an airborne coordinate.
  const airborne = schoolCoordinate([0, 0, 40])
  // Then the marker stays over the same ground point.
  assert.deepEqual(airborne, schoolCoordinate(ground))
})

test('explicit destination stays correct when route gains intermediate waypoints', () => {
  // Given the first intermediate waypoint differs from the actual destination.
  const mission = { route_enu: [[0, 0, 18], [10, 10, 18], [55, 65, 18], [0, 0, 18]], destination_enu: [55, 65, .15] }
  // When selecting the pickup marker.
  const destination = missionDestination(mission)
  // Then it uses the destination snapshot.
  assert.deepEqual(destination, [55, 65, .15])
})

test('legacy routes retain their second waypoint pickup marker', () => {
  // Given an old mission without a destination snapshot.
  const mission = { route_enu: [[0, 0, 18], [30, 37, 18], [0, 0, 18]] }
  // When selecting its pickup marker.
  const destination = missionDestination(mission)
  // Then the legacy second waypoint remains supported.
  assert.deepEqual(destination, [30, 37, 18])
})
