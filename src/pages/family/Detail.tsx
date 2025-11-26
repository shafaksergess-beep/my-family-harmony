import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowLeft, BarChart3, Calendar, Users, DollarSign, CreditCard, PiggyBank, RefreshCw, Heart } from "lucide-react";

const FamilyDetail = () => {
  const { familySlug } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [family, setFamily] = useState<any>(null);
  const [userRole, setUserRole] = useState<string>("");

  useEffect(() => {
    loadFamily();
  }, [familySlug]);

  const loadFamily = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data: familyData } = await supabase
        .from("families")
        .select("*")
        .eq("slug", familySlug)
        .single();
      
      if (!familyData) {
        toast({
          title: "Error",
          description: "Family not found",
          variant: "destructive",
        });
        navigate("/dashboard");
        return;
      }
      
      setFamily(familyData);

      // Get user's role in this family
      const { data: memberData } = await supabase
        .from("family_members")
        .select("role")
        .eq("family_id", familyData.id)
        .eq("user_id", session.user.id)
        .single();
      
      if (memberData) {
        setUserRole(memberData.role);
      }
    } catch (error) {
      console.error("Error loading family:", error);
      toast({
        title: "Error",
        description: "Failed to load family details",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
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

      <main className="container mx-auto px-4 py-8">
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
