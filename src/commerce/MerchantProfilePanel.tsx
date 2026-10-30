import { useState, type FormEvent } from 'react'
import { customerJson } from './client'
import { merchantProfileSchema, type MerchantProfile } from './models'

type Props = {
  profile: MerchantProfile
  onSaved: (profile: MerchantProfile) => void
}

export function MerchantProfilePanel({ profile, onSaved }: Props) {
  const [name, setName] = useState(profile.name)
  const [description, setDescription] = useState(profile.description)
  const [coverUrl, setCoverUrl] = useState(profile.cover_url)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError(null)
    setMessage(null)
    const normalizedName = name.trim()
    const normalizedDescription = description.trim()
    const normalizedCover = coverUrl.trim()
    if (!normalizedName || normalizedName.length > 100) {
      setError('매장 이름을 1~100자로 입력하세요.')
      return
    }
    if (normalizedDescription.length > 3000) {
      setError('매장 소개는 3,000자 이하로 입력하세요.')
      return
    }
    if (normalizedCover) {
      let url: URL
      try {
        url = new URL(normalizedCover)
      } catch (reason) {
        if (reason instanceof TypeError) {
          setError('커버 사진은 HTTP 또는 HTTPS 이미지 URL로 입력하세요.')
          return
        }
        throw reason
      }
      if (!['http:', 'https:'].includes(url.protocol)) return setError('커버 사진은 HTTP 또는 HTTPS 이미지 URL로 입력하세요.')
    }

    setSaving(true)
    try {
      const saved = await customerJson('/merchant/profile', merchantProfileSchema, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: normalizedName, description: normalizedDescription, cover_url: normalizedCover }),
      })
      onSaved(saved)
      setMessage('매장 프로필을 저장했습니다.')
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '매장 프로필을 저장하지 못했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="panel merchant-profile-panel" aria-labelledby="merchant-profile-title">
      <div className="panel-head">
        <div>
          <h2 id="merchant-profile-title">매장 프로필</h2>
          <p className="muted small">스토어에 표시되는 이름, 소개와 커버 사진을 관리합니다.</p>
        </div>
      </div>
      <form className="form-grid" onSubmit={(event) => void submit(event)}>
        <label className="field">
          <span>매장 이름 *</span>
          <input value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required />
        </label>
        <label className="field field-wide">
          <span>매장 소개</span>
          <textarea className="merchant-description-input" rows={3} value={description} onChange={(event) => setDescription(event.target.value)} maxLength={3000} />
        </label>
        <div className="field field-wide">
          <label htmlFor="merchant-cover-url">커버 사진 URL</label>
          <input id="merchant-cover-url" type="url" aria-describedby="merchant-cover-url-help" value={coverUrl} onChange={(event) => setCoverUrl(event.target.value)} placeholder="https://example.com/cover.jpg" />
          <span id="merchant-cover-url-help" className="muted small">사용 가능한 이미지 주소를 입력하세요.</span>
        </div>
        {error && <p className="error field-wide" role="alert">{error}</p>}
        {message && <p className="notice field-wide" role="status">{message}</p>}
        <div className="form-actions field-wide">
          <button className="button" type="submit" disabled={saving}>{saving ? '저장 중…' : '프로필 저장'}</button>
        </div>
      </form>
    </section>
  )
}
