import test from 'node:test'
import assert from 'node:assert/strict'
import { createGoogleMissionLayer } from '../src/googleMissionLayer.ts'
import { schoolCoordinate } from '../src/missionCoordinates.ts'

// The provider API is the narrow external seam: these doubles record its commands.
function mapHarness() {
  const maps = []
  const lines = []
  const markers = []
  const cleared = []
  const host = {
    ownerDocument: { createElement: () => ({}) },
    empty: false,
    replaceChildren() { this.empty = true },
  }
  const api = {
    Map: class {
      fits = []
      unbound = false
      constructor() { maps.push(this) }
      fitBounds(bounds) { this.fits.push(bounds.points) }
      unbindAll() { this.unbound = true }
    },
    LatLngBounds: class {
      points = []
      extend(point) { this.points.push(point); return this }
    },
    Polyline: class {
      paths = []
      constructor(options) { this.map = options.map; lines.push(this) }
      setPath(path) { this.paths.push(path) }
      setMap(map) { this.map = map }
    },
    marker: {
      AdvancedMarkerElement: class {
        constructor(options) { this.title = options.title; markers.push(this) }
        append(content) { this.content = content }
      },
    },
    event: { clearInstanceListeners: instance => cleared.push(instance) },
  }
  const layer = createGoogleMissionLayer(api, host, { mapId: 'DEMO_MAP_ID', routeColor: '#c21f3a' })
  return { maps, lines, markers, cleared, host, layer }
}

const mission = { route_enu: [[0, 0, 18], [10, 10, 18], [55, 65, 18], [0, 0, 18]], destination_enu: [55, 65, .15] }

test('telemetry updates move the drone without replacing the map or resetting user pan', () => {
  // Given an initialized route and a user-adjusted viewport.
  const harness = mapHarness()
  harness.layer.update(mission, [1, 2, 18])
  // When an equivalent new mission object and fresh position arrive at 1Hz.
  harness.layer.update(structuredClone(mission), [5, 7, 18])
  // Then only the moving marker changes; route and bounds stay intact.
  assert.equal(harness.maps.length, 1)
  assert.equal(harness.maps[0].fits.length, 1)
  assert.equal(harness.lines[0].paths.length, 1)
  assert.deepEqual(harness.markers[2].position, schoolCoordinate([5, 7, 18]))
  harness.layer.dispose()
})

test('changed route refreshes the polyline and fits all waypoints and explicit pickup', () => {
  // Given an initialized map with an older route.
  const harness = mapHarness()
  harness.layer.update(mission, null)
  const changed = { ...mission, route_enu: [[0, 0, 18], [20, 15, 18], [55, 65, 18], [0, 0, 18]], destination_enu: [60, 70, .15] }
  // When the route and explicit destination change.
  harness.layer.update(changed, [3, 4, 18])
  // Then the same map presents the new full route and actual pickup snapshot.
  assert.equal(harness.maps.length, 1)
  assert.deepEqual(harness.lines[0].paths[1], changed.route_enu.map(schoolCoordinate))
  assert.deepEqual(harness.maps[0].fits[1], [...changed.route_enu.map(schoolCoordinate), schoolCoordinate(changed.destination_enu)])
  assert.deepEqual(harness.markers[1].position, schoolCoordinate(changed.destination_enu))
  harness.layer.dispose()
})

test('stale or missing position hides the drone without removing the route', () => {
  // Given a visible drone and route.
  const harness = mapHarness()
  harness.layer.update(mission, [5, 7, 18])
  // When the parent withholds stale telemetry.
  harness.layer.update(mission, null)
  // Then stale location is detached while the planned route remains available.
  assert.equal(harness.markers[2].map, null)
  assert.equal(harness.markers[2].position, undefined)
  assert.equal(harness.lines[0].map, harness.maps[0])
  harness.layer.dispose()
})

test('dispose detaches provider objects and ignores delayed telemetry updates', () => {
  // Given a map with live overlays.
  const harness = mapHarness()
  harness.layer.update(mission, [5, 7, 18])
  // When its owner unmounts, including repeated cleanup and late telemetry.
  harness.layer.dispose()
  harness.layer.dispose()
  harness.layer.update(mission, [20, 20, 18])
  // Then overlays and listeners are released and cannot remount themselves.
  assert.ok(harness.markers.every(marker => marker.map === null))
  assert.equal(harness.lines[0].map, null)
  assert.equal(harness.maps[0].unbound, true)
  assert.equal(harness.host.empty, true)
  assert.equal(harness.cleared.length, 5)
  assert.equal(harness.maps[0].fits.length, 1)
})
