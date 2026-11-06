# school-delivery

Figma `교내 배달 · 사용자 앱` (사용자 · App 22) 22개 화면을 React + TypeScript + Vite로 구현한 프로젝트.

```bash
npm install
npm run dev      # http://localhost:5173
```

개발 서버와 preview는 `/api` 요청을 기본적으로
`https://neurovector-backend.forge-lang.org` 로 프록시합니다. `.env` 의
`VITE_API_BASE_URL` 을 비워두면 same-origin `/api` 를 사용하고, 원격 백엔드를
직접 호출하려면 절대 URL 을 지정하세요. (세션 쿠키를 쓰므로 같은 호스트 사용 권장)

다른 백엔드를 사용하려면 `.env.local` 에 `NV_BACKEND=http://127.0.0.1:18081`
처럼 설정하고 개발 서버 또는 preview를 다시 시작하세요. 기존
`DEV_API_PROXY_TARGET` 설정도 지원하며, 우선순위는 `NV_BACKEND` →
`DEV_API_PROXY_TARGET` → 위 기본 URL입니다. 두 값은 Vite 프록시에서만 사용됩니다.

## 화면

사용자 앱은 아래 해시 주소를 사용합니다. 기존 **모니터링 / 스토어 / 관리자**
화면은 `/monitor/` 에서 제공되며, 해당 화면의 해시는 `#dashboard`, `#store`,
`#admin` 입니다.

### 사용자 앱

- 폰에서는 전체 화면, 데스크톱(가로 760px·세로 900px 이상)에서는 390 × 844 폰 프레임과 화면 목록이 함께 보인다.
- 각 화면은 해시 주소로 바로 열 수 있다. 예: `#/home`, `#/cart`, `#/tracking`
- 이용 학교 화면에서 실제 운영 대상 학교를 확인하고 수령 장소를 선택한다.
- 시안 상품·매장·수령 장소 데이터는 `src/data.ts`, 장바구니·주문 상태는 `src/store.tsx`에 있다. 실제 상품·주문은 `src/api.ts`를 통해 백엔드와 연결된다.

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

## 백엔드 API

`src/api.ts`는 상품 조회, 주문 조회·생성, 결제 요청을 제공한다. 사용자 앱의 실제 상품·주문·결제 연결은 아래 Live API integration 절을 참고한다. 개발 서버와 preview의 프록시 설정은 위의 환경변수 우선순위를 따른다. 배포 환경에서는 웹 서버에도 `/api` 프록시를 설정해야 한다.

API 테스트는 Node.js 24에서 `npm test`로 실행한다. 실제 주문이나 결제는 생성하지 않는다.

## 구조

```
src/
├── App.tsx            # 화면 목록과 폰 프레임
├── router.tsx         # 해시 라우터
├── store.tsx          # 수령 장소 · 장바구니 · 주문 상태
├── data.ts            # 시안 데이터
├── components/        # 상태 표시줄 · 헤더 · 버튼 · 하단 메뉴 · 아이콘 · 경로 지도
├── screens/
│   ├── Onboarding.tsx # 약관 동의 · 로그인 · 휴대폰 인증 · 학교 등록(3가지 상태)
│   ├── Shop.tsx       # 기본 수령 장소 · 홈 · 매점 상세 · 메뉴 상세 · 장바구니 · 결제 · 수령 장소 변경
│   ├── Delivery.tsx   # 주문 완료 · 배송 현황 · 도착 임박 · 수령 확인 · 리뷰 작성
│   └── Account.tsx    # 주문 내역 · 마이 · 설정 · 결제수단 관리
├── styles/            # Figma 변수(tokens.css)와 기본 스타일
└── assets/            # 상품 사진 (Figma 렌더에서 추출)
```


## Live API integration

This deployment uses the same-origin `/api/v1` proxy. Inventory, prices, checkout,
dummy payments, order numbers and phone-filtered history use backend responses.
No sample order is shown when no order is selected. A browser session restores its
last API order on refresh. The tracking screen reads actual simulator assignments
and persisted completed flights. POSTs are not automatically retried.

The backend payment provider is a test provider; no real charge is made. SMS/SNS
verification and physical receipt confirmation are unavailable.
The existing flight monitor and administrator login remain at `/monitor/`.


## Reviews and live camera

Paid orders support one immutable review each: rating, text (1–500 characters), up to
three tags, and one JPG/PNG/WebP photo up to 1MB. Reviews and photos persist in PostgreSQL.
Open Orders → 리뷰 쓰기 / 보기; saved reviews reload read-only. The store review tab
and My Reviews show backend records and actual rating totals.

WebRTC playback is available at `/#/camera` and from the home camera button.
The viewer loads the deployed ICE/TURN configuration, exchanges SDP through WHEP,
monitors received frames, and releases the peer/session when closed or unmounted.
Swagger is proxied at `/swagger-ui/`, with the spec at `/api-docs/openapi.json`.
