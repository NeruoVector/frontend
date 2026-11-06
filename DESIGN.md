# 교내 배달 사용자 앱

The source reference is NeruoVector/frontend main af54ea8. Keep its screens,
390px mobile layout, desktop phone frame, artwork and existing styles/tokens.css.
Primary action: choose a live inventory item, add to cart, submit an API order/payment.
Layout: mobile screen owns scrolling with a fixed action footer; desktop uses the
existing phone frame and screen index. Reuse existing fields, buttons, status text,
order cards and price summary. Do not introduce another visual language.

Required states: catalog loading/error/empty, stock limits, contact validation,
submitting and failed checkout, persisted order recovery, actual API order number,
actual captured payment and total, phone-filtered API history, no-order screen,
live/stale/unavailable flight status, position/altitude, completed simulation flight.
The API has no delivery fee, so displayed fee is zero. No placeholder order or
random pickup code may stand in for server data. Orders trigger one simulation
flight and landing; this does not claim physical delivery to the selected location.

The existing monitor is preserved at /monitor/ with its map, camera and admin login.
PR #1 integration preserves the existing shell, tokens and screen layout. Empty order
routes use the same device-screen frame and their own title, with catalog/history
actions. Terms details reuse the PR bottom sheet geometry; keyboard focus stays in
the sheet and returns to its opener. Copy describes the implemented demo only.
The new tracking view links to it and shows current simulator state directly.
Phone input saves an order contact; it does not claim SMS verification.

Account login: reuse existing stacked .field inputs and primary Button. Primary action is
login (or registration after explicitly switching). Required fields: username, account
password; registration also name and order contact. Social providers remain unavailable
until configured. Session identity and private histories come from the server cookie.
Pickup number is the server-issued four decimal digits; receipt-password explanation
is separate from the account password. Camera opens automatically and shows the video
without playback controls; loading/error text and explicit retry appear only as needed.

Demo payment methods: primary action is 결제수단 추가, opening 카드 / 계좌 / 휴대폰
selection. Priorities: 결제 미연동 and demo/payment-impossible notice, saved masked
server-generated display numbers, then type selection. No real financial data entry.
Required: three kinds, random display number persisted by server, delete, login,
loading/empty/error and storage unavailable states. No default or validity claim.
Layout: existing mobile Screen body owns scroll; fixed Header, stacked saved tiles
then add action and type buttons; existing desktop phone frame. Reuse pay-card-item,
Button and existing tokens. Controls44px minimum targets,12px spacing,13px text.

Configured social login: primary action remains account login. Existing Kakao/Naver/Google
44px icon buttons activate only when the server reports that provider configured; secrets
never enter the browser bundle. Reuse oauth-row, oauth brand classes, Button, auth-error
and desc. Required states: provider availability pending/unavailable/error with retry,
redirect-in-progress disabling, cancelled/expired/failed callback feedback, and ordinary
password-login fallback. Layout: preserve existing stacked login-actions and oauth-row;
.screen-body remains the scroll owner, with the desktop phone frame unchanged.