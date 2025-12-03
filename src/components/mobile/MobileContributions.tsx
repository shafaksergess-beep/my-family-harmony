import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { 
  MobileLayout, 
  PullToRefresh, 
  SkeletonCard, 
  OfflineIndicator 
} from "@/components/mobile";
import { MobileMoneyPayment } from "./MobileMoneyPayment";
import { ReceiptScanner } from "./ReceiptScanner";
import { ContributionCard } from "./ContributionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { 
  DollarSign, 
  Clock, 
  AlertTriangle,
  Camera,
  Smartphone
} from "lucide-react";
import { haptics } from "@/lib/haptics";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { usePullToRefresh } from "@/hooks/usePullToRefresh";

interface Contribution {
  id: string;
  amount: number;
  contribution_date: string;
  payment_date: string | null;
  status: string;
  type: string;
  late_fine: number | null;
  notes: string | null;
  member_id: string;
  member_name?: string;
}

export function MobileContributions() {
  const { familySlug } = useParams();
  const { toast } = useToast();
  const { family, canManageFinances, isLoading: authLoading, userId } = useFamilyAuth(familySlug);
  const isOnline = useOnlineStatus();
  
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [myContributions, setMyContributions] = useState<Contribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("my");
  const [paymentSheetOpen, setPaymentSheetOpen] = useState(false);
  const [receiptSheetOpen, setReceiptSheetOpen] = useState(false);
  const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);

  const fetchContributions = async () => {
    if (!family) return;
    
    try {
      // Get current user's member ID
      const { data: memberData } = await supabase
        .from("family_members")
        .select("id")
        .eq("family_id", family.id)
        .eq("user_id", userId)
        .single();

      if (memberData) {
        setCurrentMemberId(memberData.id);
      }

      // Fetch all contributions
      const { data: contributionsData, error } = await supabase
        .from("contributions")
        .select("*")
        .eq("family_id", family.id)
        .order("contribution_date", { ascending: false });

      if (error) throw error;

      // Fetch member details
      const memberIds = [...new Set(contributionsData?.map(c => c.member_id) || [])];
      const { data: membersData } = await supabase
        .from("family_members")
        .select("id, user_id")
        .in("id", memberIds);

      const userIds = membersData?.map(m => m.user_id) || [];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      // Map member names
      const memberIdToUserId = new Map(membersData?.map(m => [m.id, m.user_id]) || []);
      const userIdToProfile = new Map(profilesData?.map(p => [p.id, p]) || []);

      const enrichedContributions = contributionsData?.map(c => ({
        ...c,
        member_name: userIdToProfile.get(memberIdToUserId.get(c.member_id)!)?.full_name || "Unknown"
      })) || [];

      setContributions(enrichedContributions);
      
      // Filter my contributions
      if (memberData) {
        const mine = enrichedContributions.filter(c => c.member_id === memberData.id);
        setMyContributions(mine);
      }
    } catch (error: any) {
      console.error("Error fetching contributions:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to load contributions",
      });
    } finally {
      setLoading(false);
    }
  };

  const { isRefreshing, pullDistance, handlers } = usePullToRefresh({ 
    onRefresh: fetchContributions 
  });

  useEffect(() => {
    if (family && userId) {
      fetchContributions();
    }
  }, [family, userId]);

  const handlePayContribution = (contribution: Contribution) => {
    setSelectedContribution(contribution);
    setPaymentSheetOpen(true);
    haptics.medium();
  };

  const handleMarkAsPaid = async (contributionId: string) => {
    try {
      const { error } = await supabase
        .from("contributions")
        .update({
          status: "paid",
          payment_date: new Date().toISOString(),
        })
        .eq("id", contributionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Contribution marked as paid",
      });
      haptics.success();
      fetchContributions();
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
    }
  };

  const handleReceiptCaptured = async (imageData: string, file: File) => {
    toast({
      title: "Receipt Saved",
      description: "Your payment receipt has been attached",
    });
    setReceiptSheetOpen(false);
  };

  // Calculate stats
  const totalAmount = myContributions.reduce((sum, c) => sum + c.amount, 0);
  const paidAmount = myContributions.filter(c => c.status === "paid").reduce((sum, c) => sum + c.amount, 0);
  const pendingAmount = myContributions.filter(c => c.status === "pending").reduce((sum, c) => sum + c.amount, 0);
  const overdueCount = myContributions.filter(c => c.status === "overdue").length;

  if (authLoading || loading) {
    return (
      <MobileLayout title="Contributions" familySlug={familySlug}>
        <div className="space-y-4 p-4">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </MobileLayout>
    );
  }

  return (
    <MobileLayout title="Contributions" familySlug={familySlug}>
      <div {...handlers} className="relative">
        <PullToRefresh 
          pullDistance={pullDistance}
          isRefreshing={isRefreshing}
        />
        
        {!isOnline && <OfflineIndicator />}

        <div className="space-y-4 p-4 pb-24">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 gap-3">
            <Card className="bg-primary/5">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className="h-4 w-4 text-primary" />
                  <span className="text-xs text-muted-foreground">Total Paid</span>
                </div>
                <p className="text-lg font-bold text-primary">
                  {paidAmount.toLocaleString()} <span className="text-xs">FCFA</span>
                </p>
              </CardContent>
            </Card>

            <Card className="bg-yellow-500/10">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-yellow-500" />
                  <span className="text-xs text-muted-foreground">Pending</span>
                </div>
                <p className="text-lg font-bold text-yellow-600">
                  {pendingAmount.toLocaleString()} <span className="text-xs">FCFA</span>
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Overdue Alert */}
          {overdueCount > 0 && (
            <Card className="bg-destructive/10 border-destructive/30">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-destructive">
                      {overdueCount} overdue contribution{overdueCount > 1 ? "s" : ""}
                    </p>
                    <p className="text-xs text-destructive/70">
                      Please make payment to avoid additional fines
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => {
                setReceiptSheetOpen(true);
                haptics.light();
              }}
            >
              <Camera className="h-4 w-4 mr-2" />
              Scan Receipt
            </Button>
            {myContributions.some(c => c.status === "pending") && (
              <Button 
                className="flex-1"
                onClick={() => {
                  const pending = myContributions.find(c => c.status === "pending");
                  if (pending) handlePayContribution(pending);
                }}
              >
                <Smartphone className="h-4 w-4 mr-2" />
                Pay Now
              </Button>
            )}
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="my">My Contributions</TabsTrigger>
              {canManageFinances && (
                <TabsTrigger value="all">All Members</TabsTrigger>
              )}
            </TabsList>

            <TabsContent value="my" className="mt-4 space-y-3">
              {myContributions.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-muted-foreground">
                    <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No contributions recorded yet</p>
                  </CardContent>
                </Card>
              ) : (
                myContributions.map(contribution => (
                  <ContributionCard
                    key={contribution.id}
                    contribution={contribution}
                    onPay={() => handlePayContribution(contribution)}
                    canManage={canManageFinances}
                    onMarkPaid={() => handleMarkAsPaid(contribution.id)}
                  />
                ))
              )}
            </TabsContent>

            {canManageFinances && (
              <TabsContent value="all" className="mt-4 space-y-3">
                {contributions.length === 0 ? (
                  <Card>
                    <CardContent className="p-8 text-center text-muted-foreground">
                      <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No contributions recorded yet</p>
                    </CardContent>
                  </Card>
                ) : (
                  contributions.map(contribution => (
                    <ContributionCard
                      key={contribution.id}
                      contribution={contribution}
                      canManage={canManageFinances}
                      onMarkPaid={() => handleMarkAsPaid(contribution.id)}
                    />
                  ))
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>
      </div>

      {/* Payment Sheet */}
      <Sheet open={paymentSheetOpen} onOpenChange={setPaymentSheetOpen}>
        <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Make Payment</SheetTitle>
          </SheetHeader>
          <div className="mt-4 overflow-y-auto max-h-[calc(85vh-100px)]">
            {selectedContribution && (
              <MobileMoneyPayment
                amount={selectedContribution.amount + (selectedContribution.late_fine || 0)}
                reference={`CONTRIB-${selectedContribution.id.slice(0, 8).toUpperCase()}`}
                onPaymentInitiated={() => {
                  toast({
                    title: "Payment Initiated",
                    description: "Complete the payment on your phone",
                  });
                }}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Receipt Scanner Sheet */}
      <Sheet open={receiptSheetOpen} onOpenChange={setReceiptSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh] rounded-t-3xl">
          <SheetHeader>
            <SheetTitle>Capture Receipt</SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <ReceiptScanner
              onReceiptCaptured={handleReceiptCaptured}
              onClose={() => setReceiptSheetOpen(false)}
            />
          </div>
        </SheetContent>
      </Sheet>
    </MobileLayout>
  );
}
