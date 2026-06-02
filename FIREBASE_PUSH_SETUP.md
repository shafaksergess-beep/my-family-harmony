# Push Notifications Setup (iOS, Android, PWA)

Kinsroot uses **Firebase Cloud Messaging (FCM)** for all platforms with an
SMS fallback (Twilio) for critical alerts when push isn't delivered.

The token-collection layer is unified in `src/hooks/useMobilePush.tsx`:

| Runtime                  | Token source                                   |
|--------------------------|------------------------------------------------|
| Capacitor (iOS/Android)  | `@capacitor/push-notifications` → APNs/FCM     |
| Median.co wrapper        | Median OneSignal bridge → falls back to web    |
| Web / PWA                | Firebase JS SDK + VAPID                        |

All tokens land in `profiles.push_token` and are used by the
`send-fcm-push`, `dispatch-event-push`, and `send-meeting-push-reminders`
edge functions.

## 1. Web / PWA

Already wired. Users tap **Enable Notifications** in
`Settings → Notifications`. The browser prompt requests permission and the
returned FCM token is saved to the profile.

`public/firebase-messaging-sw.js` handles background notifications.

## 2. Capacitor (iOS + Android native)

### Android
1. In Firebase Console → Project Settings → **Your apps** → add Android app
   `app.lovable.3138229105464a70a015b86eb65a55a3`.
2. Download `google-services.json` and place it in `android/app/`.
3. `npx cap sync android`.

### iOS
1. In Firebase Console → add iOS app with the same bundle ID.
2. Download `GoogleService-Info.plist` and add it to the Xcode project
   (drag into `ios/App/App/`).
3. In Xcode, enable **Push Notifications** and **Background Modes → Remote
   notifications** capabilities.
4. Upload your APNs Auth Key (`.p8`) in Firebase Console → Cloud Messaging.
5. `npx cap sync ios`.

The `useMobilePush` hook auto-detects the native runtime and uses the
Capacitor plugin — no app code changes needed.

## 3. Median.co wrapper

1. In your Median app dashboard, enable **OneSignal Push Notifications** and
   plug in the **same Firebase project** (Server Key + Sender ID).
2. Optionally enable the OneSignal JS bridge so the in-app webview can read
   the registration ID; otherwise the hook silently falls back to web FCM
   inside the WebView.

## 4. Expo / React Native (`family-harmony-mobile`)

The Expo client already registers Expo push tokens
(`src/services/notifications.ts`). To unify with the FCM-based backend:

1. In `app.json` add the Firebase config plugin or eject to use
   `@react-native-firebase/messaging`.
2. Replace the Expo token call with `messaging().getToken()` and save it to
   `profiles.push_token` — the dispatcher will then deliver via FCM.

## Backend

| Function                         | Purpose                                       |
|----------------------------------|-----------------------------------------------|
| `send-fcm-push`                  | Direct FCM send by token list                 |
| `dispatch-event-push`            | Realtime fanout from DB triggers (+ SMS fb.)  |
| `send-meeting-push-reminders`    | Cron: meeting + attendance reminders + SMS    |

Realtime triggers (defined in the latest migration) call
`dispatch-event-push` on:
- `loans` insert + status change (loan committee / borrower)
- `assistance_events` insert (whole family)

SMS fallback fires only for **critical** events
(`loan_approved/rejected/disbursed`, `fine_issued`, `attendance_deadline`,
`assistance_created` of type Death) when the user has `sms_enabled = true`
and FCM either failed or wasn't configured for that user.
