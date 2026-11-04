import { useState } from 'react'
import { Button, Footer, Header, Screen } from '../components/Layout.tsx'
import { CheckIcon, ChevronRightIcon, InfoIcon, PhoneIcon } from '../components/Icons.tsx'
import { useRouter } from '../router.tsx'
import snackImage from '../assets/login-snacks.png'
import './Onboarding.css'

/* ───────────── 01 약관 동의 ───────────── */

type TermKey = 'service' | 'privacy' | 'marketing'

const TERMS: { key: TermKey; label: string; required: boolean }[] = [
  { key: 'service', label: '서비스 이용약관', required: true },
  { key: 'privacy', label: '개인정보 수집 및 이용', required: true },
  { key: 'marketing', label: '혜택 및 이벤트 알림 수신', required: false },
]

function Checkbox({ checked }: { checked: boolean }) {
  return <span className={`checkbox ${checked ? 'is-checked' : ''}`}>{checked && <CheckIcon size={21} />}</span>
}

export function TermsScreen() {
  const { navigate } = useRouter()
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

  return (
    <Screen
      header={<Header title="서비스 이용 동의" />}
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
              <button type="button" className="icon-button" aria-label={`${term.label} 보기`}>
                <ChevronRightIcon />
              </button>
            </li>
          ))}
        </ul>

        <p className="terms-note">선택 항목에 동의하지 않아도 서비스를 이용할 수 있어요.</p>
      </div>
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
  return (
    <Screen header={<Header />}>
      <section className="login-hero">
        <p className="eyebrow">교내 드론 배달</p>
        <h1 className="login-title">
          매점 가는 시간까지
          <br />
          아껴드릴게요.
        </h1>
        <p className="desc login-desc">
          먹고 싶은 메뉴를 고르면
          <br />
          약속한 곳으로 가져다드려요.
        </p>
        <img className="login-image" src={snackImage} alt="매점 간식" />
      </section>

      <section className="login-actions">
        <h3 className="login-subtitle">간편하게 시작하세요</h3>
        <div className="oauth-row">
          <button type="button" className="oauth oauth-naver" aria-label="네이버로 시작하기" onClick={() => navigate('phone')}>
            <NaverLogo />
          </button>
          <button type="button" className="oauth oauth-kakao" aria-label="카카오로 시작하기" onClick={() => navigate('phone')}>
            <KakaoLogo />
          </button>
          <button type="button" className="oauth oauth-google" aria-label="구글로 시작하기" onClick={() => navigate('phone')}>
            <GoogleLogo />
          </button>
        </div>
        <Button variant="secondary" size="medium" className="login-phone" onClick={() => navigate('phone')}>
          <PhoneIcon />
          <span className="login-phone-label">휴대폰 번호로 시작하기</span>
        </Button>
        <Button variant="text" onClick={() => navigate('home')}>
          메뉴 먼저 둘러보기
        </Button>
      </section>
    </Screen>
  )
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
  const [phone, setPhone] = useState('')
  const [code, setCode] = useState('')
  const [sent, setSent] = useState(false)

  return (
    <Screen
      header={<Header title="휴대폰 인증" />}
      footer={
        <Footer>
          <Button onClick={() => navigate('school')}>인증하고 시작하기</Button>
        </Footer>
      }
    >
      <div className="phone">
        <p className="eyebrow">본인 확인</p>
        <h1 className="title-xl phone-title">
          휴대폰 번호를
          <br />
          입력해 주세요
        </h1>
        <p className="desc phone-desc">주문과 도착 안내를 받는 번호예요.</p>

        <label className="field phone-field">
          <span className="field-label">휴대폰 번호</span>
          <span className="phone-row">
            <input
              className="text-input phone-input"
              inputMode="tel"
              placeholder="010-0000-0000"
              value={phone}
              onChange={(e) => setPhone(formatPhone(e.target.value))}
            />
            <Button
              variant="secondary"
              block={false}
              className="phone-send"
              onClick={() => setSent(true)}
            >
              {sent ? '다시 받기' : '인증번호 받기'}
            </Button>
          </span>
        </label>

        <label className="field code-field">
          <span className="field-label">인증번호</span>
          <input
            className="text-input"
            inputMode="numeric"
            placeholder="인증번호 6자리"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
          />
        </label>

        <p className="notice-box phone-notice">
          <InfoIcon />
          입력하신 번호는 주문 안내와 본인 확인에 사용돼요.
        </p>
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
