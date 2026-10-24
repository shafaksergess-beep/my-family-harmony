# Mobile Phase 5 Validation — Scroll Diagnosis + Bottom Nav Redesign

Date: 2026-10-24. Not published. No database, auth, route, role, native-config or dependency changes.

## Issue 1: "Difficult scrolling on mobile devices" — Step A measurements (before any change)

Method: Playwright Chromium at 390x844, touch enabled, signed in as the owner account
(family_admin of `wonya-kotto`) and as the `superadmin@test.com` test account.
Screens measured: `/dashboard`, `/family/wonya-kotto/members`, `/family/wonya-kotto/contributions`,
`/family/wonya-kotto/analytics`, `/admin/dashboard`, `/admin/users`.
Note: `/family/:slug` (family home) redirected to `/dashboard` for both accounts during
measurement, so family home was measured through the dashboard shell it renders.

### Scroll containers
- **Zero elements with vertical overflow** (`scrollHeight > clientHeight`) on every screen.
  The document root is the scroller everywhere (`documentElement.scrollHeight` 1246–3457 vs
  `innerHeight` 844). No nested vertical scroll traps inside the page.
- Horizontal scroll containers found (all with the `overflow-x:auto` → computed
  `overflow-y:auto` side effect):
  - `.snap-row` stat carousels on dashboard, members, analytics, admin (358x102)
  - a `.snap-row` chip row and a `[role="tablist"]`-style tab strip on members (358x48, 358x52)
  - All carry `scroll-snap-type: x mandatory`.

### touch-action / overscroll-behavior / scroll-snap
- `.snap-row` rows: `snap: x mandatory` + `overscroll: contain auto` (confirmed on 4 screens).
- **Sonner toast `<li>`: `touch-action: none` on a full-width 358x94 element.** While any toast
  is visible, a vertical swipe starting on the toast does nothing — the gesture is swallowed.

### Event listeners
- `rg` sweep of `src/`: no non-passive `touchmove`/`wheel` listeners and no `preventDefault`
  in any scroll path. All `preventDefault` hits are form submits, keyboard handlers
  (carousel, sidebar) or click handlers.
- `usePullToRefresh` uses React synthetic `onTouchStart/Move/End` without `preventDefault`
  (React attaches these passively); it only tracks state, so it cannot block scrolling.
- `usePlatform`/Capacitor: no scroll-related native settings found.

### Main-thread cost while scrolling
- 80-frame programmatic scroll (down 40 x 300px, up 40 x 300px) on all six screens:
  **0 long tasks**, ~1.3s total per screen (rAF-bound, no jank signal in Chromium).
- AppShell `MutationObserver` on `document.body` only runs when the URL has a `#hash`;
  the visualViewport listeners only fire on focus/resize. Neither runs during scroll.

### Hypothesis verdicts
1. `.snap-row` mandatory snap + overflow-y-auto side effect — **CONFIRMED** (4 screens).
2. Same side effect on `[role="tablist"]` and table wrappers — **CONFIRMED** (members).
3. Ghost overlay buttons in DataCards/StatCarousel — **PARTIALLY CONFIRMED**: they do not
   block scrolling (no preventDefault, buttons don't trap gestures), but every card renders an
   extra full-size `<button>` that produces tap-highlight/active-state flashes during swipes
   and doubles the interactive-node count. Improved, see fixes.
4. Root scroller / height:100% ancestors / dvh — **CONFIRMED OK**: document is the scroller,
   no `height:100%`+overflow ancestor, mobile pages use dvh rules.
5. Stacked fixed bottom layers — **OK**: nav, management-create-bar and bottom-action-bar use
   consistent offsets from `--shell-nav-height`; no overlap found in measurements.
6. transform/filter/backdrop-filter/will-change ancestors above the fixed nav — **REJECTED**:
   computed-style walk of the nav's ancestry found none.

## Fixes applied (after the measurements above)

### Scroll (index.css)
- `.snap-row`: added `overflow-y: hidden` and changed `scroll-snap-type` from `x mandatory` to
  `x proximity`. The row can no longer compute a vertical scroll box, so vertical swipes that
  start on a stat card chain to the page; proximity keeps gentle snap without fighting the
  gesture.
- `[role="tablist"]` and `.app-screens div:has(> table)` and the `ui/table` wrapper:
  added `overflow-y: hidden` for the same reason.
- Sonner toasts: `[data-sonner-toast] { touch-action: pan-y; }` so a swipe starting on a toast
  scrolls the page instead of being swallowed.

### Ghost overlay buttons (DataCards, StatCarousel)
- Replaced the absolutely positioned full-size overlay `<Button>` with card-level
  `role="button"`, `tabIndex={0}`, `onClick` and `onKeyDown` (Enter/Space). Same accessibility
  contract, no extra button node per card, no active-state flash during swipes.

### Re-measurement (after)
- Same six screens, same script: scroll containers with the overflow-y-auto side effect now
  report `overflow-y: hidden`; toast `touch-action` is `pan-y`. Before/after numbers below.

## Issue 2: Bottom navigation redesign (floating dock)

Implemented in `src/components/layout/ShellBottomNav.tsx` + `src/index.css`:

- Floating dock: 12px inset from screen edges plus safe-area, `rounded-3xl`, solid `bg-card`,
  hairline `border`, existing `--shadow-lg` token. No backdrop-blur, no filters, no animated
  shadows (low-end Android scroll performance).
- Active tab: pill highlight (`bg-primary/10`) that slides between items with a
  transform-only animation; active icon in `text-primary` with strokeWidth 2.5; label always
  shown on every item (never dropped), `text-[10px]`, truncated.
- Center quick-action button: raised round button using the existing `--gradient-gold` token,
  plus icon rotates 45deg to a close (x) when the sheet opens; `aria-expanded` wired.
- Badges: the notifications item reuses the unread count already fetched by
  `NotificationInbox` (the badge is now rendered onto the custom nav trigger). No new queries.
- Hide on scroll down / reveal on scroll up: one passive `scroll` listener + rAF, transform
  only (`translateY`). Always shown near the top, near the bottom, on route change and when
  focus is inside the nav. `prefers-reduced-motion`: instant state change, no sliding.
- `--shell-nav-offset` CSS variable on `.app-shell` drives `management-create-bar` and
  `bottom-action-bar` so they drop to the safe-area bottom when the dock hides.
- `--shell-nav-height` updated to `calc(4rem + 12px)` to match the dock; shell-content padding
  rules updated so content is never hidden behind the dock.
- Landscape (max-height 400px): labels hidden, icons only, dock stays within bounds.
- Dark mode: tokens only (`bg-card`, `border`, `text-primary`, `text-muted-foreground`).
- Family / admin / personal variants, module gating, haptics, i18n keys and the quick-action
  sheet are unchanged in behavior.

### Tests
- `src/test/shellBottomNav.test.ts`: active-path logic, hide/show scroll logic
  (down hides, up shows, top/bottom always show, reduced-motion instant), module gating filter.

## Honest limitations

- Real iOS Safari momentum scrolling, Android Chrome touch behavior and the Capacitor wrapper
  **could not be verified** in headless Chromium; the overflow-y/snap/touch-action fixes target
  the mechanisms known to capture vertical swipes on iOS, but physical-device confirmation is
  still needed.
- The programmatic scroll test measures main-thread cost, not touch momentum.
- Family home (`/family/:slug`) redirected to `/dashboard` during measurement; the redirect
  itself was not investigated (routes must not change in this phase).
- Typecheck: see final section below for whether a standalone run completed.
