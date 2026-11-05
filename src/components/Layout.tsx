import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { useRouter } from '../router.tsx'
import { BackIcon } from './Icons.tsx'
import './Layout.css'

/** Figma: App / 상태 표시줄 — 데스크톱 미리보기 프레임에서만 보인다. */
export function StatusBar() {
  return (
    <div className="status-bar" aria-hidden="true">
      <span className="status-time">12:24</span>
      <span className="status-island" />
      <span className="status-icons">••• ▰</span>
    </div>
  )
}

type HeaderProps = {
  title?: string
  /** false면 뒤로 버튼을 숨긴다 */
  showBack?: boolean
  onBack?: () => void
  right?: ReactNode
}

export function Header({ title, showBack = true, onBack, right }: HeaderProps) {
  const { back } = useRouter()
  return (
    <header className="app-header">
      {showBack ? (
        <button type="button" className="icon-button" aria-label="뒤로" onClick={onBack ?? back}>
          <BackIcon />
        </button>
      ) : (
        <span className="icon-button-spacer" />
      )}
      {title && <h2 className="app-header-title">{title}</h2>}
      <span className="app-header-right">{right}</span>
    </header>
  )
}

type ScreenProps = {
  header?: ReactNode
  footer?: ReactNode
  children: ReactNode
  /** 본문 배경 (기본 흰색) */
  bodyClassName?: string
  /** 하단 메뉴 */
  nav?: ReactNode
}

export function Screen({ header, footer, children, bodyClassName, nav }: ScreenProps) {
  return (
    <div className="screen">
      <StatusBar />
      {header}
      <main className={`screen-body ${bodyClassName ?? ''}`}>{children}</main>
      {footer}
      {nav}
    </div>
  )
}

export function Footer({ children }: { children: ReactNode }) {
  return <div className="app-footer">{children}</div>
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'text'
  size?: 'large' | 'medium' | 'small'
  block?: boolean
}

export function Button({
  variant = 'primary',
  size = 'large',
  block = true,
  className,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`btn btn-${variant} btn-${size} ${block ? 'btn-block' : ''} ${className ?? ''}`}
      {...rest}
    />
  )
}
