import { useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { api } from '../api.ts'
import { Button, Footer, Header, Screen } from '../components/Layout.tsx'
import { canConfirmReceipt } from '../flightProgress.ts'
import { useOrderFlightProgress } from '../useOrderFlightProgress.ts'
import { useRouter } from '../router.tsx'
import type { Order } from '../store.tsx'

export function ReceiptScreen({ order }: { readonly order: Order }) {
  const { navigate } = useRouter()
  const progress = useOrderFlightProgress(order)
  const [sending, setSending] = useState(false)
  const [accepted, setAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pending = useRef(false)
  const ready = canConfirmReceipt(progress.simulation, order, Date.now())
  const received = accepted || progress.mission?.received === true

  async function receive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!ready || pending.current || accepted) return
    pending.current = true
    setSending(true)
    setError(null)
    try {
      await api.confirmReceipt(order.id)
      setAccepted(true)
    } catch (cause) {
      if (cause instanceof Error) setError(cause.message)
      else throw cause
    } finally {
      pending.current = false
      setSending(false)
    }
  }

  return <Screen header={<Header title={progress.completed ? '배송 완료' : '수령 확인'} onBack={() => navigate('tracking')} />}
    footer={<Footer><Button onClick={() => navigate(progress.completed ? 'orders' : 'tracking')}>
      {progress.completed ? '주문 내역 보기' : '실시간 배송·복귀 상태 보기'}
    </Button></Footer>}>
    <section className="recv-head">
      <h1 className="title-xl recv-title">{progress.completed ? '배송과 복귀를 마쳤어요' : received ? '수령이 확인됐어요' : ready ? '상품을 받으셨나요?' : '배송지 착륙을 기다려 주세요'}</h1>
      <p className="desc recv-desc" role="status">{progress.completed ? '수령 확인 후 출발지 복귀·착륙을 마쳤습니다.' : received ? '드론이 출발지로 복귀하고 있어요.' : ready ? '상품을 받은 뒤 아래 버튼을 눌러 주세요.' : '배송지에 착륙하면 수령을 확인해 주세요.'}</p>
    </section>
    <div className="recv-card-wrap"><div className="recv-card">
      <p className="recv-label">수령 장소</p><strong>{order.placeName}</strong>
    </div></div>
    {!progress.completed && !received && <form className="receipt-form" onSubmit={event => void receive(event)}>
      <p id="receipt-wait" className="desc">수령을 확인하기 전에는 드론이 복귀하지 않습니다.</p>
      <Button type="submit" disabled={!ready || sending}>{sending ? '수령 확인 중…' : '수령 확인'}</Button>
    </form>}
    {(error || progress.error) && <p className="review-feedback" role="alert">{error || progress.error}</p>}
  </Screen>
}
