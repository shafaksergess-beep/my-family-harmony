import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { AlertTriangle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

const DAY = 86_400_000;

export function FamilyLifecycleBanner({ familyId, familySlug }: { familyId: string; familySlug?: string }) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [state, setState] = useState<{ deadline: string | null; suspended: string | null } | null>(null);

  useEffect(() => {
    supabase.from("families").select("member_deadline_at, suspended_at").eq("id", familyId).maybeSingle()
      .then(({ data }) => data && setState({ deadline: data.member_deadline_at, suspended: data.suspended_at }));
  }, [familyId]);

  if (!state || (!state.deadline && !state.suspended)) return null;
  const suspended = !!state.suspended;
  const end = suspended ? new Date(state.suspended!).getTime() + 30 * DAY : new Date(state.deadline!).getTime();
  const days = Math.max(0, Math.ceil((end - Date.now()) / DAY));

  return (
    <Alert variant={suspended ? "destructive" : "default"} className="mb-4">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle>{t(suspended ? "familyLifecycle.suspendedTitle" : "familyLifecycle.deadlineTitle")}</AlertTitle>
      <AlertDescription className="space-y-2">
        <p>{t(suspended ? "familyLifecycle.suspendedBody" : "familyLifecycle.deadlineBody", { days })}</p>
        <Button size="sm" onClick={() => navigate(`/family/${familySlug}/invitations`)}>{t("familyLifecycle.invite")}</Button>
      </AlertDescription>
    </Alert>
  );
}
