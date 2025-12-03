import { useState, useEffect, useCallback } from 'react';
import { pushNotifications } from '@/lib/pushNotifications';
import { offlineStorage } from '@/lib/offlineStorage';

interface UsePushNotificationsOptions {
  familyId?: string;
  userId?: string;
  autoSetup?: boolean;
}

export function usePushNotifications({
  familyId,
  userId,
  autoSetup = true,
}: UsePushNotificationsOptions = {}) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    setIsSupported('Notification' in window);
    setIsEnabled(pushNotifications.isPermissionGranted());

    // Load saved preference
    offlineStorage.getPreference<boolean>('notifications_enabled').then(enabled => {
      if (enabled !== null) setIsEnabled(enabled);
    });
  }, []);

  // Setup realtime notifications when enabled
  useEffect(() => {
    if (!autoSetup || !isEnabled || !familyId || !userId) {
      return;
    }

    const cleanup = pushNotifications.setupRealtimeNotifications(familyId, userId);
    return cleanup;
  }, [autoSetup, isEnabled, familyId, userId]);

  const requestPermission = useCallback(async () => {
    const granted = await pushNotifications.requestPermission();
    setIsEnabled(granted);
    return granted;
  }, []);

  const disable = useCallback(async () => {
    await offlineStorage.setPreference('notifications_enabled', false);
    setIsEnabled(false);
  }, []);

  return {
    isEnabled,
    isSupported,
    requestPermission,
    disable,
    showMeetingReminder: pushNotifications.showMeetingReminder.bind(pushNotifications),
    showPaymentReminder: pushNotifications.showPaymentReminder.bind(pushNotifications),
    showLoanApproval: pushNotifications.showLoanApproval.bind(pushNotifications),
    showAssistanceEvent: pushNotifications.showAssistanceEvent.bind(pushNotifications),
    showFamilyAnnouncement: pushNotifications.showFamilyAnnouncement.bind(pushNotifications),
    showContributionReceived: pushNotifications.showContributionReceived.bind(pushNotifications),
    showAttendanceMarked: pushNotifications.showAttendanceMarked.bind(pushNotifications),
  };
}

export default usePushNotifications;
