import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { generateContributionReceipt, generateReceiptNumber } from '@/lib/receiptGenerator';
import { toast } from '@/hooks/use-toast';

interface ContributionReceiptButtonProps {
  contribution: {
    id: string;
    amount: number;
    contribution_date: string;
    payment_date: string | null;
    type: string;
    status: string;
    notes?: string | null;
    member_name?: string;
  };
  familyName: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
}

export function ContributionReceiptButton({ 
  contribution, 
  familyName,
  variant = 'ghost',
  size = 'icon'
}: ContributionReceiptButtonProps) {
  const handleDownload = () => {
    if (contribution.status !== 'paid') {
      toast({
        title: "Receipt Not Available",
        description: "Receipts are only available for paid contributions",
        variant: "destructive",
      });
      return;
    }

    try {
      generateContributionReceipt({
        receiptNumber: generateReceiptNumber(),
        familyName,
        memberName: contribution.member_name || 'Member',
        amount: contribution.amount,
        contributionDate: contribution.contribution_date,
        paymentDate: contribution.payment_date || new Date().toISOString(),
        type: contribution.type,
        notes: contribution.notes || undefined,
      });

      toast({
        title: "Receipt Downloaded",
        description: "Your contribution receipt has been generated",
      });
    } catch (error) {
      console.error('Error generating receipt:', error);
      toast({
        title: "Error",
        description: "Failed to generate receipt",
        variant: "destructive",
      });
    }
  };

  if (contribution.status !== 'paid') {
    return null;
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleDownload}
      title="Download Receipt"
    >
      <FileText className="h-4 w-4" />
      {size !== 'icon' && <span className="ml-2">Receipt</span>}
    </Button>
  );
}
