import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Users, Calendar, DollarSign, TrendingUp, Heart, Shield, Home, PiggyBank, FileText, Award } from "lucide-react";
import SplashScreen from "@/components/SplashScreen";
import SEO from "@/components/SEO";
import InstallBanner from "@/components/InstallBanner";

const Index = () => {
  const navigate = useNavigate();
  const { i18n } = useTranslation();
  const [showSplash, setShowSplash] = useState(true);
  const [lang, setLang] = useState(i18n.language || "en");
  const [stats, setStats] = useState({ activeMembers: 0, avgContribution: 0, avgInterestRate: 0, meetingsPerYear: 0 });

  const switchLang = (code: string) => {
    setLang(code);
    i18n.changeLanguage(code);
    try { localStorage.setItem("kinsroot-lang", code); } catch { /* ignore */ }
  };

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        navigate("/dashboard");
      }
    };
    checkAuth();

    // Fetch real platform stats via secure RPC function
    const fetchStats = async () => {
      const { data } = await supabase.rpc("get_platform_stats");
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        const d = data as Record<string, number>;
        setStats({
          activeMembers: d.active_members || 0,
          avgContribution: d.avg_contribution || 0,
          avgInterestRate: d.avg_interest_rate || 0,
          meetingsPerYear: d.meetings_this_year || 0,
        });
      }
    };
    fetchStats();
  }, [navigate]);

  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} duration={3500} />;
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Kinsroot — Rooted in Heritage, Built for Tomorrow"
        description="Kinsroot helps families run meetings, track contributions, manage savings, loans and njangi — all in one heritage-rooted platform."
      />
      <main id="main-content">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-primary via-primary-hover to-secondary/20 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('/lovable-uploads/pattern.svg')] opacity-10"></div>
        <div className="container mx-auto px-4 py-20 relative z-10">
          <div className="max-w-4xl mx-auto text-center animate-fade-in">
            <div className="mb-8">
              <img
                src="/logo.jpg"
                alt="Family Together Logo"
                className="w-32 h-32 mx-auto rounded-full object-cover shadow-2xl border-4 border-primary-foreground/20"
              />
            </div>

            <div className="mb-6 inline-flex items-center gap-3 bg-primary-foreground/10 backdrop-blur-sm px-6 py-3 rounded-full border border-primary-foreground/20">
              <Home className="w-5 h-5" />
              <span className="text-sm font-medium">Family Harmony Hub</span>
            </div>

            <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">Family Together</h1>

            <p className="text-xl md:text-2xl mb-8 text-primary-foreground/90 max-w-2xl mx-auto">
              Uniting heritage, managing prosperity, building our collective future
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Button
                size="lg"
                className="bg-secondary text-secondary-foreground hover:bg-secondary-hover shadow-lg hover:shadow-xl transition-all text-lg px-8 py-6"
                onClick={() => (window.location.href = "/auth")}
              >
                Get Started
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() =>
                  document.getElementById("features")?.scrollIntoView({
                    behavior: "smooth",
                  })
                }
                className="border-primary-foreground/30 text-primary-foreground text-lg px-8 py-6 bg-yellow-600 hover:bg-yellow-500"
              >
                Learn More
              </Button>
            </div>

            {/* Language Selector */}
            <div className="flex items-center justify-center gap-2 text-sm" role="group" aria-label="Language">
              {[
                { code: "en", label: "English" },
                { code: "fr", label: "Français" },
                { code: "bota", label: "Bota" },
              ].map((l) => (
                <button
                  key={l.code}
                  onClick={() => switchLang(l.code)}
                  className={`px-4 py-2 rounded-lg transition-all border ${
                    lang === l.code
                      ? "bg-primary-foreground/15 border-primary-foreground/30"
                      : "border-transparent hover:bg-primary-foreground/10"
                  }`}
                  aria-pressed={lang === l.code}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Decorative bottom wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0V120Z"
              fill="hsl(var(--background))"
            />
          </svg>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <Card className="p-6 text-center border-primary/10 hover:border-primary/30 transition-all hover:shadow-lg">
              <Users className="w-10 h-10 mx-auto mb-3 text-primary" />
              <div className="text-3xl font-bold text-primary mb-1">{stats.activeMembers}+</div>
              <div className="text-sm text-muted-foreground">Active Members</div>
            </Card>
            <Card className="p-6 text-center border-secondary/10 hover:border-secondary/30 transition-all hover:shadow-lg">
              <DollarSign className="w-10 h-10 mx-auto mb-3 text-secondary" />
              <div className="text-3xl font-bold text-secondary mb-1">{stats.avgContribution >= 1000 ? `${Math.round(stats.avgContribution / 1000)}K` : stats.avgContribution}</div>
              <div className="text-sm text-muted-foreground">Monthly Contribution</div>
            </Card>
            <Card className="p-6 text-center border-accent/10 hover:border-accent/30 transition-all hover:shadow-lg">
              <PiggyBank className="w-10 h-10 mx-auto mb-3 text-accent" />
              <div className="text-3xl font-bold text-accent mb-1">{stats.avgInterestRate.toFixed(1)}%</div>
              <div className="text-sm text-muted-foreground">Avg Loan Interest</div>
            </Card>
            <Card className="p-6 text-center border-primary/10 hover:border-primary/30 transition-all hover:shadow-lg">
              <Calendar className="w-10 h-10 mx-auto mb-3 text-primary" />
              <div className="text-3xl font-bold text-foreground mb-1">{stats.meetingsPerYear}</div>
              <div className="text-sm text-muted-foreground">Meetings/Year</div>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4 text-foreground">Complete Family Management</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Everything your family needs to thrive together, digitized and automated
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
            <FeatureCard
              icon={<Calendar className="w-8 h-8" />}
              title="Meeting Management"
              description="Track attendance, hosting calendar, and automatically calculate lateness fines. Never miss a monthly gathering."
              color="primary"
            />
            <FeatureCard
              icon={<DollarSign className="w-8 h-8" />}
              title="Financial Tracking"
              description="Monitor contributions, individual savings, and family coffers with real-time dashboards and reports."
              color="secondary"
            />
            <FeatureCard
              icon={<TrendingUp className="w-8 h-8" />}
              title="Njangi (Rotating Savings)"
              description="Manage cycles, track participants, and automate payout schedules for your collective savings group."
              color="accent"
            />
            <FeatureCard
              icon={<FileText className="w-8 h-8" />}
              title="Loan Management"
              description="Request, approve, and track loans with automatic interest calculations and payment schedules."
              color="primary"
            />
            <FeatureCard
              icon={<Award className="w-8 h-8" />}
              title="Shares & Dividends"
              description="Purchase shares, track ownership, and receive annual dividends from family investments."
              color="secondary"
            />
            <FeatureCard
              icon={<Heart className="w-8 h-8" />}
              title="Assistance Events"
              description="Coordinate support for births, deaths, sickness, and joyful occasions with automated contributions."
              color="accent"
            />
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-muted/20" aria-labelledby="how-it-works-heading">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 id="how-it-works-heading" className="text-4xl font-bold mb-4 text-foreground">How it works</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">Get your family running on Kinsroot in three steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { n: "1", title: "Create your family", body: "Set up your family space, invite members and assign roles in minutes." },
              { n: "2", title: "Run your activities", body: "Schedule meetings, record contributions, manage loans and njangi cycles." },
              { n: "3", title: "See the impact", body: "Track health, generate receipts and reports, and grow together year on year." },
            ].map((s) => (
              <Card key={s.n} className="p-8 text-center hover:shadow-lg transition-all border-primary/10">
                <div className="mx-auto w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg mb-4">
                  {s.n}
                </div>
                <h3 className="text-xl font-bold mb-2 text-foreground">{s.title}</h3>
                <p className="text-muted-foreground">{s.body}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20" aria-labelledby="testimonials-heading">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 id="testimonials-heading" className="text-4xl font-bold mb-4 text-foreground">Loved by families</h2>
            <p className="text-lg text-muted-foreground">Real stories from families using Kinsroot</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              { quote: "We used to argue over who paid what. Now everyone sees the same record — peace at last.", who: "Treasurer, Bota Land family" },
              { quote: "Scheduling a year of meetings in one click changed our family rhythm completely.", who: "Family Head, Cameroon" },
              { quote: "Our njangi cycle has never been smoother. Payouts and reminders just work.", who: "Member, diaspora chapter" },
            ].map((t, i) => (
              <Card key={i} className="p-6 border-secondary/20 hover:shadow-lg transition-all">
                <div className="text-secondary text-3xl leading-none mb-2" aria-hidden="true">“</div>
                <p className="text-foreground mb-4 leading-relaxed">{t.quote}</p>
                <p className="text-sm text-muted-foreground font-medium">— {t.who}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Cultural Heritage Section */}
      <section className="py-20 bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <Shield className="w-16 h-16 mx-auto mb-6 text-primary" />
            <h2 className="text-4xl font-bold mb-6 text-foreground">Rooted in Heritage, Built for Tomorrow</h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              The descendants of the family carry forward a legacy of unity, shared property, education, and Christian
              values. Our app honors these traditions while embracing modern tools to strengthen family bonds and secure
              our collective prosperity.
            </p>
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                <span>Unity & Solidarity</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border">
                <div className="w-2 h-2 rounded-full bg-secondary"></div>
                <span>Shared Prosperity</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-card rounded-lg border border-border">
                <div className="w-2 h-2 rounded-full bg-accent"></div>
                <span>Cultural Pride</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-primary to-primary-hover text-primary-foreground">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-4xl font-bold mb-6">Ready to Strengthen Your Family Bonds?</h2>
          <p className="text-xl mb-8 text-primary-foreground/90 max-w-2xl mx-auto">
            Join us in building a prosperous future together
          </p>
          <Button
            size="lg"
            className="bg-secondary text-secondary-foreground hover:bg-secondary-hover shadow-xl hover:shadow-2xl transition-all text-lg px-10 py-6 animate-glow"
            onClick={() => (window.location.href = "/auth")}
          >
            Get Started Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-12">
        <div className="container mx-auto px-4">
          <div className="text-center text-muted-foreground">
            <p className="mb-2">© 2025 Family Harmony</p>
            <p className="text-sm">Powered by SoftSerge</p>
          </div>
        </div>
      </footer>
      </main>
      <InstallBanner />
    </div>
  );
};
interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "primary" | "secondary" | "accent";
}
const FeatureCard = ({ icon, title, description, color }: FeatureCardProps) => {
  const colorClasses = {
    primary: "text-primary border-primary/20 hover:border-primary/40",
    secondary: "text-secondary border-secondary/20 hover:border-secondary/40",
    accent: "text-accent border-accent/20 hover:border-accent/40",
  };
  return (
    <Card className={`p-8 transition-all hover:shadow-xl border-2 ${colorClasses[color]} group`}>
      <div
        className={`mb-4 ${color === "primary" ? "text-primary" : color === "secondary" ? "text-secondary" : "text-accent"} group-hover:scale-110 transition-transform`}
      >
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3 text-foreground">{title}</h3>
      <p className="text-muted-foreground leading-relaxed">{description}</p>
    </Card>
  );
};
export default Index;
