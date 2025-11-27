import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const familySchema = z.object({
  name: z.string().min(3, 'Family name must be at least 3 characters'),
  slug: z.string().min(3, 'Slug must be at least 3 characters').regex(/^[a-z0-9-]+$/, 'Slug must only contain lowercase letters, numbers, and hyphens'),
  description: z.string().optional(),
  primary_language: z.enum(['en', 'fr', 'bota']),
  meeting_frequency: z.enum(['monthly', 'quarterly', 'weekly']),
  meeting_day: z.string(),
  meeting_time: z.string(),
  mandatory_contribution: z.coerce.number().min(0),
  njangi_amount: z.coerce.number().min(0),
  loan_interest_rate: z.coerce.number().min(0).max(100),
  share_value: z.coerce.number().min(0),
});

type FamilyFormData = z.infer<typeof familySchema>;

interface FamilySetupWizardProps {
  open: boolean;
  onComplete: (familyId: string) => void;
  onClose: () => void;
}

export function FamilySetupWizard({ open, onComplete, onClose }: FamilySetupWizardProps) {
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const form = useForm<FamilyFormData>({
    resolver: zodResolver(familySchema),
    defaultValues: {
      name: '',
      slug: '',
      description: '',
      primary_language: 'en',
      meeting_frequency: 'monthly',
      meeting_day: 'last_saturday',
      meeting_time: '13:00',
      mandatory_contribution: 25000,
      njangi_amount: 25000,
      loan_interest_rate: 2.5,
      share_value: 50000,
    },
  });

  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;

  const handleNext = async () => {
    let fieldsToValidate: (keyof FamilyFormData)[] = [];
    
    if (step === 1) {
      fieldsToValidate = ['name', 'slug', 'description', 'primary_language'];
    } else if (step === 2) {
      fieldsToValidate = ['meeting_frequency', 'meeting_day', 'meeting_time'];
    }

    const isValid = await form.trigger(fieldsToValidate);
    if (isValid && step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handlePrevious = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const onSubmit = async (data: FamilyFormData) => {
    setIsSubmitting(true);
    try {
      const { data: family, error } = await supabase
        .from('families')
        .insert({
          name: data.name,
          slug: data.slug,
          description: data.description,
          primary_language: data.primary_language,
          meeting_frequency: data.meeting_frequency,
          meeting_day: data.meeting_day,
          meeting_time: data.meeting_time,
          mandatory_contribution: data.mandatory_contribution,
          njangi_amount: data.njangi_amount,
          loan_interest_rate: data.loan_interest_rate,
          share_value: data.share_value,
        })
        .select()
        .single();

      if (error) throw error;

      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not found');

      // Add creator as family head
      const { error: memberError } = await supabase
        .from('family_members')
        .insert({
          family_id: family.id,
          user_id: user.id,
          role: 'family_head',
        });

      if (memberError) throw memberError;

      toast.success('Family created successfully!');
      onComplete(family.id);
      navigate(`/family/${family.slug}`);
    } catch (error: any) {
      console.error('Error creating family:', error);
      toast.error(error.message || 'Failed to create family');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create Your Family</DialogTitle>
          <DialogDescription>
            Set up your family profile and default settings
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Step {step} of {totalSteps}</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {step === 1 && (
                <>
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Family Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Wonya Kotto Family" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="slug"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Family Slug</FormLabel>
                        <FormControl>
                          <Input placeholder="wonya-kotto" {...field} />
                        </FormControl>
                        <FormDescription>
                          Used in URLs. Only lowercase letters, numbers, and hyphens.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description (Optional)</FormLabel>
                        <FormControl>
                          <Textarea placeholder="About your family..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="primary_language"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Primary Language</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="en">English</SelectItem>
                            <SelectItem value="fr">French</SelectItem>
                            <SelectItem value="bota">Bota</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {step === 2 && (
                <>
                  <FormField
                    control={form.control}
                    name="meeting_frequency"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meeting Frequency</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                            <SelectItem value="quarterly">Quarterly</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="meeting_day"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meeting Day</FormLabel>
                        <FormControl>
                          <Input placeholder="last_saturday" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="meeting_time"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Meeting Time</FormLabel>
                        <FormControl>
                          <Input type="time" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              {step === 3 && (
                <>
                  <FormField
                    control={form.control}
                    name="mandatory_contribution"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mandatory Contribution (FCFA)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="njangi_amount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Njangi Amount (FCFA)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="loan_interest_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Loan Interest Rate (%)</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.1" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="share_value"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Share Value (FCFA)</FormLabel>
                        <FormControl>
                          <Input type="number" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}

              <div className="flex gap-2 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handlePrevious}
                  disabled={step === 1}
                  className="flex-1"
                >
                  Previous
                </Button>
                {step < totalSteps ? (
                  <Button type="button" onClick={handleNext} className="flex-1">
                    Next
                  </Button>
                ) : (
                  <Button type="submit" disabled={isSubmitting} className="flex-1">
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create Family
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
