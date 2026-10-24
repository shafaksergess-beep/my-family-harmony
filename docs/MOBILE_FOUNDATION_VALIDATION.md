# Phase 1: mobile foundation

## Delivered

Unified synchronous device detection, authenticated layout shell, context-aware single bottom navigation, keyboard hiding, QR/check-in exclusions, reusable page headers, responsive dialogs, data cards, stat carousel, segmented tabs, bottom action bar, safe-area/overflow utilities and English/French labels.

Only Analytics and the desktop Members header were migrated. Other page content was not redesigned. Existing mobile navigation spacing was adjusted only to defer to the shell.

## Created files

- `src/contexts/DeviceContext.tsx`
- `src/hooks/useDevice.ts`
- `src/hooks/useShellConfig.tsx`
- `src/components/layout/AppShell.tsx`
- `src/components/layout/ShellBottomNav.tsx`
- `src/components/layout/PageHeader.tsx`
- `src/components/layout/DataCards.tsx`
- `src/components/layout/StatCarousel.tsx`
- `src/components/layout/SegmentedTabs.tsx`
- `src/components/layout/BottomActionBar.tsx`
- `src/components/ui/responsive-dialog.tsx`
- `src/test/device.test.tsx`
- `docs/MOBILE_FOUNDATION_VALIDATION.md`

## Edited files

- `src/App.tsx`
- `src/hooks/usePlatform.tsx`
- `src/hooks/use-mobile.tsx`
- `src/components/mobile/MobileLayout.tsx`
- `src/components/mobile/MobileBottomNav.tsx`
- `src/components/mobile/MobileDashboard.tsx`
- `src/components/mobile/MobileMembers.tsx`
- `src/components/mobile/MobileMeetings.tsx`
- `src/components/mobile/MobileContributions.tsx`
- `src/components/mobile/MobileLoans.tsx`
- `src/components/mobile/MobileQRScanner.tsx`
- `src/components/NotificationInbox.tsx`
- `src/pages/Dashboard.tsx`
- `src/pages/family/Analytics.tsx`
- `src/pages/family/Members.tsx`
- `src/pages/family/MeetingCheckIn.tsx`
- `src/components/ui/button.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/alert-dialog.tsx`
- `src/components/ui/sheet.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/tabs.tsx`
- `src/index.css`
- `tailwind.config.ts`
- `src/i18n/locales/en.json`
- `src/i18n/locales/fr.json`
- `AGENTS.md`
- `roadmap.md`

`ui/table.tsx` already had the required min-w-0 scroll wrapper, so no edit was necessary.

## Validation

- 53 tests passed across 12 test files, including concrete 767/768/1023/1024 boundaries, native precedence and reactive hook agreement.
- 42 signed-in/public route-width checks at 320, 360, 390, 430, 768, 1024 and 1280 pixels plus 12 super-admin route-width checks: no horizontal document overflow.
- Signed-in family Members navigation, focus/blur hiding, quick-action sheet, real notification inbox and French labels verified.
- Super-admin More sheet verified against existing routes; no access permissions changed.
- Mobile dialog with 40 rows scrolled while its Save action remained visible; header overflow sheet opened correctly.
- Inline paragraph/list links retain zero minimum height.
- Latest preview build log was clean. A standalone TypeScript check was not run: this environment prohibits manual project builds/typechecks. Do not interpret the preview build or tests as a confirmed standalone typecheck.

## Caveats

- Real iOS/Android keyboard, safe-area and native orientation behavior requires device builds; emulation cannot confirm it.
- The test family has no meeting: dedicated check-in exclusion was verified in code, not against a real meeting; no database data was added.
- BrowserRouter declarative routes do not expose data-router handles; `ShellRouteConfig` and `useShellConfig` provide the equivalent hideBottomNav/title mechanism.
- Compatibility hooks retain their exported fields. Legacy numerical inset values are zero; all new safe-area layouts use CSS env values rather than guessed device insets.
- Natively detection uses the existing official adapter, alongside Capacitor detection; no native SDK calls are enqueued for browsers.
- No database, permissions, route paths, branding, font, logo, viewport metadata or Capacitor configuration changed. No publishing. Later phases were not started.