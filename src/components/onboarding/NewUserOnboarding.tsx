import { useState } from "react";
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
import {
  Users, Calendar, DollarSign, Shield, Heart, Wallet,
  CheckCircle, Sparkles, ArrowRight, ArrowLeft,
} from "lucide-react";

interface NewUserOnboardingProps {
  open: boolean;
  onComplete: () => void;
  userName?: string;
}

const STEPS = [
  {
    title: "Welcome to Family Together! 🎉",
    description: "We're glad you're here. Family Together helps you manage family meetings, contributions, loans, and assistance — all in one place.",
    icon: Sparkles,
  },
  {
    title: "Family Meetings",
    description: "Schedule meetings, track attendance, record minutes, and manage agendas. Never miss an important family gathering.",
    icon: Calendar,
  },
  {
    title: "Contributions & Savings",
    description: "Track monthly contributions, manage payment plans, and monitor savings growth for every member.",
    icon: DollarSign,
  },
  {
    title: "Loans & Financial Support",
    description: "Apply for loans, track repayments, and manage interest calculations with full transparency.",
    icon: Wallet,
  },
  {
    title: "Assistance & Events",
    description: "Coordinate support for births, weddings, sickness, and other family events with automated contribution tracking.",
    icon: Heart,
  },
  {
    title: "You're Ready!",
    description: "Start by joining a family or wait for an invitation from your family administrator. You can access all features from your dashboard.",
    icon: CheckCircle,
  },
];

export function NewUserOnboarding({ open, onComplete, userName }: NewUserOnboardingProps) {
  const [currentStep, setCurrentStep] = useState(0);

  const step = STEPS[currentStep];
  const isLastStep = currentStep === STEPS.length - 1;
  const isFirstStep = currentStep === 0;
  const progress = ((currentStep + 1) / STEPS.length) * 100;
  const Icon = step.icon;

  // Personalise welcome step
  const title = isFirstStep && userName
    ? `Welcome, ${userName}! 🎉`
    : step.title;

  return (
    <Dialog open={open} onOpenChange={() => onComplete()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 rounded-xl bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle className="text-lg">{title}</DialogTitle>
          </div>
          <DialogDescription className="text-sm leading-relaxed">
            {step.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Step {currentStep + 1} of {STEPS.length}</span>
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
            Back
          </Button>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={onComplete}>
              Skip
            </Button>
            <Button
              onClick={() => isLastStep ? onComplete() : setCurrentStep(currentStep + 1)}
              size="sm"
            >
              {isLastStep ? "Get Started" : "Next"}
              {!isLastStep && <ArrowRight className="w-4 h-4 ml-1" />}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
