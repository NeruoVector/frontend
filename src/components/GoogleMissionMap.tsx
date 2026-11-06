import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { googleMapsLoader } from '../googleMapsLoader.ts'
import { createGoogleMissionLayer } from '../googleMissionLayer.ts'
import type { EnuPoint, MapMission } from '../missionCoordinates.ts'

type Props = {
  readonly apiKey: string
  readonly mission: MapMission
  readonly position: EnuPoint | null
  readonly fallback: ReactNode
}

export function GoogleMissionMap({ apiKey, mission, position, fallback }: Props) {
  const host = useRef<HTMLDivElement>(null)
  const layer = useRef<ReturnType<typeof createGoogleMissionLayer> | null>(null)
  const latest = useRef({ mission, position })
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  useEffect(() => {
    latest.current = { mission, position }
    layer.current?.update(mission, position)
  }, [mission, position])

  useEffect(() => {
    const element = host.current
    if (!element) return
    let active = true
    let usable = true
    const loader = googleMapsLoader()
    const unsubscribe = loader.onAuthenticationFailure(() => {
      if (!active) return
      usable = false
      layer.current?.dispose()
      layer.current = null
      setStatus('error')
    })
    // This effect owns the external API boundary and turns failures into the route diagram.
    void loader.load(apiKey).then(api => {
      if (!active || !usable) return
      const scene = createGoogleMissionLayer(api, element, {
        mapId: import.meta.env.VITE_GOOGLE_MAPS_MAP_ID?.trim() || 'DEMO_MAP_ID',
        routeColor: getComputedStyle(element).getPropertyValue('--brand').trim(),
      })
      layer.current = scene
      scene.update(latest.current.mission, latest.current.position)
      setStatus('ready')
    }).catch((error: unknown) => {
      if (!active) return
      if (error instanceof Error) {
        layer.current?.dispose()
        layer.current = null
        setStatus('error')
        return
      }
      throw error
    })
    return () => {
      active = false
      unsubscribe()
      layer.current?.dispose()
      layer.current = null
    }
  }, [apiKey])

  return <>
    <div ref={host} className="mission-map-canvas" hidden={status === 'error'} role="region" aria-label="선린인터넷고 주변의 대략적인 시뮬레이션 경로" />
    {status === 'loading' && <p className="mission-map-status" role="status">Google 지도 불러오는 중…</p>}
    {status === 'error' && <>
      <p className="mission-map-status" role="status">Google 지도를 불러오지 못해 경로 도식을 표시합니다.</p>
      {fallback}
    </>}
  </>
}
