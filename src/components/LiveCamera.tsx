import { useCallback, useEffect, useRef, useState } from 'react'
import ky, { HTTPError } from 'ky'
import { z } from 'zod'
import { BASE_URL } from '../api.ts'
import { Button, Header, Screen } from './Layout.tsx'
import './LiveCamera.css'
import { VisionPanel } from './VisionPanel.tsx'
import { IceGatheringError, waitForIceGathering } from '../webrtc.ts'

const iceSchema = z.object({
  iceServers: z.array(z.object({ urls: z.union([z.string(), z.array(z.string())]), username: z.string().optional(), credential: z.string().optional() })),
  iceTransportPolicy: z.enum(['all', 'relay']).default('all'),
})
const inbound = z.object({ type: z.literal('inbound-rtp'), kind: z.literal('video'), framesDecoded: z.number() })
const http = ky.create({ retry: 0, timeout: 15000, credentials: 'same-origin' })
export const SCHOOL_DRONE_ID = 'school-drone-001'

type Connection = {
  readonly controller: AbortController
  readonly peer: RTCPeerConnection
  session: string | null
  timer: ReturnType<typeof setInterval> | null
  deadline: ReturnType<typeof setTimeout> | null
}

async function deleteSession(url: string) {
  try { await http.delete(url, { timeout: 5000, keepalive: true }) }
  catch (cause) {
    if (cause instanceof HTTPError && cause.response.status === 404) return
    if (cause instanceof Error) console.warn('영상 세션을 정리하지 못했습니다.', cause.name)
    else throw cause
  }
}

export function LiveCamera({ droneId = SCHOOL_DRONE_ID }: { readonly droneId?: string }) {
  const [connecting, setConnecting] = useState(false)
  const [message, setMessage] = useState('영상 연결 대기 중')
  const video = useRef<HTMLVideoElement | null>(null)
  const current = useRef<Connection | null>(null)

  const release = useCallback(() => {
    const connection = current.current
    current.current = null
    if (connection) {
      connection.controller.abort()
      if (connection.timer !== null) clearInterval(connection.timer)
      if (connection.deadline !== null) clearTimeout(connection.deadline)
      connection.peer.ontrack = null
      connection.peer.onconnectionstatechange = null
      for (const receiver of connection.peer.getReceivers()) receiver.track?.stop()
      connection.peer.close()
      if (connection.session) void deleteSession(connection.session)
    }
    if (video.current) video.current.srcObject = null
  }, [])

  useEffect(() => {
    void connect()
    return release
  }, [droneId, release])

  async function connect() {
    release()
    if (typeof RTCPeerConnection === 'undefined') { setMessage('이 브라우저에서는 실시간 영상을 지원하지 않습니다.'); return }
    setConnecting(true); setMessage('영상 연결 중…')
    // Install ownership before waiting for configuration so navigation cannot create an orphan peer.
    const peer = new RTCPeerConnection()
    const connection: Connection = { controller: new AbortController(), peer, session: null, timer: null, deadline: null }
    current.current = connection
    try {
      const configuration = iceSchema.parse(await http.get('/webrtc-config.json', { cache: 'no-store', signal: connection.controller.signal }).json())
      if (current.current !== connection) return
      peer.setConfiguration(configuration)
      peer.addTransceiver('video', { direction: 'recvonly' })
      peer.ontrack = event => {
        if (current.current === connection && video.current) video.current.srcObject = event.streams[0] ?? new MediaStream([event.track])
      }
      peer.onconnectionstatechange = () => {
        if (current.current !== connection) return
        if (peer.connectionState === 'connected') {
          if (connection.deadline !== null) clearTimeout(connection.deadline)
          connection.deadline = null
        } else if (peer.connectionState === 'failed') {
          release(); setConnecting(false); setMessage('영상 연결 협상에 실패했습니다. 다시 연결해 주세요.')
        } else if (peer.connectionState === 'disconnected') setMessage('영상 연결이 끊어졌습니다. 다시 연결해 주세요.')
      }
      await peer.setLocalDescription(await peer.createOffer())
      await waitForIceGathering(peer)
      if (current.current !== connection) return
      const response = await http.post(`${BASE_URL}/api/v1/streams/${encodeURIComponent(droneId)}/whep`, {
        headers: { 'Content-Type': 'application/sdp' }, body: peer.localDescription?.sdp ?? '',
      })
      const location = response.headers.get('Location')
      const sessionId = location?.split('?')[0].split('/').filter(Boolean).at(-1)
      if (!sessionId || !z.uuid().safeParse(sessionId).success) throw new Error('영상 세션 응답이 올바르지 않습니다.')
      const session = `${BASE_URL}/api/v1/streams/${encodeURIComponent(droneId)}/whep/${sessionId}`
      if (current.current !== connection) { await deleteSession(session); return }
      connection.session = session
      await peer.setRemoteDescription({ type: 'answer', sdp: await response.text() })
      if (current.current !== connection) return
      if (peer.connectionState !== 'connected') connection.deadline = setTimeout(() => {
        if (current.current === connection && peer.connectionState !== 'connected') {
          release(); setConnecting(false); setMessage('영상 연결 협상 시간이 초과됐습니다. 다시 연결해 주세요.')
        }
      }, 12000)
      let previous = 0
      let lastFrame = performance.now()
      let polling = false
      connection.timer = setInterval(() => {
        if (polling || current.current !== connection || peer.connectionState !== 'connected') return
        polling = true
        void peer.getStats().then(stats => {
          if (current.current !== connection) return
          let decoded = 0
          for (const entry of stats.values()) { const result = inbound.safeParse(entry); if (result.success) decoded += result.data.framesDecoded }
          if (decoded > previous) { previous = decoded; lastFrame = performance.now(); setMessage('영상 수신 중') }
          else if (performance.now() - lastFrame > 8000) setMessage(previous > 0 ? '영상 프레임 수신이 중단됐습니다. 다시 연결해 주세요.' : '영상 프레임이 도착하지 않습니다. 송출 상태를 확인해 주세요.')
        }).catch((cause: unknown) => {
          if (current.current === connection) setMessage(cause instanceof Error ? '영상 상태를 확인하지 못했습니다. 다시 연결해 주세요.' : '영상 상태 확인 오류')
        }).finally(() => { polling = false })
      }, 1000)
      setMessage('영상 프레임 수신 대기 중…')
    } catch (cause) {
      if (current.current !== connection) return
      release()
      setConnecting(false)
      setMessage(cause instanceof IceGatheringError ? cause.message : cause instanceof Error ? '영상에 연결하지 못했습니다. 송출 상태를 확인하고 다시 연결해 주세요.' : '영상 연결 오류')
    } finally { if (current.current === connection) setConnecting(false) }
  }

  return <section className="live-camera" aria-label="실시간 드론 영상">
    <video ref={video} autoPlay playsInline muted disablePictureInPicture disableRemotePlayback controlsList="nodownload nofullscreen noremoteplayback" aria-label="드론 실시간 카메라" />
    {message !== '영상 수신 중' && <p role="status" className="desc">{message}</p>}
    {!connecting && message !== '영상 수신 중' && !message.includes('대기 중') && <Button block={false} size="medium" variant="secondary" onClick={() => void connect()}>다시 시도</Button>}
    {droneId === SCHOOL_DRONE_ID && <VisionPanel />}
  </section>
}

export function CameraScreen() {
  return <Screen header={<Header title="실시간 영상" />}><LiveCamera /></Screen>
}
