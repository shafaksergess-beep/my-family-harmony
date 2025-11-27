import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft } from "lucide-react";
import FinancialWidget from "@/components/FinancialWidget";
import { notificationManager } from "@/lib/notifications";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as LucideIcons from "lucide-react";

interface ModuleCategory {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  order_index: number;
  icon: string | null;
  color: string | null;
}

interface Module {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  route_path: string;
  icon: string | null;
  color: string | null;
  category_id: string | null;
  order_index: number;
  is_active: boolean;
}

const FamilyDetail = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { family, userRole, userId, isLoading } = useFamilyAuth(familySlug);
  const [categories, setCategories] = useState<ModuleCategory[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);

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

  useEffect(() => {
    loadModulesAndCategories();
  }, []);

  const loadModulesAndCategories = async () => {
    try {
      setLoadingModules(true);
      
      const [categoriesRes, modulesRes] = await Promise.all([
        supabase.from("module_categories").select("*").order("order_index"),
        supabase.from("modules").select("*").eq("is_active", true).order("order_index"),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (modulesRes.error) throw modulesRes.error;

      setCategories(categoriesRes.data || []);
      setModules(modulesRes.data || []);
    } catch (error) {
      console.error("Error loading modules:", error);
    } finally {
      setLoadingModules(false);
    }
  };

  const getIconComponent = (iconName: string | null) => {
    if (!iconName) return LucideIcons.Circle;
    const Icon = (LucideIcons as any)[iconName];
    return Icon || LucideIcons.Circle;
  };

  if (isLoading || loadingModules) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const legacyModules = [
    {
      title: "Analytics Dashboard",
      description: "View financial KPIs and family statistics",
      icon: LucideIcons.BarChart3,
      path: `/family/${familySlug}/analytics`,
      color: "text-blue-600",
    },
    {
      title: "Financial Analytics",
      description: "Detailed financial metrics and trends",
      icon: LucideIcons.TrendingUp,
      path: `/family/${familySlug}/financial-analytics`,
      color: "text-green-600",
    },
    {
      title: "PDF Reports",
      description: "Generate and download financial reports",
      icon: LucideIcons.FileText,
      path: `/family/${familySlug}/pdf-reports`,
      color: "text-red-600",
    },
    {
      title: "Notifications",
      description: "Role-based alerts and updates",
      icon: LucideIcons.Bell,
      path: `/family/${familySlug}/notifications`,
      color: "text-violet-600",
    },
    {
      title: "Email Settings",
      description: "Configure email notifications",
      icon: LucideIcons.Bell,
      path: `/family/${familySlug}/email-settings`,
      color: "text-indigo-600",
    },
    {
      title: "Audit Trail",
      description: "Track all changes and actions",
      icon: LucideIcons.FileText,
      path: `/family/${familySlug}/audit-trail`,
      color: "text-slate-600",
    },
    {
      title: "Financial Reports",
      description: "View trends and charts over time",
      icon: LucideIcons.BarChart3,
      path: `/family/${familySlug}/reports`,
      color: "text-indigo-600",
    },
    {
      title: "Meetings",
      description: "Schedule and track family meetings",
      icon: LucideIcons.Calendar,
      path: `/family/${familySlug}/meetings`,
      color: "text-purple-600",
    },
    {
      title: "Balloting System",
      description: "Random assignment for hosting and njangi schedules",
      icon: LucideIcons.RefreshCw,
      path: `/family/${familySlug}/balloting`,
      color: "text-violet-600",
    },
    {
      title: "Attendance Analytics",
      description: "View attendance trends and member statistics",
      icon: LucideIcons.BarChart3,
      path: `/family/${familySlug}/attendance-analytics`,
      color: "text-cyan-600",
    },
    {
      title: "Meeting Analytics",
      description: "Track meeting frequency and participation trends",
      icon: LucideIcons.Calendar,
      path: `/family/${familySlug}/meeting-analytics`,
      color: "text-blue-600",
    },
    {
      title: "Meeting Templates",
      description: "Create reusable meeting agenda templates",
      icon: LucideIcons.FileText,
      path: `/family/${familySlug}/meeting-templates`,
      color: "text-purple-600",
    },
    {
      title: "Meeting Settings",
      description: "Configure meeting schedules and fine policies",
      icon: LucideIcons.Settings,
      path: `/family/${familySlug}/meeting-settings`,
      color: "text-gray-600",
    },
    {
      title: "Members",
      description: "View and manage family members",
      icon: LucideIcons.Users,
      path: `/family/${familySlug}/members`,
      color: "text-emerald-600",
    },
    {
      title: "Contributions",
      description: "Track monthly contributions and payments",
      icon: LucideIcons.DollarSign,
      path: `/family/${familySlug}/contributions`,
      color: "text-orange-600",
    },
    {
      title: "Loans",
      description: "Manage loan requests and repayments",
      icon: LucideIcons.CreditCard,
      path: `/family/${familySlug}/loans`,
      color: "text-red-600",
    },
    {
      title: "Loan Committee",
      description: "Review and approve loan requests",
      icon: LucideIcons.Users,
      path: `/family/${familySlug}/loan-committee`,
      color: "text-purple-600",
    },
    {
      title: "Loan Analytics",
      description: "Repayment rates and interest revenue tracking",
      icon: LucideIcons.TrendingUp,
      path: `/family/${familySlug}/loan-analytics`,
      color: "text-blue-600",
    },
    {
      title: "Loan History",
      description: "Complete loan transaction history and balances",
      icon: LucideIcons.FileText,
      path: `/family/${familySlug}/loan-history`,
      color: "text-slate-600",
    },
    {
      title: "Savings",
      description: "Track individual member savings",
      icon: LucideIcons.PiggyBank,
      path: `/family/${familySlug}/savings`,
      color: "text-cyan-600",
    },
    {
      title: "Njangi",
      description: "Manage rotating savings cycles",
      icon: LucideIcons.RefreshCw,
      path: `/family/${familySlug}/njangi`,
      color: "text-indigo-600",
    },
    {
      title: "Assistance",
      description: "Track birth, death, and sickness events",
      icon: LucideIcons.Heart,
      path: `/family/${familySlug}/assistance`,
      color: "text-pink-600",
    },
    {
      title: "Shares & Dividends",
      description: "Manage shares and dividend distributions",
      icon: LucideIcons.Award,
      path: `/family/${familySlug}/shares`,
      color: "text-yellow-600",
    },
    {
      title: "Member Invitations",
      description: "Invite new members to join the family",
      icon: LucideIcons.Mail,
      path: `/family/${familySlug}/invitations`,
      color: "text-blue-600",
    },
    {
      title: "Payment Management",
      description: "Track and verify member payments",
      icon: LucideIcons.Wallet,
      path: `/family/${familySlug}/payments`,
      color: "text-teal-600",
    },
    {
      title: "Meeting Reminders",
      description: "Send automated meeting notifications",
      icon: LucideIcons.MessageSquare,
      path: `/family/${familySlug}/meeting-reminders`,
      color: "text-purple-600",
    },
    {
      title: "Contribution Analytics",
      description: "Track payment trends and late payments",
      icon: LucideIcons.TrendingUp,
      path: `/family/${familySlug}/contribution-analytics`,
      color: "text-indigo-600",
    },
    {
      title: "Reminder Settings",
      description: "Configure late payment reminder escalation",
      icon: LucideIcons.Settings,
      path: `/family/${familySlug}/reminder-settings`,
      color: "text-gray-600",
    },
    {
      title: "Financial Forecasting",
      description: "Predict cash flow and future finances",
      icon: LucideIcons.TrendingUp,
      path: `/family/${familySlug}/forecasting`,
      color: "text-emerald-600",
    },
    {
      title: "Payment Plans",
      description: "Manage installment payment arrangements",
      icon: LucideIcons.Calendar,
      path: `/family/${familySlug}/payment-plans`,
      color: "text-amber-600",
    },
    {
      title: "Budget Planning",
      description: "Track expenses and manage budgets",
      icon: LucideIcons.Wallet,
      path: `/family/${familySlug}/budget`,
      color: "text-green-600",
    },
    {
      title: "Financial Settings",
      description: "Configure savings, loans, njangi & shares",
      icon: LucideIcons.Settings,
      path: `/family/${familySlug}/financial-settings`,
      color: "text-orange-600",
    },
    {
      title: "Email Reports",
      description: "Configure automated email digests",
      icon: LucideIcons.Mail,
      path: `/family/${familySlug}/email-reports`,
      color: "text-blue-600",
    },
    {
      title: "Export Scheduler",
      description: "Schedule automated report exports",
      icon: LucideIcons.Calendar,
      path: `/family/${familySlug}/export-scheduler`,
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
        
        <Tabs defaultValue={categories[0]?.slug || "meetings"} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            {categories.map((category) => {
              const Icon = getIconComponent(category.icon);
              return (
                <TabsTrigger key={category.id} value={category.slug}>
                  <Icon className="w-4 h-4 mr-2" />
                  {category.name}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {categories.map((category) => {
            const categoryModules = modules.filter(m => m.category_id === category.id);
            
            return (
              <TabsContent key={category.id} value={category.slug} className="space-y-4">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-bold">{category.name}</h2>
                  {category.description && (
                    <p className="text-muted-foreground">{category.description}</p>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {categoryModules.map((module) => {
                    const Icon = getIconComponent(module.icon);
                    return (
                      <Card 
                        key={module.id} 
                        className="hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => navigate(`/family/${familySlug}${module.route_path}`)}
                      >
                        <CardHeader>
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg bg-muted ${module.color || 'text-primary'}`}>
                              <Icon className="w-6 h-6" />
                            </div>
                            <div>
                              <CardTitle className="text-lg">{module.name}</CardTitle>
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
                    );
                  })}
                  {categoryModules.length === 0 && (
                    <div className="col-span-full text-center py-12 text-muted-foreground">
                      No modules in this category yet
                    </div>
                  )}
                </div>
              </TabsContent>
            );
          })}
        </Tabs>

        {/* Legacy modules not yet categorized */}
        {legacyModules.length > 0 && (
          <Card className="mt-8">
            <CardHeader>
              <CardTitle>Additional Modules</CardTitle>
              <CardDescription>Other available features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {legacyModules
                  .filter(legacy => !modules.some(m => m.slug === legacy.title.toLowerCase().replace(/\s+/g, '-')))
                  .map((module, index) => (
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
                            <CardTitle className="text-sm">{module.title}</CardTitle>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-xs">{module.description}</CardDescription>
                        <Button className="w-full mt-2" variant="outline" size="sm">
                          Open
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default FamilyDetail;
