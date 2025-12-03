import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics';

// Check if haptics are available
const isHapticsAvailable = async (): Promise<boolean> => {
  try {
    return !!(window as any).Capacitor?.isNativePlatform?.();
  } catch {
    return false;
  }
};

/**
 * Light haptic feedback - for subtle UI interactions
 * Use for: toggles, checkboxes, small selections
 */
export const hapticsLight = async (): Promise<void> => {
  if (await isHapticsAvailable()) {
    await Haptics.impact({ style: ImpactStyle.Light });
  }
};

/**
 * Medium haptic feedback - for standard interactions
 * Use for: button taps, list item selections
 */
export const hapticsMedium = async (): Promise<void> => {
  if (await isHapticsAvailable()) {
    await Haptics.impact({ style: ImpactStyle.Medium });
  }
};

/**
 * Heavy haptic feedback - for significant actions
 * Use for: important confirmations, drag & drop
 */
export const hapticsHeavy = async (): Promise<void> => {
  if (await isHapticsAvailable()) {
    await Haptics.impact({ style: ImpactStyle.Heavy });
  }
};

/**
 * Success notification haptic
 * Use for: successful form submissions, completed actions
 */
export const hapticsSuccess = async (): Promise<void> => {
  if (await isHapticsAvailable()) {
    await Haptics.notification({ type: NotificationType.Success });
  }
};

/**
 * Warning notification haptic
 * Use for: validation warnings, alerts
 */
export const hapticsWarning = async (): Promise<void> => {
  if (await isHapticsAvailable()) {
    await Haptics.notification({ type: NotificationType.Warning });
  }
};

/**
 * Error notification haptic
 * Use for: errors, failed actions
 */
export const hapticsError = async (): Promise<void> => {
  if (await isHapticsAvailable()) {
    await Haptics.notification({ type: NotificationType.Error });
  }
};

/**
 * Selection changed haptic
 * Use for: picker changes, slider adjustments
 */
export const hapticsSelection = async (): Promise<void> => {
  if (await isHapticsAvailable()) {
    await Haptics.selectionChanged();
  }
};

/**
 * Vibrate for a custom duration (Android only)
 * Use for: long press feedback, special events
 */
export const hapticsVibrate = async (duration: number = 300): Promise<void> => {
  if (await isHapticsAvailable()) {
    await Haptics.vibrate({ duration });
  }
};

// Combined haptics object for easy import
export const haptics = {
  light: hapticsLight,
  medium: hapticsMedium,
  heavy: hapticsHeavy,
  success: hapticsSuccess,
  warning: hapticsWarning,
  error: hapticsError,
  selection: hapticsSelection,
  vibrate: hapticsVibrate,
};

export default haptics;
