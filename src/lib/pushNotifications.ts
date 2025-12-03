import { supabase } from "@/integrations/supabase/client";
import { offlineStorage } from "./offlineStorage";

export type NotificationType = 
  | 'meeting_reminder'
  | 'payment_reminder'
  | 'loan_approval'
  | 'loan_rejection'
  | 'assistance_event'
  | 'family_announcement'
  | 'contribution_received'
  | 'attendance_marked';

export interface PushNotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  tag?: string;
  data?: Record<string, string>;
  actions?: NotificationAction[];
}

interface NotificationAction {
  action: string;
  title: string;
  icon?: string;
}

class PushNotificationService {
  private static instance: PushNotificationService;
  private permission: NotificationPermission = 'default';
  private registration: ServiceWorkerRegistration | null = null;

  private constructor() {
    this.init();
  }

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  private async init() {
    if (!('Notification' in window)) {
      console.log('Notifications not supported');
      return;
    }

    this.permission = Notification.permission;

    // Register service worker for push notifications
    if ('serviceWorker' in navigator) {
      try {
        this.registration = await navigator.serviceWorker.ready;
      } catch (error) {
        console.error('Service worker registration failed:', error);
      }
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!('Notification' in window)) {
      return false;
    }

    if (this.permission === 'granted') {
      return true;
    }

    if (this.permission !== 'denied') {
      this.permission = await Notification.requestPermission();
      
      // Store preference
      await offlineStorage.setPreference('notifications_enabled', this.permission === 'granted');
      
      return this.permission === 'granted';
    }

    return false;
  }

  isPermissionGranted(): boolean {
    return this.permission === 'granted';
  }

  async show(payload: PushNotificationPayload): Promise<void> {
    if (!this.isPermissionGranted()) {
      console.log('Notification permission not granted');
      return;
    }

    const options: NotificationOptions & { vibrate?: number[]; actions?: NotificationAction[] } = {
      body: payload.body,
      icon: payload.icon || '/pwa-192x192.png',
      badge: payload.badge || '/favicon.jpg',
      tag: payload.tag || `${payload.type}-${Date.now()}`,
      data: payload.data,
      vibrate: [200, 100, 200],
      requireInteraction: this.shouldRequireInteraction(payload.type),
      actions: payload.actions,
    };

    try {
      if (this.registration) {
        // Use service worker for better reliability
        await this.registration.showNotification(payload.title, options);
      } else {
        // Fallback to basic notification
        const notification = new Notification(payload.title, options);
        
        notification.onclick = () => {
          window.focus();
          if (payload.data?.url) {
            window.location.href = payload.data.url;
          }
          notification.close();
        };

        // Auto close non-critical notifications
        if (!this.shouldRequireInteraction(payload.type)) {
          setTimeout(() => notification.close(), 5000);
        }
      }
    } catch (error) {
      console.error('Failed to show notification:', error);
    }
  }

  private shouldRequireInteraction(type: NotificationType): boolean {
    // These notification types should stay visible until user interacts
    return ['loan_approval', 'loan_rejection', 'assistance_event'].includes(type);
  }

  // Notification factory methods
  showMeetingReminder(meetingDate: string, meetingTime: string, location?: string): void {
    this.show({
      type: 'meeting_reminder',
      title: '📅 Meeting Reminder',
      body: `Family meeting on ${meetingDate} at ${meetingTime}${location ? ` - ${location}` : ''}`,
      tag: `meeting-${meetingDate}`,
      data: { url: '/meetings' },
      actions: [
        { action: 'view', title: 'View Details' },
        { action: 'dismiss', title: 'Dismiss' },
      ],
    });
  }

  showPaymentReminder(amount: number, dueDate: string, type: string): void {
    this.show({
      type: 'payment_reminder',
      title: '💰 Payment Reminder',
      body: `Your ${type} payment of ${amount.toLocaleString()} FCFA is due on ${dueDate}`,
      tag: `payment-${dueDate}`,
      data: { url: '/contributions' },
      actions: [
        { action: 'pay', title: 'Pay Now' },
        { action: 'later', title: 'Remind Later' },
      ],
    });
  }

  showLoanApproval(loanId: string, amount: number, approved: boolean): void {
    this.show({
      type: approved ? 'loan_approval' : 'loan_rejection',
      title: approved ? '✅ Loan Approved!' : '❌ Loan Not Approved',
      body: approved 
        ? `Your loan request for ${amount.toLocaleString()} FCFA has been approved!`
        : `Your loan request for ${amount.toLocaleString()} FCFA was not approved.`,
      tag: `loan-${loanId}`,
      data: { url: `/loans/${loanId}` },
    });
  }

  showAssistanceEvent(eventType: string, memberName: string, amount?: number): void {
    const titles: Record<string, string> = {
      birth: '👶 New Birth!',
      death: '🕯️ Condolences',
      sickness: '🏥 Sickness Alert',
      wedding: '💒 Wedding Announcement',
    };

    this.show({
      type: 'assistance_event',
      title: titles[eventType] || '📢 Family Event',
      body: `${memberName} - ${eventType.charAt(0).toUpperCase() + eventType.slice(1)} assistance${amount ? `: ${amount.toLocaleString()} FCFA` : ''}`,
      tag: `assistance-${Date.now()}`,
      data: { url: '/assistance' },
    });
  }

  showFamilyAnnouncement(title: string, message: string): void {
    this.show({
      type: 'family_announcement',
      title: `📢 ${title}`,
      body: message,
      tag: `announcement-${Date.now()}`,
    });
  }

  showContributionReceived(memberName: string, amount: number, type: string): void {
    this.show({
      type: 'contribution_received',
      title: '💵 Contribution Received',
      body: `${memberName} contributed ${amount.toLocaleString()} FCFA (${type})`,
      tag: `contribution-${Date.now()}`,
      data: { url: '/contributions' },
    });
  }

  showAttendanceMarked(meetingDate: string, status: string): void {
    this.show({
      type: 'attendance_marked',
      title: '✓ Attendance Recorded',
      body: `Your attendance for ${meetingDate} has been marked as ${status}`,
      tag: `attendance-${meetingDate}`,
    });
  }

  // Setup realtime listeners for push notifications
  setupRealtimeNotifications(familyId: string, userId: string): () => void {
    const channels: ReturnType<typeof supabase.channel>[] = [];

    // Listen for new meetings
    const meetingsChannel = supabase
      .channel(`push-meetings-${familyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'meetings',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          const meeting = payload.new as { meeting_date: string; meeting_time: string; location?: string };
          this.showMeetingReminder(meeting.meeting_date, meeting.meeting_time, meeting.location);
        }
      )
      .subscribe();
    channels.push(meetingsChannel);

    // Listen for loan status changes
    const loansChannel = supabase
      .channel(`push-loans-${familyId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'loans',
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          const loan = payload.new as { id: string; member_id: string; amount: number; status: string };
          const oldLoan = payload.old as { status: string };
          
          // Check if status changed to approved or rejected
          if (oldLoan.status === 'pending' && (loan.status === 'approved' || loan.status === 'rejected')) {
            this.showLoanApproval(loan.id, loan.amount, loan.status === 'approved');
          }
        }
      )
      .subscribe();
    channels.push(loansChannel);

    // Listen for assistance events
    const assistanceChannel = supabase
      .channel(`push-assistance-${familyId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'assistance_events',
          filter: `family_id=eq.${familyId}`,
        },
        async (payload) => {
          const event = payload.new as { event_type: string; member_id: string; amount: number };
          
          // Get member name
          const { data: member } = await supabase
            .from('family_members')
            .select('profiles(full_name)')
            .eq('id', event.member_id)
            .single();
          
          const memberName = (member?.profiles as { full_name: string } | null)?.full_name || 'A family member';
          this.showAssistanceEvent(event.event_type, memberName, event.amount);
        }
      )
      .subscribe();
    channels.push(assistanceChannel);

    // Cleanup function
    return () => {
      channels.forEach(channel => supabase.removeChannel(channel));
    };
  }
}

export const pushNotifications = PushNotificationService.getInstance();
export default pushNotifications;
