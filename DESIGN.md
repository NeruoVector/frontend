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
The new tracking view links to it and shows current simulator state directly.
Phone input saves an order contact; it does not claim SMS verification.

Account login: reuse existing stacked .field inputs and primary Button. Primary action is
login (or registration after explicitly switching). Required fields: username, account
password; registration also name and order contact. Social providers remain unavailable
until configured. Session identity and private histories come from the server cookie.
Pickup number is the server-issued four decimal digits; receipt-password explanation
is separate from the account password. Camera opens automatically and shows the video
without playback controls; loading/error text and explicit retry appear only as needed.
