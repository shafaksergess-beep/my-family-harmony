## Session Management for Kinsroot

Kinsroot handles family financial data (contributions, loans, njangi, shares, wallets). That warrants stricter-than-default session handling, but not banking-grade — members log in from phones daily, so overly aggressive expiry hurts UX.

### Proposed policy

**1. Session expiration**
- **Access token (JWT)**: 1 hour (Supabase default, keep it).
- **Refresh token / max session**: 7 days of inactivity, hard cap 30 days absolute lifetime. Configured in Lovable Cloud auth settings.
- **Idle timeout in the client**: 30 minutes of no user activity (mouse/keyboard/touch/visibility) → force `signOut({ scope: "local" })` and redirect to `/auth`. Warning modal at 28 min with "Stay signed in" button that pings `supabase.auth.getUser()` to refresh.

**2. Concurrent session limits**
- **Cap: 3 active sessions per user** (typical: phone PWA + installed Android app + desktop browser).
- On new sign-in, if the user already has 3 active sessions, revoke the oldest via `auth.admin.signOut(sessionId)` from an edge function. Show a toast: "Signed out of oldest device."
- New page `/profile/sessions` (or a section inside `/profile`) listing all active sessions with device/browser/last-seen, and a "Sign out" button per row plus "Sign out everywhere else."

**3. Instant session revocation on password change**
- After `supabase.auth.updateUser({ password })` succeeds in `ResetPassword.tsx` and in the Profile change-password flow, call a new edge function `revoke-other-sessions` that uses the service role to `auth.admin.signOut(userId, 'others')`. Current device keeps its session; every other device is killed immediately.
- Same call fires when the user clicks "Sign out everywhere else."

### Technical details

**Database**
- No new tables — Supabase already stores sessions in `auth.sessions`. Read via `auth.admin.listUserSessions(userId)`.
- Add a `user_session_metadata` table (user_id, session_id, user_agent, ip, last_seen_at, created_at, device_label) so the UI can show human-friendly device names. Populated by a small edge function `record-session` called from `AuthBootstrap` on `SIGNED_IN`. RLS: users see only their own rows; service_role full access.

**Edge functions (new)**
- `revoke-other-sessions` — auth required, calls `admin.signOut(userId, 'others')`.
- `revoke-session` — auth required, body `{ sessionId }`, verifies session belongs to caller, calls `admin.signOut(sessionId, 'local')`.
- `enforce-session-limit` — called from `AuthBootstrap` on sign-in; lists sessions, if >3 revokes oldest.
- `record-session` — upserts row into `user_session_metadata`.

All use `requireAuth` from `supabase/functions/_shared/auth.ts`.

**Frontend**
- New hook `src/hooks/useIdleTimeout.tsx` — tracks activity via `mousemove`, `keydown`, `touchstart`, `visibilitychange`; shows warning dialog; signs out on timeout. Mounted in `App.tsx` (or `AuthBootstrap`) when a session exists.
- New component `src/components/IdleWarningDialog.tsx`.
- New page `src/pages/SessionManagement.tsx` at `/profile/sessions` — lists sessions, revoke buttons, "Sign out everywhere else."
- Link entry from `src/pages/Profile.tsx`.
- `AuthBootstrap.tsx`: on `SIGNED_IN` also call `record-session` and `enforce-session-limit`.
- `ResetPassword.tsx` + profile password-change: after `updateUser`, call `revoke-other-sessions`.

**Lovable Cloud auth settings**
- Set refresh token inactivity timeout: 7 days.
- Set session absolute lifetime: 30 days.
- Enable "Reuse detection" for refresh tokens (rotates on every refresh; reuse = full revoke).

**i18n**: Add strings for idle warning, session list, revoke buttons in `en.json`, `fr.json`, `bota.json`.

### Out of scope
- No changes to OAuth flows themselves.
- No MFA changes (web app has none; mobile has its own MFA already).
- No IP-based geofencing.

### Confirm before I build
1. Is **30 min idle / 3 concurrent / 7 day refresh / 30 day max** acceptable, or do you want tighter (e.g. 15 min idle, 2 sessions) or looser?
2. Should password change kill **all** sessions including current (forcing re-login on the current device), or keep the current one alive (the plan above)?
