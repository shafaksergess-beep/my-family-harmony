import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Users, Calendar, DollarSign, FileText, CheckCircle } from 'lucide-react';

interface OnboardingStep {
  title: string;
  description: string;
  icon: any;
  action?: string;
  path?: string;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    title: 'Welcome to Kinsroot',
    description: 'Manage your family meetings, contributions, loans, and assistance events all in one place.',
    icon: Users,
  },
  {
    title: 'Schedule Meetings',
    description: 'Set up monthly family meetings, track attendance, and manage hosting rotation.',
    icon: Calendar,
    action: 'View Meetings',
    path: '/meetings',
  },
  {
    title: 'Track Contributions',
    description: 'Record monthly contributions, manage payment plans, and monitor outstanding balances.',
    icon: DollarSign,
    action: 'View Contributions',
    path: '/contributions',
  },
  {
    title: 'Manage Loans',
    description: 'Process loan requests, track repayments, and monitor interest calculations.',
    icon: FileText,
    action: 'View Loans',
    path: '/loans',
  },
  {
    title: 'You\'re All Set!',
    description: 'You\'re ready to start using Kinsroot. Explore the dashboard to get started.',
    icon: CheckCircle,
  },
];

interface OnboardingTutorialProps {
  open: boolean;
  onComplete: () => void;
}

export function OnboardingTutorial({ open, onComplete }: OnboardingTutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const navigate = useNavigate();

  const step = ONBOARDING_STEPS[currentStep];
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;
  const progress = ((currentStep + 1) / ONBOARDING_STEPS.length) * 100;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleAction = () => {
    if (step.path) {
      onComplete();
      navigate(step.path);
    }
  };

  const Icon = step.icon;

  return (
    <Dialog open={open} onOpenChange={onComplete}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <DialogTitle>{step.title}</DialogTitle>
          </div>
          <DialogDescription>{step.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {currentStep + 1} of {ONBOARDING_STEPS.length}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>
        </div>

        <DialogFooter className="flex-row gap-2">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0}
            className="flex-1"
          >
            Previous
          </Button>
          {step.action ? (
            <Button onClick={handleAction} className="flex-1">
              {step.action}
            </Button>
          ) : null}
          <Button onClick={handleNext} className="flex-1">
            {isLastStep ? 'Get Started' : 'Next'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
