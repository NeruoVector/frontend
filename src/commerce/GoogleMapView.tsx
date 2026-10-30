import { useEffect, useRef, useState } from 'react'
import { loadGoogleMaps } from './googleMaps'
import { markerViewport } from './mapMarkerViewport'
import type { MapCoordinate, MapMarker, MarkerViewport } from './mapMarkerViewport'
export type { MapCoordinate, MapMarker } from './mapMarkerViewport'

type Props = {
  center?: MapCoordinate | null
  markers?: readonly MapMarker[]
  onPick?: (coordinate: MapCoordinate) => void
  label: string
}

type MapState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready' }

const seoulCenter: MapCoordinate = { latitude: 37.5665, longitude: 126.978 }

function assertNever(viewport: never): never {
  throw new Error(`Unhandled map viewport: ${JSON.stringify(viewport)}`)
}

export function GoogleMapView({ center, markers = [], onPick, label }: Props) {
  const container = useRef<HTMLDivElement | null>(null)
  const map = useRef<google.maps.Map | null>(null)
  const mapMarkers = useRef<google.maps.Marker[]>([])
  const lastViewportFit = useRef<{ map: google.maps.Map; key: string } | null>(null)
  const onPickRef = useRef(onPick)
  const centerRef = useRef(center)
  const [state, setState] = useState<MapState>({ status: 'loading' })
  const [retryKey, setRetryKey] = useState(0)
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY?.trim() ?? ''

  useEffect(() => {
    onPickRef.current = onPick
  }, [onPick])

  useEffect(() => {
    centerRef.current = center
  }, [center])

  useEffect(() => {
    if (!apiKey) return

    let cancelled = false
    let clickListener: google.maps.MapsEventListener | null = null
    void loadGoogleMaps(apiKey)
      .then((maps) => {
        const element = container.current
        if (cancelled || !element) return
        const selectedCenter = centerRef.current
        const initial = selectedCenter ?? seoulCenter
        const instance = new maps.Map(element, {
          center: { lat: initial.latitude, lng: initial.longitude },
          zoom: selectedCenter ? 16 : 12,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
          clickableIcons: false,
        })
        map.current = instance
        clickListener = instance.addListener('click', (event: google.maps.MapMouseEvent) => {
          const point = event.latLng
          if (!point) return
          onPickRef.current?.({ latitude: point.lat(), longitude: point.lng() })
        })
        setState({ status: 'ready' })
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setState({ status: 'error', message: error instanceof Error ? error.message : '지도를 표시하지 못했습니다.' })
        }
      })

    return () => {
      cancelled = true
      clickListener?.remove()
      for (const marker of mapMarkers.current) marker.setMap(null)
      mapMarkers.current = []
      map.current = null
      lastViewportFit.current = null
    }
  }, [apiKey, retryKey])

  useEffect(() => {
    const instance = map.current
    if (!instance) return
    const centerLatitude = center?.latitude
    const centerLongitude = center?.longitude
    if (centerLatitude !== undefined && centerLongitude !== undefined) {
      instance.setCenter({ lat: centerLatitude, lng: centerLongitude })
      instance.setZoom(16)
      lastViewportFit.current = null
    } else {
      const viewport: MarkerViewport = markerViewport(markers)
      switch (viewport.kind) {
        case 'none':
          lastViewportFit.current = null
          break
        case 'single':
          if (lastViewportFit.current?.map !== instance || lastViewportFit.current.key !== viewport.key) {
            instance.setCenter({ lat: viewport.marker.latitude, lng: viewport.marker.longitude })
            instance.setZoom(16)
            lastViewportFit.current = { map: instance, key: viewport.key }
          }
          break
        case 'bounds':
          if (lastViewportFit.current?.map !== instance || lastViewportFit.current.key !== viewport.key) {
            const bounds = new google.maps.LatLngBounds()
            for (const marker of viewport.markers) {
              bounds.extend({ lat: marker.latitude, lng: marker.longitude })
            }
            instance.fitBounds(bounds)
            lastViewportFit.current = { map: instance, key: viewport.key }
          }
          break
        default:
          assertNever(viewport)
      }
    }
    for (const marker of mapMarkers.current) marker.setMap(null)
    mapMarkers.current = markers.map((marker) => new google.maps.Marker({
      map: instance,
      position: { lat: marker.latitude, lng: marker.longitude },
      title: marker.label,
      label: marker.label.slice(0, 1),
    }))
  }, [center?.latitude, center?.longitude, markers, state.status])

  if (!apiKey) {
    return (
      <div className="map-fallback" role="status">
        <strong>{label}</strong>
        <p>지도 API 키가 설정되지 않았습니다.</p>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="map-fallback" role="status">
        <strong>{label}</strong>
        <p>{state.message}</p>
        <button className="button button-secondary button-small" type="button" onClick={() => { setState({ status: 'loading' }); setRetryKey((key) => key + 1) }}>다시 시도</button>
      </div>
    )
  }

  return (
    <div className="google-map-shell" aria-label={label}>
      {state.status === 'loading' && <div className="map-fallback" role="status">실제 지도를 불러오고 있습니다.</div>}
      <div className="google-map-canvas" ref={container} />
      {onPick && <p className="muted small map-hint">지도에서 위치를 누르면 좌표가 선택됩니다.</p>}
    </div>
  )
}
