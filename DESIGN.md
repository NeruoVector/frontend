# NeuroVector Frontend Design System

## 1. Atmosphere & Identity

NeuroVector is a calm dark operations console: technical information stays legible in close quarters, while commerce and delivery actions use the same restrained panel language as the monitoring tools. Its signature is a midnight canvas with layered blue-black surfaces and one clear cobalt action color. This document records the existing interface and defines the additional primitives needed for account, storefront, merchant, and delivery flows.

## 2. Color

### Palette

| Role | Token | Light | Dark | Usage |
|---|---|---:|---:|---|
| Canvas | `--color-canvas` | `#f8fafc` | `#0f172a` | App background |
| Surface | `--color-surface` | `#ffffff` | `#111c33` | Panels, cards, navigation |
| Surface raised | `--color-surface-raised` | `#f1f5f9` | `#16223c` | Hover and nested surfaces |
| Surface inset | `--color-surface-inset` | `#ffffff` | `#0b1222` | Form controls and compact details |
| Surface media | `--color-surface-media` | `#e2e8f0` | `#020617` | Video and image fallback |
| Text primary | `--color-text` | `#0f172a` | `#e2e8f0` | Headings and body text |
| Text secondary | `--color-muted` | `#475569` | `#94a3b8` | Descriptions and field labels |
| Text subtle | `--color-text-subtle` | `#64748b` | `#cbd5e1` | Secondary controls |
| Border | `--color-border` | `#cbd5e1` | `#1e293b` | Panels and dividers |
| Border strong | `--color-border-strong` | `#94a3b8` | `#334155` | Inputs and control boundaries |
| Accent | `--color-accent` | `#1d4ed8` | `#2563eb` | Primary actions and selected navigation |
| Link | `--color-link` | `#1d4ed8` | `#93c5fd` | Text links |
| Success surface / ink | `--color-success-surface` / `--color-success` | `#dcfce7` / `#166534` | `#064e3b` / `#6ee7b7` | Completed and available states |
| Warning surface / ink | `--color-warning-surface` / `--color-warning` | `#fef3c7` / `#92400e` | `#422006` / `#fbbf24` | Low stock and attention states |
| Error surface / ink | `--color-error-surface` / `--color-error` | `#fee2e2` / `#991b1b` | `#3f1d1d` / `#fca5a5` | Errors and unavailable states |
| Notice surface / ink | `--color-notice-surface` / `--color-notice` | `#dcfce7` / `#166534` | `#052e1b` / `#86efac` | Inline success messages |

The current UI is dark-first; dark values match the existing CSS. Light values are reserved for a future supported theme and are not a claim that a light theme currently exists. New styles use these tokens and existing styles may retain equivalent legacy literals until a focused token migration.

## 3. Typography

| Level | Size | Weight | Line height | Usage |
|---|---:|---:|---:|---|
| Display | `2rem` | 700 | 1.2 | Product wordmark |
| Page title | `1.45rem` | 700 | 1.35 | Screen title |
| Section title | `1.1rem` | 600 | 1.4 | Panel headings |
| Body | `1rem` | 400 | 1.5 | Main text |
| Control | `0.9rem` | 500–600 | 1.5 | Navigation and table content |
| Label | `0.82rem` | 500 | 1.4 | Form labels |
| Small | `0.8rem` | 400 | 1.5 | Captions, helper text, metadata |

Use the existing system stack: `system-ui`, `-apple-system`, `Segoe UI`, `Noto Sans KR`, sans-serif. Headings use slightly tight tracking (`-0.02em`); Korean copy wraps naturally and is not forced into fixed line breaks.

## 4. Spacing

The interface uses a quarter-rem rhythm. Core steps are `0.25rem`, `0.5rem`, `0.75rem`, `1rem`, `1.25rem`, `1.5rem`, and `2rem`; `3rem` is reserved for separated authentication content. Dense controls use `0.35–0.65rem`; panel interiors use `1–1.5rem`; page and section separation uses `2rem`. Prefer these existing values when extending a layout.

## 5. Components

| Primitive | Anatomy and use | Required states |
|---|---|---|
| `panel` | Bordered, rounded midnight surface for a named content group. Use a heading and local status beneath it. | Default, loading, empty, error, populated |
| `panel-head` | Heading and optional count or action aligned on one row; wraps when narrow. | Default, wrapping/mobile |
| `button` | Cobalt filled action; one primary action per local task. | Hover, active, keyboard focus, disabled, submitting |
| `button-secondary` | Transparent, neutral outlined alternative action. | Hover, active, keyboard focus, disabled |
| `field` | Visible label plus input/select/textarea, with helper or error text adjacent. | Default, focus, invalid, disabled |
| `nav-item` | Compact route button inside the shared dark nav container. | Default, hover, selected, keyboard focus |
| `badge` | Short textual status with background and ink; never conveys status by color alone. | Success, warning, error, online, offline |
| `product-card` | Product name, image when available, description, price, stock and quantity action. | Loading placeholder, populated, sold out, image unavailable |
| `inline-status` | Local success/error message near the changed object; use `aria-live` for asynchronous updates. | Success, error, pending |
| `food-database-picker` | Merchant-only Korean reference lookup and separate barcode photo confirmation inside the product panel; reuses fields, product grid/cards, buttons, and image fallbacks. Media uses an `8rem` height; controls and results use `1rem` gaps, with the existing border and muted tokens. | Idle, submitting, populated, empty, upstream/network error, image missing, import draft |
| `map-frame` | Real Google Map canvas with selected destination or live drone markers. | Loading, ready, no API key, SDK error, missing coordinates, stale telemetry |

Primitive showcase is represented by the existing monitoring/store/admin views and their local state variants; new components must keep the same `panel`, `button`, and `field` classes and verify their states at phone and desktop widths before release.

## 6. Motion & Interaction

The existing interface is mostly static and uses no motion library. New route, form, cart, and tracking interactions retain immediate browser feedback; no decorative animation is added. Loading and status changes are announced in place, and a live-region arrival toast is reserved for an event the user may not be viewing. If motion is later introduced, use opacity/transform only and reduce positional motion under `prefers-reduced-motion`.

## 7. Depth & Surface

Use a mixed tonal-shift and border strategy: panels use the existing `#111c33` surface on a `#0f172a` canvas with a subtle `#1e293b` boundary; inset controls use `#0b1222`; hover surfaces use `#16223c`. No shadow is currently part of the system. Radius tokens are `8px` for fields/buttons, `10px` for navigation and media frames, `12px` for panels/cards, and `999px` for status pills. Preserve the established radius per component rather than applying a single radius everywhere.

## 8. Accessibility Constraints & Accepted Debt

### Constraints

- Target WCAG 2.2 AA contrast, visible keyboard focus, keyboard-operable controls, visible labels, and accessible names for icon-only actions.
- Do not encode order state, stock status, or map state by color alone; pair the visual treatment with text.
- Keep the page usable at 390px without horizontal scrolling for primary content; table regions may scroll horizontally only when necessary.
- Map controls must include a textual no-key/error state and a keyboard-accessible way to enter coordinates or use saved locations.
- Ask for browser notification permission only from an explicit user action.

### Accepted Debt

| Item | Location | Why accepted | Owner / Exit |
|---|---|---|---|
| No supported light theme | `frontend/src/index.css` | The existing product is dark-first; this feature extends that established theme. | Frontend / define and verify a full light theme separately |
| Google Maps is unavailable without a deployment key | Map components | A simulated map would misrepresent GPS and telemetry. | Deployment / provide `VITE_GOOGLE_MAPS_API_KEY` |
| Legacy CSS contains literal colors | `frontend/src/App.css` | Existing colors are recorded here; broad restyling is outside this feature. New additions should use the tokens above. | Frontend / migrate when the CSS system is consolidated |
