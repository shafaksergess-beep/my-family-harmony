import { initializeApp, getApps, getApp } from "firebase/app";
import { getAnalytics, isSupported as analyticsSupported, logEvent, Analytics } from "firebase/analytics";
import { getMessaging, getToken, onMessage, isSupported as messagingSupported, Messaging } from "firebase/messaging";

export const firebaseConfig = {
  apiKey: "AIzaSyC_qDUsta9DMlqCpRUFIFiHvGIi_-Rjoas",
  authDomain: "kinsroot.firebaseapp.com",
  projectId: "kinsroot",
  storageBucket: "kinsroot.firebasestorage.app",
  messagingSenderId: "41161281213",
  appId: "1:41161281213:web:44992d6dd3b31b63d1f1d4",
  measurementId: "G-T64P1QQZTT",
};

export const VAPID_KEY =
  "BBV1rIy-T0loOfT3kdKsVeZJBxYPqnkC4OjyLrTAh7TOtz2yni-chwHP87Jre9mahXVe1HCjFzk0rFFYeAQAVso";

export const firebaseApp = getApps().length ? getApp() : initializeApp(firebaseConfig);

let _analytics: Analytics | null = null;
export async function getAnalyticsSafe(): Promise<Analytics | null> {
  if (_analytics) return _analytics;
  try {
    if (await analyticsSupported()) {
      _analytics = getAnalytics(firebaseApp);
      return _analytics;
    }
  } catch (e) {
    console.warn("[firebase] analytics init failed", e);
  }
  return null;
}

export async function logAnalyticsEvent(name: string, params?: Record<string, unknown>) {
  const a = await getAnalyticsSafe();
  if (a) {
    try {
      logEvent(a, name as string, params as Record<string, unknown>);
    } catch (e) {
      console.warn("[firebase] logEvent failed", e);
    }
  }
}

let _messaging: Messaging | null = null;
export async function getMessagingSafe(): Promise<Messaging | null> {
  if (_messaging) return _messaging;
  try {
    if (!(await messagingSupported())) return null;
    _messaging = getMessaging(firebaseApp);
    return _messaging;
  } catch (e) {
    console.warn("[firebase] messaging unsupported", e);
    return null;
  }
}

/**
 * Request notification permission and return an FCM registration token.
 * Returns null when the browser doesn't support FCM, when permission was
 * denied, or when token retrieval fails (e.g. blocked SW).
 */
export async function requestFcmToken(): Promise<string | null> {
  try {
    if (!("Notification" in window) || !("serviceWorker" in navigator)) return null;

    const permission =
      Notification.permission === "default"
        ? await Notification.requestPermission()
        : Notification.permission;
    if (permission !== "granted") return null;

    const messaging = await getMessagingSafe();
    if (!messaging) return null;

    // Register the dedicated FCM service worker (separate from the PWA SW).
    const swReg = await navigator.serviceWorker.register("/firebase-messaging-sw.js", {
      scope: "/firebase-cloud-messaging-push-scope",
    });

    const token = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: swReg,
    });
    return token || null;
  } catch (e) {
    console.warn("[firebase] requestFcmToken failed", e);
    return null;
  }
}

/** Subscribe to foreground FCM messages. */
export async function onForegroundMessage(cb: (payload: unknown) => void) {
  const messaging = await getMessagingSafe();
  if (!messaging) return () => {};
  return onMessage(messaging, cb);
}
