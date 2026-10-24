import { useTranslation } from 'react-i18next';
import { useDevice } from '@/hooks/useDevice';
import { ResponsiveDialog, ResponsiveDialogContent, ResponsiveDialogHeader, ResponsiveDialogTitle, ResponsiveDialogDescription } from '@/components/ui/responsive-dialog';
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Activity, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface HealthData {
  score: number;
  status: string;
  analysis: string;
  improvements: string[];
}

interface Props {
  familyId: string;
}

/**
 * AI-powered family health snapshot. Calls family-health-score edge function.
 * Visible to family leadership for at-a-glance retention insights.
 */
export const FamilyHealthWidget = ({ familyId }: Props) => {
  const { toast } = useToast();
  const { t } = useTranslation(); const { isMobile } = useDevice(); const [detailsOpen, setDetailsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<HealthData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: err } = await supabase.functions.invoke(
        "family-health-score",
        { body: { familyId } }
      );
      if (err) throw err;
      if (result?.error) throw new Error(result.error);
      setData(result as HealthData);
    } catch (e) {
      const msg = (e as Error).message || "Failed to load health score";
      setError(msg);
      toast({ title: "Could not load family health", description: msg, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (familyId) fetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId]);

  const tone =
    !data ? "secondary"
    : data.score >= 75 ? "default"
    : data.score >= 50 ? "secondary"
    : "destructive";

  if (isMobile) return <>
    <Card className="flex min-w-0 items-center gap-3 rounded-2xl p-4">
      <div className="relative h-16 w-16 shrink-0"><svg viewBox="0 0 64 64" className="h-16 w-16 -rotate-90" aria-label={t('phase2.familyHealth')}><circle cx="32" cy="32" r="27" fill="none" stroke="hsl(var(--muted))" strokeWidth="5" /><circle cx="32" cy="32" r="27" fill="none" stroke="hsl(var(--primary))" strokeWidth="5" pathLength="100" strokeDasharray={`${Math.max(0, Math.min(100, data?.score ?? 0))} 100`} /></svg><span className="absolute inset-0 flex items-center justify-center text-lg font-bold">{loading ? '…' : data?.score ?? '—'}</span></div>
      <div className="min-w-0 flex-1"><h2 className="text-sm font-semibold">{t('phase2.familyHealth')}</h2><p className="text-xs text-muted-foreground">{t(loading ? 'phase2.analyzing' : data ? 'phase2.healthSnapshot' : 'phase2.unavailable')}</p></div><Button variant="outline" size="sm" onClick={() => setDetailsOpen(true)}>{t('phase2.details')}</Button>
    </Card><ResponsiveDialog open={detailsOpen} onOpenChange={setDetailsOpen}><ResponsiveDialogContent><ResponsiveDialogHeader><ResponsiveDialogTitle>{t('phase2.familyHealth')}</ResponsiveDialogTitle><ResponsiveDialogDescription>{t('phase2.healthSnapshot')}</ResponsiveDialogDescription></ResponsiveDialogHeader><div className="space-y-4 py-4"><p className="text-sm">{data?.analysis || t('phase2.unavailable')}</p>{data?.improvements?.map((tip, i) => <p key={i} className="text-sm text-muted-foreground">{tip}</p>)}<Button variant="outline" onClick={fetch} disabled={loading}><RefreshCw className="h-4 w-4" />{t('phase2.refresh')}</Button></div></ResponsiveDialogContent></ResponsiveDialog></>;

  return (
    <Card className="border-primary/20">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <CardTitle className="text-base">Family Health</CardTitle>
        </div>
        <Button size="sm" variant="ghost" onClick={fetch} disabled={loading} aria-label="Refresh">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && !data ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="w-4 h-4 animate-pulse" />
            Analyzing your family activity…
          </div>
        ) : error && !data ? (
          <p className="text-sm text-muted-foreground">{error}</p>
        ) : data ? (
          <>
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-4xl font-bold text-foreground">{data.score}<span className="text-base text-muted-foreground">/100</span></div>
                <Badge variant={tone as "default" | "secondary" | "destructive"} className="mt-1">{data.status}</Badge>
              </div>
            </div>
            <Progress value={data.score} aria-label="Family health score" />
            <p className="text-sm text-muted-foreground leading-relaxed">{data.analysis}</p>
            {data.improvements?.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">Suggestions</p>
                <ul className="space-y-1.5 text-sm">
                  {data.improvements.map((tip, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{tip}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : null}
      </CardContent>
    </Card>
  );
};

export default FamilyHealthWidget;
