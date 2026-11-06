import { AuthProvider } from './auth.tsx'
import { lazy, Suspense, type ReactElement } from 'react'
import { RouterProvider, useRouter, type Route } from './router.tsx'
import { AppStateProvider, useAppState } from './store.tsx'
import {
  CartScreen,
  HomeScreen,
  MenuScreen,
  PaymentScreen,
  PlaceScreen,
  StoreScreen,
} from './screens/Shop.tsx'
import './App.css'
import { RouteErrorBoundary } from './components/RouteErrorBoundary.tsx'
import { Header, Screen, Button } from './components/Layout.tsx'

const TermsScreen = lazy(() => import('./screens/Onboarding.tsx').then((module) => ({ default: module.TermsScreen })))
const LoginScreen = lazy(() => import('./screens/Onboarding.tsx').then((module) => ({ default: module.LoginScreen })))
const PhoneScreen = lazy(() => import('./screens/Onboarding.tsx').then((module) => ({ default: module.PhoneScreen })))
const SchoolScreen = lazy(() => import('./screens/Onboarding.tsx').then((module) => ({ default: module.SchoolScreen })))
const ArrivingScreen = lazy(() => import('./screens/Delivery.tsx').then((module) => ({ default: module.ArrivingScreen })))
const OrderCompleteScreen = lazy(() => import('./screens/Delivery.tsx').then((module) => ({ default: module.OrderCompleteScreen })))
const ReceivedScreen = lazy(() => import('./screens/Delivery.tsx').then((module) => ({ default: module.ReceivedScreen })))
const ReviewScreen = lazy(() => import('./screens/Delivery.tsx').then((module) => ({ default: module.ReviewScreen })))
const TrackingScreen = lazy(() => import('./screens/Delivery.tsx').then((module) => ({ default: module.TrackingScreen })))
const MyScreen = lazy(() => import('./screens/Account.tsx').then((module) => ({ default: module.MyScreen })))
const MyReviewsScreen = lazy(() => import('./screens/Account.tsx').then((module) => ({ default: module.MyReviewsScreen })))
const OrdersScreen = lazy(() => import('./screens/Account.tsx').then((module) => ({ default: module.OrdersScreen })))
const PaymentMethodsScreen = lazy(() => import('./screens/Account.tsx').then((module) => ({ default: module.PaymentMethodsScreen })))
const SettingsScreen = lazy(() => import('./screens/Account.tsx').then((module) => ({ default: module.SettingsScreen })))
const CameraScreen = lazy(() => import('./components/LiveCamera.tsx').then((module) => ({ default: module.CameraScreen })))

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
  camera: { label: '실시간 영상', section: '04 배송과 수령', render: () => <CameraScreen /> },
  tracking: { label: '배송 현황', section: '04 배송과 수령', render: () => <TrackingScreen /> },
  arriving: { label: '배송 도착 안내', section: '04 배송과 수령', render: () => <ArrivingScreen /> },
  received: { label: '수령 확인', section: '04 배송과 수령', render: () => <ReceivedScreen /> },
  reviews: { label: '내 리뷰', section: '05 마이와 이용 관리', render: () => <MyReviewsScreen /> },
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
  const { route, navigate } = useRouter()
  const { order, loading } = useAppState()
  const needsOrder = ['order-complete', 'tracking', 'arriving', 'received', 'review'].includes(route)
  // 다른 화면과 같은 .device-screen 틀 안에 그려야 폰 크기·여백이 맞는다.
  if (needsOrder && !order) return (
    <div className="device-screen" key={route}>
      <Screen header={<Header title={SCREENS[route].label} />}>
        <div className="order-empty">
          <p className="desc" role="status">{loading ? '주문을 불러오는 중…' : '선택한 주문이 없습니다.'}</p>
          {!loading && <>
            <Button onClick={() => navigate('home')}>상품 보러 가기</Button>
            <Button variant="secondary" onClick={() => navigate('orders')}>주문 내역 보기</Button>
          </>}
        </div>
      </Screen>
    </div>
  )
  // key로 화면이 바뀔 때마다 입력 상태를 초기화하고 스크롤을 맨 위로 돌린다.
  return (
    <div className="device-screen" key={route}>
      <RouteErrorBoundary>
        <Suspense fallback={<Screen header={<Header title={SCREENS[route].label} />}><p className="desc" role="status">화면을 불러오는 중…</p></Screen>}>
          {SCREENS[route].render()}
        </Suspense>
      </RouteErrorBoundary>
    </div>
  )
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider><AppStateProvider>
        <div className="app-stage">
          <ScreenIndex />
          <div className="device">
            <CurrentScreen />
          </div>
        </div>
      </AppStateProvider></AuthProvider>
    </RouterProvider>
  )
}
