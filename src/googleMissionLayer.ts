import type { GoogleMapsApi } from './googleMapsTypes.ts'
import { missionDestination, schoolCoordinate, SCHOOL_CENTER } from './missionCoordinates.ts'
import type { EnuPoint, MapMission } from './missionCoordinates.ts'

type MapAppearance = { readonly mapId: string; readonly routeColor: string }

export function createGoogleMissionLayer(api: GoogleMapsApi, host: HTMLElement, appearance: MapAppearance) {
  const map = new api.Map(host, {
    center: SCHOOL_CENTER, zoom: 18, maxZoom: 19, mapId: appearance.mapId,
    mapTypeControl: false, streetViewControl: false, fullscreenControl: false, gestureHandling: 'cooperative',
  })
  const route = new api.Polyline({ map, strokeColor: appearance.routeColor, strokeOpacity: 1, strokeWeight: 3 })
  const marker = (name: string, label: string, kind: string) => {
    const content = host.ownerDocument.createElement('span')
    content.className = `mission-map-marker mission-map-marker-${kind}`
    content.textContent = label
    const pin = new api.marker.AdvancedMarkerElement({ title: name })
    pin.append(content)
    return pin
  }
  const home = marker('시뮬레이션 출발 지점', '출발', 'home')
  const destination = marker('시뮬레이션 수령 지점', '수령', 'destination')
  const drone = marker('드론의 대략적인 시뮬레이션 위치', '드론', 'drone')
  let routeSignature: string | undefined
  let disposed = false

  return {
    update(mission: MapMission, position: EnuPoint | null) {
      if (disposed) return
      const target = missionDestination(mission)
      const signature = JSON.stringify([mission.route_enu, target])
      if (signature !== routeSignature) {
        routeSignature = signature
        const path = mission.route_enu.map(schoolCoordinate)
        route.setPath(path)
        const start = mission.route_enu[0]
        home.position = start ? schoolCoordinate(start) : undefined
        home.map = start ? map : null
        destination.position = target ? schoolCoordinate(target) : undefined
        destination.map = target ? map : null
        if (path.length) {
          const bounds = new api.LatLngBounds()
          for (const point of path) bounds.extend(point)
          if (target) bounds.extend(schoolCoordinate(target))
          map.fitBounds(bounds, 36)
        }
      }
      drone.position = position ? schoolCoordinate(position) : undefined
      drone.map = position ? map : null
    },
    dispose() {
      if (disposed) return
      disposed = true
      for (const instance of [home, destination, drone]) {
        instance.map = null
        api.event.clearInstanceListeners(instance)
      }
      route.setMap(null)
      api.event.clearInstanceListeners(route)
      api.event.clearInstanceListeners(map)
      map.unbindAll()
      host.replaceChildren()
    },
  }
}
