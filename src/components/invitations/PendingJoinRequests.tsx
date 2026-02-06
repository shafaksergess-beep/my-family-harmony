import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { JoinRequestCard } from "./JoinRequestCard";
import { Loader2, UserPlus, Clock, CheckCircle, XCircle, Bell } from "lucide-react";

interface JoinRequest {
  id: string;
  full_name: string;
  email?: string;
  phone?: string;
  message?: string;
  status: string;
  reference_code_used?: string;
  created_at: string;
  user_id?: string;
  profiles?: {
    avatar_url?: string;
    full_name: string;
  };
}

interface PendingJoinRequestsProps {
  familyId: string;
  familySlug: string;
}

export const PendingJoinRequests = ({ familyId, familySlug }: PendingJoinRequestsProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<JoinRequest[]>([]);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    loadRequests();
  }, [familyId]);

  const loadRequests = async () => {
    try {
      const { data, error } = await supabase
        .from("join_requests")
        .select("*")
        .eq("family_id", familyId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      // Fetch profiles separately for requests with user_id
      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (request) => {
          if (request.user_id) {
            const { data: profile } = await supabase
              .from("profiles")
              .select("avatar_url, full_name")
              .eq("id", request.user_id)
              .single();
            return { ...request, profiles: profile || undefined };
          }
          return request;
        })
      );
      
      setRequests(requestsWithProfiles as JoinRequest[]);
    } catch (error) {
      console.error("Error loading join requests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId: string, welcomeMessage?: string) => {
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Update request status
      const { error: updateError } = await supabase
        .from("join_requests")
        .update({
          status: "approved",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          welcome_message: welcomeMessage || null,
        })
        .eq("id", requestId);

      if (updateError) throw updateError;

      // If user has an account, add them to the family
      if (request.user_id) {
        const { error: memberError } = await supabase
          .from("family_members")
          .insert({
            family_id: familyId,
            user_id: request.user_id,
            role: "member",
          });

        if (memberError && !memberError.message.includes("duplicate")) {
          throw memberError;
        }
      }

      toast({
        title: "Request Approved",
        description: `${request.full_name} has been added to the family.`,
      });

      // Refresh list
      loadRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to approve request",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (requestId: string, reason?: string) => {
    try {
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("join_requests")
        .update({
          status: "rejected",
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
          rejection_reason: reason || null,
        })
        .eq("id", requestId);

      if (error) throw error;

      toast({
        title: "Request Declined",
        description: `${request.full_name}'s request has been declined.`,
      });

      loadRequests();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to decline request",
        variant: "destructive",
      });
    }
  };

  const filteredRequests = requests.filter(r => {
    if (filter === "all") return true;
    return r.status === filter;
  });

  const pendingCount = requests.filter(r => r.status === "pending").length;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Join Requests
              {pendingCount > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {pendingCount} pending
                </Badge>
              )}
            </CardTitle>
            <CardDescription>Review and manage requests to join your family</CardDescription>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 text-sm text-amber-600 dark:text-amber-400">
              <Bell className="w-4 h-4" />
              Action required
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={filter} onValueChange={setFilter} className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="pending" className="gap-1">
              <Clock className="w-3 h-3" />
              Pending
            </TabsTrigger>
            <TabsTrigger value="approved" className="gap-1">
              <CheckCircle className="w-3 h-3" />
              Approved
            </TabsTrigger>
            <TabsTrigger value="rejected" className="gap-1">
              <XCircle className="w-3 h-3" />
              Declined
            </TabsTrigger>
          </TabsList>

          <div className="space-y-3">
            {filteredRequests.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No {filter === "all" ? "" : filter} requests</p>
              </div>
            ) : (
              filteredRequests.map((request) => (
                <JoinRequestCard
                  key={request.id}
                  request={request}
                  onApprove={handleApprove}
                  onReject={handleReject}
                />
              ))
            )}
          </div>
        </Tabs>
      </CardContent>
    </Card>
  );
};
