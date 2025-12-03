import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Wallet, DollarSign, TrendingUp, Calendar, Home } from "lucide-react";

interface FamilyStats {
  totalMembers: number;
  workingMembers: number;
  totalHouses: number;
  totalContributions: number;
  totalLoansActive: number;
  totalSavings: number;
  nextMeetingDate?: string;
}

interface FamilyStatsCardProps {
  stats: FamilyStats;
  familyName: string;
}

export function FamilyStatsCard({ stats, familyName }: FamilyStatsCardProps) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          {familyName} Statistics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Users className="h-5 w-5 mx-auto text-blue-600 mb-1" />
            <div className="text-xl font-bold">{stats.totalMembers}</div>
            <div className="text-xs text-muted-foreground">Members</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Wallet className="h-5 w-5 mx-auto text-green-600 mb-1" />
            <div className="text-xl font-bold">{stats.workingMembers}</div>
            <div className="text-xs text-muted-foreground">Working</div>
          </div>
          <div className="text-center p-3 bg-muted/50 rounded-lg">
            <Home className="h-5 w-5 mx-auto text-orange-600 mb-1" />
            <div className="text-xl font-bold">{stats.totalHouses}</div>
            <div className="text-xs text-muted-foreground">Houses</div>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-green-600" />
              <span className="text-sm">Total Contributions</span>
            </div>
            <span className="font-bold text-green-600">
              {stats.totalContributions.toLocaleString()} FCFA
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
            <div className="flex items-center gap-2">
              <Wallet className="h-4 w-4 text-blue-600" />
              <span className="text-sm">Total Savings</span>
            </div>
            <span className="font-bold text-blue-600">
              {stats.totalSavings.toLocaleString()} FCFA
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-orange-500/10 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-orange-600" />
              <span className="text-sm">Active Loans</span>
            </div>
            <span className="font-bold text-orange-600">
              {stats.totalLoansActive.toLocaleString()} FCFA
            </span>
          </div>
        </div>

        {stats.nextMeetingDate && (
          <div className="flex items-center gap-2 p-3 bg-primary/10 rounded-lg">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm">Next Meeting:</span>
            <span className="font-medium text-primary">{stats.nextMeetingDate}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
