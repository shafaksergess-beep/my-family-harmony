# Phase 6: closed-testing feedback

## Audit before implementation

- Dark tokens and ThemeToggle exist. Its only render is family NotificationSettings, hidden in family settings rather than Profile. The switch writes `theme` but initialization does not read it or honor system preference. No ThemeProvider is mounted, despite next-themes already being installed and used by Sonner.
- Dashboard imports NewUserOnboarding (six English-only steps). The mobile early return bypasses it. A global first-login flag is removed before rendering; it is not a reliable per-user seen preference. Older OnboardingTutorial and useOnboarding also use device-wide flags. Family-join onboarding is separate.
- More has a Share action using navigator.share with no copy fallback. Profile has no share/rate/feedback rows. No Apple App Store listing URL was found. Android package is com.softserge.kinsroot. Existing public support email: softserge.dev@gmail.com.
- Natively adapter already exposes sharing, copying, scanning, opening external HTTP(S) links and Firebase push registration. usePlatform delegates to DeviceProvider. No app hardware-back or status-bar handler found in source. BrowserRouter handles normal browser history, but cannot establish how Natively intercepts Android Back.

## Implementation and verification

Pending. No changes to database, auth, route definitions, roles, dependencies or native configuration. No publishing. AGENTS.md and roadmap.md are unchanged.

## Device limitations

Real Android/iOS, Natively hardware Back, native share sheets, store launching, physical touch momentum and the Play in-app review API cannot be verified in desktop Chromium. No native screen rewrite or automatic review prompt is planned.