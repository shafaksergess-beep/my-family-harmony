import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, FileText, Download, Calendar } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { generateMonthlyReport } from "@/lib/pdfGenerator";

const PDFReports = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [family, setFamily] = useState<Record<string, unknown> | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));

  const loadData = useCallback(async () => {
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
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "Failed to load family data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [familySlug, navigate, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleGenerateReport = async () => {
    setGenerating(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const monthName = new Date(selectedMonth + '-01').toLocaleDateString('en-US', { month: 'long' });

      // Fetch contributions for the month
      const { data: contributions } = await supabase
        .from("contributions")
        .select(`
          *,
          family_members!inner (
            profiles!inner (full_name)
          )
        `)
        .eq("family_id", family?.id as string)
        .gte("contribution_date", `${selectedMonth}-01`)
        .lt("contribution_date", `${year}-${String(parseInt(month) + 1).padStart(2, '0')}-01`);

      // Fetch loans for the month
      const { data: loans } = await supabase
        .from("loans")
        .select(`
          *,
          family_members!inner (
            profiles!inner (full_name)
          )
        `)
        .eq("family_id", family?.id as string);

      // Fetch savings for the month
      const { data: savings } = await supabase
        .from("savings")
        .select(`
          *,
          family_members!inner (
            profiles!inner (full_name)
          )
        `)
        .eq("family_id", family?.id as string)
        .eq("month", `${selectedMonth}-01`);

      const totalContributions = contributions?.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0) || 0;
      const totalLoans = loans?.reduce((sum, l) => sum + parseFloat(l.amount.toString()), 0) || 0;
      const totalSavings = savings?.reduce((sum, s) => sum + parseFloat(s.amount.toString()), 0) || 0;
      const loansOutstanding = loans?.reduce((sum, l) => {
        const amount = parseFloat(l.amount.toString());
        const paid = parseFloat((l.amount_paid || 0).toString());
        return sum + (amount - paid);
      }, 0) || 0;

      const reportData = {
        familyName: family?.name as string,
        month: monthName,
        year: parseInt(year),
        totalContributions,
        totalLoans,
        totalSavings,
        loansOutstanding,
        contributions: contributions?.map(c => {
          const profiles = Array.isArray(c.family_members.profiles) 
            ? c.family_members.profiles[0] 
            : c.family_members.profiles;
          return {
            member: profiles.full_name,
            amount: parseFloat(c.amount.toString()),
            status: c.status,
            date: new Date(c.contribution_date).toLocaleDateString(),
          };
        }) || [],
        loans: loans?.map(l => {
          const profiles = Array.isArray(l.family_members.profiles) 
            ? l.family_members.profiles[0] 
            : l.family_members.profiles;
          return {
            member: profiles.full_name,
            amount: parseFloat(l.amount.toString()),
            status: l.status,
            outstanding: parseFloat(l.amount.toString()) - parseFloat((l.amount_paid || 0).toString()),
          };
        }) || [],
        savings: savings?.map(s => {
          const profiles = Array.isArray(s.family_members.profiles) 
            ? s.family_members.profiles[0] 
            : s.family_members.profiles;
          return {
            member: profiles.full_name,
            amount: parseFloat(s.amount.toString()),
          };
        }) || [],
      };

      generateMonthlyReport(reportData);

      toast({
        title: "Success",
        description: "Monthly report generated successfully",
      });
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: "Error",
        description: "Failed to generate report",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  // Generate list of last 12 months
  const generateMonthOptions = () => {
    const options = [];
    for (let i = 0; i < 12; i++) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      const value = date.toISOString().slice(0, 7);
      const label = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
      options.push({ value, label });
    }
    return options;
  };

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
                  <FileText className="w-6 h-6" />
                  PDF Reports
                </h1>
                <p className="text-sm text-muted-foreground">{family?.name as string}</p>
              </div>
            </div>
            <LanguageSwitcher />
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Generate Monthly Report</CardTitle>
            <CardDescription>
              Create a detailed PDF report with financial summaries and member data
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Month</label>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {generateMonthOptions().map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h3 className="font-semibold mb-2">Report Contents:</h3>
              <ul className="space-y-1 text-sm text-muted-foreground">
                <li>• Financial summary (contributions, loans, savings)</li>
                <li>• Detailed contribution records</li>
                <li>• Loan status and outstanding amounts</li>
                <li>• Member savings overview</li>
                <li>• Professional formatting and charts</li>
              </ul>
            </div>

            <Button 
              onClick={handleGenerateReport} 
              disabled={generating}
              className="w-full"
              size="lg"
            >
              {generating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Download className="w-4 h-4 mr-2" />
                  Generate PDF Report
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Automated Reports</CardTitle>
            <CardDescription>
              Schedule automatic monthly report generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Configure automatic monthly PDF reports to be generated and emailed to family heads and treasurers.
            </p>
            <Button variant="outline" onClick={() => navigate("/admin/email-reports")}>
              <Calendar className="w-4 h-4 mr-2" />
              Configure Automated Reports
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default PDFReports;
