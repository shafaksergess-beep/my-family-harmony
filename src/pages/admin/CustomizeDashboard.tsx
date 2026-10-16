import { useTranslation } from "react-i18next";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Layout, Save } from "lucide-react";
import { Responsive, WidthProvider } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";
import FinancialWidget from "@/components/FinancialWidget";
import ActivityWidget from "@/components/ActivityWidget";

const ResponsiveGridLayout = WidthProvider(Responsive);

interface DashboardWidget {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  component: string;
}

export default function CustomizeDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [layouts, setLayouts] = useState<any>({
    lg: [
      { i: "financial", x: 0, y: 0, w: 6, h: 4, component: "financial" },
      { i: "activity", x: 6, y: 0, w: 6, h: 4, component: "activity" },
      { i: "stats1", x: 0, y: 4, w: 3, h: 3, component: "stats" },
      { i: "stats2", x: 3, y: 4, w: 3, h: 3, component: "stats" },
      { i: "stats3", x: 6, y: 4, w: 3, h: 3, component: "stats" },
      { i: "stats4", x: 9, y: 4, w: 3, h: 3, component: "stats" },
    ],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkSuperAdmin();
    loadLayout();
  }, []);

  const checkSuperAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/auth");
      return;
    }

    const { data: isSuperAdmin } = await supabase
      .rpc("is_super_admin", { check_user_id: session.user.id });

    if (!isSuperAdmin) {
      toast({
        title: t("admCustomizeDashboard.accessDenied"),
        description: t("admCustomizeDashboard.youMustBeASuper"),
        variant: "destructive",
      });
      navigate("/admin");
    }
  };

  const loadLayout = () => {
    const saved = localStorage.getItem("dashboard_layout");
    if (saved) {
      setLayouts(JSON.parse(saved));
    }
  };

  const handleLayoutChange = (layout: any, allLayouts: any) => {
    setLayouts(allLayouts);
  };

  const saveLayout = () => {
    setSaving(true);
    localStorage.setItem("dashboard_layout", JSON.stringify(layouts));
    toast({
      title: t("admCustomizeDashboard.success"),
      description: t("admCustomizeDashboard.dashboardLayoutSavedSuccessfully"),
    });
    setSaving(false);
  };

  const resetLayout = () => {
    const defaultLayout = {
      lg: [
        { i: "financial", x: 0, y: 0, w: 6, h: 4, component: "financial" },
        { i: "activity", x: 6, y: 0, w: 6, h: 4, component: "activity" },
        { i: "stats1", x: 0, y: 4, w: 3, h: 3, component: "stats" },
        { i: "stats2", x: 3, y: 4, w: 3, h: 3, component: "stats" },
        { i: "stats3", x: 6, y: 4, w: 3, h: 3, component: "stats" },
        { i: "stats4", x: 9, y: 4, w: 3, h: 3, component: "stats" },
      ],
    };
    setLayouts(defaultLayout);
    localStorage.removeItem("dashboard_layout");
    toast({
      title: t("admCustomizeDashboard.success"),
      description: t("admCustomizeDashboard.dashboardLayoutResetToDefault"),
    });
  };

  const renderWidget = (widgetId: string) => {
    switch (widgetId) {
      case "financial":
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{t("admCustomizeDashboard.financialOverview")}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <div className="text-3xl font-bold">FCFA 1,250,000</div>
                <div className="text-sm text-muted-foreground mt-2">{t("admCustomizeDashboard.totalBalance")}</div>
              </div>
            </CardContent>
          </Card>
        );
      case "activity":
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>{t("admCustomizeDashboard.recentActivity")}</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityWidget />
            </CardContent>
          </Card>
        );
      case "stats1":
      case "stats2":
      case "stats3":
      case "stats4":
        return (
          <Card className="h-full">
            <CardHeader>
              <CardTitle>Stats Widget {widgetId.slice(-1)}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">125</div>
              <div className="text-sm text-muted-foreground">{t("admCustomizeDashboard.totalCount")}</div>
            </CardContent>
          </Card>
        );
      default:
        return <div>{t("admCustomizeDashboard.unknownWidget")}</div>;
    }
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">{t("admCustomizeDashboard.customizeDashboard")}</h1>
              <p className="text-muted-foreground">
                {t("admCustomizeDashboard.dragAndResizeWidgetsTo")}
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <Button variant="outline" onClick={resetLayout}>
              {t("admCustomizeDashboard.reset")}
            </Button>
            <Button onClick={saveLayout} disabled={saving}>
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving..." : "Save Layout"}
            </Button>
          </div>
        </div>

        <Card className="bg-muted border-dashed">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Layout className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="font-semibold">{t("admCustomizeDashboard.howToCustomize")}</p>
                <ul className="text-sm text-muted-foreground space-y-1 mt-2">
                  <li>• Drag widgets to reposition them</li>
                  <li>• Drag the bottom-right corner to resize widgets</li>
                  <li>• Click "Save Layout" to persist your changes</li>
                  <li>• Click "Reset" to restore default layout</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>

        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
          rowHeight={60}
          onLayoutChange={handleLayoutChange}
          isDraggable
          isResizable
          compactType="vertical"
          preventCollision={false}
        >
          {layouts.lg.map((item: any) => (
            <div key={item.i} className="cursor-move">
              {renderWidget(item.i)}
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>
    </div>
  );
}
