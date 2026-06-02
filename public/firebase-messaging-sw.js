/* global self, importScripts, firebase */
/* eslint-disable no-undef */

// Firebase Cloud Messaging service worker.
// Loaded by the browser at /firebase-messaging-sw.js (must live in /public).

importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.13.2/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyC_qDUsta9DMlqCpRUFIFiHvGIi_-Rjoas",
  authDomain: "kinsroot.firebaseapp.com",
  projectId: "kinsroot",
  storageBucket: "kinsroot.firebasestorage.app",
  messagingSenderId: "41161281213",
  appId: "1:41161281213:web:44992d6dd3b31b63d1f1d4",
  measurementId: "G-T64P1QQZTT",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "Kinsroot";
  const options = {
    body: (payload.notification && payload.notification.body) || "",
    icon: "/app-icon.png",
    badge: "/favicon.svg",
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })
  );
});
