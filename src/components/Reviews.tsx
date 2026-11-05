import { useEffect, useState } from 'react'
import { api, type ReviewList } from '../api.ts'
import './Reviews.css'

type ReviewLoad =
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly data: ReviewList }
  | { readonly status: 'error'; readonly message: string }

export function useReviews(phone?: string, enabled = true, own = false) {
  const [state, setState] = useState<ReviewLoad>({ status: 'loading' })
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    if (!enabled) { setState({ status: 'loading' }); return }
    let active = true
    setState({ status: 'loading' });
    (own ? api.myReviews() : api.reviews(phone)).then(data => { if (active) setState({ status: 'ready', data }) }).catch((cause: unknown) => {
      if (active) setState({ status: 'error', message: cause instanceof Error ? cause.message : '리뷰를 불러오지 못했습니다.' })
    })
    return () => { active = false }
  }, [phone, enabled, revision, own])
  return { state, reload: () => setRevision(value => value + 1) }
}

export function ReviewEntries({ state, reload }: ReturnType<typeof useReviews>) {
  switch (state.status) {
    case 'loading': return <p className="desc" role="status">리뷰를 불러오는 중…</p>
    case 'error': return <div><p role="alert">{state.message}</p><button className="order-btn" type="button" onClick={reload}>다시 불러오기</button></div>
    case 'ready': return state.data.items.length === 0 ? <p className="desc">등록된 리뷰가 없습니다.</p> : <div className="saved-reviews">
      {state.data.items.map(review => <article className="saved-review" key={review.id}>
        <header><span aria-label={`별점 ${review.rating}점`}>{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span><time dateTime={review.created_at}>{new Date(review.created_at).toLocaleDateString('ko-KR')}</time></header>
        <p className="saved-review-content">{review.content}</p>
        {review.tags.length > 0 && <ul className="saved-review-tags" aria-label="리뷰 태그">{review.tags.map(tag => <li key={tag}>{tag}</li>)}</ul>}
        {review.has_photo && <img className="saved-review-photo" src={api.reviewPhotoUrl(review.id)} alt="등록된 리뷰 사진" loading="lazy" />}
      </article>)}
    </div>
    default: { const unreachable: never = state; return unreachable }
  }
}
