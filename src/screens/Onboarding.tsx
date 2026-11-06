import { useLayoutEffect, useRef, useState } from 'react'
import { Button, Footer, Header, Screen } from '../components/Layout.tsx'
import { ChevronRightIcon } from '../components/Icons.tsx'
import { useRouter } from '../router.tsx'
import { useAuth } from '../auth.tsx'
import { ApiError } from '../api.ts'
import { oauthError } from '../oauth.ts'
import { OAuthButtons } from '../components/OAuthButtons.tsx'
import { useAppState } from '../store.tsx'
import snackImage from '../assets/login-snacks.png'
import { STORE } from '../data.ts'
import './Onboarding.css'

/* ───────────── 01 이용안내 ───────────── */

type TermKey = 'service' | 'privacy'

const TERMS: { readonly key: TermKey; readonly label: string; readonly body: readonly string[] }[] = [
  {
    key: 'service',
    label: '서비스 이용안내',
    body: [
      '교내 배달은 매점 상품 주문부터 드론의 배송·수령·복귀까지 확인하는 시뮬레이션 서비스입니다.',
      '결제는 테스트 결제이며 실제로 청구되지 않습니다.',
      '배송 화면은 Gazebo/PX4 시뮬레이터의 위치와 비행 상태를 표시합니다.',
      '목적지에 착륙한 뒤 상품 수령을 확인하면 드론이 출발지로 복귀합니다.',
    ],
  },
  {
    key: 'privacy',
    label: '개인정보 안내',
    body: [
      '수집 항목: 아이디, 이름, 휴대폰 번호, 주문 내역, 수령 장소',
      '계정 정보는 로그인과 본인 주문 내역 조회에 사용됩니다.',
      '연락처와 수령 장소는 주문 정보에 저장됩니다.',
      '내 주문과 리뷰는 로그인한 계정으로 확인할 수 있습니다.',
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

export function TermsScreen() {
  const { navigate } = useRouter()
  const { customer } = useAuth()
  const [openTerm, setOpenTerm] = useState<TermKey | null>(null)
  const viewing = TERMS.find((t) => t.key === openTerm)
  return (
    <Screen
      header={<Header title="이용안내" />}
      footer={
        <Footer>
          <Button onClick={() => navigate(customer ? 'settings' : 'login')}>
            {customer ? '설정으로 돌아가기' : '로그인하고 시작하기'}
          </Button>
        </Footer>
      }
    >
      <div className="terms">
        <p className="brand-logo">교내 배달</p>
        <h1 className="title-xl terms-title">
          학교 안 배달,
          <br />
          이렇게 이용해요
        </h1>
        <p className="desc terms-desc">
          주문·배송 과정과 개인정보 이용 내용을 확인하세요.
        </p>

        <ul className="terms-list">
          {TERMS.map((term) => (
            <li key={term.key} className="terms-item">
              <button
                type="button"
                className="terms-link"
                aria-haspopup="dialog"
                onClick={() => setOpenTerm(term.key)}
              >
                <span className="term-label">{term.label}</span>
                <ChevronRightIcon />
              </button>
            </li>
          ))}
        </ul>

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
  const { navigate, loginReturnTo } = useRouter()
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
      navigate(loginReturnTo, { replace: true })
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
          <p className="desc">입력한 번호를 주문 연락처로 사용합니다.</p></>}
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

/* ───────────── 03 주문 연락처 ───────────── */

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
        <p className="desc">입력한 번호를 주문 연락처로 사용합니다.</p>
      </div>
    </Screen>
  )
}

/* ───────────── 04 이용 학교 ───────────── */

export function SchoolScreen() {
  const { navigate } = useRouter()
  return (
    <Screen
      header={<Header title="이용 학교" />}
      footer={<Footer><Button onClick={() => navigate('place')}>수령 장소 선택하기</Button></Footer>}
    >
      <section className="school">
        <div className="school-intro">
          <h1 className="school-title">{STORE.school}</h1>
          <p className="school-desc">이 학교 매점에서 상품을 주문하고 교내 수령 장소를 선택할 수 있습니다.</p>
        </div>
        <div className="school-card">
          <p className="school-name">{STORE.name}</p>
          <p className="school-card-desc">배송 현황에서 드론의 비행·착륙·복귀 상태를 확인하세요.</p>
        </div>
      </section>
    </Screen>
  )
}
