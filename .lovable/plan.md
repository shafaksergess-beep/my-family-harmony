
## Goal

Audit the existing PWA setup, fix issues, and make "Add to Home Screen" install prominent and reliable across Chrome/Android and iOS Safari.

## Audit findings (verified in code)

1. **Preview leakage**: `vite.config.ts` uses `injectRegister: "auto"` + `PWAUpdatePrompt` also calls `useRegisterSW`. This registers a service worker inside the Lovable preview iframe (`id-preview--*.lovable.app`), which the PWA skill explicitly forbids — stale caches will haunt the editor preview.
2. **Double-registration risk**: `injectRegister: "auto"` injects its own registration AND `useRegisterSW` registers again. Only one path should register.
3. **Duplicate route**: `/install` is declared twice in `src/App.tsx` (lines 148 and 229).
4. **iOS blind spot**: `InstallBanner.tsx` only shows when `beforeinstallprompt` fires — iOS Safari never fires it, so iPhone users never see the prompt or instructions.
5. **No prominent entry point**: `/install` page exists but nothing in the app chrome links to it. Users don't know it's installable.
6. **Manifest**: `logo.jpg` at 192x192 is declared with `purpose: "any"` — jpeg is allowed but a PNG is preferred; existing `pwa-192x192.png` / `pwa-512x512.png` already cover this.

## Changes

### 1. Guarded service-worker registration (per PWA skill)

Create `src/lib/pwaRegister.ts` — single registration wrapper that:
- refuses when `!import.meta.env.PROD`
- refuses inside iframes
- refuses on hostnames starting with `id-preview--` / `preview--`
- refuses on `*.lovableproject.com`, `*.lovableproject-dev.com`, `*.beta.lovable.dev`
- refuses when `?sw=off` — and unregisters any existing `/sw.js` in that case
- otherwise calls `useRegisterSW` (via the existing `PWAUpdatePrompt`)

Update `vite.config.ts`:
- `injectRegister: null` (skill requirement — wrapper is the only registrar)
- `devOptions: { enabled: false }` (explicit, prevent dev SW)

Refactor `src/components/PWAUpdatePrompt.tsx` to short-circuit and unregister in refused contexts before touching `useRegisterSW`. Keep the update-toast + offline-ready toast behavior.

### 2. Cross-platform install UX

Replace the current single-shot `InstallBanner.tsx` with a smarter component:
- **Android/Chromium**: capture `beforeinstallprompt`, show banner with "Install" button.
- **iOS Safari** (detect `/iphone|ipad|ipod/` + not standalone + not Chrome-on-iOS): show a banner with the Share → Add to Home Screen instructions.
- Suppress when already installed (`display-mode: standalone` or `navigator.standalone`).
- Dismissal stored in `localStorage` for 14 days (not just session) so it isn't nagging every reload.
- "Learn more" link → `/install` for full instructions.

Add a persistent **"Install app"** entry in the profile/settings menu so users can trigger installation any time (fires the deferred prompt on Android, links to `/install` on iOS).

### 3. Fix duplicate `/install` route

Remove the duplicate `<Route path="/install" />` on line 229 of `src/App.tsx`.

### 4. `/install` page polish

`src/pages/Install.tsx` already exists and covers Android + iOS manual instructions. Small tweaks:
- Detect standalone mode more robustly (both `display-mode: standalone` and iOS `navigator.standalone`).
- Add a "Copy link" button so users on desktop can send the URL to their phone.

### 5. Manifest sanity

`public/manifest.webmanifest` and the manifest embedded in `vite.config.ts` diverge slightly. Keep the vite-plugin-pwa generated one authoritative; delete `public/manifest.webmanifest` to avoid two competing manifests being served. Confirm `index.html` `<link rel="manifest">` still resolves (plugin injects it in `injectManifest`/`generateSW` mode automatically).

## Verification

- Run build; confirm `dist/sw.js` and `dist/manifest.webmanifest` are emitted.
- Load preview in the Lovable editor iframe → confirm no SW registers (check Application tab via Playwright).
- Load published site in a normal Chrome tab → confirm SW registers, install banner appears, `/install` works.
- Simulate iOS UA in Playwright → confirm iOS instructions render.

## Files touched

```text
vite.config.ts                              (injectRegister: null, devOptions off)
src/lib/pwaRegister.ts                      (new — guard helper)
src/components/PWAUpdatePrompt.tsx          (apply guard, unregister in refused ctx)
src/components/InstallBanner.tsx            (add iOS branch, 14-day dismiss)
src/components/InstallMenuItem.tsx          (new — reusable install trigger)
src/pages/Profile.tsx                       (add InstallMenuItem in settings list)
src/pages/Install.tsx                       (better standalone detection, share link)
src/App.tsx                                 (remove duplicate /install route)
public/manifest.webmanifest                 (delete — plugin generates it)
```
