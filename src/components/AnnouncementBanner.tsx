import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { X, Info, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Announcement {
  id: string;
  title: string;
  body: string;
  severity: "info" | "warning" | "success";
  link_url: string | null;
  link_label: string | null;
}

const STORAGE_KEY = "dismissed_announcements_v1";

const getDismissed = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};

const dismissId = (id: string) => {
  const list = Array.from(new Set([...getDismissed(), id]));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

export function AnnouncementBanner() {
  const [items, setItems] = useState<Announcement[]>([]);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const sub = supabase.auth.onAuthStateChange((_e, session) => {
      setAuthed(!!session);
    });
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    return () => sub.data.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authed) {
      setItems([]);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("system_announcements")
        .select("id,title,body,severity,link_url,link_label")
        .eq("active", true)
        .lte("starts_at", new Date().toISOString())
        .order("starts_at", { ascending: false })
        .limit(5);
      if (cancelled || !data) return;
      const dismissed = getDismissed();
      setItems(
        (data as Announcement[]).filter((a) => !dismissed.includes(a.id)),
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [authed]);

  const handleDismiss = (id: string) => {
    dismissId(id);
    setItems((prev) => prev.filter((a) => a.id !== id));
  };

  if (!items.length) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 space-y-1 p-2 pointer-events-none">
      {items.map((a) => {
        const Icon =
          a.severity === "warning"
            ? AlertTriangle
            : a.severity === "success"
              ? CheckCircle2
              : Info;
        return (
          <Alert
            key={a.id}
            className="pointer-events-auto shadow-lg border bg-card/95 backdrop-blur"
          >
            <Icon className="h-4 w-4" />
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <AlertTitle className="text-sm">{a.title}</AlertTitle>
                <AlertDescription className="text-xs">
                  {a.body}
                  {a.link_url && (
                    <a
                      href={a.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 underline text-primary"
                    >
                      {a.link_label || "See announcement details"}
                    </a>
                  )}
                </AlertDescription>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 shrink-0"
                onClick={() => handleDismiss(a.id)}
                aria-label="Dismiss"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          </Alert>
        );
      })}
    </div>
  );
}
