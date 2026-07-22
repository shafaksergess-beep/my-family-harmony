import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      devOptions: { enabled: false },
      includeAssets: ["favicon.ico", "favicon.jpg", "robots.txt", "logo.jpg", "pwa-192x192.png", "pwa-512x512.png"],
      manifest: {
        name: "Kinsroot - Rooted in Heritage",
        short_name: "Kinsroot",
        description: "Family reunion management platform - Rooted in Heritage, Built for Tomorrow",
        theme_color: "#1a3d2e",
        background_color: "#1a3d2e",
        display: "standalone",
        scope: "/",
        start_url: "/",
        orientation: "portrait-primary",
        categories: ["productivity", "finance", "social"],
        icons: [
          {
            src: "/logo.jpg",
            sizes: "192x192",
            type: "image/jpeg",
            purpose: "any",
          },
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "any maskable",
          },
        ],
        shortcuts: [
          {
            name: "Dashboard",
            short_name: "Dashboard",
            description: "View your family dashboard",
            url: "/dashboard",
            icons: [{ src: "/logo.jpg", sizes: "96x96" }],
          },
          {
            name: "Profile",
            short_name: "Profile",
            description: "View your profile",
            url: "/profile",
            icons: [{ src: "/logo.jpg", sizes: "96x96" }],
          },
        ],
      },
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,jpg,svg,woff,woff2}"],
        maximumFileSizeToCacheInBytes: 5 * 1024 * 1024,
        cleanupOutdatedCaches: true,
        skipWaiting: true,
        clientsClaim: true,
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/~oauth/, /^\/api\//, /^\/functions\//],
        // Warm the SPA shell + top routes so first navigation to each is instant.
        // (The SPA fallback serves index.html for these; the JS chunks are
        // already precached via globPatterns above.)
        additionalManifestEntries: [
          { url: "/dashboard", revision: null },
          { url: "/profile", revision: null },
          { url: "/install", revision: null },
          { url: "/onboarding/join-family", revision: null },
        ],
        runtimeCaching: [
          {
            // Supabase REST (PostgREST) — stale-while-revalidate so pages render
            // instantly from cache and refresh in the background.
            urlPattern: /^https:\/\/.*\.supabase\.co\/rest\/v1\/.*/i,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "supabase-rest-cache",
              expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 },
              cacheableResponse: { statuses: [0, 200] },
              },
            },
          },
          {
            // Supabase auth/storage/functions — NetworkFirst (fresh preferred,
            // fall back to cache offline).
            urlPattern: /^https:\/\/.*\.supabase\.co\/(auth|storage|functions)\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-api-cache",
              networkTimeoutSeconds: 5,
              expiration: { maxEntries: 50, maxAgeSeconds: 300 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Same-origin images (avatars, uploads) — SWR keeps them fresh.
            urlPattern: ({ request, sameOrigin }) =>
              sameOrigin && request.destination === "image",
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "image-cache",
              expiration: {
                maxEntries: 200,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            // Cross-origin images (Supabase storage, gravatar, etc).
            urlPattern: ({ url, request }) =>
              request.destination === "image" && url.origin !== self.location.origin,
            handler: "StaleWhileRevalidate",
            options: {
              cacheName: "image-cache-external",
              expiration: { maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 7 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\.(?:woff|woff2|ttf|eot)$/,
            handler: "CacheFirst",
            options: {
              cacheName: "font-cache",
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
        ],

      },
    }),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom", "react-router-dom"],
          "supabase-vendor": ["@supabase/supabase-js"],
        },
      },
    },
  },
}));
