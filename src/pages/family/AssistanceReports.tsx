import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { ArrowLeft, Download, FileText } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";

interface AssistanceEvent {
  id: string;
  event_type: string;
  event_date: string;
  amount: number;
  contribution_per_member: number | null;
  is_paid: boolean;
  payment_date: string | null;
  notes: string | null;
  beneficiary_name: string | null;
  family_members: {
    profiles: {
      full_name: string;
    };
  };
}

const EVENT_TYPE_LABELS: Record<string, string> = {
  birth: "Birth",
  member_death: "Member Death",
  spouse_death: "Spouse Death",
  child_death: "Child Death",
  external_wonya: "External Wonya Kotto",
  external_other: "External Other",
  sickness: "Sickness",
  wedding: "Wedding",
  ceremony_invitation: "Other Ceremony",
};

export default function AssistanceReports() {
  const { t } = useTranslation();
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, canManageFinances, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AssistanceEvent[]>([]);
  const [filteredEvents, setFilteredEvents] = useState<AssistanceEvent[]>([]);
  const [filters, setFilters] = useState({
    eventType: "all",
    paymentStatus: "all",
    startDate: "",
    endDate: "",
    memberId: "all",
  });
  const [members, setMembers] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (family?.id) {
      loadData();
    }
  }, [family?.id]);

  useEffect(() => {
    applyFilters();
  }, [filters, events]);

  const loadData = async () => {
    if (!family) return;

    try {
      setLoading(true);

      // Fetch assistance events with member details
      const { data: eventsData, error: eventsError } = await supabase
        .from("assistance_events")
        .select(`
          *,
          family_members!inner(
            id,
            profiles!inner(full_name)
          )
        `)
        .eq("family_id", family.id)
        .order("event_date", { ascending: false });

      if (eventsError) throw eventsError;

      setEvents(eventsData as any);

      // Get unique members for filter dropdown
      const uniqueMembers = Array.from(
        new Set(
          eventsData?.map((e: any) => JSON.stringify({
            id: e.family_members.id,
            name: e.family_members.profiles.full_name
          }))
        )
      ).map(str => JSON.parse(str));

      setMembers(uniqueMembers);
    } catch (error: any) {
      toast({ title: t("famAssistanceReports.error"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...events];

    if (filters.eventType !== "all") {
      filtered = filtered.filter(e => e.event_type === filters.eventType);
    }

    if (filters.paymentStatus !== "all") {
      filtered = filtered.filter(e => 
        filters.paymentStatus === "paid" ? e.is_paid : !e.is_paid
      );
    }

    if (filters.startDate) {
      filtered = filtered.filter(e => e.event_date >= filters.startDate);
    }

    if (filters.endDate) {
      filtered = filtered.filter(e => e.event_date <= filters.endDate);
    }

    if (filters.memberId !== "all") {
      filtered = filtered.filter(e => (e.family_members as any).id === filters.memberId);
    }

    setFilteredEvents(filtered);
  };

  const calculateSummary = () => {
    const total = filteredEvents.reduce((sum, e) => sum + e.amount, 0);
    const paid = filteredEvents.filter(e => e.is_paid).reduce((sum, e) => sum + e.amount, 0);
    const pending = filteredEvents.filter(e => !e.is_paid).reduce((sum, e) => sum + e.amount, 0);

    return { total, paid, pending };
  };

  const exportToCSV = () => {
    const headers = ["Date", "Member", "Event Type", "Beneficiary", "Amount (FCFA)", "Status", "Payment Date", "Notes"];
    const rows = filteredEvents.map(event => [
      event.event_date,
      event.family_members.profiles.full_name,
      EVENT_TYPE_LABELS[event.event_type] || event.event_type,
      event.beneficiary_name || "-",
      event.amount.toString(),
      event.is_paid ? "Paid" : "Pending",
      event.payment_date || "-",
      (event.notes || "-").replace(/\n/g, " "),
    ]);

    const csv = [headers, ...rows].map(row => row.map(cell => `"${cell}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `assistance-report-${family?.slug}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    toast({ title: t("famAssistanceReports.success"), description: t("famAssistanceReports.reportExportedToCsv") });
  };

  const summary = calculateSummary();

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">{t("famAssistanceReports.loading")}</div>;
  }

  if (!canManageFinances) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto">
          <Card className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">{t("famAssistanceReports.accessDenied")}</h2>
            <p className="text-muted-foreground mb-6">
              {t("famAssistanceReports.onlyAuthorizedMembersCanView")}
            </p>
            <Button onClick={() => navigate(`/family/${familySlug}`)}>
              {t("famAssistanceReports.backToDashboard")}
            </Button>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/family/${familySlug}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{t("famAssistanceReports.assistancePayoutReports")}</h1>
              <p className="text-muted-foreground">{t("famAssistanceReports.detailedAssistanceEventReportsAnd")}</p>
            </div>
          </div>
          <LanguageSwitcher />
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">{t("famAssistanceReports.totalAssistance")}</div>
            <div className="text-2xl font-bold">{summary.total.toLocaleString()} FCFA</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">{t("famAssistanceReports.paidOut")}</div>
            <div className="text-2xl font-bold text-green-600">{summary.paid.toLocaleString()} FCFA</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">{t("famAssistanceReports.pending")}</div>
            <div className="text-2xl font-bold text-amber-600">{summary.pending.toLocaleString()} FCFA</div>
          </Card>
        </div>

        {/* Filters */}
        <Card className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>{t("famAssistanceReports.eventType")}</Label>
              <Select value={filters.eventType} onValueChange={(value) => setFilters({ ...filters, eventType: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("famAssistanceReports.allTypes")}</SelectItem>
                  {Object.entries(EVENT_TYPE_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("famAssistanceReports.paymentStatus")}</Label>
              <Select value={filters.paymentStatus} onValueChange={(value) => setFilters({ ...filters, paymentStatus: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("famAssistanceReports.allStatus")}</SelectItem>
                  <SelectItem value="paid">{t("famAssistanceReports.paid")}</SelectItem>
                  <SelectItem value="pending">{t("famAssistanceReports.pending")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("famAssistanceReports.member")}</Label>
              <Select value={filters.memberId} onValueChange={(value) => setFilters({ ...filters, memberId: value })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("famAssistanceReports.allMembers")}</SelectItem>
                  {members.map(member => (
                    <SelectItem key={member.id} value={member.id}>{member.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>{t("famAssistanceReports.startDate")}</Label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label>{t("famAssistanceReports.endDate")}</Label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* Export Button */}
        <div className="flex justify-end">
          <Button onClick={exportToCSV} disabled={filteredEvents.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            {t("famAssistanceReports.exportToCsv")}
          </Button>
        </div>

        {/* Events Table */}
        <Card>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("famAssistanceReports.date")}</TableHead>
                  <TableHead>{t("famAssistanceReports.member")}</TableHead>
                  <TableHead>{t("famAssistanceReports.eventType")}</TableHead>
                  <TableHead>{t("famAssistanceReports.beneficiary")}</TableHead>
                  <TableHead className="text-right">{t("famAssistanceReports.amount")}</TableHead>
                  <TableHead>{t("famAssistanceReports.status")}</TableHead>
                  <TableHead>{t("famAssistanceReports.paymentDate")}</TableHead>
                  <TableHead>{t("famAssistanceReports.notes")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEvents.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                      {t("famAssistanceReports.noAssistanceEventsFound")}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEvents.map(event => (
                    <TableRow key={event.id}>
                      <TableCell>{new Date(event.event_date).toLocaleDateString()}</TableCell>
                      <TableCell className="font-medium">{event.family_members.profiles.full_name}</TableCell>
                      <TableCell>{EVENT_TYPE_LABELS[event.event_type] || event.event_type}</TableCell>
                      <TableCell>{event.beneficiary_name || "-"}</TableCell>
                      <TableCell className="text-right font-semibold">{event.amount.toLocaleString()} FCFA</TableCell>
                      <TableCell>
                        <Badge variant={event.is_paid ? "default" : "secondary"}>
                          {event.is_paid ? "Paid" : "Pending"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {event.payment_date ? new Date(event.payment_date).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{event.notes || "-"}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
