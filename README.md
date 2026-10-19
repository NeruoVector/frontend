# NeuroVector Frontend

드론 감지 결과, 텔레메트리, 실시간 카메라, 녹화 파일을 보여주는 React 대시보드입니다.

- **React 19 + TypeScript + Vite**
- 감지/텔레메트리는 백엔드 REST API 로 조회
- 카메라는 백엔드 WHEP 프록시를 통해 WebRTC 로 재생
- 녹화 파일은 MediaMTX 녹화본을 백엔드 API 로 다운로드

## 요구 사항

- Node.js 20.19+ (또는 22.12+)
- npm

## 시작하기

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

개발 서버는 `/api` 요청을 `http://localhost:8081` 로 프록시합니다.
백엔드 주소를 바꾸려면 `vite.config.ts` 의 `server.proxy` 또는 `.env` 의
`VITE_API_BASE_URL` 을 수정하세요.

## 화면

| 패널 | API |
| --- | --- |
| 최근 감지 | `GET /api/v1/detections` |
| 드론 상태 | `GET /api/v1/flights/status` (5초 폴링) |
| 실시간 카메라 | `POST /api/v1/streams/{drone_id}/whep` |
| 녹화 파일 | `GET /api/v1/recordings?drone_id=` |

카메라 패널은 드론이 아래 SRT 주소로 송출 중일 때 동작합니다.

```text
srt://<MEDIA_SRT_PUBLIC_HOST>:8890?streamid=publish:drone-001
```

브라우저는 non-trickle ICE 로 offer 를 만든 뒤 백엔드 WHEP 프록시에 전달하고,
MediaMTX 의 answer SDP 를 받아 `<video>` 에 연결합니다.

## 스크립트

| 명령 | 설명 |
| --- | --- |
| `npm run dev` | 개발 서버 |
| `npm run build` | 타입 체크 + 프로덕션 빌드 (`dist/`) |
| `npm run preview` | 빌드 결과 미리보기 |
| `npm run lint` | oxlint |

## 환경 변수

| 변수 | 기본값 | 설명 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | `http://localhost:8081` | 백엔드 API 주소 |

## 관련 레포

- [`backend`](https://github.com/NeruoVector/backend) — Rust API 서버
- [`vision`](https://github.com/NeruoVector/vision) — Python 장애물 감지
- [`drone`](https://github.com/NeruoVector/drone) — C/C++ 드론 HAL
- [`platform`](https://github.com/NeruoVector/platform) — Docker 인프라

## 구조

```
src/
├── App.tsx      # 대시보드 + 카메라/녹화/상태 패널
├── App.css
├── main.tsx
└── index.css
```
