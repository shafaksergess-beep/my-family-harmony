# Roadmap

## Signup and unassigned user recovery
- [x] Share membership-aware sign-in destinations while preserving invitations and platform-admin access
- [x] Expose the existing creation wizard on empty desktop/mobile dashboards
- [x] Add direct superadmin family assignment and search in the unassigned-member picker
- [x] Verify 40 regression tests, signed-in setup routing, desktop/mobile creation entry points and superadmin discovery/assignment dialog

## App-wide UI/UX hardening
- [x] Fix shared controls, dialogs, tables, tabs and mobile content sizing
- [x] Fix overflowing admin and family page headers/actions without changing permissions
- [x] Validate signed-in screens and interactions at mobile, tablet and desktop sizes (136 route/viewport checks, admin forms, 70 authorized family-screen checks; 49 tests pass)

- [x] Replace Median integration with verified Natively bridge
- [x] Add authenticated self-account deletion with English/French confirmation
- [x] Generate branded master icon and store graphics with listing guidance
- [x] Verify signed-in confirmation, authorization rejection, and native adapter tests (27 tests pass)
- [ ] Verify irreversible deletion using a disposable member (requires a designated test account)
- [ ] Verify native push/OAuth and capture store screenshots (requires Natively device builds)
- [x] Replace unsupported session APIs with service-only session listing and JWT-based other-device sign-out; remove unsupported individual revoke/device-cap claims (31 tests pass)
- [ ] Verify real signed-in device listing and other-device sign-out (preview-issued test token lacks a device session; requires ordinary app sign-in and disposable account for destructive verification)

- [x] New homepage at / (old design retired, /home-preview redirects)
- [x] Remove Bota; English + French built in
- [x] Super admin Languages page (add, activate, translate, CSV export/import)
- [x] Family default language (family head/admin)
- [x] Translate homepage
- [x] Translate batch 1 rest: sign-in, sign-up, password reset, onboarding, install
- [x] Translate batch 2: dashboard, profile, navigation, notifications
- [x] Translate batch 3: family money & meetings pages
- [x] Translate batch 4: reports, analytics, settings, calendar, chat
- [x] Translate batch 5: super admin panel

- [x] Self-service family creation alongside admin-created families
- [x] 14-day member deadline with reminders, suspension and deletion (daily check)
- [x] Kinsroot branding on all emails (testing sender kept)
- [ ] Switch emails to a verified domain sender (waiting on user's domain)
- [x] Promotional video recordings: Flow 1 self-service onboarding (portrait + landscape), with 14-day suspension walkthrough
- [ ] Verify the daily family-lifecycle check end-to-end with a real reminder→suspension→deletion run (recording simulated the suspension state directly)

## Enhancements (Oct 2026)
- [x] 1. Entity types: Family / Association / Tontine group in creation wizard + dynamic vocabulary (validated: tontine group created end-to-end)
- [x] 2. Per-family module activation toggles (family head/admin/superadmin) gating dashboard + More + routes (validated: Loans hidden + route bounce)
- [x] 3. Support admin platform role (read-mostly, one step below super admin) (validated: grant + revoke in admin Users page)
- [x] Tests + validation for all three (46 tests pass)

## Phase 1 mobile foundation
- [x] Unify device detection and compatibility hooks
- [x] Add authenticated AppShell with context-aware navigation and keyboard handling
- [x] Add PageHeader and responsive primitives; migrate Analytics and desktop Members headers only
- [x] Scope touch targets and add safe-area, overflow and dvh utilities with EN/FR labels
- [x] Validate foundation tests (53 pass), signed-in navigation, EN/FR, 54 route/viewport checks and clean preview build
- [ ] Validate physical-device keyboard, safe areas and native orientation (requires Natively iOS/Android builds)

## Phase 2 dashboards and analytics
- [x] Member dashboard currency, attention list, family sheet and mobile super-admin home
- [x] Family home header, KPIs, modules and compact health details
- [x] Mobile analytics headers, existing filter sheet, KPIs, charts, summaries and data cards
- [x] Verify signed-in mobile/landscape and desktop screens, regression tests and document caveats (57 tests; see docs/MOBILE_PHASE2_VALIDATION.md)
- [ ] Physical native/offline and populated role-specific approval validation (requires native builds and designated populated test records)


## Phase 3 management screens
- [x] 1. Mobile member-management shared records/actions and responsive dialogs
- [ ] Member-management destructive/new-member end-to-end checks (requires disposable test records); dark-mode contrast follow-up
- [ ] 2. Contributions, settings, payments, proofs and plans
- [ ] 3. Loans, history and committee
- [ ] 4. Savings, Njangi, shares, balloting and assistance
- [ ] 5-8. Meetings, invitations, family settings and More
- [ ] Platform administration and profile area
- [x] Document this increment and validate member screens at nine widths and 60 regression tests
- [ ] Complete remaining Phase 3 screens and their validation

## Phase 3b remaining mobile management
- [x] Adapt requested primary family, administration and profile/settings presentation without data changes (remaining gaps in docs/MOBILE_PHASE3B_VALIDATION.md)
- [x] Validate 24 routes at six sizes and document remaining gaps (144 checks; 60 tests pass)
- [ ] Populated meeting-detail, role-specific financial actions and physical-device validation (requires designated disposable records/native builds)

## Phase 4 final mobile audit
- [x] Close presentation gaps, audit all registered routes and polish sheets/contrast/install metadata
- [x] Verify accessible routes at five mobile sizes, French and dark mode; document limitations in docs/MOBILE_PHASE4_VALIDATION.md
