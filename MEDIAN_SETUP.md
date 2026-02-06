# Median.co Integration Guide

This project is configured with the Median JavaScript Bridge for converting the web app into native iOS and Android mobile apps.

## Package Installed

- `median-js-bridge` v2.13.3 - The official Median JavaScript Bridge NPM package

## Integration Setup

### 1. Context & Hook

The Median integration includes:

- **`src/hooks/useMedian.tsx`** - Core hook providing access to Median native APIs
- **`src/contexts/MedianContext.tsx`** - React context for app-wide Median state

### 2. Using Median in Components

```tsx
import { useMedianContext } from '@/contexts/MedianContext';

function MyComponent() {
  const { 
    isReady, 
    isNativeApp, 
    platform,
    deviceInfo,
    sharePage,
    copyToClipboard,
    setStatusBar,
    scanBarcode,
    // ... more methods
  } = useMedianContext();

  if (isNativeApp) {
    // Native app specific functionality
    return <NativeAppView />;
  }

  return <WebView />;
}
```

## Available Methods

### Device Information
- `isReady` - Boolean indicating if Median bridge is ready
- `isNativeApp` - Boolean indicating if running in native app
- `platform` - 'ios' | 'android' | 'browser'
- `deviceInfo` - Full device information object
- `getDeviceInfo()` - Async method to get device info

### Navigation
- `openWindow(url, mode)` - Open URL (mode: 'internal', 'external', 'appbrowser')
- `closeWindow()` - Close current window

### Status Bar
- `setStatusBar({ style, color, overlay, blur })` - Configure native status bar

### Sharing
- `sharePage(url, text)` - Native share sheet

### Clipboard
- `copyToClipboard(data)` - Copy text to clipboard
- `getFromClipboard()` - Get text from clipboard

### Push Notifications (OneSignal)
- `registerForPush()` - Register for push notifications

### Tab Navigation
- `selectTab(tabIndex)` - Select tab in native tab bar

### Connectivity
- `getConnectivity()` - Check network connectivity

### Screen
- `setScreenMode(mode)` - Set dark/light/auto mode
- `keepScreenOn(enable)` - Prevent screen from sleeping

### Webview
- `clearCache()` - Clear webview cache
- `reloadWebview()` - Reload the webview

### Barcode Scanner
- `scanBarcode()` - Native barcode/QR scanner

### App Review
- `promptAppReview()` - Prompt user to review app

## Building Native Apps with Median

### Step 1: Create Median Account
1. Go to [median.co](https://median.co)
2. Create a new app project
3. Enter your web app URL

### Step 2: Configure App Settings
1. Set your app name: "Kinsroot"
2. Configure app icons and splash screens
3. Set up push notifications if needed
4. Enable required native plugins

### Step 3: Enable SPA Navigation
Since this is a React SPA, enable these settings in Median:
1. Go to **Link Handling** → Enable **SPA Navigation**
2. Go to **Native Plugins** → **JavaScript Bridge and NPM** → Enable **Using JavaScript Bridge Library from website and NPM**

### Step 4: Build Apps
1. Click "Build" in Median dashboard
2. Download iOS/Android source code or get direct builds
3. For iOS: Open in Xcode, configure signing, submit to App Store
4. For Android: Open in Android Studio or upload to Play Store

## Native Features to Configure in Median

### Recommended Plugins
- **OneSignal Push Notifications** - Already supported in hook
- **Barcode Scanner** - Already supported in hook
- **Touch ID/Face ID** - For biometric authentication
- **In-App Purchases** - If monetization needed

### Status Bar Configuration
```javascript
// Example: Set dark status bar
setStatusBar({
  style: 'dark',
  color: '#1a3d2e', // Your primary color
  overlay: false,
  blur: false
});
```

## Migration from Capacitor

This project previously had Capacitor configured. Median provides a simpler approach:

| Feature | Capacitor | Median |
|---------|-----------|--------|
| Native builds | Export + local build | Cloud build |
| Plugins | Manual install | Built-in |
| Updates | App store only | OTA updates |
| Complexity | Higher | Lower |

## Testing

The Median bridge only works when your app is loaded inside a Median native app. In the browser:
- `isNativeApp` will be `false`
- `platform` will be `'browser'`
- Native methods will fall back to web equivalents or no-op

## Resources

- [Median Documentation](https://docs.median.co)
- [JavaScript Bridge Reference](https://docs.median.co/docs/javascript-bridge)
- [NPM Package](https://docs.median.co/docs/npm-package)
