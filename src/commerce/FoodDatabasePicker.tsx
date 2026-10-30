import { useEffect, useRef, useState, type FormEvent } from 'react'
import { foodDatabasePath, resultSchema, type FoodProduct, type FoodQuery, type FoodResults } from './foodDatabase'
import { customerJson } from './client'

type Props = { readonly onChoose: (product: FoodProduct, dataset: FoodResults['dataset']) => void; readonly onClose: () => void }
type State = { readonly status: 'idle' | 'loading' } | { readonly status: 'error'; readonly message: string } | { readonly status: 'ready'; readonly result: FoodResults }

export function FoodDatabasePicker({ onChoose, onClose }: Props) {
  const [term, setTerm] = useState('')
  const [category, setCategory] = useState<'01' | 'all'>('01')
  const [state, setState] = useState<State>({ status: 'idle' })
  const [lastQuery, setLastQuery] = useState<FoodQuery | null>(null)
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  async function search(query: FoodQuery) {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setState({ status: 'loading' }); setLastQuery(query)
    try {
      const result = await customerJson(foodDatabasePath(query), resultSchema, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]) })
      if (!controller.signal.aborted) setState({ status: 'ready', result })
    } catch (error) {
      if (!controller.signal.aborted) setState({ status: 'error', message: error instanceof Error ? error.message : '식품 DB를 불러오지 못했습니다.' })
    }
  }
  function clearResults() { request.current?.abort(); setState({ status: 'idle' }); setLastQuery(null) }
  function submit(event: FormEvent<HTMLFormElement>) { event.preventDefault(); void search({ term, category, page: 1 }) }
  const loading = state.status === 'loading'
  return <section className="food-database-picker" aria-labelledby="food-database-title" aria-busy={loading}>
    <div className="panel-head"><div><h3 id="food-database-title">식약처 식품 DB에서 가져오기</h3><p className="muted small commerce-copy">식약처 식품 정보를 선택하세요. 판매가와 재고는 직접 입력합니다.</p></div><button className="button button-secondary button-small" type="button" onClick={onClose}>닫기</button></div>
    <form className="food-database-controls" onSubmit={submit}>
      <label className="field"><span>식품명, 제조사, 식품코드 또는 보고번호</span><input value={term} onChange={(event) => { setTerm(event.target.value); clearResults() }} maxLength={100} placeholder="예: 빼빼로" /></label>
      <label className="field"><span>식품 대분류</span><select value={category} onChange={(event) => { setCategory(event.target.value === 'all' ? 'all' : '01'); clearResults() }}><option value="01">과자류·빵류 또는 떡류</option><option value="all">전체</option></select></label>
      <button className="button button-small" type="submit" disabled={loading}>{loading ? '조회 중…' : '검색'}</button>
    </form>
    {state.status === 'idle' && <p className="muted" role="status">식품명이나 제조사로 검색하세요. 식품코드는 바코드가 아닙니다.</p>}
    {loading && <p className="muted" role="status">식품 정보를 조회하고 있습니다.</p>}
    {state.status === 'error' && <div className="inline-error"><p className="error" role="alert">{state.message}</p><button className="button button-secondary button-small" type="button" onClick={() => { if (lastQuery) void search(lastQuery) }}>다시 시도</button></div>}
    {state.status === 'ready' && <>
      <p className="muted small food-database-credit">출처: <a href={state.result.dataset.source_url} target="_blank" rel="noreferrer">{state.result.dataset.name}</a> · 기준일 {state.result.dataset.date} · {state.result.dataset.record_count.toLocaleString('ko-KR')}건</p><details className="muted small food-database-credit"><summary>데이터 파일 정보</summary><p>20260828_가공식품DB_316734건.xlsx · SHA-256 {state.result.dataset.sha256}</p></details>
      {state.result.items.length === 0 && <p className="muted" role="status">조회된 식품이 없습니다.</p>}
      <div className="product-grid food-database-results">{state.result.items.map((product) => <article className="product-card food-database-result" key={product.food_code}>
        <h4>{product.name}</h4><p className="muted small">{product.manufacturer || '제조사 정보 없음'} · {product.major_category}</p><p className="small">식품코드: {product.food_code}</p>
        <p className="small">{product.food_weight ? `식품중량: ${product.food_weight}` : '식품중량 정보 없음'} · {product.weight_grams === null ? '배송 무게 직접 입력 필요' : `표시 중량 ${product.weight_grams.toLocaleString('ko-KR')}g`}</p>
        <button className="button button-small" type="button" onClick={() => onChoose(product, state.result.dataset)}>{product.name} 가져오기</button>
      </article>)}</div>
      {lastQuery && (lastQuery.page > 1 || state.result.has_more) && <div className="form-actions food-database-pagination"><button className="button button-secondary button-small" type="button" disabled={lastQuery.page <= 1} onClick={() => void search({ ...lastQuery, page: lastQuery.page - 1 })}>이전</button><span className="muted small">{lastQuery.page}페이지</span><button className="button button-secondary button-small" type="button" disabled={!state.result.has_more} onClick={() => void search({ ...lastQuery, page: lastQuery.page + 1 })}>다음</button></div>}
    </>}
  </section>
}
