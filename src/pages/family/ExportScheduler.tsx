import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ArrowLeft, Plus, Calendar, Mail, Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

interface ExportSchedule {
  id: string;
  name: string;
  frequency: string;
  report_type: string;
  recipients: string[];
  format: string;
  is_active: boolean;
  last_sent_at: string | null;
  next_send_at: string | null;
}

export default function ExportScheduler() {
  const { t } = useTranslation();
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { family, canManageFinances } = useFamilyAuth(familySlug);
  const { toast } = useToast();

  const [schedules, setSchedules] = useState<ExportSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: "",
    frequency: "weekly",
    report_type: "financial_summary",
    recipients: "",
    format: "csv",
    is_active: true,
  });

  useEffect(() => {
    if (family) {
      loadSchedules();
    }
  }, [family]);

  const loadSchedules = async () => {
    if (!family) return;

    try {
      const { data, error } = await supabase
        .from('export_schedules')
        .select('*')
        .eq('family_id', family.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSchedules(data || []);
    } catch (error: any) {
      toast({
        title: t("famExportScheduler.error"),
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSchedule = async () => {
    if (!family) return;

    if (!newSchedule.name || !newSchedule.recipients) {
      toast({
        title: t("famExportScheduler.missingInformation"),
        description: t("famExportScheduler.pleaseFillInAllRequired"),
        variant: "destructive",
      });
      return;
    }

    try {
      const recipients = newSchedule.recipients.split(',').map(email => email.trim()).filter(Boolean);

      const { error } = await supabase
        .from('export_schedules')
        .insert({
          family_id: family.id,
          created_by: (await supabase.auth.getUser()).data.user?.id,
          name: newSchedule.name,
          frequency: newSchedule.frequency,
          report_type: newSchedule.report_type,
          recipients,
          format: newSchedule.format,
          is_active: newSchedule.is_active,
        });

      if (error) throw error;

      toast({
        title: t("famExportScheduler.scheduleCreated"),
        description: t("famExportScheduler.exportScheduleHasBeenCreated"),
      });

      setIsDialogOpen(false);
      setNewSchedule({
        name: "",
        frequency: "weekly",
        report_type: "financial_summary",
        recipients: "",
        format: "csv",
        is_active: true,
      });
      loadSchedules();
    } catch (error: any) {
      toast({
        title: t("famExportScheduler.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (scheduleId: string, currentState: boolean) => {
    try {
      const { error } = await supabase
        .from('export_schedules')
        .update({ is_active: !currentState })
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: t("famExportScheduler.scheduleUpdated"),
        description: `Schedule ${!currentState ? 'enabled' : 'disabled'}`,
      });

      loadSchedules();
    } catch (error: any) {
      toast({
        title: t("famExportScheduler.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteSchedule = async (scheduleId: string) => {
    try {
      const { error } = await supabase
        .from('export_schedules')
        .delete()
        .eq('id', scheduleId);

      if (error) throw error;

      toast({
        title: t("famExportScheduler.scheduleDeleted"),
        description: t("famExportScheduler.exportScheduleHasBeenDeleted"),
      });

      loadSchedules();
    } catch (error: any) {
      toast({
        title: t("famExportScheduler.error"),
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!canManageFinances) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">{t("famExportScheduler.youDonTHavePermission")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">{t("famExportScheduler.loading")}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/family/${familySlug}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">{t("famExportScheduler.exportScheduler")}</h1>
            <p className="text-muted-foreground">{t("famExportScheduler.automateFinancialReportExportsVia")}</p>
          </div>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              {t("famExportScheduler.newSchedule")}
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t("famExportScheduler.createExportSchedule")}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>{t("famExportScheduler.scheduleName")}</Label>
                <Input
                  placeholder={t("famExportScheduler.weeklyFinancialSummary")}
                  value={newSchedule.name}
                  onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                />
              </div>

              <div>
                <Label>{t("famExportScheduler.frequency")}</Label>
                <Select
                  value={newSchedule.frequency}
                  onValueChange={(value) => setNewSchedule({ ...newSchedule, frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t("famExportScheduler.daily")}</SelectItem>
                    <SelectItem value="weekly">Weekly (Monday)</SelectItem>
                    <SelectItem value="monthly">Monthly (1st)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t("famExportScheduler.reportType")}</Label>
                <Select
                  value={newSchedule.report_type}
                  onValueChange={(value) => setNewSchedule({ ...newSchedule, report_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="contributions">{t("famExportScheduler.contributions")}</SelectItem>
                    <SelectItem value="loans">{t("famExportScheduler.loans")}</SelectItem>
                    <SelectItem value="savings">{t("famExportScheduler.savings")}</SelectItem>
                    <SelectItem value="attendance">{t("famExportScheduler.attendance")}</SelectItem>
                    <SelectItem value="financial_summary">{t("famExportScheduler.financialSummary")}</SelectItem>
                    <SelectItem value="all">{t("famExportScheduler.allReports")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>{t("famExportScheduler.format")}</Label>
                <Select
                  value={newSchedule.format}
                  onValueChange={(value) => setNewSchedule({ ...newSchedule, format: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="csv">CSV</SelectItem>
                    <SelectItem value="excel">{t("famExportScheduler.excel")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Recipients (comma-separated emails)</Label>
                <Input
                  placeholder="email1@example.com, email2@example.com"
                  value={newSchedule.recipients}
                  onChange={(e) => setNewSchedule({ ...newSchedule, recipients: e.target.value })}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label>{t("famExportScheduler.active")}</Label>
                <Switch
                  checked={newSchedule.is_active}
                  onCheckedChange={(checked) => setNewSchedule({ ...newSchedule, is_active: checked })}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  {t("famExportScheduler.cancel")}
                </Button>
                <Button onClick={handleCreateSchedule}>
                  {t("famExportScheduler.createSchedule")}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {schedules.length === 0 ? (
          <Card>
            <CardContent className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">{t("famExportScheduler.noSchedulesYet")}</h3>
              <p className="text-muted-foreground mb-6">
                {t("famExportScheduler.createYourFirstExportSchedule")}
              </p>
            </CardContent>
          </Card>
        ) : (
          schedules.map((schedule) => (
            <Card key={schedule.id}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded">
                      <Download className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle>{schedule.name}</CardTitle>
                      <CardDescription>
                        {schedule.frequency.charAt(0).toUpperCase() + schedule.frequency.slice(1)} • {' '}
                        {schedule.report_type.replace('_', ' ').toUpperCase()} • {' '}
                        {schedule.format.toUpperCase()}
                      </CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={schedule.is_active ? "default" : "secondary"}>
                      {schedule.is_active ? "Active" : "Disabled"}
                    </Badge>
                    <Switch
                      checked={schedule.is_active}
                      onCheckedChange={() => handleToggleActive(schedule.id, schedule.is_active)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-muted-foreground">{t("famExportScheduler.recipients")}</span>
                    <span>{schedule.recipients.join(', ')}</span>
                  </div>
                  {schedule.last_sent_at && (
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">{t("famExportScheduler.lastSent")}</span>
                      <span>{format(new Date(schedule.last_sent_at), 'PPp')}</span>
                    </div>
                  )}
                  <div className="flex justify-end gap-2 pt-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteSchedule(schedule.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("famExportScheduler.delete")}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
