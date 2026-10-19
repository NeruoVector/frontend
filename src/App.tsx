import { useEffect, useState } from 'react'
import './App.css'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8081'

type Detection = {
  id: string
  drone_id: string
  label: string
  confidence: number
  latitude: number | null
  longitude: number | null
  detected_at: string
  created_at: string
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; detections: Detection[] }

function App() {
  const [state, setState] = useState<LoadState>({ status: 'loading' })

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/v1/detections?limit=50`, {
          signal: controller.signal,
        })
        if (!response.ok) {
          throw new Error(`API ${response.status}`)
        }
        const detections = (await response.json()) as Detection[]
        setState({ status: 'ready', detections })
      } catch (error) {
        if (controller.signal.aborted) return
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : '알 수 없는 오류',
        })
      }
    }

    load()
    return () => controller.abort()
  }, [])

  return (
    <main className="app">
      <header className="header">
        <h1>NeuroVector</h1>
        <p className="subtitle">드론 장애물 감지 모니터</p>
      </header>

      <section className="panel">
        <h2>최근 감지</h2>

        {state.status === 'loading' && <p className="muted">불러오는 중…</p>}

        {state.status === 'error' && (
          <p className="error">
            데이터를 불러오지 못했습니다: {state.message}
            <br />
            <span className="muted">백엔드({API_BASE_URL})가 실행 중인지 확인하세요.</span>
          </p>
        )}

        {state.status === 'ready' && state.detections.length === 0 && (
          <p className="muted">아직 감지 기록이 없습니다.</p>
        )}

        {state.status === 'ready' && state.detections.length > 0 && (
          <table className="table">
            <thead>
              <tr>
                <th>시각</th>
                <th>드론</th>
                <th>객체</th>
                <th>신뢰도</th>
                <th>위치</th>
              </tr>
            </thead>
            <tbody>
              {state.detections.map((d) => (
                <tr key={d.id}>
                  <td>{new Date(d.detected_at).toLocaleString('ko-KR')}</td>
                  <td>{d.drone_id}</td>
                  <td>{d.label}</td>
                  <td>{(d.confidence * 100).toFixed(1)}%</td>
                  <td>
                    {d.latitude != null && d.longitude != null
                      ? `${d.latitude.toFixed(5)}, ${d.longitude.toFixed(5)}`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </main>
  )
}

export default App
