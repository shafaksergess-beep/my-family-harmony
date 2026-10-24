# Phase 6: closed-testing feedback

## Audit before implementation

- Dark tokens and ThemeToggle exist. Its only render is family NotificationSettings, hidden in family settings rather than Profile. The switch writes `theme` but initialization does not read it or honor system preference. No ThemeProvider is mounted, despite next-themes already being installed and used by Sonner.
- Dashboard imports NewUserOnboarding (six English-only steps). The mobile early return bypasses it. A global first-login flag is removed before rendering; it is not a reliable per-user seen preference. Older OnboardingTutorial and useOnboarding also use device-wide flags. Family-join onboarding is separate.
- More has a Share action using navigator.share with no copy fallback. Profile has no share/rate/feedback rows. No Apple App Store listing URL was found. Android package is com.softserge.kinsroot. Existing public support email: softserge.dev@gmail.com.
- Natively adapter already exposes sharing, copying, scanning, opening external HTTP(S) links and Firebase push registration. usePlatform delegates to DeviceProvider. No app hardware-back or status-bar handler found in source. BrowserRouter handles normal browser history, but cannot establish how Natively intercepts Android Back.

## Built

- Mounted the already-installed next-themes provider, preserving the existing `theme` storage key. System is the initial default, explicit Light/Dark persist, and System responds to OS changes. Appearance is now the first Profile section and is also immediately visible on More for every member, independent of management permissions. Sonner now shares the same theme state.
- Reused NewUserOnboarding rather than adding a competing tour. It now has four translated steps and head/admin/treasurer guidance, renders alongside the mobile dashboard, and can be skipped, closed or replayed from Profile. Completion and skipping use `kinsroot:tour-seen:<userId>` in guarded device storage, not a database field. Account flags are independent; blocked storage permits the tour without blocking sign-in. It can recur after storage clearing or on another device. Direct links to urgent tasks do not automatically open the tour.
- Profile Support & about includes replay, sharing, Android-only rating and feedback. Share opens an editable EN/FR message sheet and uses navigator.share if available, otherwise copies the edited message and production install link with a toast. Share cancellation does not copy. More reuses the same sharing control. Existing More Help now goes to Profile rather than the undefined `/help` destination.
- Rating uses the verified installed SDK's `openExternalApp` for the exact market URL in Natively; browser Android uses the URL scheme. A visibility-guarded delayed fallback opens the HTTPS listing through the existing external-link bridge. No guessed plugin, Apple listing or automatic rating prompt. Browser visibility is only a best-effort fallback signal, not proof the store opened.
- Feedback uses the existing public support email, with localized subject/body and a reminder not to include sensitive details. No feedback storage or attachment upload was added. Sending requires a configured email app.

No changes to database, auth, route definitions, roles, dependencies or native configuration. No publishing. AGENTS.md and roadmap.md are unchanged: this extends existing settings/onboarding/bridge conventions and does not need a new architectural rule or a multi-phase roadmap.

## Browser verification

Signed in as the requesting account using the preview's managed session, with actual Ebonge Clan membership. No finance records or account preferences were mutated on the server.

- At 390x844 with system dark and no explicit theme, mobile first-run tour appeared. Skip followed by reload kept it dismissed. Replay traversed all four steps, including management guidance for the existing family-head role. French replay and sharing were captured and inspected.
- Light selection survived reload while the emulated system remained dark; switching back to Dark applied immediately.
- Edited French share text was copied successfully with `https://kinsroot.softserge.com/install`. Feedback link points to the existing support inbox. No email was sent or inbox inspected.
- Android user-agent context showed Rate; a non-Android context hid it. Actual market/store launching was not performed in Chromium. Native SDK invocation and fallback are unit-tested.
- Profile and More document widths matched viewport at all sizes below. No page-level horizontal overflow observed:

| Size | Profile scrollWidth | More scrollWidth |
| --- | ---: | ---: |
| 320x700 | 320 | 320 |
| 360x800 | 360 | 360 |
| 390x844 | 390 | 390 |
| 430x900 | 430 | 430 |
| 640x360 | 640 | 640 |

- At 390x844: dashboard, members, contributions, analytics and More loaded in dark mode without horizontal overflow. Inspected actual screenshots of dock, raised gold action, member role badge, cards, segmented tabs, chart axes, sharing and tour sheets. Inspected shared PageHeader, DataCards, StatCarousel, SegmentedTabs, ResponsiveDialog, BottomActionBar and ManagementMobile token usage. This is not an exhaustive populated-data review of every Phase 1-5 component variant; analytics had zero data and the health score was unavailable, contributions were empty, and members had one real record. Legacy green/orange contribution status amounts remain an unverified contrast concern. No Phase 5 scroll/dock behavior or colors were changed.
- Browser history test: More -> Profile -> Back returned to More; More -> Members through the dock -> Back returned to More, not outside the app. This establishes BrowserRouter history, **not** Android hardware Back interception. Direct-entry subpages and native root-exit behavior remain unverified.
- No page errors in the initial signed-in Profile/dashboard/tour run. System preference, theme restoration, tour completion, replay and copy were checked through the UI rather than only source.

## Existing native-feeling capabilities and gaps

| Capability | Source evidence and limitation |
| --- | --- |
| Safe areas and mobile shell | AppShell uses CSS env safe-area clearance, dvh and viewport keyboard state; physical insets/keyboard not tested. |
| Push | Official Natively Firebase permission/token bridge exists. Push hook persists tokens; Capacitor listeners do not establish Natively notification-tap handling. Delivery untested. |
| Haptics | Existing haptics helpers are Capacitor-gated. Natively-only users may receive none. |
| Scanner/share/clipboard | Official adapter exposes scanner and sharing/copy fallbacks. Camera and native sheets require device testing. |
| Status bar | No status-bar integration in app source; wrapper appearance is externally configured and unverified. |
| Android Back | No hardware-back handler or SDK back-event API identified. BrowserRouter history works in browser; wrapper behavior remains unverified. Many existing parent buttons push a destination rather than pop history. |

Cheap future options verified against installed `natively/dist/classes/Natively.d.ts`: `hapticImpact`, `hapticNotification`, `setAppStatusBarStyle`, and `shareText` are available through the already-imported useNatively SDK; bridging existing haptics and synchronizing status-bar contrast can be considered after device checks. `requestAppReview` exists, but was intentionally not used because this phase requests a listing button, not review prompts. No invented Android back API, native rewrite or wrapper configuration change.

## Tests and build

- Final full regression suite: **81 tests passed across 16 files** at 07:49 UTC, including the additional SDK store-link test.
- Added 11 concrete tests covering per-user seen state, blocked storage, role-specific guidance, edited sharing, copy fallback, cancellation/error behavior, Android-only rating and exact package fallback. Added a mocked SDK store-launch allowlist test.
- Standalone typecheck **not run**: sandbox instructions explicitly prohibit manually running project builds/typechecks; automatic preview validation is used instead. No claim that a standalone typecheck passed.
- Latest automatic preview build before documentation finalization: build OK (07:49:37 UTC). Vitest emits an existing Vite optimizeDeps deprecation warning; an expected mocked membership-sync error is logged by its error-path test.

## Known remaining issues

- Existing More module names/descriptions still contain English literals when French is selected; newly added Phase 6 controls/tour/messages are translated. Family language application can restore the family's English default on navigation when no personal French preference is saved; French checks changed the UI language without saving the owner's profile.
- Native hardware Back, true share-sheet capability and market fallback visibility behavior need the installed Natively build. No promise of hardware Back correctness or native Play review API verification is made.
- Real populated charts, all badge/status contrasts, offline tour restoration, storage-denied UI behavior, physical keyboard, safe areas and touch momentum are not comprehensively verified. Pure storage-error handling is unit-tested.

## Files changed

- `src/App.tsx`
- `src/components/settings/ThemeToggle.tsx`
- `src/components/settings/AppSupport.tsx`
- `src/components/onboarding/NewUserOnboarding.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/Profile.tsx`
- `src/pages/family/More.tsx`
- `src/lib/mobileExperience.ts`
- `src/lib/natively.ts`
- `src/i18n/locales/en.json`
- `src/i18n/locales/fr.json`
- `src/test/mobileExperience.test.ts`
- `src/test/natively.test.ts`
- `docs/MOBILE_PHASE6_VALIDATION.md`

## Device limitations

Real Android/iOS, Natively hardware Back, native share sheets, store launching, physical touch momentum and the Play in-app review API cannot be verified in desktop Chromium. No native screen rewrite or automatic review prompt is planned.