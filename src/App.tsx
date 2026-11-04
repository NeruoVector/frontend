import type { ReactElement } from 'react'
import { RouterProvider, useRouter, type Route } from './router.tsx'
import { AppStateProvider } from './store.tsx'
import { LoginScreen, PhoneScreen, SchoolScreen, TermsScreen } from './screens/Onboarding.tsx'
import {
  CartScreen,
  HomeScreen,
  MenuScreen,
  PaymentScreen,
  PlaceScreen,
  StoreScreen,
} from './screens/Shop.tsx'
import {
  ArrivingScreen,
  OrderCompleteScreen,
  ReceivedScreen,
  ReviewScreen,
  TrackingScreen,
} from './screens/Delivery.tsx'
import { MyScreen, OrdersScreen, PaymentMethodsScreen, SettingsScreen } from './screens/Account.tsx'
import './App.css'

const SCREENS: Record<Route, { label: string; section: string; render: () => ReactElement }> = {
  terms: { label: '약관 동의', section: '01 가입과 시작', render: () => <TermsScreen /> },
  login: { label: '로그인', section: '01 가입과 시작', render: () => <LoginScreen /> },
  phone: { label: '휴대폰 인증', section: '01 가입과 시작', render: () => <PhoneScreen /> },
  school: { label: '학교 등록', section: '02 학교 등록과 장소 설정', render: () => <SchoolScreen /> },
  place: { label: '기본 수령 장소', section: '02 학교 등록과 장소 설정', render: () => <PlaceScreen /> },
  home: { label: '홈', section: '03 매점 탐색과 주문', render: () => <HomeScreen /> },
  store: { label: '매점 상세', section: '03 매점 탐색과 주문', render: () => <StoreScreen /> },
  menu: { label: '메뉴 상세', section: '03 매점 탐색과 주문', render: () => <MenuScreen /> },
  cart: { label: '장바구니', section: '03 매점 탐색과 주문', render: () => <CartScreen /> },
  payment: { label: '결제', section: '03 매점 탐색과 주문', render: () => <PaymentScreen /> },
  'change-place': { label: '수령 장소 변경', section: '03 매점 탐색과 주문', render: () => <PlaceScreen mode="change" /> },
  'order-complete': { label: '주문 완료', section: '04 배송과 수령', render: () => <OrderCompleteScreen /> },
  tracking: { label: '배송 현황', section: '04 배송과 수령', render: () => <TrackingScreen /> },
  arriving: { label: '도착 임박', section: '04 배송과 수령', render: () => <ArrivingScreen /> },
  received: { label: '수령 확인', section: '04 배송과 수령', render: () => <ReceivedScreen /> },
  review: { label: '리뷰 작성', section: '05 마이와 이용 관리', render: () => <ReviewScreen /> },
  orders: { label: '주문 내역', section: '05 마이와 이용 관리', render: () => <OrdersScreen /> },
  my: { label: '마이', section: '05 마이와 이용 관리', render: () => <MyScreen /> },
  settings: { label: '설정', section: '05 마이와 이용 관리', render: () => <SettingsScreen /> },
  'payment-methods': { label: '결제수단 관리', section: '05 마이와 이용 관리', render: () => <PaymentMethodsScreen /> },
}

/** 데스크톱에서만 보이는 화면 목록 (시안 검토용) */
function ScreenIndex() {
  const { route, navigate } = useRouter()
  const sections = [...new Set(Object.values(SCREENS).map((s) => s.section))]
  return (
    <nav className="screen-index" aria-label="화면 목록">
      <p className="screen-index-title">교내 배달 · 사용자 앱</p>
      {sections.map((section) => (
        <div key={section} className="screen-index-group">
          <p>{section}</p>
          {(Object.keys(SCREENS) as Route[])
            .filter((r) => SCREENS[r].section === section)
            .map((r) => (
              <button
                key={r}
                type="button"
                className={r === route ? 'is-active' : ''}
                onClick={() => navigate(r)}
              >
                {SCREENS[r].label}
              </button>
            ))}
        </div>
      ))}
    </nav>
  )
}

function CurrentScreen() {
  const { route } = useRouter()
  // key로 화면이 바뀔 때마다 입력 상태를 초기화하고 스크롤을 맨 위로 돌린다.
  return <div className="device-screen" key={route}>{SCREENS[route].render()}</div>
}

export default function App() {
  return (
    <RouterProvider>
      <AppStateProvider>
        <div className="app-stage">
          <ScreenIndex />
          <div className="device">
            <CurrentScreen />
          </div>
        </div>
      </AppStateProvider>
    </RouterProvider>
  )
}
