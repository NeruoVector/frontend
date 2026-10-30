import { useEffect, useRef, useState } from 'react'
import { parsePhotoCandidate, type PhotoCandidate } from './photoLookup'

type State = { readonly status: 'idle' | 'loading' | 'not-found' } | { readonly status: 'error'; readonly message: string } | { readonly status: 'ready'; readonly candidate: PhotoCandidate }
export function PhotoLookup({ onApply }: { readonly onApply: (candidate: PhotoCandidate) => void }) {
  const [barcode, setBarcode] = useState('')
  const [imageStatus, setImageStatus] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [state, setState] = useState<State>({ status: 'idle' })
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  async function lookup() {
    if (!/^\d{8,14}$/.test(barcode)) { setState({ status: 'error', message: '포장 바코드를 숫자 8~14자리로 입력하세요.' }); return }
    request.current?.abort()
    const controller = new AbortController(); request.current = controller; setImageStatus('loading'); setState({ status: 'loading' })
    try {
      const response = await fetch(`/food-db/api/v3.6/product/${barcode}.json?fields=product_name,brands,image_front_url`, { credentials: 'omit', signal: AbortSignal.any([controller.signal, AbortSignal.timeout(25_000)]) })
      if (controller.signal.aborted) return
      if (response.status === 404) { setState({ status: 'not-found' }); return }
      if (!response.ok) { setState({ status: 'error', message: `사진 조회에 실패했습니다 (HTTP ${response.status}).` }); return }
      const candidate = parsePhotoCandidate(await response.json(), barcode)
      if (!controller.signal.aborted) setState(candidate ? { status: 'ready', candidate } : { status: 'not-found' })
    } catch (error) {
      if (controller.signal.aborted) return
      setState({ status: 'error', message: error instanceof DOMException && error.name === 'TimeoutError' ? '사진 조회 시간이 초과되었습니다.' : '사진 조회에 실패했습니다. 다시 시도하세요.' })
    }
  }
  return <section className="food-database-picker field-wide" aria-labelledby="photo-lookup-title" aria-busy={state.status === 'loading'}>
    <h3 id="photo-lookup-title">바코드로 사진 찾기 (선택)</h3><p className="muted small commerce-copy">실제 포장 바코드를 입력하고 상품을 확인한 뒤 사진만 적용하세요. 식품코드는 바코드가 아닙니다.</p>
    <div className="food-database-controls"><label className="field"><span>포장 바코드</span><input inputMode="numeric" onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); if (state.status !== 'loading') void lookup() } }} value={barcode} maxLength={14} onChange={(event) => { setBarcode(event.target.value); setState({ status: 'idle' }); request.current?.abort() }} /></label><button className="button button-secondary button-small" type="button" onClick={() => void lookup()} disabled={state.status === 'loading'}>사진 조회</button>{state.status === 'loading' && <button className="button button-secondary button-small" type="button" onClick={() => { request.current?.abort(); setState({ status: 'idle' }) }}>취소</button>}</div>
    {state.status === 'loading' && <p role="status">사진을 조회하고 있습니다.</p>}
    {state.status === 'error' && <p className="error" role="alert">{state.message}</p>}
    {state.status === 'not-found' && <p role="status">해당 바코드의 상품을 찾지 못했습니다.</p>}
    {state.status === 'ready' && <div className="food-database-result"><p><strong>{state.candidate.name}</strong> · {state.candidate.brand}</p><a href={state.candidate.sourceUrl} target="_blank" rel="noreferrer">Open Food Facts 원본 · {state.candidate.barcode}</a>
      {state.candidate.imageUrl ? <>{imageStatus === 'failed' ? <p role="status">사진을 불러오지 못했습니다.</p> : <img src={state.candidate.imageUrl} alt={`${state.candidate.name} 사진`} className="product-image" onLoad={() => setImageStatus('ready')} onError={() => setImageStatus('failed')} />}<button type="button" className="button button-small" disabled={imageStatus !== 'ready'} onClick={() => onApply(state.candidate)}>이 사진 적용</button></> : <p role="status">등록된 사진이 없습니다.</p>}
      <p className="muted small">사진: Open Food Facts · <a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noreferrer">CC BY-SA</a></p></div>}
  </section>
}
