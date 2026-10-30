import { useState } from 'react'
import { GoogleMapView, type MapCoordinate } from './GoogleMapView'

type Props = {
  value: MapCoordinate | null
  onChange: (coordinate: MapCoordinate | null) => void
}

function parseCoordinate(latitude: string, longitude: string): MapCoordinate | null {
  if (!latitude.trim() || !longitude.trim()) return null
  const lat = Number(latitude)
  const lon = Number(longitude)
  if (!Number.isFinite(lat) || !Number.isFinite(lon)) return null
  if (lat < -90 || lat > 90 || lon < -180 || lon > 180) return null
  return { latitude: lat, longitude: lon }
}

function locationError(error: GeolocationPositionError): string {
  switch (error.code) {
    case error.PERMISSION_DENIED: return '위치 권한을 허용한 뒤 다시 시도하세요.'
    case error.POSITION_UNAVAILABLE: return '현재 위치를 확인할 수 없습니다.'
    case error.TIMEOUT: return '위치 확인 시간이 초과되었습니다.'
    default: return '현재 위치를 확인하지 못했습니다.'
  }
}

export function LocationPicker({ value, onChange }: Props) {
  const [latitude, setLatitude] = useState(value ? String(value.latitude) : '')
  const [longitude, setLongitude] = useState(value ? String(value.longitude) : '')
  const [locating, setLocating] = useState(false)
  const [showMap, setShowMap] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function updateCoordinate(lat: string, lon: string) {
    setLatitude(lat)
    setLongitude(lon)
    const parsed = parseCoordinate(lat, lon)
    onChange(parsed)
    setError(lat && lon && !parsed ? '위도는 -90~90, 경도는 -180~180 범위로 입력하세요.' : null)
  }

  function locate() {
    setError(null)
    if (!navigator.geolocation) {
      setError('이 브라우저에서는 현재 위치를 사용할 수 없습니다.')
      return
    }
    setLocating(true)
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = String(position.coords.latitude)
        const lon = String(position.coords.longitude)
        setLatitude(lat)
        setLongitude(lon)
        onChange({ latitude: position.coords.latitude, longitude: position.coords.longitude })
        setLocating(false)
      },
      (reason) => {
        setError(locationError(reason))
        setLocating(false)
      },
      { enableHighAccuracy: true, timeout: 12_000, maximumAge: 30_000 },
    )
  }

  function pickOnMap(coordinate: MapCoordinate) {
    setLatitude(String(coordinate.latitude))
    setLongitude(String(coordinate.longitude))
    onChange(coordinate)
    setError(null)
  }

  return (
    <div className="location-picker">
      <div className="location-tools">
        <button className="button button-secondary button-small" type="button" onClick={locate} disabled={locating}>
          {locating ? '위치 확인 중…' : '현재 위치 사용'}
        </button>
        <button className="button button-secondary button-small" type="button" onClick={() => setShowMap((open) => !open)} aria-expanded={showMap}>
          {showMap ? '지도 닫기' : '지도에서 선택'}
        </button>
      </div>
      <div className="location-coordinate-fields">
        <label className="field">
          <span>위도 *</span>
          <input type="number" min="-90" max="90" step="any" value={latitude} onChange={(event) => updateCoordinate(event.target.value, longitude)} required />
        </label>
        <label className="field">
          <span>경도 *</span>
          <input type="number" min="-180" max="180" step="any" value={longitude} onChange={(event) => updateCoordinate(latitude, event.target.value)} required />
        </label>
      </div>
      {error && <p className="error small" role="alert">{error}</p>}
      {showMap && (
        <GoogleMapView
          center={value}
          markers={value ? [{ id: 'destination', ...value, label: '배송지' }] : []}
          onPick={pickOnMap}
          label="배송 위치 선택 지도"
        />
      )}
      {!showMap && value && <p className="muted small">선택 위치: {value.latitude.toFixed(6)}, {value.longitude.toFixed(6)}</p>}
    </div>
  )
}
