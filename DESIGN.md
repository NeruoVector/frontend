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

Receipt flow: primary action is 수령 확인, available only for fresh matching telemetry
at awaiting_receipt, arrived and disarmed. Priorities: landing/receipt/return status,
pickup code entry, then order details. Required: place, four-digit order number,
password explanation, input validation, pending/error/success, tracking navigation,
and distinct home-flight completion. Receipt success never means flight completion.
Left out: countdown-driven receipt, decorative status cards, placeholder confirmations.
Layout: tracking details and receipt form - narrow independent fields -> stack
(https://github.com/changeroa/StyleGallery/blob/main/patterns/stacking/stack.md);
scroll owner: .screen-body; anti-patterns: squeezed sibling text columns, fixed-height
help text and nested vertical scrollers. Reuse 22px screen inset, 12px field gaps,
14px field text, 44px minimum inputs, 7px control radius and existing color tokens.

Configured social login: primary action remains account login. Existing Kakao/Naver/Google
44px icon buttons activate only when the server reports that provider configured; secrets
never enter the browser bundle. Reuse oauth-row, oauth brand classes, Button, auth-error
and desc. Required states: provider availability pending/unavailable/error with retry,
redirect-in-progress disabling, cancelled/expired/failed callback feedback, and ordinary
password-login fallback. Layout: preserve existing stacked login-actions and oauth-row;
.screen-body remains the scroll owner, with the desktop phone frame unchanged.

Operational UI audit: prioritize available products without hiding sold-out inventory.
Primary action: choose a product; empty cart/payment routes offer 상품 보러 가기.
Keep product names, prices, stock status, search, categories, cart quantities and notes.
Layout: catalog - long product names and prices -> card-grid
(https://github.com/changeroa/StyleGallery/blob/main/patterns/grid-repetition/card-grid.md);
scroll owner: .screen-body; anti-patterns: price/status sharing a fixed-height line,
cropped packaging, missing-image labels replacing the product's accessible name.
Preserve the three-column reference grid; allow price/status to stack and wrap.
Layout: empty cart/payment - one next action -> stack
(https://github.com/changeroa/StyleGallery/blob/main/patterns/stacking/stack.md);
scroll owner: .screen-body; reuse .order-empty and Button; omit zero-value checkout
fields until items exist. Checkout login returns to payment with its cart intact.
Drone tracking: primary action is receipt only after fresh matching landed telemetry.
Show preparation, outbound flight, receipt wait, return flight and completed landing
as distinct stages. A return flight must never ask the customer to wait for delivery
landing again. Missing/stale telemetry disables receipt. No placeholder phone calls.
Use existing type sizes, 12px gaps, 22px insets, brand/ink/muted tokens and 44px
minimum touch targets on the shop controls changed during this audit.

Feature-scope cleanup (user requested): display only actions backed by working flows.
This supersedes the earlier consent, marketing and demo-card screen requirements.
Remove placeholder points/coupons, inactive account/help links, local-only notification
switches, the non-persisted wishlist, unsupported financial-method choices and disabled
unconfigured social providers. Keep existing customer data and backend APIs intact.
Terms become a read-only service/privacy guide, without pretending to store consent.
School shows the actual configured school and links to place selection; no mock code lookup.
Payment guidance describes the functioning test checkout and links to the current cart.
Keep test-payment and simulator disclosures so the remaining UI describes real behavior.
Layout: account, settings, guide and payment information - supported actions only -> stack
(https://github.com/changeroa/StyleGallery/blob/main/patterns/stacking/stack.md);
scroll owner: .screen-body; preserve Header, Footer, Button and the desktop frame.
Required: account identity/login/logout, private orders/reviews, place selection,
readable service/privacy details with keyboard-closeable sheets, supported OAuth,
test checkout, stock validation, receipt and flight-state safeguards.
