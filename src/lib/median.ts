/**
 * Global helper to detect if the app is running inside a Median native app.
 * Checks the user agent for 'median' or 'gonative' (legacy).
 */
export const isMedianApp: boolean = 
  typeof navigator !== 'undefined' && 
  (navigator.userAgent.toLowerCase().indexOf('median') > -1 || 
   navigator.userAgent.toLowerCase().indexOf('gonative') > -1);

/**
 * Function version for dynamic checks
 */
export function checkIsMedianApp(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent.toLowerCase();
  return ua.indexOf('median') > -1 || ua.indexOf('gonative') > -1;
}

// Also attach to window for global access in non-module contexts
if (typeof window !== 'undefined') {
  (window as any).isMedianApp = isMedianApp;
}

export default isMedianApp;
