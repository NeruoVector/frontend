import { useEffect, useState } from 'react'
import { api, type CardMetadataInput, type CardMetadata } from '../api.ts'
import { useAuth } from '../auth.tsx'
import { Button, Header, Screen } from '../components/Layout.tsx'
import { useRouter } from '../router.tsx'
import './Account.css'
import './PaymentMethods.css'

export function PaymentMethodsScreen() {
  const { customer, loading } = useAuth()
  const { navigate } = useRouter()
  return <Screen header={<Header title="결제수단 관리" />}>
    <div className="paym">
      <p className="desc paym-desc">자주 쓰는 결제수단을 등록해 두세요.</p>
      {loading ? <p role="status" className="desc">로그인 상태를 확인하는 중…</p> : customer
        ? <CardMetadataManager key={customer.id} />
        : <><p className="desc">로그인하면 내 결제수단을 관리할 수 있습니다.</p><Button onClick={() => navigate('login')}>로그인</Button></>}
    </div>
  </Screen>
}

function CardMetadataManager() {
  const [cards, setCards] = useState<CardMetadata[]>([])
  const [loading, setLoading] = useState(true)
  const [available, setAvailable] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [choosing, setChoosing] = useState(false)
  const [retry, setRetry] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = cards.find(card => card.id === selectedId) ?? cards[0]
  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    api.cards().then(result => {
      if (active) { setCards([...result.items].sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind])); setAvailable(result.storage_available) }
    }).catch((cause: unknown) => {
      if (active) setError(cause instanceof Error ? cause.message : '결제수단을 불러오지 못했습니다.')
    }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [retry])
  // Each authenticated identity owns a keyed instance; unmount invalidates pending mutations.
  const [lifetime] = useState(() => ({ active: true }))
  useEffect(() => { lifetime.active = true; return () => { lifetime.active = false } }, [lifetime])

  async function add(kind: CardMetadataInput['kind']) {
    setBusy(true)
    setError(null)
    try {
      const card = await api.addCard({ kind })
      if (lifetime.active) { setCards(current => [...current, card]); setChoosing(false) }
    } catch (cause) {
      if (lifetime.active) setError(cause instanceof Error ? cause.message : '결제수단을 등록하지 못했습니다.')
    } finally { if (lifetime.active) setBusy(false) }
  }
  async function remove(id: string) {
    setBusy(true)
    setError(null)
    try {
      await api.removeCard(id)
      if (lifetime.active) setCards(current => current.filter(card => card.id !== id))
    } catch (cause) {
      if (lifetime.active) setError(cause instanceof Error ? cause.message : '결제수단을 삭제하지 못했습니다.')
    } finally { if (lifetime.active) setBusy(false) }
  }
  return <section className="paym-manager" aria-label="저장한 결제수단" aria-busy={busy || loading}>
    {loading && <p className="desc" role="status">결제수단을 불러오는 중…</p>}
    {error && <p className="paym-error" role="alert">{error}</p>}
    {!loading && !available && !error && <p className="desc" role="status">결제수단 저장 기능을 사용할 수 없습니다. 잠시 후 다시 시도해 주세요.</p>}
    {!loading && (error || !available) && <button className="order-btn" type="button" disabled={busy} onClick={() => setRetry(value => value + 1)}>다시 불러오기</button>}
    {!loading && available && <>
      <div className="paym-cards">
        {cards.map(card => <button type="button" key={card.id} className={`pay-card-item ${card.kind === 'bank_account' ? 'is-dark' : 'is-light'}`} disabled={busy} aria-pressed={selected?.id === card.id} onClick={() => setSelectedId(card.id)}>
          <span className="pay-card-top"><strong>{card.nickname}</strong>{selected?.id === card.id && <span className="pay-card-badge">기본</span>}</span>
          <span className="pay-card-chip" aria-hidden="true" />
          <span className="pay-card-number">{maskedNumber(card)}</span>
          <span className="pay-card-brand" aria-hidden="true">SEONRIN</span>
        </button>)}
      </div>
      {cards.length === 0 && <p className="desc">저장한 결제수단이 없습니다.</p>}
      <button type="button" className="paym-add" disabled={busy} aria-expanded={choosing} onClick={() => setChoosing(value => !value)}><img src="/figma/payment-add.svg" width="21" height="21" alt="" />결제수단 추가</button>
      <p className="paym-note">기본 수단 선택은 이 화면에서 유지됩니다.<br />등록된 정보는 데모이며 실제 결제는 지원하지 않습니다.</p>
      {selected && <button className="order-btn paym-remove" type="button" disabled={busy} aria-label={`${selected.nickname} 끝 4자리 ${selected.last4} 삭제`} onClick={() => void remove(selected.id)}>선택한 결제수단 삭제</button>}
      {choosing && <div className="paym-options" role="group" aria-label="데모 결제수단 종류">
        <p className="desc">종류를 선택하면 데모 번호가 자동으로 생성됩니다.</p>
        {KINDS.map(option => <button className="order-btn" type="button" key={option.kind} disabled={busy} onClick={() => void add(option.kind)}>{option.label}</button>)}
      </div>}
      {busy && <p role="status" className="desc">처리 중…</p>}

    </>}
  </section>
}

const KINDS = [{ kind: 'card', label: '카드' }, { kind: 'bank_account', label: '계좌' }, { kind: 'mobile', label: '휴대폰' }] as const
const KIND_ORDER = { card: 0, bank_account: 1, mobile: 2 } as const
function maskedNumber(card: CardMetadata): string {
  switch (card.kind) {
    case 'card': return `•••• •••• ${card.last4}`
    case 'bank_account': return `•••• •••• ${card.last4}`
    case 'mobile': return `010-••••-${card.last4}`
    default: { const unreachable: never = card.kind; return unreachable }
  }
}
