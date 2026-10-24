- i18n: all UI text goes through `t()` with keys in src/i18n/locales/en.json (source of truth) + fr.json; extra languages live in the `languages`/`translations` tables and load at runtime via src/i18n/languages.ts — why: super admins add languages without code changes, missing keys fall back to English.

- Native wrapper features use the official Natively SDK through src/lib/natively.ts and NativelyContext; browser fallbacks never enqueue native calls. Why: keep wrapper-specific APIs isolated and avoid OneSignal identifiers being used as Firebase tokens.
- Self-account deletion uses an authenticated edge endpoint and auth lifecycle cleanup; anonymized ledger identities survive removal of sign-in credentials. Why: preserve family accounting without retaining personal profile data.
- Auth state listeners defer database requests until after the callback returns. Why: prevent auth storage-lock deadlocks during signed-in reloads.
- Device management reads authoritative sessions through a service-only public read-only RPC, derives the current session from verified JWT claims, and revokes others using JWT-based Auth sign-out; never promise individual revocation or a device cap without supported APIs. Why: metadata deletion and session UUIDs cannot revoke authentication sessions.
- Group types: `families.entity_type` is family|association|tontine (default family); creation goes through the 12-arg `create_family_self_service` overload — keep the 11-arg version for older callers.
- Module activation: modules are default-on; a `family_module_settings` row with `is_enabled=false` hides them. Gate navigation via `useFamilyModules` and routes via `ModuleGate` — never delete data when a module is disabled.
- Platform roles: super admins in `super_admins`, support team in `support_admins` (read-mostly); check via `is_super_admin`/`is_support_admin` security-definer RPCs, never client storage.

- Responsive sizing is owned by shared UI controls and the app-screens layout scope; wide data tables scroll locally and page headers wrap without hiding actions. Why: ensure consistent mobile, tablet and desktop behavior across modules without changing authorization.

- DeviceProvider/useDevice is the single reactive device source; usePlatform/useIsMobile are compatibility adapters. Why: first-render mobile classification and breakpoint changes must agree everywhere.
- AppShell owns authenticated mobile navigation, safe-area clearance and keyboard state; legacy MobileLayout defers nav ownership inside it. Why: prevent duplicate bars and bottom spacing without altering route permissions.
- Shared PageHeader and responsive primitives live in components/layout and responsive-dialog; Phase 2 dashboards and analytics reuse these controls with mobile-only branches. Why: desktop composition and existing permissions stay independent of mobile presentation.
- Mobile analytics adapters reuse each report's existing computed values and chronological series; categorical compaction is presentation-only and preserves totals. Why: mobile readability must not change financial calculations or data access.
- BrowserRouter route shell options are registered via ShellRouteConfig/useShellConfig, including check-in hiding. Why: declarative Routes cannot expose data-router useMatches handles.
