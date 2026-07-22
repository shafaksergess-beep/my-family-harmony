## Goal

Native Android push notifications delivered through Firebase Cloud Messaging (FCM) that:
- Show in the phone's notification bar (foreground + background + app-killed states)
- Update the app icon badge count
- Deep-link to the correct in-app route on tap
- Reuse the existing `send-fcm-push` / `dispatch-event-push` backend

## Changes

### 1. Capacitor config
- `capacitor.config.ts`: change `appId` from `app.lovable.3138229105464a70a015b86eb65a55a3` to `com.softserge.kinsroot` to match the uploaded `google-services.json`.
- Add `FirebaseMessaging` plugin config block with a default Android notification channel (`kinsroot_default`, high importance, badge + sound enabled) and default small icon reference (`ic_stat_notify`).

### 2. Install native plugin
- `bun add @capacitor-firebase/messaging @capacitor/app @capacitor/badge`
  - `@capacitor-firebase/messaging`: native FCM token + tray notifications
  - `@capacitor/badge`: app icon badge count updates
  - `@capacitor/app`: handle deep-link on notification tap (already may be present)

### 3. Native Android files (documented, user copies after `git pull`)
- Save uploaded `google-services.json` to `android/app/google-services.json` (committed into repo so future `npx cap sync` picks it up).
- Add note in `FIREBASE_PUSH_SETUP.md`: after `npx cap sync android`, the plugin auto-registers the Google Services Gradle plugin; no manual Gradle edits needed on Capacitor 6+.

### 4. Refactor `src/hooks/useMobilePush.tsx`
Replace the `@capacitor/push-notifications` path with `@capacitor-firebase/messaging`:
- `FirebaseMessaging.requestPermissions()` → `getToken()` → save to `profiles.push_token`.
- Listen to `notificationReceived` (foreground) → show local tray notification via the plugin's `createChannel` + optionally update badge.
- Listen to `notificationActionPerformed` → parse `data.url` and route via React Router.
- Listen to `tokenReceived` → re-persist rotated tokens.
- Keep Median + web fallback branches unchanged.

### 5. Badge count
- New small helper `src/lib/appBadge.ts` wrapping `@capacitor/badge` (`set`, `clear`).
- Bump badge on each `notificationReceived`; clear when the in-app notification inbox is opened (hook into existing `NotificationInbox`).

### 6. Backend adjustments (small)
- `supabase/functions/send-fcm-push/index.ts`: extend the FCM v1 payload with an `android` block (`notification.channel_id: "kinsroot_default"`, `notification.notification_count` for badge) so native devices route to the right channel and increment the badge. Web `webpush.fcm_options.link` stays as-is.

### 7. Docs
- Update `FIREBASE_PUSH_SETUP.md` Android section: replace `@capacitor/push-notifications` steps with `@capacitor-firebase/messaging`, note the new `appId`, and list the exact commands the user runs locally after `git pull`:
  1. `npm install`
  2. `npx cap sync android`
  3. `npx cap run android`

## Out of scope (per your answers)
- iOS setup (no plist/APNs key yet) — will be added when you upload those.
- Firebase project consolidation — plan uses the uploaded `kinsroot-7a831` project for Android; web keeps using `kinsroot`. Backend `FIREBASE_SERVICE_ACCOUNT` secret must be the service account of whichever project owns the target tokens. Since Android and Web tokens live in different projects, we'll need **two service accounts** eventually. For now, Android push will require you to update `FIREBASE_SERVICE_ACCOUNT` to the `kinsroot-7a831` service account, OR I can extend `send-fcm-push` to accept a second secret `FIREBASE_SERVICE_ACCOUNT_ANDROID` and route by token. Say the word and I'll add the dual-project routing.

## Verification
- `tsgo` typecheck after edits.
- User runs `npx cap sync android && npx cap run android` on a physical device, taps "Enable Notifications" in Settings → Notifications, then triggers a test push from the admin panel — notification should appear in the tray and increment the app icon badge.
