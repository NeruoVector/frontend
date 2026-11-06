import { useEffect, useState } from 'react'
import ky from 'ky'
import { z } from 'zod'
import './VisionPanel.css'

const inferenceSchema = z.object({
  timestamp: z.number().finite(),
  ok: z.boolean(),
  blocked: z.boolean(),
  detections: z.array(z.object({
    label: z.string(),
    confidence: z.number().finite().min(0).max(1),
    distance_m: z.number().finite().nonnegative().nullable(),
  })),
  elapsed_ms: z.number().finite().nonnegative(),
  error: z.string().nullable().optional(),
})
type Inference = z.infer<typeof inferenceSchema>
const labels: Readonly<Record<string, string>> = {
  person: '사람', car: '승용차', truck: '트럭', bus: '버스',
  tree_region: '나무', building_region: '건물', window: '창문',
}

export function VisionPanel() {
  const [inference, setInference] = useState<Inference | null>(null)
  const [nowMs, setNowMs] = useState(Date.now)
  useEffect(() => {
    const controller = new AbortController()
    let timer: ReturnType<typeof setTimeout> | undefined
    const clock = setInterval(() => setNowMs(Date.now()), 1000)
    async function poll() {
      try {
        const result = inferenceSchema.parse(await ky.get('/simulation/live/inference.json', {
          signal: controller.signal, timeout: 3000, retry: 0, cache: 'no-store', credentials: 'same-origin',
        }).json())
        if (!controller.signal.aborted) { setInference(result); setNowMs(Date.now()) }
      } catch (cause) {
        if (controller.signal.aborted) return
        if (cause instanceof Error) setInference(null)
        else throw cause
      } finally {
        if (!controller.signal.aborted) timer = setTimeout(() => void poll(), 2000)
      }
    }
    void poll()
    return () => { controller.abort(); clearTimeout(timer); clearInterval(clock) }
  }, [])
  const age = inference === null ? Infinity : nowMs / 1000 - inference.timestamp
  const current = inference !== null && inference.ok && age >= -2 && age < 8 ? inference : null
  return <section className="vision-panel" aria-label="최근 AI 분석">
    <h3>최근 AI 분석</h3>
    <p className="desc" role="status">{current ? `AI 분석 중 · 감지 ${current.detections.length}개` : '분석 연결 확인 중'}</p>
    {current && <>
      {current.blocked && <p className="vision-panel-warning">장애물 감지 · 안전 확인 중</p>}
      {current.detections.length > 0 && <ul className="vision-detections">
        {current.detections.map((detection, index) => <li key={`${detection.label}-${index}`}>
          <span>{labels[detection.label] ?? detection.label}</span>
          <span>신뢰도 {Number((detection.confidence * 100).toFixed(1))}%</span>
          {detection.distance_m !== null && <span>장애물 추정 거리 {detection.distance_m.toFixed(1)} m</span>}
        </li>)}
      </ul>}
      <details className="vision-image">
        <summary>최근 분석 이미지 보기</summary>
        <img src={`/simulation/live/detections.jpg?t=${current.timestamp}`} loading="lazy" alt="최근 AI 분석 이미지" />
      </details>
    </>}
  </section>
}
