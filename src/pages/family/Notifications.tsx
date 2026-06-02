import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Bell, Check, X } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

interface DeliveryRow {
  channel: string;
  status: string;
  error_message?: string | null;
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  priority: 'low' | 'medium' | 'high';
  read: boolean;
  created_at: string;
  link?: string | null;
  role_specific?: string;
  deliveries?: DeliveryRow[];
}

function DeliveryStatusRow({ deliveries }: { deliveries?: DeliveryRow[] }) {
  const list = (deliveries ?? []).filter((d) => d.channel !== "inapp");
  if (list.length === 0) return null;
  const tone = (s: string) =>
    s === "sent"
      ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
      : s === "failed"
      ? "bg-red-500/10 text-red-600 border-red-500/20"
      : "bg-muted text-muted-foreground border-border";
  return (
    <div className="flex items-center gap-1.5 mt-2 flex-wrap">
      {list.map((d, i) => (
        <Badge
          key={i}
          variant="outline"
          className={tone(d.status)}
          title={d.error_message ?? `${d.channel}: ${d.status}`}
        >
          {d.channel === "push" ? "Push" : d.channel === "sms" ? "SMS" : d.channel}{" "}
          {d.status === "sent" ? "✓" : d.status === "failed" ? "✕" : "–"}
        </Badge>
      ))}
    </div>
  );
}



const Notifications = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<Record<string, unknown> | null>(null);
  const [userRole, setUserRole] = useState<string>('member');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [settings, setSettings] = useState({
    contributions: true,
    loans: true,
    meetings: true,
    assistance: true,
    email: true,
  });

  useEffect(() => {
    loadData();
    setupRealtimeSubscription();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familySlug]);

  const setupRealtimeSubscription = () => {
    const channel = supabase
      .channel('inapp-notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'in_app_notifications' },
        () => loadNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: familyData } = await supabase
        .from("families")
        .select("*")
        .eq("slug", familySlug)
        .single();

      if (!familyData) {
        navigate("/dashboard");
        return;
      }

      setFamily(familyData);

      // Get user's role in the family
      const { data: memberData } = await supabase
        .from("family_members")
        .select("role")
        .eq("family_id", familyData.id)
        .eq("user_id", session.user.id)
        .single();

      if (memberData) {
        setUserRole(memberData.role);
      }

      // Load notification settings
      const savedSettings = localStorage.getItem(`notification-settings-${familyData.id}`);
      if (savedSettings) {
        setSettings(JSON.parse(savedSettings));
      }

      await loadNotifications();
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load notifications",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadNotifications = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: familyRow } = await supabase
      .from("families")
      .select("id")
      .eq("slug", familySlug)
      .maybeSingle();

    const query = supabase
      .from("in_app_notifications")
      .select("id, title, body, notification_type, link, read_at, created_at, family_id, notification_deliveries(channel, status, error_message)")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false })
      .limit(100);

    if (familyRow?.id) query.or(`family_id.eq.${familyRow.id},family_id.is.null`);

    const { data, error } = await query;
    if (error) {
      console.error("[notifications] load error", error);
      return;
    }

    const priorityFor = (type: string): 'low' | 'medium' | 'high' => {
      if (type.startsWith("loan_") || type === "attendance_deadline" || type === "fine_issued" || type === "sanction_recorded") return 'high';
      if (type === "meeting_reminder_1d" || type === "assistance_created" || type === "discipline_recorded" || type === "apology_recorded") return 'medium';
      return 'low';
    };

    setNotifications(
      (data ?? []).map((r) => ({
        id: r.id,
        title: r.title,
        message: r.body,
        type: r.notification_type,
        priority: priorityFor(r.notification_type),
        read: !!r.read_at,
        created_at: r.created_at,
        link: r.link,
        deliveries: (r as { notification_deliveries?: DeliveryRow[] }).notification_deliveries ?? [],
      }))
    );
  };


  const handleMarkAsRead = async (id: string) => {
    await supabase
      .from("in_app_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    setNotifications(notifications.map(n => n.id === id ? { ...n, read: true } : n));
  };

  const handleMarkAllAsRead = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;
    await supabase
      .from("in_app_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", session.user.id)
      .is("read_at", null);
    setNotifications(notifications.map(n => ({ ...n, read: true })));
    toast({ title: "Success", description: "All notifications marked as read" });
  };

  const handleDeleteNotification = async (id: string) => {
    // Soft hide locally — keep DB row for audit
    await supabase
      .from("in_app_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    setNotifications(notifications.filter(n => n.id !== id));
  };

  const handleSaveSettings = () => {
    localStorage.setItem(`notification-settings-${family?.id}`, JSON.stringify(settings));
    toast({
      title: "Success",
      description: "Notification settings saved",
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'contribution':
        return '💰';
      case 'loan':
        return '💳';
      case 'meeting':
        return '📅';
      case 'assistance':
        return '🤝';
      default:
        return '📢';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default:
        return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}`)}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("common.back")}
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Bell className="w-6 h-6" />
                  Notifications
                  {unreadCount > 0 && (
                    <Badge variant="destructive">{unreadCount}</Badge>
                  )}
                </h1>
                <p className="text-sm text-muted-foreground">{family?.name as string} - Role: {userRole}</p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Tabs defaultValue="all">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="all">All ({notifications.length})</TabsTrigger>
            <TabsTrigger value="unread">Unread ({unreadCount})</TabsTrigger>
            <TabsTrigger value="settings">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="space-y-4">
            {unreadCount > 0 && (
              <div className="flex justify-end">
                <Button variant="outline" size="sm" onClick={handleMarkAllAsRead}>
                  <Check className="w-4 h-4 mr-2" />
                  Mark All as Read
                </Button>
              </div>
            )}

            {notifications.length === 0 ? (
              <Card className="p-12 text-center">
                <Bell className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-xl font-semibold mb-2">No notifications</h3>
                <p className="text-muted-foreground">You're all caught up!</p>
              </Card>
            ) : (
              notifications.map((notification) => (
                <Card key={notification.id} className={!notification.read ? 'border-primary' : ''}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3 flex-1">
                        <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{notification.title}</h3>
                            {!notification.read && <Badge variant="default">New</Badge>}
                            <Badge variant="outline" className={getPriorityColor(notification.priority)}>
                              {notification.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                          <DeliveryStatusRow deliveries={notification.deliveries} />

                        </div>
                      </div>
                      <div className="flex gap-2">
                        {!notification.read && (
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleMarkAsRead(notification.id)}
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteNotification(notification.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="unread" className="space-y-4">
            {notifications.filter(n => !n.read).length === 0 ? (
              <Card className="p-12 text-center">
                <Check className="w-16 h-16 mx-auto mb-4 text-green-500" />
                <h3 className="text-xl font-semibold mb-2">All caught up!</h3>
                <p className="text-muted-foreground">No unread notifications</p>
              </Card>
            ) : (
              notifications.filter(n => !n.read).map((notification) => (
                <Card key={notification.id} className="border-primary">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex gap-3 flex-1">
                        <div className="text-2xl">{getNotificationIcon(notification.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">{notification.title}</h3>
                            <Badge variant="default">New</Badge>
                            <Badge variant="outline" className={getPriorityColor(notification.priority)}>
                              {notification.priority}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{notification.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(notification.created_at).toLocaleString()}
                          </p>
                          <DeliveryStatusRow deliveries={notification.deliveries} />

                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleMarkAsRead(notification.id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteNotification(notification.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>Notification Preferences</CardTitle>
                <CardDescription>Choose what notifications you want to receive</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Contribution Notifications</Label>
                    <p className="text-sm text-muted-foreground">Get notified about contributions</p>
                  </div>
                  <Switch
                    checked={settings.contributions}
                    onCheckedChange={(checked) => setSettings({ ...settings, contributions: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Loan Notifications</Label>
                    <p className="text-sm text-muted-foreground">Get notified about loan activities</p>
                  </div>
                  <Switch
                    checked={settings.loans}
                    onCheckedChange={(checked) => setSettings({ ...settings, loans: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Meeting Notifications</Label>
                    <p className="text-sm text-muted-foreground">Get notified about upcoming meetings</p>
                  </div>
                  <Switch
                    checked={settings.meetings}
                    onCheckedChange={(checked) => setSettings({ ...settings, meetings: checked })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Assistance Notifications</Label>
                    <p className="text-sm text-muted-foreground">Get notified about assistance events</p>
                  </div>
                  <Switch
                    checked={settings.assistance}
                    onCheckedChange={(checked) => setSettings({ ...settings, assistance: checked })}
                  />
                </div>

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="space-y-0.5">
                    <Label>Email Notifications</Label>
                    <p className="text-sm text-muted-foreground">Receive notifications via email</p>
                  </div>
                  <Switch
                    checked={settings.email}
                    onCheckedChange={(checked) => setSettings({ ...settings, email: checked })}
                  />
                </div>

                <div className="flex justify-end pt-4">
                  <Button onClick={handleSaveSettings}>
                    Save Preferences
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Notifications;
