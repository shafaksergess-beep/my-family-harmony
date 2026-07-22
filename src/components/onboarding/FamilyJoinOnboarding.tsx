import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Users, Calendar, DollarSign, Shield, Heart, Wallet,
  CheckCircle, PartyPopper, ArrowRight, ArrowLeft,
  FileText, ClipboardList,
} from "lucide-react";


interface RoleCapability {
  icon: any;
  label: string;
  description: string;
}

const ROLE_CAPABILITIES: Record<string, RoleCapability[]> = {
  family_head: [
    { icon: Shield, label: "Full Admin Access", description: "Manage all family settings, members, and finances" },
    { icon: Users, label: "Member Management", description: "Add, remove, and assign roles to family members" },
    { icon: Wallet, label: "Financial Oversight", description: "Approve loans, manage contributions, and view all reports" },
    { icon: Calendar, label: "Meeting Management", description: "Schedule meetings, manage agendas, and record attendance" },
  ],
  family_admin: [
    { icon: Shield, label: "Administrative Access", description: "Help manage family settings and members" },
    { icon: Users, label: "Member Management", description: "Add and manage family members" },
    { icon: Wallet, label: "Financial Management", description: "Manage contributions and financial records" },
    { icon: Calendar, label: "Meeting Coordination", description: "Help organize and manage meetings" },
  ],
  treasurer: [
    { icon: Wallet, label: "Financial Management", description: "Record contributions, manage payments, and track balances" },
    { icon: DollarSign, label: "Loan Processing", description: "Help process loan applications and track repayments" },
    { icon: FileText, label: "Financial Reports", description: "Generate and review financial reports and statements" },
    { icon: Calendar, label: "Meeting Participation", description: "Attend meetings and present financial updates" },
  ],
  secretary: [
    { icon: ClipboardList, label: "Meeting Minutes", description: "Record meeting minutes, decisions, and action items" },
    { icon: Calendar, label: "Meeting Scheduling", description: "Schedule meetings and manage agendas" },
    { icon: FileText, label: "Reports & Documents", description: "Manage family documents and reports" },
    { icon: Users, label: "Communication", description: "Help coordinate family communications" },
  ],
  loan_committee: [
    { icon: Wallet, label: "Loan Review", description: "Review and evaluate loan applications" },
    { icon: DollarSign, label: "Repayment Tracking", description: "Monitor loan repayments and outstanding balances" },
    { icon: FileText, label: "Credit Assessment", description: "Assess member creditworthiness for loans" },
    { icon: Calendar, label: "Meeting Participation", description: "Attend meetings and present loan updates" },
  ],
  member: [
    { icon: Calendar, label: "Meeting Attendance", description: "Attend family meetings and participate in discussions" },
    { icon: DollarSign, label: "Contributions", description: "Make monthly contributions and view your payment history" },
    { icon: Wallet, label: "Loan Access", description: "Apply for loans and track your repayments" },
    { icon: Heart, label: "Family Events", description: "Participate in assistance events and family celebrations" },
  ],
};

interface FamilyJoinOnboardingProps {
  open: boolean;
  onComplete: () => void;
  familyName: string;
  role: string;
  userName?: string;
}

export function FamilyJoinOnboarding({
  open,
  onComplete,
  familyName,
  role,
  userName,
}: FamilyJoinOnboardingProps) {
  const { t } = useTranslation();
  const [currentStep, setCurrentStep] = useState(0);

  const roleLabel = role.replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
  const capabilities = ROLE_CAPABILITIES[role] || ROLE_CAPABILITIES.member;

  const steps = [
    {
      title: t("joinFamilyOnboarding.roleWelcomeTitle", { family: familyName }),
      description: userName
        ? t("joinFamilyOnboarding.roleWelcomeDescNamed", { name: userName, family: familyName })
        : t("joinFamilyOnboarding.roleWelcomeDesc", { family: familyName }),
      icon: PartyPopper,
      content: (
        <div className="flex items-center justify-center py-4">
          <Badge className="text-sm px-4 py-2" variant="secondary">
            <Shield className="w-4 h-4 mr-2" />
            {t("joinFamilyOnboarding.yourRole", { role: roleLabel })}
          </Badge>
        </div>
      ),
    },
    {
      title: t("joinFamilyOnboarding.yourRole", { role: roleLabel }),
      description: t("joinFamilyOnboarding.roleCapabilitiesDesc"),
      icon: Shield,
      content: (
        <div className="space-y-3 py-2">
          {capabilities.map((cap, i) => {
            const CapIcon = cap.icon;
            return (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                  <CapIcon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium">{cap.label}</p>
                  <p className="text-xs text-muted-foreground">{cap.description}</p>
                </div>
              </div>
            );
          })}
        </div>
      ),
    },
    {
      title: t("joinFamilyOnboarding.allSet"),
      description: t("joinFamilyOnboarding.allSetDesc", { family: familyName }),
      icon: CheckCircle,
      content: (
        <div className="space-y-3 py-2">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Calendar className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{t("joinFamilyOnboarding.checkMeetings")}</p>
              <p className="text-xs text-muted-foreground">{t("joinFamilyOnboarding.checkMeetingsDesc")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <DollarSign className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{t("joinFamilyOnboarding.viewContributions")}</p>
              <p className="text-xs text-muted-foreground">{t("joinFamilyOnboarding.viewContributionsDesc")}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
            <Users className="w-5 h-5 text-primary" />
            <div>
              <p className="text-sm font-medium">{t("joinFamilyOnboarding.meetMembers")}</p>
              <p className="text-xs text-muted-foreground">{t("joinFamilyOnboarding.meetMembersDesc")}</p>
            </div>
          </div>
        </div>
      ),
    },
  ];

  const step = steps[currentStep];
  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;
  const progress = ((currentStep + 1) / steps.length) * 100;
  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={() => onComplete()}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-lg">{step.title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        {step.content}

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{t("joinFamilyOnboarding.stepOf", { current: currentStep + 1, total: steps.length })}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        <DialogFooter className="flex-row gap-2 sm:justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentStep(currentStep - 1)}
            disabled={isFirstStep}
            size="sm"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            {t("joinFamilyOnboarding.back")}
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onComplete}>
              {t("joinFamilyOnboarding.skip")}
            </Button>
            <Button
              onClick={() => isLastStep ? onComplete() : setCurrentStep(currentStep + 1)}
              size="sm"
            >
              {isLastStep ? t("joinFamilyOnboarding.letsGo") : t("joinFamilyOnboarding.next")}
              {!isLastStep && <ArrowRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

