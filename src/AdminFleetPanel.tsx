import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { apiUrl, errorMessage, readApiError } from './api'
import {
  activeDeliveryStatuses,
  adminJson,
  deliveryLabel,
  deliveryListSchema,
  emptyFleetForm,
  fleetDroneSchema,
  fleetFormFrom,
  fleetListSchema,
  numberField,
  payloadMeasurementSchema,
  type Delivery,
  type FleetDrone,
  type FleetDroneInput,
  type FleetForm,
  type PayloadMeasurement,
} from './adminFleetApi'

export function AdminFleetPanel({ onSessionExpired }: { onSessionExpired: () => void }) {
  const [fleet, setFleet] = useState<readonly FleetDrone[]>([])
  const [deliveries, setDeliveries] = useState<readonly Delivery[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<FleetForm>({ ...emptyFleetForm })
  const [selectedDrone, setSelectedDrone] = useState('')
  const [selectedDelivery, setSelectedDelivery] = useState('')
  const [measuredGrams, setMeasuredGrams] = useState('')
  const [saving, setSaving] = useState(false)
  const [measuring, setMeasuring] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [measurement, setMeasurement] = useState<PayloadMeasurement | null>(null)

  const refresh = useCallback(async (signal?: AbortSignal, showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const [fleetData, deliveryData] = await Promise.all([
        adminJson('/api/v1/admin/fleet', fleetListSchema, { signal, cache: 'no-store' }, onSessionExpired),
        adminJson('/api/v1/deliveries?limit=500', deliveryListSchema, { signal, cache: 'no-store' }, onSessionExpired),
      ])
      setFleet(fleetData)
      setDeliveries(deliveryData)
      setSelectedDrone((current) => fleetData.some((drone) => drone.active && drone.drone_id === current)
        ? current
        : fleetData.find((drone) => drone.active)?.drone_id || '')
      setLoadError(null)
    } catch (error) {
      if (signal?.aborted) return
      setLoadError(errorMessage(error))
    } finally {
      if (!signal?.aborted) setLoading(false)
    }
  }, [onSessionExpired])

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const [fleetData, deliveryData] = await Promise.all([
          adminJson('/api/v1/admin/fleet', fleetListSchema, { signal: controller.signal, cache: 'no-store' }, onSessionExpired),
          adminJson('/api/v1/deliveries?limit=500', deliveryListSchema, { signal: controller.signal, cache: 'no-store' }, onSessionExpired),
        ])
        if (controller.signal.aborted) return
        setFleet(fleetData)
        setDeliveries(deliveryData)
        setSelectedDrone((current) => current || fleetData.find((drone) => drone.active)?.drone_id || '')
        setLoadError(null)
      } catch (error) {
        if (!controller.signal.aborted) setLoadError(errorMessage(error))
      } finally {
        if (!controller.signal.aborted) setLoading(false)
      }
    }
    void load()
    return () => controller.abort()
  }, [onSessionExpired])

  const activeDrones = useMemo(() => fleet.filter((drone) => drone.active), [fleet])
  const activeDeliveries = useMemo(() => deliveries.filter((delivery) =>
    delivery.drone_id === selectedDrone && activeDeliveryStatuses.has(delivery.status),
  ), [deliveries, selectedDrone])
  const selectedDeliveryIsActive = activeDeliveries.some((delivery) => delivery.id === selectedDelivery)

  async function submitFleet(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionError(null)
    setNotice(null)
    const droneId = form.drone_id.trim()
    if (!droneId || droneId.length > 64 || !/^[A-Za-z0-9._-]+$/.test(droneId)) {
      setActionError('드론 ID는 영문, 숫자, 점, 밑줄, 하이픈으로 1~64자 입력하세요.')
      return
    }
    let payload: FleetDroneInput
    try {
      const capacity = numberField(form.capacity_grams, '적재 용량', 1, 2_147_483_647)
      if (!Number.isInteger(capacity)) throw new Error('적재 용량은 정수 그램으로 입력하세요.')
      payload = {
        drone_id: droneId,
        capacity_grams: capacity,
        home_latitude: numberField(form.home_latitude, '홈 위도', -90, 90),
        home_longitude: numberField(form.home_longitude, '홈 경도', -180, 180),
        cruise_speed_mps: numberField(form.cruise_speed_mps, '순항 속도', 0.1, 100),
        max_altitude_m: numberField(form.max_altitude_m, '최대 고도', 1, 120),
        active: form.active,
      }
    } catch (error) {
      setActionError(errorMessage(error))
      return
    }
    setSaving(true)
    try {
      await adminJson('/api/v1/admin/fleet', fleetDroneSchema, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }, onSessionExpired)
      setNotice(`드론 ${droneId} 설정을 저장했습니다.`)
      setEditing(null)
      setForm({ ...emptyFleetForm })
      await refresh()
    } catch (error) {
      setActionError(errorMessage(error))
    } finally {
      setSaving(false)
    }
  }

  async function deactivate(drone: FleetDrone) {
    setActionError(null)
    setNotice(null)
    try {
      const response = await fetch(apiUrl(`/api/v1/admin/fleet/${encodeURIComponent(drone.drone_id)}`), {
        method: 'DELETE',
        credentials: 'include',
      })
      if (response.status === 401) {
        onSessionExpired()
        throw new Error('관리자 세션이 만료되었습니다. 다시 로그인하세요.')
      }
      if (!response.ok) throw new Error(await readApiError(response))
      if (editing === drone.drone_id) {
        setEditing(null)
        setForm({ ...emptyFleetForm })
      }
      setNotice(`드론 ${drone.drone_id}을 비활성화했습니다.`)
      await refresh()
    } catch (error) {
      setActionError(errorMessage(error))
    }
  }

  async function submitMeasurement(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionError(null)
    setNotice(null)
    const weight = Number(measuredGrams)
    if (!selectedDrone || !activeDrones.some((drone) => drone.drone_id === selectedDrone) || !selectedDeliveryIsActive) {
      setActionError('드론과 진행 중인 배송을 선택하세요.')
      return
    }
    if (!Number.isInteger(weight) || weight < 0 || weight > 2_147_483_647) {
      setActionError('측정 무게는 0~2,147,483,647 사이의 정수 그램으로 입력하세요.')
      return
    }
    setMeasuring(true)
    try {
      const saved = await adminJson(
        `/api/v1/admin/fleet/${encodeURIComponent(selectedDrone)}/payload-measurements`,
        payloadMeasurementSchema,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ delivery_id: selectedDelivery, weight_grams: weight }),
        },
        onSessionExpired,
      )
      setMeasurement(saved)
      setMeasuredGrams('')
      setNotice('관리자가 입력한 신뢰 측정값을 배송 기록에 저장했습니다.')
    } catch (error) {
      setActionError(errorMessage(error))
    } finally {
      setMeasuring(false)
    }
  }

  return (
    <section className="fleet-workspace" aria-labelledby="admin-fleet-title">
      <div className="panel-head fleet-section-head">
        <div><h2 id="admin-fleet-title">배송 드론 운영</h2><p className="muted small">용량과 홈 위치는 스케줄링에 사용됩니다. payload 무게 입력은 관리자 수동 측정으로 기록합니다.</p></div>
        <button className="button button-secondary button-small" type="button" onClick={() => void refresh()} disabled={loading}>새로고침</button>
      </div>
      {loadError && <p className="error" role="alert">드론/배송 정보를 불러오지 못했습니다: {loadError}</p>}
      {actionError && <p className="error action-error" role="alert">{actionError}</p>}
      {notice && <p className="notice" role="status">{notice}</p>}

      <section className="panel fleet-panel" aria-labelledby="fleet-config-title">
        <div className="panel-head"><div><h3 id="fleet-config-title">드론 용량과 홈 위치</h3><p className="muted small">ID가 있는 항목을 수정하면 기존 설정을 갱신합니다.</p></div></div>
        <form className="form-grid fleet-form" onSubmit={(event) => void submitFleet(event)}>
          <label className="field"><span>드론 ID *</span><input value={form.drone_id} onChange={(event) => setForm({ ...form, drone_id: event.target.value })} disabled={editing !== null} maxLength={64} required /></label>
          <label className="field"><span>적재 용량 (g) *</span><input type="number" min="1" max="2147483647" step="1" value={form.capacity_grams} onChange={(event) => setForm({ ...form, capacity_grams: event.target.value })} required /></label>
          <label className="field"><span>순항 속도 (m/s) *</span><input type="number" min="0.1" max="100" step="0.1" value={form.cruise_speed_mps} onChange={(event) => setForm({ ...form, cruise_speed_mps: event.target.value })} required /></label>
          <label className="field"><span>홈 위도 *</span><input type="number" min="-90" max="90" step="any" value={form.home_latitude} onChange={(event) => setForm({ ...form, home_latitude: event.target.value })} required /></label>
          <label className="field"><span>홈 경도 *</span><input type="number" min="-180" max="180" step="any" value={form.home_longitude} onChange={(event) => setForm({ ...form, home_longitude: event.target.value })} required /></label>
          <label className="field"><span>최대 고도 (m) *</span><input type="number" min="1" max="120" step="any" value={form.max_altitude_m} onChange={(event) => setForm({ ...form, max_altitude_m: event.target.value })} required /></label>
          <label className="field checkbox-field"><span>운영 상태</span><span className="checkbox"><input type="checkbox" checked={form.active} onChange={(event) => setForm({ ...form, active: event.target.checked })} /> 활성</span></label>
          <div className="form-actions field-wide"><button className="button" type="submit" disabled={saving}>{saving ? '저장 중…' : editing ? '설정 저장' : '드론 등록'}</button><button className="button button-secondary" type="button" onClick={() => { setEditing(null); setForm({ ...emptyFleetForm }) }}>초기화</button></div>
        </form>
        {loading && fleet.length === 0 && <p className="muted" role="status">등록된 드론을 불러오는 중…</p>}
        {!loading && !loadError && fleet.length === 0 && <p className="muted">등록된 배송 드론이 없습니다.</p>}
        {fleet.length > 0 && <div className="scroll"><table className="table fleet-table"><thead><tr><th>드론</th><th>용량</th><th>홈 위치</th><th>속도</th><th>상태</th><th>관리</th></tr></thead><tbody>{fleet.map((drone) => <tr key={drone.drone_id}><td>{drone.drone_id}</td><td>{drone.capacity_grams.toLocaleString('ko-KR')} g</td><td>{drone.home_latitude.toFixed(5)}, {drone.home_longitude.toFixed(5)}</td><td>{drone.cruise_speed_mps} m/s</td><td>{drone.active ? '활성' : '비활성'}</td><td><div className="row-actions"><button className="link-button" type="button" onClick={() => { setEditing(drone.drone_id); setForm(fleetFormFrom(drone)) }}>수정</button>{drone.active && <button className="link-button" type="button" onClick={() => void deactivate(drone)}>비활성화</button>}</div></td></tr>)}</tbody></table></div>}
      </section>

      <section className="panel fleet-panel" aria-labelledby="payload-measurement-title">
        <div className="panel-head"><div><h3 id="payload-measurement-title">배송 적재 무게 기록</h3><p className="muted small">입력값은 센서값이 아니라 관리자가 확인해 입력한 수동 측정값입니다.</p></div></div>
        <form className="form-grid payload-measurement-form" onSubmit={(event) => void submitMeasurement(event)}>
          <label className="field"><span>활성 드론 *</span><select value={selectedDrone} onChange={(event) => { setSelectedDrone(event.target.value); setSelectedDelivery(''); setMeasurement(null) }} required><option value="">드론 선택</option>{activeDrones.map((drone) => <option key={drone.drone_id} value={drone.drone_id}>{drone.drone_id} · {drone.capacity_grams.toLocaleString('ko-KR')} g 용량</option>)}</select></label>
          <label className="field"><span>진행 중인 배송 *</span><select value={selectedDelivery} onChange={(event) => { setSelectedDelivery(event.target.value); setMeasurement(null) }} required disabled={!selectedDrone || activeDeliveries.length === 0}><option value="">배송 선택</option>{activeDeliveries.map((delivery) => <option key={delivery.id} value={delivery.id}>{deliveryLabel(delivery)}</option>)}</select></label>
          <label className="field"><span>관리자가 확인한 무게 (g) *</span><input type="number" min="0" max="2147483647" step="1" value={measuredGrams} onChange={(event) => setMeasuredGrams(event.target.value)} required /></label>
          <div className="form-actions field-wide"><button className="button" type="submit" disabled={measuring || !selectedDeliveryIsActive || !activeDrones.some((drone) => drone.drone_id === selectedDrone)}>{measuring ? '기록 중…' : '수동 측정 기록'}</button></div>
        </form>
        {selectedDrone && activeDeliveries.length === 0 && <p className="muted">선택한 드론에 연결된 진행 중 배송이 없습니다.</p>}
        {measurement && <div className="measurement-result" role="status"><strong>측정 기록 저장됨</strong><span>예상: {measurement.estimated_delivery_weight_grams === null ? '정보 없음' : `${measurement.estimated_delivery_weight_grams.toLocaleString('ko-KR')} g`}</span><span>실측: {measurement.weight_grams.toLocaleString('ko-KR')} g · 용량 {measurement.capacity_grams.toLocaleString('ko-KR')} g</span><span>{measurement.capacity_exceeded ? '적재 용량 초과' : '적재 용량 이내'} · {measurement.measured_by} 수동 입력</span></div>}
      </section>
    </section>
  )
}
