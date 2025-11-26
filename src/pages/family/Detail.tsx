import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, BarChart3, Calendar, Users, DollarSign, CreditCard, PiggyBank, RefreshCw, Heart, Award, TrendingUp, Bell, FileText, Mail, Wallet, MessageSquare } from "lucide-react";
import FinancialWidget from "@/components/FinancialWidget";
import { notificationManager } from "@/lib/notifications";
import { useEffect } from "react";

const FamilyDetail = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { family, userRole, userId, isLoading } = useFamilyAuth(familySlug);

  useEffect(() => {
    const requestNotificationPermission = async () => {
      await notificationManager.requestPermission();
    };
    requestNotificationPermission();
  }, []);

  useEffect(() => {
    if (family && userRole && userId) {
      const cleanup = notificationManager.setupRealtimeListeners(
        family.id,
        userRole,
        userId
      );
      return cleanup;
    }
  }, [family, userRole, userId]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const modules = [
    {
      title: "Analytics Dashboard",
      description: "View financial KPIs and family statistics",
      icon: BarChart3,
      path: `/family/${familySlug}/analytics`,
      color: "text-blue-600",
    },
    {
      title: "Financial Analytics",
      description: "Detailed financial metrics and trends",
      icon: TrendingUp,
      path: `/family/${familySlug}/financial-analytics`,
      color: "text-green-600",
    },
    {
      title: "PDF Reports",
      description: "Generate and download financial reports",
      icon: FileText,
      path: `/family/${familySlug}/pdf-reports`,
      color: "text-red-600",
    },
    {
      title: "Notifications",
      description: "Role-based alerts and updates",
      icon: Bell,
      path: `/family/${familySlug}/notifications`,
      color: "text-violet-600",
    },
    {
      title: "Email Settings",
      description: "Configure email notifications",
      icon: Bell,
      path: `/family/${familySlug}/email-settings`,
      color: "text-indigo-600",
    },
    {
      title: "Audit Trail",
      description: "Track all changes and actions",
      icon: FileText,
      path: `/family/${familySlug}/audit-trail`,
      color: "text-slate-600",
    },
    {
      title: "Financial Reports",
      description: "View trends and charts over time",
      icon: BarChart3,
      path: `/family/${familySlug}/reports`,
      color: "text-indigo-600",
    },
    {
      title: "Meetings",
      description: "Schedule and track family meetings",
      icon: Calendar,
      path: `/family/${familySlug}/meetings`,
      color: "text-purple-600",
    },
    {
      title: "Members",
      description: "View and manage family members",
      icon: Users,
      path: `/family/${familySlug}/members`,
      color: "text-emerald-600",
    },
    {
      title: "Contributions",
      description: "Track monthly contributions and payments",
      icon: DollarSign,
      path: `/family/${familySlug}/contributions`,
      color: "text-orange-600",
    },
    {
      title: "Loans",
      description: "Manage loan requests and repayments",
      icon: CreditCard,
      path: `/family/${familySlug}/loans`,
      color: "text-red-600",
    },
    {
      title: "Savings",
      description: "Track individual member savings",
      icon: PiggyBank,
      path: `/family/${familySlug}/savings`,
      color: "text-cyan-600",
    },
    {
      title: "Njangi",
      description: "Manage rotating savings cycles",
      icon: RefreshCw,
      path: `/family/${familySlug}/njangi`,
      color: "text-indigo-600",
    },
    {
      title: "Assistance",
      description: "Track birth, death, and sickness events",
      icon: Heart,
      path: `/family/${familySlug}/assistance`,
      color: "text-pink-600",
    },
    {
      title: "Shares & Dividends",
      description: "Manage shares and dividend distributions",
      icon: Award,
      path: `/family/${familySlug}/shares`,
      color: "text-yellow-600",
    },
    {
      title: "Member Invitations",
      description: "Invite new members to join the family",
      icon: Mail,
      path: `/family/${familySlug}/invitations`,
      color: "text-blue-600",
    },
    {
      title: "Payment Management",
      description: "Track and verify member payments",
      icon: Wallet,
      path: `/family/${familySlug}/payments`,
      color: "text-teal-600",
    },
    {
      title: "Meeting Reminders",
      description: "Send automated meeting notifications",
      icon: MessageSquare,
      path: `/family/${familySlug}/meeting-reminders`,
      color: "text-purple-600",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate("/dashboard")}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{family?.name}</h1>
              <p className="text-sm text-muted-foreground">
                {family?.description || "Family management dashboard"}
                {userRole && ` • Your role: ${userRole.replace("_", " ").toUpperCase()}`}
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {family && <FinancialWidget familyId={family.id} />}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {modules.map((module, index) => (
            <Card 
              key={index} 
              className="hover:shadow-lg transition-all cursor-pointer"
              onClick={() => navigate(module.path)}
            >
              <CardHeader>
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg bg-muted ${module.color}`}>
                    <module.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{module.description}</CardDescription>
                <Button className="w-full mt-4" variant="outline">
                  Open Module
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </main>
    </div>
  );
};

export default FamilyDetail;
