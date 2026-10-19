# NeuroVector Frontend

드론 장애물 감지 결과를 보여주는 React 대시보드입니다.

- **React 19 + TypeScript + Vite**
- 백엔드 API(`/api/v1/detections`)에서 최근 감지 목록을 조회

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
├── App.tsx      # 대시보드 화면
├── App.css
├── main.tsx
└── index.css
```
