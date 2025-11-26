/**
 * reCAPTCHA v3 integration utilities
 * IMPORTANT: Replace the site key below with your actual reCAPTCHA v3 site key
 * Get your key from: https://www.google.com/recaptcha/admin
 */

// reCAPTCHA v3 site key (safe to expose publicly)
export const RECAPTCHA_SITE_KEY = "6LeJVxksAAAAABY93KGo4h14CHaW2HnRrdSjJnwQ";

/**
 * Load reCAPTCHA script dynamically
 */
export const loadRecaptchaScript = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined") {
      reject(new Error("Window is not defined"));
      return;
    }

    // Check if already loaded
    if ((window as any).grecaptcha) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load reCAPTCHA script"));
    document.head.appendChild(script);
  });
};

/**
 * Execute reCAPTCHA and get token
 * @param action - The action name for this reCAPTCHA execution
 */
export const executeRecaptcha = async (action: string): Promise<string> => {
  if (typeof window === "undefined" || !(window as any).grecaptcha) {
    throw new Error("reCAPTCHA not loaded");
  }

  try {
    return new Promise((resolve, reject) => {
      (window as any).grecaptcha.ready(() => {
        (window as any).grecaptcha
          .execute(RECAPTCHA_SITE_KEY, { action })
          .then((token: string) => resolve(token))
          .catch((error: Error) => reject(error));
      });
    });
  } catch (error) {
    console.error("reCAPTCHA execution failed:", error);
    throw new Error("Failed to execute reCAPTCHA");
  }
};

// Note: Server-side verification is handled in edge functions
// See supabase/functions/_shared/recaptcha.ts
