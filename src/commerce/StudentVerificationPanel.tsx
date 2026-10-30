import { useEffect, useState, type FormEvent } from 'react'
import { customerJson } from './client'
import {
  optionalStudentVerificationSchema,
  studentVerificationSchema,
  type StudentVerification,
} from './models'

type VerificationState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; verification: StudentVerification | null }

const maxEvidenceSize = 5 * 1024 * 1024
const allowedImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp'])

function reviewLabel(status: StudentVerification['status']): string {
  switch (status) {
    case 'pending': return '검토 대기'
    case 'approved': return '인증 완료'
    case 'rejected': return '수정 필요'
  }
}

export function StudentVerificationPanel() {
  const [state, setState] = useState<VerificationState>({ status: 'loading' })
  const [school, setSchool] = useState('')
  const [studentNumber, setStudentNumber] = useState('')
  const [evidence, setEvidence] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const verification = await customerJson(
          '/student-verification',
          optionalStudentVerificationSchema,
          { signal: controller.signal },
        )
        if (controller.signal.aborted) return
        setState({ status: 'ready', verification })
      } catch (error) {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : '인증 상태를 불러오지 못했습니다.',
        })
      }
    }
    void load()
    return () => controller.abort()
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setActionError(null)
    const schoolValue = school.trim()
    const numberValue = studentNumber.trim()
    if (!schoolValue || schoolValue.length > 100) {
      setActionError('학교 이름을 1~100자로 입력하세요.')
      return
    }
    if (!numberValue || numberValue.length > 40) {
      setActionError('학번을 1~40자로 입력하세요.')
      return
    }
    if (!evidence) {
      setActionError('학생증 사진을 선택하세요.')
      return
    }
    if (!allowedImageTypes.has(evidence.type) || evidence.size > maxEvidenceSize) {
      setActionError('PNG, JPEG, WebP 사진을 5MB 이하로 선택하세요.')
      return
    }

    const form = new FormData()
    form.set('school', schoolValue)
    form.set('student_number', numberValue)
    form.set('image', evidence)
    setSubmitting(true)
    try {
      const verification = await customerJson('/student-verification', studentVerificationSchema, {
        method: 'POST',
        body: form,
      })
      setState({ status: 'ready', verification })
      setEvidence(null)
      const fileInput = document.querySelector<HTMLInputElement>('#student-evidence')
      if (fileInput) fileInput.value = ''
    } catch (error) {
      setActionError(error instanceof Error ? error.message : '학생 인증을 제출하지 못했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const verification = state.status === 'ready' ? state.verification : null
  const approved = verification?.status === 'approved'

  return (
    <section className="panel" aria-labelledby="student-verification-title">
      <div className="panel-head">
        <div>
          <h2 id="student-verification-title">학생 인증</h2>
          <p className="muted small">학생증 사진은 관리자 검토 후 인증 상태가 표시됩니다.</p>
        </div>
        {verification && <span className={`badge ${verification.status === 'approved' ? 'badge-ok' : verification.status === 'rejected' ? 'badge-danger' : 'badge-warn'}`}>{reviewLabel(verification.status)}</span>}
      </div>

      {state.status === 'loading' && <p className="muted" role="status">인증 상태를 불러오고 있습니다.</p>}
      {state.status === 'error' && <p className="error" role="alert">인증 상태 조회 실패: {state.message}</p>}
      {verification && (
        <p className="muted small">
          {verification.school} · {verification.student_number}
          {verification.reason && <span className="error"> · {verification.reason}</span>}
        </p>
      )}
      {state.status === 'ready' && !approved && (
        <form className="form-grid verification-form" onSubmit={(event) => void submit(event)}>
          <label className="field">
            <span>학교 *</span>
            <input value={school} onChange={(event) => setSchool(event.target.value)} required maxLength={100} />
          </label>
          <label className="field">
            <span>학번 *</span>
            <input value={studentNumber} onChange={(event) => setStudentNumber(event.target.value)} required maxLength={40} />
          </label>
          <label className="field field-wide">
            <span>학생증 사진 * (PNG, JPEG, WebP · 5MB 이하)</span>
            <input
              id="student-evidence"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={(event) => setEvidence(event.target.files?.item(0) ?? null)}
              required
              aria-describedby="student-evidence-help"
            />
            <span id="student-evidence-help" className="muted small">사진에는 학교와 학번이 읽히도록 하고, 불필요한 정보는 가려주세요.</span>
          </label>
          {actionError && <p className="error field-wide" role="alert">{actionError}</p>}
          <div className="form-actions field-wide">
            <button className="button" type="submit" disabled={submitting}>
              {submitting ? '제출 중…' : verification ? '사진 다시 제출' : '인증 요청 제출'}
            </button>
          </div>
        </form>
      )}
      {verification?.status === 'pending' && <p className="notice" role="status">관리자 검토를 기다리고 있습니다.</p>}
      {approved && <p className="notice" role="status">학생 인증이 완료되었습니다.</p>}
    </section>
  )
}
