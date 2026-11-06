import { useLayoutEffect, useRef, useState } from 'react'
import { Button, Footer, Header, Screen } from '../components/Layout.tsx'
import { CheckIcon, ChevronRightIcon, InfoIcon } from '../components/Icons.tsx'
import { useRouter } from '../router.tsx'
import { useAuth } from '../auth.tsx'
import { ApiError } from '../api.ts'
import { oauthError } from '../oauth.ts'
import { OAuthButtons } from '../components/OAuthButtons.tsx'
import { useAppState } from '../store.tsx'
import snackImage from '../assets/login-snacks.png'
import './Onboarding.css'

/* ───────────── 01 약관 동의 ───────────── */

type TermKey = 'service' | 'privacy' | 'marketing'

const TERMS: { key: TermKey; label: string; required: boolean; body: string[] }[] = [
  {
    key: 'service',
    label: '서비스 이용약관',
    required: true,
    body: [
      '교내 배달은 매점 상품 주문과 교내 지정 장소까지의 드론 배송 과정을 체험하는 데모입니다. 실제 배송은 제공하지 않습니다.',
      '결제는 테스트 결제이며 실제로 청구되지 않습니다.',
      '주문 후 표시되는 배송 상태와 도착 안내는 시뮬레이션입니다.',
      '이 안내는 현재 데모 기능에 대한 설명입니다.',
    ],
  },
  {
    key: 'privacy',
    label: '개인정보 수집 및 이용',
    required: true,
    body: [
      '수집 항목: 아이디, 이름, 휴대폰 번호, 주문 내역, 수령 장소',
      '입력한 계정 정보와 연락처는 데모의 계정 및 주문 기능에 사용됩니다. 휴대폰 문자 인증은 제공하지 않습니다.',
      '이 데모에는 회원 탈퇴나 개인정보 자동 삭제 기능이 구현되어 있지 않습니다.',
      '이 화면의 선택은 데모 화면에서만 관리되며, 서버에 동의 기록으로 저장되지 않습니다.',
    ],
  },
  {
    key: 'marketing',
    label: '혜택 및 이벤트 알림 수신',
    required: false,
    body: [
      '혜택 및 이벤트 알림은 아직 제공하지 않습니다. 이 항목은 데모의 선택 화면입니다.',
      '선택 여부와 관계없이 데모를 이용할 수 있으며, 실제 마케팅 알림은 발송되지 않습니다.',
    ],
  },
]

function TermsSheet({ term, onClose }: { term: (typeof TERMS)[number]; onClose: () => void }) {
  const backdropRef = useRef<HTMLDivElement>(null)
  const confirmRef = useRef<HTMLButtonElement>(null)

  useLayoutEffect(() => {
    const backdrop = backdropRef.current
    if (!backdrop) return
    const opener = document.activeElement
    const background: { element: HTMLElement; inert: boolean }[] = []
    let branch: HTMLElement = backdrop
    while (branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling instanceof HTMLElement && sibling !== branch) {
          background.push({ element: sibling, inert: sibling.inert })
          sibling.inert = true
        }
      }
      branch = branch.parentElement
      if (branch === document.body) break
    }
    const scrollContainer = backdrop.closest<HTMLElement>('.screen-body')
    const previousOverflow = scrollContainer?.style.overflow ?? ''
    if (scrollContainer) scrollContainer.style.overflow = 'hidden'
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        event.stopPropagation()
        onClose()
      } else if (event.key === 'Tab') {
        // The confirmation button is this read-only sheet's only tab stop.
        event.preventDefault()
        confirmRef.current?.focus({ preventScroll: true })
      }
    }
    const containFocus = (event: FocusEvent) => {
      if (event.target instanceof Node && !backdrop.contains(event.target)) {
        confirmRef.current?.focus({ preventScroll: true })
      }
    }
    document.addEventListener('keydown', handleKeyDown, true)
    document.addEventListener('focusin', containFocus)
    confirmRef.current?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true)
      document.removeEventListener('focusin', containFocus)
      for (const { element, inert } of background) element.inert = inert
      if (scrollContainer) scrollContainer.style.overflow = previousOverflow
      if (opener instanceof HTMLElement && opener.isConnected) opener.focus({ preventScroll: true })
    }
  }, [onClose])

  return (
    <div ref={backdropRef} className="terms-sheet-backdrop" onClick={onClose}>
      <section
        className="terms-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="terms-sheet-title" className="terms-sheet-title">
          <span className={term.required ? 'term-tag is-required' : 'term-tag'}>{term.required ? '필수' : '선택'}</span>
          {term.label}
        </h2>
        <ul className="terms-sheet-body">
          {term.body.map((line) => <li key={line}>{line}</li>)}
        </ul>
        <button ref={confirmRef} type="button" className="btn btn-primary btn-large btn-block" onClick={onClose}>확인</button>
      </section>
    </div>
  )
}

function Checkbox({ checked }: { checked: boolean }) {
  return <span className={`checkbox ${checked ? 'is-checked' : ''}`}>{checked && <CheckIcon size={21} />}</span>
}

export function TermsScreen() {
  const { navigate } = useRouter()
  const { customer } = useAuth()
  const [openTerm, setOpenTerm] = useState<TermKey | null>(null)
  const viewing = TERMS.find((t) => t.key === openTerm)
  const [agreed, setAgreed] = useState<Record<TermKey, boolean>>({
    service: true,
    privacy: true,
    marketing: false,
  })
  const allAgreed = TERMS.every((t) => agreed[t.key])
  const requiredAgreed = TERMS.filter((t) => t.required).every((t) => agreed[t.key])

  const toggleAll = () => {
    const next = !allAgreed
    setAgreed({ service: next, privacy: next, marketing: next })
  }

  // 로그인 후 마이 > 이용약관으로 온 경우에만 뒤로 가기를 보여 준다.
  return (
    <Screen
      header={<Header title="서비스 이용 동의" showBack={customer !== null} />}
      footer={
        <Footer>
          <Button disabled={!requiredAgreed} onClick={() => navigate('login')}>
            동의하고 시작하기
          </Button>
        </Footer>
      }
    >
      <div className="terms">
        <p className="brand-logo">교내 배달</p>
        <h1 className="title-xl terms-title">
          학교 안 배달,
          <br />
          시작하기 전에 확인해요
        </h1>
        <p className="desc terms-desc">
          안전한 주문과 수령을 위해
          <br />
          이용약관에 동의해 주세요.
        </p>

        <button type="button" className="terms-all" onClick={toggleAll} aria-pressed={allAgreed}>
          <Checkbox checked={allAgreed} />
          <span>전체 동의</span>
        </button>

        <ul className="terms-list">
          {TERMS.map((term) => (
            <li key={term.key} className="terms-item">
              <button
                type="button"
                className="terms-check"
                aria-pressed={agreed[term.key]}
                onClick={() => setAgreed({ ...agreed, [term.key]: !agreed[term.key] })}
              >
                <Checkbox checked={agreed[term.key]} />
                <span className={term.required ? 'term-tag is-required' : 'term-tag'}>
                  {term.required ? '필수' : '선택'}
                </span>
                <span className="term-label">{term.label}</span>
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label={`${term.label} 보기`}
                aria-haspopup="dialog"
                onClick={() => setOpenTerm(term.key)}
              >
                <ChevronRightIcon />
              </button>
            </li>
          ))}
        </ul>

        <p className="terms-note">선택 항목에 동의하지 않아도 서비스를 이용할 수 있어요.</p>
      </div>
      {viewing && <TermsSheet term={viewing} onClose={() => setOpenTerm(null)} />}
    </Screen>
  )
}

/* ───────────── 02 로그인 ───────────── */

function NaverLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true">
      <path d="M14.9 11.8 6.8 0H0v22h7.1V10.2L15.2 22H22V0h-7.1v11.8Z" fill="#fff" />
    </svg>
  )
}

function KakaoLogo() {
  return (
    <svg width="30" height="28" viewBox="0 0 30 28" aria-hidden="true">
      <path
        d="M15 1C7.3 1 1 5.9 1 12c0 3.9 2.6 7.4 6.6 9.3L6.2 27l6.3-4.2c.8.1 1.6.2 2.5.2 7.7 0 14-4.9 14-11S22.7 1 15 1Z"
        fill="#191919"
      />
    </svg>
  )
}

function GoogleLogo() {
  return (
    <svg width="40" height="40" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5Z" />
      <path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7Z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44Z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5Z" />
    </svg>
  )
}

export function LoginScreen() {
  const { navigate } = useRouter()
  const auth = useAuth()
  const [signup, setSignup] = useState(false)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(() => oauthError(location.search))
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy) return
    setBusy(true); setError(null)
    try {
      if (signup) await auth.register({ username: username.trim(), password, name: name.trim(), phone: phone.replace(/\D/g, '') })
      else await auth.login({ username: username.trim(), password })
      setPassword('')
      navigate('home', { replace: true })
    } catch (cause) {
      setError(cause instanceof ApiError && cause.status === 401 ? '아이디 또는 비밀번호를 확인해 주세요.' : cause instanceof ApiError && cause.status === 409 ? '이미 사용 중인 아이디입니다.' : cause instanceof Error ? cause.message : '로그인하지 못했습니다.')
    } finally { setBusy(false) }
  }
  return <Screen header={<Header title={signup ? '회원가입' : '로그인'} />}>
    <section className={`login-hero${signup ? ' is-signup' : ''}`}>
      <h1 className="login-title">학교 안 배달,<br />내 계정으로 시작하세요.</h1>
      <img className="login-image" src={snackImage} alt="매점 간식" />
    </section>
    <section className="login-actions">
      <form className="auth-form" onSubmit={event => void submit(event)} aria-busy={busy}>
        <label className="field">아이디<input className="text-input" autoComplete="username" required minLength={4} maxLength={32} pattern="[A-Za-z0-9_\-]+" title="영문, 숫자, 밑줄 또는 하이픈 4~32자" aria-describedby={signup ? 'auth-username-hint' : undefined} value={username} onChange={event => setUsername(event.target.value)} /></label>
        {signup && <p id="auth-username-hint" className="auth-hint">영문, 숫자, 밑줄 또는 하이픈 4~32자</p>}
        <label className="field">계정 비밀번호<input className="text-input" type="password" autoComplete={signup ? 'new-password' : 'current-password'} required minLength={signup ? 8 : 1} maxLength={128} aria-describedby={signup ? 'auth-password-hint' : undefined} value={password} onChange={event => setPassword(event.target.value)} /></label>
        {signup && <><p id="auth-password-hint" className="auth-hint">계정 비밀번호는 8자 이상 입력해 주세요.</p><label className="field">이름<input className="text-input" autoComplete="name" required maxLength={50} value={name} onChange={event => setName(event.target.value)} /></label>
          <label className="field">휴대폰 번호<input className="text-input" autoComplete="tel" inputMode="tel" required pattern="0[0-9]{10}" placeholder="01012345678" value={phone} onChange={event => setPhone(event.target.value.replace(/\D/g, '').slice(0, 11))} /></label>
          <p className="desc">주문 안내용 연락처이며 문자 인증은 제공하지 않습니다.</p></>}
        {error && <p className="auth-error" role="alert">{error}</p>}
        <Button type="submit" disabled={busy || auth.loading}>{busy ? '처리 중…' : signup ? '회원가입' : '로그인'}</Button>
      </form>
      <Button variant="secondary" onClick={() => { setSignup(!signup); setPassword(''); setError(null) }}>{signup ? '로그인으로 돌아가기' : '새 계정 만들기'}</Button>
      <OAuthButtons icons={{ naver: <NaverLogo />, kakao: <KakaoLogo />, google: <GoogleLogo /> }}
        disabled={busy || auth.loading} onStart={() => setBusy(true)} onReturn={() => setBusy(false)} />
      <Button variant="text" onClick={() => navigate('home')}>메뉴 먼저 둘러보기</Button>
    </section>
  </Screen>
}

/* ───────────── 03 휴대폰 인증 ───────────── */

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length < 4) return digits
  if (digits.length < 8) return `${digits.slice(0, 3)}-${digits.slice(3)}`
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
}

export function PhoneScreen() {
  const { navigate } = useRouter()
  const { customerPhone, setCustomerPhone } = useAppState()
  return (
    <Screen header={<Header title="주문 연락처" />} footer={<Footer><Button disabled={customerPhone.replace(/\D/g, '').length !== 11} onClick={() => navigate('school')}>연락처 저장하고 계속</Button></Footer>}>
      <div className="phone">
        <h1 className="title-xl phone-title">주문 안내를 받을 번호를 입력해 주세요</h1>
        <label className="field"><span className="field-label">휴대폰 번호</span><input className="text-input" inputMode="tel" autoComplete="tel" placeholder="010-0000-0000" value={customerPhone} onChange={event => setCustomerPhone(formatPhone(event.target.value))} /></label>
        <p className="desc">연락처를 저장합니다. 문자 인증은 제공하지 않습니다.</p>
      </div>
    </Screen>
  )
}

/* ───────────── 04 학교 등록 (코드 입력 · 자동 조회 완료 · 조회 결과 없음) ───────────── */

// 백엔드 연결 전 임시 학교 목록
const SCHOOLS: Record<string, string> = {
  '123456': '선린인터넷고등학교',
}

export function SchoolScreen() {
  const { navigate } = useRouter()
  const [code, setCode] = useState('')
  const complete = code.length === 6
  const school = complete ? SCHOOLS[code] : undefined
  const notFound = complete && !school

  return (
    <Screen
      header={<Header title="학교 등록" />}
      footer={
        <Footer>
          <Button disabled={!school} onClick={() => navigate('place')}>
            이 학교로 연결하기
          </Button>
        </Footer>
      }
    >
      <div className="school">
        <div className="school-intro">
          <p className="school-eyebrow">학교 연결</p>
          <h1 className="school-title">
            어느 학교에서
            <br />
            이용하시나요?
          </h1>
          <p className="school-desc">학교에서 안내받은 6자리 코드를 입력해 주세요.</p>
        </div>

        <label className="school-field">
          <span className="school-label">학교 코드</span>
          <input
            className={`school-input ${notFound ? 'is-error' : ''}`}
            inputMode="numeric"
            placeholder="학교 코드 6자리"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
        </label>

        {!complete && (
          <div className="school-card">
            <p className="school-hint">
              <InfoIcon />
              <span>
                코드 6자리를 입력하면
                <br />
                등록된 학교가 자동으로 표시돼요.
              </span>
            </p>
          </div>
        )}

        {school && (
          <div className="school-card is-found" role="status">
            <p className="school-found-label">학교를 자동으로 찾았어요</p>
            <p className="school-name">{school}</p>
            <p className="school-card-desc">학교가 맞는지 확인하고 연결해 주세요.</p>
          </div>
        )}

        {notFound && (
          <div className="school-card" role="status">
            <p className="school-empty-title">학교를 찾을 수 없어요</p>
            <p className="school-card-desc">
              입력한 코드를 다시 확인해 주세요.
              <br />
              학교 이름으로 직접 검색할 수도 있어요.
            </p>
            <Button variant="secondary" size="medium">
              학교 이름으로 검색
            </Button>
          </div>
        )}
      </div>
    </Screen>
  )
}
