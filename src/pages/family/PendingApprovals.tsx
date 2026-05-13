import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { ArrowLeft, Check, X, Loader2, Inbox, UserPlus, PiggyBank } from "lucide-react";
import { format } from "date-fns";
import SEO from "@/components/SEO";
import { EmptyState } from "@/components/EmptyState";

interface JoinReq {
  id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  created_at: string;
}

interface PendingSaving {
  id: string;
  amount: number;
  month: string;
  notes: string | null;
  created_at: string;
  member_id: string;
  family_members: { profiles: { full_name: string } | null } | null;
}

export default function PendingApprovals() {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, canManageMembers, canManageFinances, isLoading: authLoading } =
    useFamilyAuth(familySlug);
  const [joinReqs, setJoinReqs] = useState<JoinReq[]>([]);
  const [pendingSavings, setPendingSavings] = useState<PendingSaving[]>([]);
  const [loading, setLoading] = useState(true);
  const [actingOn, setActingOn] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!family) return;
    setLoading(true);
    const [{ data: jr }, { data: sav }] = await Promise.all([
      supabase
        .from("join_requests")
        .select("id,full_name,email,phone,message,created_at")
        .eq("family_id", family.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase
        .from("savings")
        .select("id,amount,month,notes,created_at,member_id,family_members(profiles(full_name))")
        .eq("family_id", family.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false }),
    ]);
    setJoinReqs((jr as JoinReq[]) || []);
    setPendingSavings((sav as unknown as PendingSaving[]) || []);
    setLoading(false);
  }, [family]);

  useEffect(() => {
    if (family) load();
  }, [family, load]);

  const reviewJoin = async (id: string, approve: boolean) => {
    setActingOn(id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("join_requests")
      .update({
        status: approve ? "approved" : "rejected",
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", id);
    setActingOn(null);
    if (error) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: approve ? "Request approved" : "Request rejected" });
    load();
  };

  const reviewSaving = async (id: string, approve: boolean) => {
    setActingOn(id);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("savings")
      .update({
        status: approve ? "approved" : "rejected",
        approved_by: user?.id,
        approved_at: new Date().toISOString(),
      })
      .eq("id", id);
    setActingOn(null);
    if (error) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: approve ? "Saving approved" : "Saving rejected" });
    load();
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const showJoins = canManageMembers;
  const showSavings = canManageFinances;
  const total = (showJoins ? joinReqs.length : 0) + (showSavings ? pendingSavings.length : 0);

  return (
    <>
      <SEO title="Pending approvals" description="Review and act on pending join requests and financial approvals for your family." />
      <div className="min-h-screen bg-background">
        <header className="border-b border-border bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center gap-3">
            <Button variant="ghost" onClick={() => navigate(`/family/${familySlug}`)}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Inbox className="w-6 h-6" /> Pending Approvals
              </h1>
              <p className="text-sm text-muted-foreground">
                {total} item{total === 1 ? "" : "s"} awaiting your review.
              </p>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-6 space-y-6">
          {total === 0 && (
            <EmptyState
              icon={Inbox}
              title="All caught up"
              description="No join requests or financial approvals are pending."
            />
          )}

          {showJoins && joinReqs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <UserPlus className="w-5 h-5" /> Join requests
                  <Badge variant="secondary">{joinReqs.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {joinReqs.map((r) => (
                  <div key={r.id} className="flex items-start justify-between gap-3 p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">{r.full_name}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.email || r.phone || "No contact"} · {format(new Date(r.created_at), "PP")}
                      </p>
                      {r.message && <p className="text-sm mt-1 text-muted-foreground">{r.message}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reviewJoin(r.id, false)}
                        disabled={actingOn === r.id}
                      >
                        <X className="w-4 h-4 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => reviewJoin(r.id, true)}
                        disabled={actingOn === r.id}
                      >
                        <Check className="w-4 h-4 mr-1" /> Approve
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <Link to={`/family/${familySlug}/invitations`} className="text-sm text-primary underline">
                    Manage all invitations →
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          {showSavings && pendingSavings.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <PiggyBank className="w-5 h-5" /> Savings approvals
                  <Badge variant="secondary">{pendingSavings.length}</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {pendingSavings.map((s) => (
                  <div key={s.id} className="flex items-start justify-between gap-3 p-3 border rounded-lg">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">
                        {s.family_members?.profiles?.full_name || "Member"} · {format(new Date(s.month), "MMM yyyy")}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Amount: {s.amount} · submitted {format(new Date(s.created_at), "PP")}
                      </p>
                      {s.notes && <p className="text-sm mt-1 text-muted-foreground">{s.notes}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => reviewSaving(s.id, false)}
                        disabled={actingOn === s.id}
                      >
                        <X className="w-4 h-4 mr-1" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => reviewSaving(s.id, true)}
                        disabled={actingOn === s.id}
                      >
                        <Check className="w-4 h-4 mr-1" /> Approve
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="pt-2">
                  <Link to={`/family/${familySlug}/savings`} className="text-sm text-primary underline">
                    Open savings module →
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </>
  );
}
