# school-delivery

Figma `교내 배달 · 사용자 앱` (사용자 · App 22) 22개 화면을 React + TypeScript + Vite로 구현한 프로젝트.

```bash
npm install
npm run dev      # http://localhost:5173
```

- 폰에서는 전체 화면, 데스크톱(가로 760px·세로 900px 이상)에서는 390 × 844 폰 프레임과 화면 목록이 함께 보인다.
- 각 화면은 해시 주소로 바로 열 수 있다. 예: `#/home`, `#/cart`, `#/tracking`
- 학교 등록 화면은 코드 `123456`을 넣으면 "자동 조회 완료", 다른 6자리면 "조회 결과 없음" 상태가 된다.
- 상품·매장·수령 장소 데이터는 `src/data.ts`, 장바구니·주문 상태는 `src/store.tsx`에 있다. 백엔드 연결 시 이 두 곳을 바꾸면 된다.

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
