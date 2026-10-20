# NeuroVector Frontend

드론 감지 결과, 텔레메트리, 실시간 카메라, 녹화 파일을 보여주는 React 대시보드와
상품·재고 관리 및 주문 기능을 제공하는 웹 스토어입니다.

- **React 19 + TypeScript + Vite**
- 감지/텔레메트리는 백엔드 REST API 로 조회
- 카메라는 백엔드 WHEP 프록시를 통해 WebRTC 로 재생
- 녹화 파일은 MediaMTX 녹화본을 백엔드 API 로 다운로드
- 관리자 세션 로그인 후 상품 등록·수정, 판매 상태 변경, 재고 설정
- 스토어에서 주문하면 백엔드가 재고를 즉시 차감

## 요구 사항

- Node.js 20.19+ (또는 22.12+)
- npm

## 시작하기

```bash
npm install
cp .env.example .env
npm run dev          # http://localhost:5173
```

개발 서버는 `/api` 요청을 `http://localhost:8081` 로 프록시합니다. `.env` 의
`VITE_API_BASE_URL` 을 비워두면 same-origin `/api` 를 사용하고, 원격 백엔드를
직접 호출하려면 절대 URL 을 지정하세요. (세션 쿠키를 쓰므로 같은 호스트 사용 권장)

## 화면

상단 내비게이션으로 **모니터링 / 스토어 / 관리자** 화면을 오갈 수 있습니다.
각 화면은 `#dashboard`, `#store`, `#admin` 해시로 직접 열 수 있습니다.

### 모니터링

| 패널 | API |
| --- | --- |
| 최근 감지 | `GET /api/v1/detections` |
| 드론 상태 | `GET /api/v1/flights/status` (5초 폴링) |
| 실시간 카메라 | `POST /api/v1/streams/{drone_id}/whep` |
| 녹화 파일 | `GET /api/v1/recordings?drone_id=` |

### 스토어

- 판매 중(`active=true`) 상품만 조회: `GET /api/v1/inventory?active=true`
- 장바구니에 담은 상품을 `POST /api/v1/orders` 로 주문
- 주문 생성과 같은 트랜잭션에서 재고가 차감되며, 응답에 주문번호와 금액이 포함됩니다.
- 품절 상품은 담기 버튼이 비활성화되고, 재고보다 많은 수량은 주문할 수 없습니다.

### 관리자

`#admin` 화면은 먼저 세션을 확인하고, 로그인하지 않았으면 로그인 폼을 표시합니다.
로그인은 `POST /api/v1/admin/auth/login` 으로 수행하며 HttpOnly 세션 쿠키를 사용합니다.
로그아웃은 `POST /api/v1/admin/auth/logout` 입니다.

| 기능 | API |
| --- | --- |
| 세션 확인 | `GET /api/v1/admin/auth/me` |
| 로그인 | `POST /api/v1/admin/auth/login` |
| 로그아웃 | `POST /api/v1/admin/auth/logout` |
| 상품 목록 | `GET /api/v1/inventory?limit=500` |
| 상품 추가 | `POST /api/v1/inventory` |
| 상품 수정 | `PATCH /api/v1/inventory/{id}` |
| 판매 상태 변경 | `PATCH /api/v1/inventory/{id}` (`active`) |
| 재고 설정 | `PATCH /api/v1/inventory/{id}` (`stock_quantity`) |

관리자 콘솔에서 재고를 저장하거나 상품을 추가·수정하면 Redis 캐시가
무효화되어 스토어와 관리자 화면에 최신 값이 표시됩니다.

> 관리자 계정은 백엔드의 `ADMIN_USERNAME` / `ADMIN_PASSWORD` 환경 변수로
> 생성·갱신됩니다. HTTPS 배포 시 `ADMIN_COOKIE_SECURE=true` 로 설정하세요.
> 관리자 계정은 단일 역할이며, 세션 만료는 `ADMIN_SESSION_TTL_SECONDS` 로 조정합니다.

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
| `VITE_API_BASE_URL` | 빈 값 | 백엔드 API 주소 (빈 값이면 same-origin `/api`) |

## 관련 레포

- [`backend`](https://github.com/NeruoVector/backend) — Rust API 서버
- [`vision`](https://github.com/NeruoVector/vision) — Python 장애물 감지
- [`drone`](https://github.com/NeruoVector/drone) — C/C++ 드론 HAL
- [`platform`](https://github.com/NeruoVector/platform) — Docker 인프라

## 구조

```
src/
├── App.tsx        # 내비게이션 + 모니터링 대시보드
├── AdminAuthGate.tsx # 관리자 세션 확인·로그인
├── AdminPage.tsx  # 상품·재고·판매 상태 관리
├── StorePage.tsx  # 상품 목록·장바구니·주문
├── api.ts         # API 주소와 오류 파싱
├── format.ts      # 금액 포맷
├── types.ts       # 상품·주문 타입
├── App.css
├── main.tsx
└── index.css
```
