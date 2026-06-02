import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";

interface DeliveryRow {
  channel: string;
  status: string;
}

interface InboxItem {
  id: string;
  title: string;
  body: string;
  notification_type: string;
  link: string | null;
  read_at: string | null;
  created_at: string;
  notification_deliveries?: DeliveryRow[];
}


/**
 * In-app notification bell. Subscribes to in_app_notifications via realtime,
 * shows unread count, and lets the user mark items as read or navigate.
 */
export function NotificationInbox({ familySlug }: { familySlug?: string }) {
  const navigate = useNavigate();
  const [items, setItems] = useState<InboxItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!mounted || !data.user) return;
      setUserId(data.user.id);
      await refresh(data.user.id);
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`inbox-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "in_app_notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          setItems((prev) => [payload.new as InboxItem, ...prev].slice(0, 50));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const refresh = async (uid: string) => {
    const { data } = await supabase
      .from("in_app_notifications")
      .select("id, title, body, notification_type, link, read_at, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(30);
    setItems(data ?? []);
  };

  const markRead = async (id: string) => {
    await supabase
      .from("in_app_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("id", id);
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, read_at: new Date().toISOString() } : i))
    );
  };

  const markAllRead = async () => {
    if (!userId) return;
    await supabase
      .from("in_app_notifications")
      .update({ read_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("read_at", null);
    setItems((prev) => prev.map((i) => ({ ...i, read_at: new Date().toISOString() })));
  };

  const handleClick = (item: InboxItem) => {
    void markRead(item.id);
    if (item.link) navigate(item.link);
    else if (familySlug) navigate(`/family/${familySlug}/notifications`);
  };

  const unread = items.filter((i) => !i.read_at).length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <Badge
              variant="destructive"
              className="absolute -top-1 -right-1 h-5 min-w-5 px-1 text-xs"
            >
              {unread > 9 ? "9+" : unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h3 className="font-semibold text-sm">Notifications</h3>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          {items.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              You're all caught up
            </div>
          ) : (
            <ul className="divide-y">
              {items.map((item) => (
                <li
                  key={item.id}
                  className={`px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors ${
                    !item.read_at ? "bg-primary/5" : ""
                  }`}
                  onClick={() => handleClick(item)}
                >
                  <div className="flex items-start gap-2">
                    {!item.read_at && (
                      <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-tight">{item.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {item.body}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
        {familySlug && (
          <div className="border-t p-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs"
              onClick={() => navigate(`/family/${familySlug}/notifications`)}
            >
              View all
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

export default NotificationInbox;
