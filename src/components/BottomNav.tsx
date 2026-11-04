import { useRouter, type Route } from '../router.tsx'
import { HomeIcon, ReceiptIcon, SearchIcon, UserIcon } from './Icons.tsx'
import './BottomNav.css'

const ITEMS: { label: string; route: Route; Icon: typeof HomeIcon }[] = [
  { label: '홈', route: 'home', Icon: HomeIcon },
  { label: '매점', route: 'store', Icon: SearchIcon },
  { label: '주문내역', route: 'orders', Icon: ReceiptIcon },
  { label: '마이', route: 'my', Icon: UserIcon },
]

/** Figma: App / 하단 메뉴 (Active = 홈 · 주문내역 · 마이) */
export function BottomNav({ active }: { active: Route }) {
  const { navigate } = useRouter()
  return (
    <nav className="bottom-nav" aria-label="하단 메뉴">
      {ITEMS.map(({ label, route, Icon }) => (
        <button
          key={route}
          type="button"
          className={`bottom-nav-item ${active === route ? 'is-active' : ''}`}
          aria-current={active === route ? 'page' : undefined}
          onClick={() => navigate(route)}
        >
          <Icon />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  )
}
