import { ResponsiveDialogFooter } from "@/components/ui/responsive-dialog";
import { ManagementTable, ManagementHeader } from "@/components/layout/ManagementMobile";
import i18n from "@/i18n/config";
import { useTranslation } from "react-i18next";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { ArrowLeft, Plus, CheckCircle2 } from "lucide-react";
import { ResponsiveDialog as Dialog, ResponsiveDialogContent as DialogContent, ResponsiveDialogHeader as DialogHeader, ResponsiveDialogTitle as DialogTitle, ResponsiveDialogTrigger as DialogTrigger } from "@/components/ui/responsive-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
import { assistanceEventSchema, type AssistanceEventInput } from "@/lib/validation";
import { LoanDeductionDialog } from "@/components/LoanDeductionDialog";

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
  hospitalization_days: number | null;
  visit_completed: boolean;
  visit_completed_at: string | null;
  family_members: {
    id: string;
    profiles: {
      full_name: string;
    };
  };
}

interface FamilyMember {
  id: string;
  profiles: {
    full_name: string;
  };
}

const EVENT_TYPES = {
  birth: { get label() { return i18n.t("famAssistance.birth"); }, amount: 5000, description: "5,000 FCFA per member" },
  member_death: { get label() { return i18n.t("famAssistance.memberDeath"); }, amount: 1000000, description: "1,000,000 FCFA total" },
  spouse_death: { get label() { return i18n.t("famAssistance.spouseDeath"); }, amount: 500000, description: "500,000 FCFA total" },
  child_death: { get label() { return i18n.t("famAssistance.childDeath"); }, amount: 500000, description: "500,000 FCFA total" },
  external_wonya: { get label() { return i18n.t("famAssistance.externalWonyaKotto"); }, amount: 150000, get description() { return i18n.t("famAssistance.upTo150000Fcfa"); } },
  external_other: { get label() { return i18n.t("famAssistance.externalOther"); }, amount: 100000, get description() { return i18n.t("famAssistance.upTo100000Fcfa"); } },
  sickness: { get label() { return i18n.t("famAssistance.sickness5Days"); }, amount: 50000, description: "50,000 FCFA" },
  wedding: { get label() { return i18n.t("famAssistance.wedding"); }, amount: 100000, description: "100,000 FCFA" },
  ceremony_invitation: { get label() { return i18n.t("famAssistance.otherCeremony"); }, amount: 2500, description: "2,500 FCFA per member" },
};

export default function FamilyAssistance() {
  const { t } = useTranslation();
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { family, canManageFinances, isLoading: authLoading } = useFamilyAuth(familySlug);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<AssistanceEvent[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    member_id: "",
    event_type: "",
    event_date: new Date().toISOString().split('T')[0],
    beneficiary_name: "",
    hospitalization_days: "",
    amount: "",
    contribution_per_member: "",
    notes: "",
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [selectedEventForPayout, setSelectedEventForPayout] = useState<string | null>(null);
  const [isLoanDeductionDialogOpen, setIsLoanDeductionDialogOpen] = useState(false);

  useEffect(() => {
    if (family?.id) {
      loadData();
    }
  }, [family?.id]);

  const loadData = async () => {
    if (!family) return;
    
    try {
      setLoading(true);

      // Fetch assistance events
      const { data: eventsData, error: eventsError } = await supabase
        .from("assistance_events")
        .select("*")
        .eq("family_id", family.id)
        .order("event_date", { ascending: false });

      if (eventsError) throw eventsError;

      // Fetch family members
      const memberIds = [...new Set(eventsData?.map(e => e.member_id) || [])];
      const { data: membersData, error: membersError } = await supabase
        .from("family_members")
        .select("id, user_id")
        .in("id", memberIds);

      if (membersError) throw membersError;

      // Fetch profiles
      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData, error: profilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      if (profilesError) throw profilesError;

      // Merge data
      const memberIdToUserId = new Map(membersData?.map(m => [m.id, m.user_id]) || []);
      const userIdToProfile = new Map(profilesData?.map(p => [p.id, p]) || []);

      const enrichedEvents = eventsData?.map(event => ({
        ...event,
        family_members: {
          id: event.member_id,
          profiles: userIdToProfile.get(memberIdToUserId.get(event.member_id)!) || { full_name: "Unknown" }
        }
      })) || [];

      setEvents(enrichedEvents as any);

      // Fetch all members for dropdown
      const { data: allMembersData, error: allMembersError } = await supabase
        .from("family_members")
        .select("id, user_id")
        .eq("family_id", family.id);

      if (allMembersError) throw allMembersError;

      const allUserIds = allMembersData?.map(m => m.user_id) || [];
      const { data: allProfilesData, error: allProfilesError } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", allUserIds);

      if (allProfilesError) throw allProfilesError;

      const allUserIdToProfile = new Map(allProfilesData?.map(p => [p.id, p]) || []);
      const allEnrichedMembers = allMembersData?.map(member => ({
        id: member.id,
        profiles: allUserIdToProfile.get(member.user_id) || { full_name: "Unknown" }
      })) || [];

      setMembers(allEnrichedMembers as any);
    } catch (error: any) {
      toast({ title: t("famAssistance.error"), description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleEventTypeChange = (eventType: string) => {
    const eventConfig = EVENT_TYPES[eventType as keyof typeof EVENT_TYPES];
    const requiresPerMemberContribution = ['birth', 'ceremony_invitation'].includes(eventType);
    setFormData({
      ...formData,
      event_type: eventType,
      amount: eventConfig.amount.toString(),
      contribution_per_member: requiresPerMemberContribution ? eventConfig.amount.toString() : "",
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!family) return;
    setValidationErrors({});
    
    // Sickness frequency validation: only once per year
    if (formData.event_type === 'sickness') {
      const currentYear = new Date().getFullYear();
      const { data: existingSickness, error: checkError } = await supabase
        .from("assistance_events")
        .select("id")
        .eq("family_id", family.id)
        .eq("member_id", formData.member_id)
        .eq("event_type", "sickness")
        .gte("event_date", `${currentYear}-01-01`)
        .lte("event_date", `${currentYear}-12-31`);

      if (checkError) {
        toast({ title: t("famAssistance.error"), description: checkError.message, variant: "destructive" });
        return;
      }

      if (existingSickness && existingSickness.length > 0) {
        toast({ 
          title: t("famAssistance.limitExceeded"), 
          description: t("famAssistance.memberCanOnlyReceiveSickness"),
          variant: "destructive" 
        });
        return;
      }
    }
    
    // Map event types to validation schema format
    const eventTypeMap: Record<string, string> = {
      birth: "birth",
      member_death: "death",
      spouse_death: "death",
      child_death: "death",
      external_wonya: "external_support",
      external_other: "external_support",
      sickness: "sickness",
      wedding: "joyful_event",
      ceremony_invitation: "joyful_event",
    };
    
    // Validate input
    const validationResult = assistanceEventSchema.safeParse({
      memberId: formData.member_id,
      eventType: eventTypeMap[formData.event_type] || formData.event_type,
      eventDate: formData.event_date,
      amount: parseFloat(formData.amount),
      beneficiaryName: formData.beneficiary_name || undefined,
      hospitalizationDays: formData.hospitalization_days ? parseInt(formData.hospitalization_days) : undefined,
      notes: formData.notes || undefined,
    });

    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.errors.forEach((err) => {
        const field = err.path[0] as string;
        errors[field] = err.message;
      });
      setValidationErrors(errors);
      toast({
        title: t("famAssistance.validationError"),
        description: t("famAssistance.pleaseCheckTheFormFor"),
        variant: "destructive",
      });
      return;
    }
    
    try {
      const { error } = await supabase.from("assistance_events").insert({
        family_id: family.id,
        member_id: validationResult.data.memberId,
        event_type: formData.event_type,
        event_date: validationResult.data.eventDate,
        amount: validationResult.data.amount,
        contribution_per_member: formData.contribution_per_member ? parseFloat(formData.contribution_per_member) : null,
        beneficiary_name: validationResult.data.beneficiaryName || null,
        hospitalization_days: validationResult.data.hospitalizationDays || null,
        notes: validationResult.data.notes || null,
      });

      if (error) throw error;

      toast({ title: t("famAssistance.success"), description: t("famAssistance.assistanceEventRecorded") });
      setIsDialogOpen(false);
      setFormData({
        member_id: "",
        event_type: "",
        event_date: new Date().toISOString().split('T')[0],
        beneficiary_name: "",
        hospitalization_days: "",
        amount: "",
        contribution_per_member: "",
        notes: "",
      });
      setValidationErrors({});
      loadData();
    } catch (error: any) {
      toast({ title: t("famAssistance.error"), description: error.message, variant: "destructive" });
    }
  };

  const handleMarkPaid = (eventId: string) => {
    setSelectedEventForPayout(eventId);
    setIsLoanDeductionDialogOpen(true);
  };

  const confirmPayout = async (deductionAmount: number, remainingPayout: number) => {
    if (!selectedEventForPayout) return;

    try {
      const event = events.find(e => e.id === selectedEventForPayout);
      if (!event) return;

      // Mark event as paid with actual amount after deduction
      const { error: payoutError } = await supabase
        .from("assistance_events")
        .update({
          is_paid: true,
          payment_date: new Date().toISOString(),
          notes: deductionAmount > 0 
            ? `${deductionAmount.toLocaleString()} FCFA deducted for loan repayment. Original amount: ${event.amount.toLocaleString()} FCFA. Net paid: ${Math.max(0, remainingPayout).toLocaleString()} FCFA`
            : event.notes,
        })
        .eq("id", selectedEventForPayout);

      if (payoutError) throw payoutError;

      // If there was a deduction, apply it to the member's loans
      if (deductionAmount > 0) {
        const { data: loans, error: loansError } = await supabase
          .from("loans")
          .select("*")
          .eq("member_id", event.family_members.id)
          .in("status", ["approved", "disbursed"])
          .order("created_at", { ascending: true });

        if (loansError) throw loansError;

        let remainingDeduction = deductionAmount;
        for (const loan of loans || []) {
          if (remainingDeduction <= 0) break;

          const totalInterest = (loan.amount * loan.interest_rate * loan.term_months) / 100;
          const totalOwed = loan.amount + totalInterest;
          const totalPaid = (loan.amount_paid || 0) + (loan.interest_paid || 0);
          const outstanding = totalOwed - totalPaid;

          const paymentAmount = Math.min(remainingDeduction, outstanding);
          
          // Apply payment (prioritize interest first, then principal)
          const interestRemaining = totalInterest - (loan.interest_paid || 0);
          const interestPayment = Math.min(paymentAmount, interestRemaining);
          const principalPayment = paymentAmount - interestPayment;

          const newInterestPaid = (loan.interest_paid || 0) + interestPayment;
          const newPrincipalPaid = (loan.amount_paid || 0) + principalPayment;
          const newTotalPaid = newPrincipalPaid + newInterestPaid;
          const isFullyPaid = newTotalPaid >= totalOwed;

          const { error: loanUpdateError } = await supabase
            .from("loans")
            .update({
              amount_paid: newPrincipalPaid,
              interest_paid: newInterestPaid,
              status: isFullyPaid ? "repaid" : loan.status,
              notes: `${loan.notes || ""}\n\nAuto-deduction from assistance payment: ${paymentAmount.toLocaleString()} FCFA (${interestPayment.toLocaleString()} interest + ${principalPayment.toLocaleString()} principal)`,
            })
            .eq("id", loan.id);

          if (loanUpdateError) throw loanUpdateError;

          remainingDeduction -= paymentAmount;
        }
      }

      toast({ 
        title: t("famAssistance.success"), 
        description: deductionAmount > 0 
          ? `Payment processed: ${Math.max(0, remainingPayout).toLocaleString()} FCFA paid, ${deductionAmount.toLocaleString()} FCFA applied to loans`
          : "Event marked as paid"
      });
      
      loadData();
      setSelectedEventForPayout(null);
    } catch (error: any) {
      toast({ title: t("famAssistance.error"), description: error.message, variant: "destructive" });
    }
  };

  const calculateStats = () => {
    const totalAmount = events.reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
    const pendingAmount = events.filter(e => !e.is_paid).reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);
    const paidAmount = events.filter(e => e.is_paid).reduce((sum, e) => sum + parseFloat(e.amount.toString()), 0);

    return { totalAmount, pendingAmount, paidAmount };
  };

  const stats = calculateStats();

  if (authLoading || loading) {
    return <div className="flex items-center justify-center min-h-screen">{t("famAssistance.loading")}</div>;
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <ManagementHeader className="flex items-center justify-between" title={t("famAssistance.assistanceEvents")} onCreate={canManageFinances ? () => setIsDialogOpen(true) : undefined} createLabel={t("famAssistance.recordEvent")} as="div">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate(`/family/${familySlug}`)}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <h1 className="text-3xl font-bold">{t("famAssistance.assistanceEvents")}</h1>
          </div>
          <LanguageSwitcher />
        </ManagementHeader>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">{t("famAssistance.totalAssistance")}</div>
            <div className="text-2xl font-bold">{stats.totalAmount.toLocaleString()} FCFA</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">{t("famAssistance.pending")}</div>
            <div className="text-2xl font-bold">{stats.pendingAmount.toLocaleString()} FCFA</div>
          </Card>
          <Card className="p-6">
            <div className="text-sm text-muted-foreground">{t("famAssistance.paid")}</div>
            <div className="text-2xl font-bold">{stats.paidAmount.toLocaleString()} FCFA</div>
          </Card>
        </div>

        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">{t("famAssistance.eventsHistory")}</h2>
          {canManageFinances && (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  {t("famAssistance.recordEvent")}
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{t("famAssistance.recordAssistanceEvent")}</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 responsive-dialog-form"><div className="responsive-dialog-fields space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="member">{t("famAssistance.member")}</Label>
                      <Select
                        value={formData.member_id}
                        onValueChange={(value) => {
                          setFormData({ ...formData, member_id: value });
                          setValidationErrors({ ...validationErrors, memberId: "" });
                        }}
                      >
                        <SelectTrigger className={validationErrors.memberId ? "border-red-500" : ""}>
                          <SelectValue placeholder={t("famAssistance.selectMember")} />
                        </SelectTrigger>
                        <SelectContent>
                          {members.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.profiles.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {validationErrors.memberId && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors.memberId}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="event_type">{t("famAssistance.eventType")}</Label>
                      <Select
                        value={formData.event_type}
                        onValueChange={(value) => {
                          handleEventTypeChange(value);
                          setValidationErrors({ ...validationErrors, eventType: "" });
                        }}
                      >
                        <SelectTrigger className={validationErrors.eventType ? "border-red-500" : ""}>
                          <SelectValue placeholder={t("famAssistance.selectEventType")} />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(EVENT_TYPES).map(([key, value]) => (
                            <SelectItem key={key} value={key}>
                              {value.label} - {value.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {validationErrors.eventType && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors.eventType}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="event_date">{t("famAssistance.eventDate")}</Label>
                      <Input
                        id="event_date"
                        type="date"
                        value={formData.event_date}
                        onChange={(e) => {
                          setFormData({ ...formData, event_date: e.target.value });
                          setValidationErrors({ ...validationErrors, eventDate: "" });
                        }}
                        className={validationErrors.eventDate ? "border-red-500" : ""}
                        required
                      />
                      {validationErrors.eventDate && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors.eventDate}</p>
                      )}
                    </div>
                    <div>
                      <Label htmlFor="amount">Total Amount (FCFA)</Label>
                      <Input
                        id="amount"
                        type="number"
                        min="0"
                        step="1000"
                        value={formData.amount}
                        onChange={(e) => {
                          setFormData({ ...formData, amount: e.target.value });
                          setValidationErrors({ ...validationErrors, amount: "" });
                        }}
                        className={validationErrors.amount ? "border-red-500" : ""}
                        required
                      />
                      {validationErrors.amount && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors.amount}</p>
                      )}
                    </div>
                  </div>
                  {formData.event_type === 'birth' && (
                    <div>
                      <Label htmlFor="contribution">Contribution Per Member (FCFA)</Label>
                      <Input
                        id="contribution"
                        type="number"
                        min="0"
                        step="1000"
                        value={formData.contribution_per_member}
                        onChange={(e) => setFormData({ ...formData, contribution_per_member: e.target.value })}
                      />
                    </div>
                  )}
                  {(formData.event_type.includes('death') || formData.event_type.includes('external')) && (
                    <div>
                      <Label htmlFor="beneficiary">Beneficiary Name (optional)</Label>
                      <Input
                        id="beneficiary"
                        value={formData.beneficiary_name}
                        onChange={(e) => {
                          setFormData({ ...formData, beneficiary_name: e.target.value });
                          setValidationErrors({ ...validationErrors, beneficiaryName: "" });
                        }}
                        maxLength={100}
                        className={validationErrors.beneficiaryName ? "border-red-500" : ""}
                      />
                      {validationErrors.beneficiaryName && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors.beneficiaryName}</p>
                      )}
                    </div>
                  )}
                  {formData.event_type === 'sickness' && (
                    <div>
                      <Label htmlFor="hospitalization">Hospitalization Days (min 5)</Label>
                      <Input
                        id="hospitalization"
                        type="number"
                        min="5"
                        value={formData.hospitalization_days}
                        onChange={(e) => {
                          setFormData({ ...formData, hospitalization_days: e.target.value });
                          setValidationErrors({ ...validationErrors, hospitalizationDays: "" });
                        }}
                        className={validationErrors.hospitalizationDays ? "border-red-500" : ""}
                      />
                      {validationErrors.hospitalizationDays && (
                        <p className="text-sm text-red-500 mt-1">{validationErrors.hospitalizationDays}</p>
                      )}
                    </div>
                  )}
                  <div>
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => {
                        setFormData({ ...formData, notes: e.target.value });
                        setValidationErrors({ ...validationErrors, notes: "" });
                      }}
                      maxLength={500}
                      className={validationErrors.notes ? "border-red-500" : ""}
                    />
                    {validationErrors.notes && (
                      <p className="text-sm text-red-500 mt-1">{validationErrors.notes}</p>
                    )}
                  </div>
                  </div><ResponsiveDialogFooter><Button type="submit" className="w-full">{t("famAssistance.recordEvent")}</Button></ResponsiveDialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <div className="overflow-x-auto">
            <ManagementTable className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-4">{t("famAssistance.date")}</th>
                  <th className="text-left p-4">{t("famAssistance.member")}</th>
                  <th className="text-left p-4">{t("famAssistance.eventType")}</th>
                  <th className="text-right p-4">{t("famAssistance.amount")}</th>
                  <th className="text-center p-4">{t("famAssistance.status")}</th>
                  <th className="text-center p-4">{t("famAssistance.actions")}</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-8 text-muted-foreground">
                      {t("famAssistance.noAssistanceEventsRecordedYet")}
                    </td>
                  </tr>
                ) : (
                  events.map((event) => {
                    const isDeathEvent = event.event_type.includes('death');
                    const wreathAmount = isDeathEvent ? 50000 : 0;
                    const beneficiaryAmount = isDeathEvent ? event.amount - wreathAmount : event.amount;
                    
                    const isBirthEvent = event.event_type === 'birth';
                    const birthDate = isBirthEvent ? new Date(event.event_date) : null;
                    const visitDeadline = birthDate ? new Date(birthDate.setMonth(birthDate.getMonth() + 6)) : null;
                    const daysUntilDeadline = visitDeadline ? Math.ceil((visitDeadline.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : null;
                    
                    return (
                      <tr key={event.id} className="border-b hover:bg-muted/50">
                        <td className="p-4">
                          {new Date(event.event_date).toLocaleDateString()}
                          {isBirthEvent && visitDeadline && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Visit by: {visitDeadline.toLocaleDateString()}
                              {daysUntilDeadline !== null && (
                                <Badge 
                                  variant={daysUntilDeadline < 0 ? "destructive" : daysUntilDeadline < 30 ? "default" : "secondary"}
                                  className="ml-2"
                                >
                                  {daysUntilDeadline < 0 ? "Overdue" : `${daysUntilDeadline}d left`}
                                </Badge>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="p-4">{event.family_members.profiles.full_name}</td>
                        <td className="p-4">
                          {EVENT_TYPES[event.event_type as keyof typeof EVENT_TYPES]?.label || event.event_type}
                        </td>
                        <td className="p-4 text-right font-mono">
                          {parseFloat(event.amount.toString()).toLocaleString()} FCFA
                          {isDeathEvent && (
                            <div className="text-xs text-muted-foreground mt-1">
                              Wreath: {wreathAmount.toLocaleString()} FCFA<br/>
                              Beneficiary: {beneficiaryAmount.toLocaleString()} FCFA
                            </div>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {event.is_paid ? (
                            <Badge variant="default">{t("famAssistance.paid")}</Badge>
                          ) : (
                            <Badge variant="secondary">{t("famAssistance.pending")}</Badge>
                          )}
                        </td>
                        <td className="p-4 text-center">
                          {!event.is_paid && canManageFinances && (
                            <Button
                              size="sm"
                              onClick={() => handleMarkPaid(event.id)}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              {t("famAssistance.markPaid")}
                            </Button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </ManagementTable>
          </div>
        </Card>

        {selectedEventForPayout && (
          <LoanDeductionDialog
            open={isLoanDeductionDialogOpen}
            onOpenChange={setIsLoanDeductionDialogOpen}
            memberId={events.find(e => e.id === selectedEventForPayout)?.family_members.id || ""}
            payoutAmount={events.find(e => e.id === selectedEventForPayout)?.amount || 0}
            payoutType="assistance"
            onConfirm={confirmPayout}
          />
        )}
      </div>
    </div>
  );
}

