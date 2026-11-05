type IcePeer = Pick<RTCPeerConnection, 'iceGatheringState' | 'connectionState' | 'addEventListener' | 'removeEventListener'>

export class IceGatheringError extends Error {
  readonly reason: 'timeout' | 'closed'
  constructor(reason: 'timeout' | 'closed') {
    super(reason === 'timeout' ? 'ICE 후보 수집 시간이 초과됐습니다. 다시 연결해 주세요.' : 'ICE 연결이 취소됐습니다.')
    this.reason = reason
  }
}

export function waitForIceGathering(peer: IcePeer): Promise<void> {
  if (peer.connectionState === 'closed') return Promise.reject(new IceGatheringError('closed'))
  if (peer.iceGatheringState === 'complete') return Promise.resolve()
  return new Promise((resolve, reject) => {
    const cleanup = () => {
      clearTimeout(timer)
      peer.removeEventListener('icegatheringstatechange', changed)
      peer.removeEventListener('connectionstatechange', changed)
    }
    const changed = () => {
      if (peer.connectionState === 'closed') { cleanup(); reject(new IceGatheringError('closed')) }
      else if (peer.iceGatheringState === 'complete') { cleanup(); resolve() }
    }
    const timer = setTimeout(() => { cleanup(); reject(new IceGatheringError('timeout')) }, 10000)
    peer.addEventListener('icegatheringstatechange', changed)
    peer.addEventListener('connectionstatechange', changed)
  })
}
