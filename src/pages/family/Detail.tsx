import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useFamilyAuth } from "@/hooks/useFamilyAuth";
import { useParams, useNavigate } from "react-router-dom";
import { Loader2, ArrowLeft, UserPlus } from "lucide-react";
import FinancialWidget from "@/components/FinancialWidget";
import { notificationManager } from "@/lib/notifications";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import * as LucideIcons from "lucide-react";
import { usePlatform } from "@/hooks/usePlatform";
import { MobileLayout } from "@/components/mobile/MobileLayout";
import { haptics } from "@/lib/haptics";
import { FamilyChatbot } from "@/components/chat/FamilyChatbot";
import SEO from "@/components/SEO";

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
  const { family, userRole, userId, isLoading, isFamilyHead, isFamilyAdmin } = useFamilyAuth(familySlug);
  const { isMobile } = usePlatform();
  const [categories, setCategories] = useState<ModuleCategory[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [loadingModules, setLoadingModules] = useState(true);
  
  const canManageInvitations = isFamilyHead || isFamilyAdmin;

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
    if (userRole) {
      loadModulesAndCategories();
    }
  }, [userRole]);

  const loadModulesAndCategories = async () => {
    try {
      setLoadingModules(true);
      
      const [categoriesRes, modulesRes] = await Promise.all([
        supabase.from("module_categories").select("*").order("order_index"),
        supabase.from("modules").select("*").eq("is_active", true).order("order_index"),
      ]);

      if (categoriesRes.error) throw categoriesRes.error;
      if (modulesRes.error) throw modulesRes.error;

      // Filter modules based on user role
      const allModules = modulesRes.data || [];
      const filteredModules = allModules.filter((module) => {
        const requiredRoles = module.required_roles as string[] | null;
        // If no required roles, everyone can access
        if (!requiredRoles || requiredRoles.length === 0) {
          return true;
        }
        // Check if user has one of the required roles
        return requiredRoles.includes(userRole);
      });

      setCategories(categoriesRes.data || []);
      setModules(filteredModules);
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

  const handleModuleClick = async (path: string) => {
    await haptics.light();
    navigate(path);
  };

  // Mobile layout
  if (isMobile) {
    return (
      <MobileLayout
        title={family?.name || 'Family'}
        familySlug={familySlug}
        showSearch={true}
      >
        <div className="p-4 space-y-6">
          {/* Invite Members Button for Family Heads/Admins */}
          {canManageInvitations && (
            <Button 
              onClick={() => navigate(`/family/${familySlug}/invitations`)}
              className="w-full"
              size="lg"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Invite Members
            </Button>
          )}
          
          {family && <FinancialWidget familyId={family.id} />}
          
          <Tabs defaultValue={categories[0]?.slug || "meetings"} className="space-y-4">
            <div className="overflow-x-auto pb-2 -mx-4 px-4 hide-scrollbar">
              <TabsList className="inline-flex w-auto gap-1 bg-muted/50 p-1">
                {categories.map((category) => {
                  const Icon = getIconComponent(category.icon);
                  return (
                    <TabsTrigger 
                      key={category.id} 
                      value={category.slug}
                      className="whitespace-nowrap px-3 py-2 data-[state=active]:bg-card"
                    >
                      <Icon className="w-4 h-4 mr-1.5" />
                      <span className="text-xs">{category.name}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {categories.map((category) => {
              const categoryModules = modules.filter(m => m.category_id === category.id);
              
              return (
                <TabsContent key={category.id} value={category.slug} className="space-y-3 mt-0">
                  {categoryModules.map((module) => {
                    const Icon = getIconComponent(module.icon);
                    const path = module.route_path.replace(':familySlug', familySlug || '');
                    return (
                      <Card 
                        key={module.id} 
                        className="p-4 active:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => handleModuleClick(path)}
                      >
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl bg-primary/10`}>
                            <Icon className="w-5 h-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-sm">{module.name}</h3>
                            <p className="text-xs text-muted-foreground truncate">
                              {module.description}
                            </p>
                          </div>
                          <LucideIcons.ChevronRight className="w-5 h-5 text-muted-foreground" />
                        </div>
                      </Card>
                    );
                  })}
                  {categoryModules.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <LucideIcons.Circle className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm">No modules in this category</p>
                    </div>
                  )}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>
      </MobileLayout>
    );
  }

  // Desktop layout
  return (
    <>
      <SEO title="Family Workspace" description="Your family workspace — meetings, contributions, savings, loans and more." />
      <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
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
            {canManageInvitations && (
              <Button onClick={() => navigate(`/family/${familySlug}/invitations`)}>
                <UserPlus className="w-4 h-4 mr-2" />
                Invite Members
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 space-y-6">
        {family && <FinancialWidget familyId={family.id} />}
        
        <Tabs defaultValue={categories[0]?.slug || "meetings"} className="space-y-6">
          <div className="overflow-x-auto pb-2 -mx-4 px-4">
            <TabsList className="inline-flex w-auto min-w-full md:w-full md:grid md:grid-cols-7 gap-1">
              {categories.map((category) => {
                const Icon = getIconComponent(category.icon);
                return (
                  <TabsTrigger 
                    key={category.id} 
                    value={category.slug}
                    className="whitespace-nowrap px-3 md:px-4 flex-shrink-0"
                  >
                    <Icon className="w-4 h-4 mr-1 md:mr-2" />
                    <span className="text-xs md:text-sm">{category.name}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </div>

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
                    const path = module.route_path.replace(':familySlug', familySlug || '');
                    return (
                      <Card 
                        key={module.id} 
                        className="hover:shadow-lg transition-all cursor-pointer"
                        onClick={() => navigate(path)}
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
      </main>
      {family && <FamilyChatbot familyId={family.id} />}
    </div>
    </>
  );
};

export default FamilyDetail;
