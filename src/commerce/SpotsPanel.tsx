import { useEffect, useState, type FormEvent } from 'react'
import { customerJson, customerRequest } from './client'
import { spotListSchema, spotSchema, type Spot } from './models'
import { emptySpotForm, spotFormFrom, spotIndoorFields, type SpotForm } from './spotForm'
import { SpotEditor } from './SpotEditor'

type Props = {
  selected: Spot | null
  onSelect: (spot: Spot | null) => void
}

function indoorLocation(spot: Spot): string {
  if (spot.room_number) return `호수 ${spot.room_number}`
  if (spot.grade !== null && spot.classroom) return `${spot.grade}학년 ${spot.classroom}반`
  if (spot.grade === null && spot.classroom === null) return '야외 배송 위치'
  return '실내 위치 정보 확인 필요'
}

export function SpotsPanel({ selected, onSelect }: Props) {
  const [spots, setSpots] = useState<readonly Spot[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [editing, setEditing] = useState<Spot | null>(null)
  const [formOpen, setFormOpen] = useState(false)
  const [form, setForm] = useState<SpotForm>({ ...emptySpotForm })
  const [saving, setSaving] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    try {
      const data = await customerJson('/account/spots', spotListSchema)
      setSpots(data)
      setLoadError(null)
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : '저장 위치를 불러오지 못했습니다.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    void customerJson('/account/spots', spotListSchema, { signal: controller.signal })
      .then((data) => {
        if (controller.signal.aborted) return
        setSpots(data)
        setLoadError(null)
        setLoading(false)
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        setLoadError(error instanceof Error ? error.message : '저장 위치를 불러오지 못했습니다.')
        setLoading(false)
      })
    return () => controller.abort()
  }, [])

  function startCreate() {
    setEditing(null)
    setForm({ ...emptySpotForm })
    setFormOpen(true)
    setActionError(null)
  }

  function startEdit(spot: Spot) {
    setEditing(spot)
    setForm(spotFormFrom(spot))
    setFormOpen(true)
    setActionError(null)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionError(null)
    const label = form.label.trim()
    const address = form.delivery_address.trim()
    if (!label || label.length > 60) return setActionError('위치 이름을 1~60자로 입력하세요.')
    if (!address || address.length > 300) return setActionError('주소를 1~300자로 입력하세요.')
    if (!form.coordinate) return setActionError('현재 위치를 사용하거나 지도에서 좌표를 선택하세요.')

    if (form.indoor_type === 'room' && (!form.room_number.trim() || form.room_number.trim().length > 40)) {
      return setActionError('호수 또는 실내 위치를 1~40자로 입력하세요.')
    }
    const grade = form.indoor_type === 'classroom' ? Number(form.grade) : null
    if (form.indoor_type === 'classroom' && (grade === null || !Number.isInteger(grade) || grade < 1 || grade > 12 || !form.classroom.trim() || form.classroom.trim().length > 40)) {
      return setActionError('학년은 1~12, 반 이름은 1~40자로 입력하세요.')
    }

    const payload = {
      label,
      delivery_address: address,
      delivery_detail: form.delivery_detail.trim() || null,
      latitude: form.coordinate.latitude,
      longitude: form.coordinate.longitude,
      ...spotIndoorFields(form),
    }
    setSaving(true)
    try {
      const saved = await customerJson(
        editing ? `/account/spots/${editing.id}` : '/account/spots',
        spotSchema,
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        },
      )
      setFormOpen(false)
      setEditing(null)
      onSelect(saved)
      await refresh()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '저장 위치를 저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  async function remove(spot: Spot) {
    setActionError(null)
    try {
      await customerRequest(`/account/spots/${spot.id}`, { method: 'DELETE' })
      if (selected?.id === spot.id) onSelect(null)
      await refresh()
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '저장 위치를 삭제하지 못했습니다.')
    }
  }

  return (
    <section className="panel" aria-labelledby="spots-title">
      <div className="panel-head spots-panel-head">
        <div>
          <h2 id="spots-title">저장 위치</h2>
          <p className="muted small">배송받을 장소를 저장하고 주문에서 선택하세요.</p>
        </div>
        <div className="row-actions">
          <button className="button button-secondary button-small" type="button" onClick={() => void refresh()} disabled={loading}>새로고침</button>
          <button className="button button-small" type="button" onClick={startCreate}>위치 추가</button>
        </div>
      </div>

      {loading && spots.length === 0 && <p className="muted" role="status">저장 위치를 불러오고 있습니다.</p>}
      {loadError && <p className="error" role="alert">저장 위치 조회 실패: {loadError}</p>}
      {actionError && <p className="error action-error" role="alert">{actionError}</p>}
      {!loading && !loadError && spots.length === 0 && <p className="muted">저장한 위치가 없습니다. 위치를 추가해 주세요.</p>}

      {spots.length > 0 && (
        <div className="spot-list" role="radiogroup" aria-label="주문 배송 위치 선택">
          {spots.map((spot) => (
            <article className="spot-row" key={spot.id}>
              <label className="spot-choice">
                <input type="radio" name="checkout-spot" checked={selected?.id === spot.id} onChange={() => onSelect(spot)} />
                <span>
                  <strong>{spot.label}</strong>
                  <span className="muted small">{spot.delivery_address}{spot.delivery_detail ? ` · ${spot.delivery_detail}` : ''} · {indoorLocation(spot)}</span>
                  <span className="muted small">{spot.latitude.toFixed(5)}, {spot.longitude.toFixed(5)}</span>
                </span>
              </label>
              <div className="row-actions">
                <button className="link-button" type="button" onClick={() => startEdit(spot)}>수정</button>
                <button className="link-button" type="button" onClick={() => void remove(spot)}>삭제</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {formOpen && (
        <SpotEditor
          key={editing?.id ?? 'new-location'}
          form={form}
          editing={editing !== null}
          saving={saving}
          onChange={setForm}
          onSubmit={(event) => void submit(event)}
          onClose={() => setFormOpen(false)}
        />
      )}
    </section>
  )
}
