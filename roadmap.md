# Roadmap

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
