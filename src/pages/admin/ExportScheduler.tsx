import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, Download, Calendar, Plus, Trash2 } from "lucide-react";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";

interface ExportSchedule {
  id: string;
  name: string;
  entity_type: string;
  frequency: string;
  time: string;
  day_of_week?: string;
  day_of_month?: string;
  enabled: boolean;
  recipients: string;
}

const ExportScheduler = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [schedules, setSchedules] = useState<ExportSchedule[]>([]);
  const [isAdding, setIsAdding] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    entity_type: 'activity_logs',
    frequency: 'weekly',
    time: '09:00',
    day_of_week: '1',
    day_of_month: '1',
    enabled: true,
    recipients: '',
  });

  useEffect(() => {
    checkAuthAndLoadSchedules();
  }, []);

  const checkAuthAndLoadSchedules = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: superAdminData } = await supabase
        .from("super_admins")
        .select("*")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (!superAdminData) {
        toast({
          title: "Access Denied",
          description: "You don't have permission to access this page",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }

      // Load schedules from localStorage for now
      const savedSchedules = localStorage.getItem('export-schedules');
      if (savedSchedules) {
        setSchedules(JSON.parse(savedSchedules));
      }
    } catch (error) {
      console.error("Auth check error:", error);
      navigate("/auth");
    } finally {
      setLoading(false);
    }
  };

  const handleAddSchedule = () => {
    const schedule: ExportSchedule = {
      id: Date.now().toString(),
      ...newSchedule,
    };

    const updated = [...schedules, schedule];
    setSchedules(updated);
    localStorage.setItem('export-schedules', JSON.stringify(updated));
    
    setIsAdding(false);
    setNewSchedule({
      name: '',
      entity_type: 'activity_logs',
      frequency: 'weekly',
      time: '09:00',
      day_of_week: '1',
      day_of_month: '1',
      enabled: true,
      recipients: '',
    });

    toast({
      title: "Success",
      description: "Export schedule created successfully",
    });
  };

  const handleDeleteSchedule = (id: string) => {
    const updated = schedules.filter(s => s.id !== id);
    setSchedules(updated);
    localStorage.setItem('export-schedules', JSON.stringify(updated));
    
    toast({
      title: "Success",
      description: "Export schedule deleted",
    });
  };

  const handleToggleSchedule = (id: string) => {
    const updated = schedules.map(s => 
      s.id === id ? { ...s, enabled: !s.enabled } : s
    );
    setSchedules(updated);
    localStorage.setItem('export-schedules', JSON.stringify(updated));
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
              <Button variant="ghost" onClick={() => navigate("/admin/dashboard")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t("common.back")}
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                  <Download className="w-6 h-6" />
                  Export Scheduler
                </h1>
                <p className="text-sm text-muted-foreground">Schedule automatic data exports</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Button onClick={() => setIsAdding(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Schedule
              </Button>
              <LanguageSwitcher />
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {isAdding && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>New Export Schedule</CardTitle>
              <CardDescription>Configure a new automatic export schedule</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Schedule Name</Label>
                <Input
                  placeholder="Weekly Activity Report"
                  value={newSchedule.name}
                  onChange={(e) => setNewSchedule({ ...newSchedule, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Data Type</Label>
                <Select
                  value={newSchedule.entity_type}
                  onValueChange={(entity_type) => setNewSchedule({ ...newSchedule, entity_type })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activity_logs">Activity Logs</SelectItem>
                    <SelectItem value="families">Families</SelectItem>
                    <SelectItem value="members">Members</SelectItem>
                    <SelectItem value="contributions">Contributions</SelectItem>
                    <SelectItem value="loans">Loans</SelectItem>
                    <SelectItem value="savings">Savings</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Frequency</Label>
                  <Select
                    value={newSchedule.frequency}
                    onValueChange={(frequency) => setNewSchedule({ ...newSchedule, frequency })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input
                    type="time"
                    value={newSchedule.time}
                    onChange={(e) => setNewSchedule({ ...newSchedule, time: e.target.value })}
                  />
                </div>
              </div>

              {newSchedule.frequency === 'weekly' && (
                <div className="space-y-2">
                  <Label>Day of Week</Label>
                  <Select
                    value={newSchedule.day_of_week}
                    onValueChange={(day_of_week) => setNewSchedule({ ...newSchedule, day_of_week })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Monday</SelectItem>
                      <SelectItem value="2">Tuesday</SelectItem>
                      <SelectItem value="3">Wednesday</SelectItem>
                      <SelectItem value="4">Thursday</SelectItem>
                      <SelectItem value="5">Friday</SelectItem>
                      <SelectItem value="6">Saturday</SelectItem>
                      <SelectItem value="0">Sunday</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {newSchedule.frequency === 'monthly' && (
                <div className="space-y-2">
                  <Label>Day of Month</Label>
                  <Input
                    type="number"
                    min="1"
                    max="28"
                    value={newSchedule.day_of_month}
                    onChange={(e) => setNewSchedule({ ...newSchedule, day_of_month: e.target.value })}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label>Email Recipients</Label>
                <Input
                  placeholder="admin@example.com, manager@example.com"
                  value={newSchedule.recipients}
                  onChange={(e) => setNewSchedule({ ...newSchedule, recipients: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">Comma-separated email addresses</p>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsAdding(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddSchedule} disabled={!newSchedule.name}>
                  Create Schedule
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="space-y-4">
          {schedules.length === 0 ? (
            <Card className="p-12 text-center">
              <Calendar className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2 text-foreground">No export schedules</h3>
              <p className="text-muted-foreground mb-4">Create your first automatic export schedule</p>
              <Button onClick={() => setIsAdding(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Schedule
              </Button>
            </Card>
          ) : (
            schedules.map((schedule) => (
              <Card key={schedule.id}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        {schedule.name}
                        {schedule.enabled ? (
                          <Badge variant="default">Active</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                      </CardTitle>
                      <CardDescription className="mt-1">
                        {schedule.entity_type} • {schedule.frequency} at {schedule.time}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={schedule.enabled}
                        onCheckedChange={() => handleToggleSchedule(schedule.id)}
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteSchedule(schedule.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                {schedule.recipients && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Recipients: {schedule.recipients}
                    </p>
                  </CardContent>
                )}
              </Card>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default ExportScheduler;
