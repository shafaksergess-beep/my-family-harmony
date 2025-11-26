import { supabase } from "@/integrations/supabase/client";

export interface NotificationPayload {
  title: string;
  message: string;
  type: "contribution" | "loan" | "meeting" | "assistance" | "general";
  familyId: string;
  link?: string;
  userId?: string;
  roleSpecific?: string[];
}

export class NotificationManager {
  private static instance: NotificationManager;
  private permissionGranted: boolean = false;

  private constructor() {
    this.checkPermission();
  }

  static getInstance(): NotificationManager {
    if (!NotificationManager.instance) {
      NotificationManager.instance = new NotificationManager();
    }
    return NotificationManager.instance;
  }

  async requestPermission(): Promise<boolean> {
    if (!("Notification" in window)) {
      console.log("This browser does not support notifications");
      return false;
    }

    if (Notification.permission === "granted") {
      this.permissionGranted = true;
      return true;
    }

    if (Notification.permission !== "denied") {
      const permission = await Notification.requestPermission();
      this.permissionGranted = permission === "granted";
      return this.permissionGranted;
    }

    return false;
  }

  private checkPermission() {
    if ("Notification" in window) {
      this.permissionGranted = Notification.permission === "granted";
    }
  }

  showNotification(payload: NotificationPayload) {
    if (!this.permissionGranted) {
      console.log("Notification permission not granted");
      return;
    }

    const notificationOptions: NotificationOptions = {
      body: payload.message,
      icon: "/favicon.ico",
      badge: "/favicon.ico",
      tag: `${payload.type}-${Date.now()}`,
      requireInteraction: false,
      data: {
        url: payload.link,
      },
    };

    const notification = new Notification(payload.title, notificationOptions);

    notification.onclick = (event) => {
      event.preventDefault();
      if (payload.link) {
        window.open(payload.link, "_blank");
      }
      notification.close();
    };

    // Auto close after 5 seconds
    setTimeout(() => {
      notification.close();
    }, 5000);
  }

  setupRealtimeListeners(familyId: string, userRole: string, userId: string) {
    // Listen to contributions
    const contributionsChannel = supabase
      .channel(`contributions-${familyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "contributions",
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          if (["family_head", "treasurer"].includes(userRole)) {
            this.showNotification({
              title: "New Contribution",
              message: "A new contribution has been recorded",
              type: "contribution",
              familyId,
              link: `/family/${familyId}/contributions`,
            });
          }
        }
      )
      .subscribe();

    // Listen to loans
    const loansChannel = supabase
      .channel(`loans-${familyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "loans",
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          if (["family_head", "loan_committee", "treasurer"].includes(userRole)) {
            this.showNotification({
              title: "New Loan Request",
              message: "A new loan request has been submitted",
              type: "loan",
              familyId,
              link: `/family/${familyId}/loans`,
            });
          }
        }
      )
      .subscribe();

    // Listen to meetings
    const meetingsChannel = supabase
      .channel(`meetings-${familyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "meetings",
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          this.showNotification({
            title: "New Meeting Scheduled",
            message: "A new family meeting has been scheduled",
            type: "meeting",
            familyId,
            link: `/family/${familyId}/meetings`,
          });
        }
      )
      .subscribe();

    // Listen to meeting reminders
    const remindersChannel = supabase
      .channel(`meeting-reminders-${familyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "meeting_reminders",
          filter: `family_id=eq.${familyId}`,
        },
        async (payload) => {
          // Fetch meeting details for the reminder
          const { data: meeting } = await supabase
            .from("meetings")
            .select("*")
            .eq("id", payload.new.meeting_id)
            .single();

          if (meeting) {
            const daysText = payload.new.days_before === 1 ? "tomorrow" : `in ${payload.new.days_before} days`;
            this.showNotification({
              title: "Meeting Reminder",
              message: `Family meeting ${daysText} at ${meeting.meeting_time}`,
              type: "meeting",
              familyId,
              link: `/family/${familyId}/meetings/${meeting.id}`,
            });
          }
        }
      )
      .subscribe();

    // Listen to assistance events
    const assistanceChannel = supabase
      .channel(`assistance-${familyId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "assistance_events",
          filter: `family_id=eq.${familyId}`,
        },
        (payload) => {
          this.showNotification({
            title: "New Assistance Event",
            message: "A new assistance event has been created",
            type: "assistance",
            familyId,
            link: `/family/${familyId}/assistance`,
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(contributionsChannel);
      supabase.removeChannel(loansChannel);
      supabase.removeChannel(meetingsChannel);
      supabase.removeChannel(remindersChannel);
      supabase.removeChannel(assistanceChannel);
    };
  }
}

export const notificationManager = NotificationManager.getInstance();
