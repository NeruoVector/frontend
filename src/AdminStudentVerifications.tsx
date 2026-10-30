import { useCallback, useEffect, useState } from 'react'
import { z } from 'zod'
import { apiUrl, errorMessage, readApiError } from './api'

const verificationSchema = z.object({
  customer_id: z.string().uuid(),
  customer_name: z.string(),
  school: z.string(),
  student_number: z.string(),
  status: z.enum(['pending', 'approved', 'rejected']),
  reason: z.string().nullable(),
  submitted_at: z.string(),
  reviewed_at: z.string().nullable(),
})

const verificationListSchema = z.array(verificationSchema)
type Verification = z.infer<typeof verificationSchema>

type Props = {
  onSessionExpired: () => void
}

function EvidenceImage({ customerId, onUnauthorized }: { customerId: string; onUnauthorized: () => void }) {
  const [source, setSource] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    let objectUrl: string | null = null
    async function loadEvidence() {
      try {
        const response = await fetch(apiUrl(`/api/v1/admin/student-verifications/${customerId}/evidence`), {
          signal: controller.signal,
          credentials: 'include',
          cache: 'no-store',
        })
        if (response.status === 401) {
          onUnauthorized()
          throw new Error('관리자 세션이 만료되었습니다.')
        }
        if (!response.ok) throw new Error(await readApiError(response))
        const blob = await response.blob()
        objectUrl = URL.createObjectURL(blob)
        setSource(objectUrl)
      } catch (reason) {
        if (!controller.signal.aborted) setError(errorMessage(reason))
      }
    }
    void loadEvidence()
    return () => {
      controller.abort()
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [customerId, onUnauthorized])

  if (error) return <p className="error" role="alert">학생증을 불러오지 못했습니다: {error}</p>
  if (!source) return <p className="muted" role="status">학생증 사진을 불러오는 중입니다.</p>
  return <img className="verification-evidence" src={source} alt="학생 인증을 위해 제출한 학생증 사진" />
}

function statusLabel(status: Verification['status']): string {
  switch (status) {
    case 'pending': return '검토 대기'
    case 'approved': return '승인'
    case 'rejected': return '반려'
  }
}

export function AdminStudentVerifications({ onSessionExpired }: Props) {
  const [rows, setRows] = useState<readonly Verification[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [reasons, setReasons] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const refresh = useCallback(async (signal?: AbortSignal, showLoading = true) => {
    if (showLoading) setLoading(true)
    try {
      const response = await fetch(apiUrl('/api/v1/admin/student-verifications'), {
        signal,
        credentials: 'include',
        cache: 'no-store',
      })
      if (response.status === 401) {
        onSessionExpired()
        throw new Error('관리자 세션이 만료되었습니다.')
      }
      if (!response.ok) throw new Error(await readApiError(response))
      const parsed = verificationListSchema.safeParse(await response.json())
      if (!parsed.success) throw new Error('학생 인증 목록 응답 형식이 올바르지 않습니다.')
      setRows(parsed.data)
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
    void fetch(apiUrl('/api/v1/admin/student-verifications'), {
      signal: controller.signal,
      credentials: 'include',
      cache: 'no-store',
    })
      .then(async (response) => {
        if (response.status === 401) {
          onSessionExpired()
          throw new Error('관리자 세션이 만료되었습니다.')
        }
        if (!response.ok) throw new Error(await readApiError(response))
        const parsed = verificationListSchema.safeParse(await response.json())
        if (!parsed.success) throw new Error('학생 인증 목록 응답 형식이 올바르지 않습니다.')
        if (!controller.signal.aborted) {
          setRows(parsed.data)
          setLoadError(null)
          setLoading(false)
        }
      })
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setLoadError(errorMessage(error))
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [onSessionExpired])

  async function review(row: Verification, status: 'approved' | 'rejected') {
    setSavingId(row.customer_id)
    setActionError(null)
    try {
      const response = await fetch(apiUrl(`/api/v1/admin/student-verifications/${row.customer_id}/review`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, reason: reasons[row.customer_id]?.trim() || null }),
      })
      if (response.status === 401) {
        onSessionExpired()
        throw new Error('관리자 세션이 만료되었습니다.')
      }
      if (!response.ok) throw new Error(await readApiError(response))
      await refresh()
    } catch (error) {
      setActionError(errorMessage(error))
    } finally {
      setSavingId(null)
    }
  }

  return (
    <section className="panel" aria-labelledby="student-review-title">
      <div className="panel-head">
        <div>
          <h2 id="student-review-title">학생 인증 검토</h2>
          <p className="muted small">제출된 학생증 사진을 확인하고 승인 또는 반려합니다.</p>
        </div>
        <button className="button button-secondary button-small" type="button" onClick={() => void refresh()} disabled={loading}>
          새로고침
        </button>
      </div>
      {loading && rows.length === 0 && <p className="muted" role="status">인증 요청을 불러오고 있습니다.</p>}
      {loadError && <p className="error" role="alert">요청을 불러오지 못했습니다: {loadError}</p>}
      {actionError && <p className="error action-error" role="alert">검토를 저장하지 못했습니다: {actionError}</p>}
      {!loading && !loadError && rows.length === 0 && <p className="muted">아직 제출된 학생 인증 요청이 없습니다.</p>}
      <div className="verification-list">
        {rows.map((row) => (
          <article className="verification-row" key={row.customer_id}>
            <div className="verification-summary">
              <div>
                <h3>{row.customer_name}</h3>
                <p className="muted small">{row.school} · {row.student_number}</p>
                <p className="muted small">제출 {new Date(row.submitted_at).toLocaleString('ko-KR')}</p>
              </div>
              <span className={`badge ${row.status === 'approved' ? 'badge-ok' : row.status === 'rejected' ? 'badge-danger' : 'badge-warn'}`}>
                {statusLabel(row.status)}
              </span>
            </div>
            <details className="evidence-details">
              <summary>학생증 사진 보기</summary>
              <EvidenceImage customerId={row.customer_id} onUnauthorized={onSessionExpired} />
            </details>
            {row.status === 'pending' && (
              <div className="verification-actions">
                <label className="field">
                  <span>반려 사유 (반려 시 표시)</span>
                  <input
                    value={reasons[row.customer_id] ?? ''}
                    maxLength={500}
                    onChange={(event) => setReasons((previous) => ({ ...previous, [row.customer_id]: event.target.value }))}
                  />
                </label>
                <div className="form-actions">
                  <button className="button" type="button" onClick={() => void review(row, 'approved')} disabled={savingId !== null}>
                    {savingId === row.customer_id ? '저장 중…' : '승인'}
                  </button>
                  <button className="button button-secondary" type="button" onClick={() => void review(row, 'rejected')} disabled={savingId !== null}>
                    반려
                  </button>
                </div>
              </div>
            )}
            {row.reason && <p className="error small">반려 사유: {row.reason}</p>}
          </article>
        ))}
      </div>
    </section>
  )
}
