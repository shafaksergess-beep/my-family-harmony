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
