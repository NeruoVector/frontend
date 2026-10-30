import type { FormEvent } from 'react'
import { LocationPicker } from './LocationPicker'
import type { SpotForm } from './spotForm'

type Props = {
  form: SpotForm
  editing: boolean
  saving: boolean
  onChange: (form: SpotForm) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onClose: () => void
}

export function SpotEditor({ form, editing, saving, onChange, onSubmit, onClose }: Props) {
  return (
    <form className="spot-form form-grid" onSubmit={onSubmit}>
      <div className="panel-head field-wide">
        <h3>{editing ? '위치 수정' : '새 위치 추가'}</h3>
        <button className="button button-secondary button-small" type="button" onClick={onClose}>닫기</button>
      </div>
      <label className="field">
        <span>위치 이름 *</span>
        <input value={form.label} maxLength={60} onChange={(event) => onChange({ ...form, label: event.target.value })} required />
      </label>
      <label className="field field-wide">
        <span>배송 주소 *</span>
        <input value={form.delivery_address} maxLength={300} onChange={(event) => onChange({ ...form, delivery_address: event.target.value })} required />
      </label>
      <label className="field field-wide">
        <span>상세 주소</span>
        <input value={form.delivery_detail} onChange={(event) => onChange({ ...form, delivery_detail: event.target.value })} />
      </label>
      <label className="field">
        <span>실내 위치 유형 *</span>
        <select value={form.indoor_type} onChange={(event) => onChange({ ...form, indoor_type: event.target.value === 'classroom' ? 'classroom' : event.target.value === 'outdoor' ? 'outdoor' : 'room' })}>
          <option value="room">호수</option>
          <option value="classroom">학년과 반</option>
          <option value="outdoor">야외 위치</option>
        </select>
      </label>
      {form.indoor_type === 'room' ? (
        <label className="field">
          <span>호수 *</span>
          <input value={form.room_number} maxLength={40} onChange={(event) => onChange({ ...form, room_number: event.target.value })} required />
        </label>
      ) : form.indoor_type === 'classroom' ? (
        <>
          <label className="field">
            <span>학년 *</span>
            <input type="number" min="1" max="12" step="1" value={form.grade} onChange={(event) => onChange({ ...form, grade: event.target.value })} required />
          </label>
          <label className="field">
            <span>반 *</span>
            <input value={form.classroom} maxLength={40} onChange={(event) => onChange({ ...form, classroom: event.target.value })} required />
          </label>
        </>
      ) : <p className="field muted small">야외 배송 위치는 실내 위치를 지정하지 않습니다.</p>}
      <div className="field field-wide">
        <span>지도 좌표 *</span>
        <LocationPicker value={form.coordinate} onChange={(coordinate) => onChange({ ...form, coordinate })} />
      </div>
      <div className="form-actions field-wide">
        <button className="button" type="submit" disabled={saving}>{saving ? '저장 중…' : editing ? '위치 저장' : '위치 추가'}</button>
        <button className="button button-secondary" type="button" onClick={onClose}>취소</button>
      </div>
    </form>
  )
}
