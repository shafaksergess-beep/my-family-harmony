import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, DollarSign, CreditCard, PiggyBank, TrendingUp, UserPlus, CheckCircle, XCircle, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface TimelineEvent {
  date: string;
  type: 'joined' | 'contribution' | 'loan' | 'saving' | 'attendance';
  title: string;
  description: string;
  amount?: number;
  status?: string;
}

interface MemberActivityTimelineProps {
  joinedDate: string | null;
  contributions: any[];
  loans: any[];
  savings: any[];
  attendance: any[];
}

export const MemberActivityTimeline = ({ 
  joinedDate, 
  contributions, 
  loans, 
  savings, 
  attendance 
}: MemberActivityTimelineProps) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'XAF',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Build timeline events
  const events: TimelineEvent[] = [];

  // Add join event
  if (joinedDate) {
    events.push({
      date: joinedDate,
      type: 'joined',
      title: 'Joined Family',
      description: 'Became a member of the family',
    });
  }

  // Add contribution events (only paid ones for timeline)
  contributions.filter(c => c.status === 'paid').forEach(contribution => {
    events.push({
      date: contribution.payment_date || contribution.contribution_date,
      type: 'contribution',
      title: `${contribution.type.charAt(0).toUpperCase() + contribution.type.slice(1)} Contribution`,
      description: 'Payment received',
      amount: contribution.amount,
      status: contribution.status,
    });
  });

  // Add loan events
  loans.forEach(loan => {
    events.push({
      date: loan.created_at,
      type: 'loan',
      title: 'Loan Approved',
      description: `${loan.purpose} - ${loan.term_months} months term`,
      amount: loan.amount,
      status: loan.status,
    });
  });

  // Add savings events
  savings.forEach(saving => {
    events.push({
      date: saving.created_at,
      type: 'saving',
      title: 'Savings Deposit',
      description: new Date(saving.month).toLocaleDateString('en-US', { year: 'numeric', month: 'long' }),
      amount: saving.amount,
    });
  });

  // Add significant attendance events (absences and late arrivals)
  attendance.filter(a => a.status !== 'present' || a.fine_amount > 0).forEach((record: any) => {
    events.push({
      date: record.meetings?.meeting_date || record.created_at,
      type: 'attendance',
      title: record.status === 'present' ? 'Late Arrival' : record.status === 'absent' ? 'Missed Meeting' : 'Excused Absence',
      description: record.excuse_reason || record.meetings?.meeting_type || 'Meeting',
      amount: record.fine_amount,
      status: record.status,
    });
  });

  // Sort events by date (newest first)
  events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Take only last 20 events
  const recentEvents = events.slice(0, 20);

  const getEventIcon = (type: string, status?: string) => {
    switch (type) {
      case 'joined':
        return <UserPlus className="w-5 h-5 text-blue-500" />;
      case 'contribution':
        return <DollarSign className="w-5 h-5 text-green-500" />;
      case 'loan':
        return <CreditCard className="w-5 h-5 text-orange-500" />;
      case 'saving':
        return <PiggyBank className="w-5 h-5 text-purple-500" />;
      case 'attendance':
        return status === 'present' ? 
          <Clock className="w-5 h-5 text-yellow-500" /> : 
          status === 'absent' ?
          <XCircle className="w-5 h-5 text-red-500" /> :
          <CheckCircle className="w-5 h-5 text-gray-500" />;
      default:
        return <Calendar className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const getEventColor = (type: string) => {
    switch (type) {
      case 'joined':
        return 'border-blue-500';
      case 'contribution':
        return 'border-green-500';
      case 'loan':
        return 'border-orange-500';
      case 'saving':
        return 'border-purple-500';
      case 'attendance':
        return 'border-red-500';
      default:
        return 'border-muted';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5" />
          Activity Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recentEvents.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">No activity recorded yet</p>
        ) : (
          <div className="space-y-4">
            {recentEvents.map((event, index) => (
              <div key={index} className="flex gap-4">
                <div className="flex flex-col items-center">
                  <div className={`p-2 rounded-full bg-background border-2 ${getEventColor(event.type)}`}>
                    {getEventIcon(event.type, event.status)}
                  </div>
                  {index < recentEvents.length - 1 && (
                    <div className="w-0.5 h-full min-h-[40px] bg-border my-1" />
                  )}
                </div>
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-semibold text-sm">{event.title}</h4>
                      <p className="text-sm text-muted-foreground">{event.description}</p>
                      {event.amount !== undefined && (
                        <p className="text-sm font-medium mt-1">{formatCurrency(event.amount)}</p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-xs text-muted-foreground">
                        {new Date(event.date).toLocaleDateString()}
                      </p>
                      {event.status && (
                        <Badge variant={event.status === 'paid' || event.status === 'present' ? 'default' : 'secondary'} className="text-xs mt-1">
                          {event.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
