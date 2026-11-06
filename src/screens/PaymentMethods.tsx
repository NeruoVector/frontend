import { Button, Footer, Header, Screen } from '../components/Layout.tsx'
import { useRouter } from '../router.tsx'
import { useAppState } from '../store.tsx'

export function PaymentMethodsScreen() {
  const { navigate } = useRouter()
  const { cartCount } = useAppState()
  return <Screen
    header={<Header title="결제 안내" />}
    footer={<Footer><Button onClick={() => navigate(cartCount > 0 ? 'payment' : 'home')}>
      {cartCount > 0 ? '주문·결제로 가기' : '상품 보러 가기'}
    </Button></Footer>}
  >
    <section className="pay-section">
      <h1 className="section-title">테스트 결제</h1>
      <p className="desc">장바구니에 담은 상품의 주문 금액을 확인하고 결제할 수 있습니다.</p>
      <p className="desc">결제는 테스트로 처리되며 실제 금액이 청구되지 않습니다. 카드번호나 계좌번호를 입력할 필요가 없습니다.</p>
      <p className="desc">결제 결과와 주문 내역은 로그인한 계정에서 확인할 수 있습니다.</p>
    </section>
  </Screen>
}
