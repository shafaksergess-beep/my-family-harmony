import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Circle } from "lucide-react";

interface OnlineUser {
  user_id: string;
  full_name: string;
  avatar_url?: string;
  online_at: string;
}

interface LiveMemberStatusProps {
  meetingId: string;
  familyId: string;
}

export const LiveMemberStatus = ({ meetingId, familyId }: LiveMemberStatusProps) => {
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const initPresence = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      setCurrentUserId(user.id);

      // Get user profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, avatar_url")
        .eq("id", user.id)
        .single();

      const channel = supabase.channel(`meeting:${meetingId}`);

      channel
        .on("presence", { event: "sync" }, () => {
          const state = channel.presenceState();
          const users = Object.values(state)
            .flat()
            .map((presence: any) => presence as OnlineUser);
          setOnlineUsers(users);
        })
        .on("presence", { event: "join" }, ({ key, newPresences }) => {
          console.log("User joined:", key, newPresences);
        })
        .on("presence", { event: "leave" }, ({ key, leftPresences }) => {
          console.log("User left:", key, leftPresences);
        })
        .subscribe(async (status) => {
          if (status === "SUBSCRIBED" && profile) {
            await channel.track({
              user_id: user.id,
              full_name: profile.full_name,
              avatar_url: profile.avatar_url,
              online_at: new Date().toISOString(),
            });
          }
        });

      return () => {
        supabase.removeChannel(channel);
      };
    };

    initPresence();
  }, [meetingId]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Users className="w-5 h-5" />
          Live Members
          <Badge variant="secondary" className="ml-auto">
            {onlineUsers.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {onlineUsers.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No members online yet
            </p>
          ) : (
            onlineUsers.map((user) => (
              <div
                key={user.user_id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback>
                      {user.full_name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Circle className="absolute -bottom-1 -right-1 w-4 h-4 fill-green-500 text-green-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {user.full_name}
                    {user.user_id === currentUserId && (
                      <span className="text-muted-foreground ml-2">(You)</span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Online {new Date(user.online_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};
