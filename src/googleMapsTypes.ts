import type { MapCoordinate } from './missionCoordinates.ts'

// Narrow structural surface of the external Maps JS API; no SDK dependency.
export interface GoogleMap {
  fitBounds(bounds: GoogleBounds, padding: number): void
  unbindAll(): void
}
export interface GoogleBounds { extend(point: MapCoordinate): GoogleBounds }
export interface GooglePolyline {
  setPath(path: readonly MapCoordinate[]): void
  setMap(map: GoogleMap | null): void
}
export interface GoogleMarker {
  map: GoogleMap | null
  position: MapCoordinate | undefined
  append(...nodes: Node[]): void
}
export interface GoogleMapsApi {
  readonly Map: new (host: HTMLElement, options: {
    readonly center: MapCoordinate; readonly zoom: number; readonly maxZoom: number; readonly mapId: string
    readonly mapTypeControl: boolean; readonly streetViewControl: boolean; readonly fullscreenControl: boolean
    readonly gestureHandling: string
  }) => GoogleMap
  readonly LatLngBounds: new () => GoogleBounds
  readonly Polyline: new (options: {
    readonly map: GoogleMap; readonly strokeColor: string; readonly strokeOpacity: number; readonly strokeWeight: number
  }) => GooglePolyline
  readonly marker: {
    readonly AdvancedMarkerElement: new (options: {
      readonly title: string
    }) => GoogleMarker
  }
  readonly event: { clearInstanceListeners(instance: object): void }
}

export interface GoogleMapsWindow {
  readonly google?: { readonly maps?: GoogleMapsApi }
  __nvGoogleMapsReady?: () => void
  gm_authFailure?: () => void
}

declare global {
  interface Window extends GoogleMapsWindow {}
}
