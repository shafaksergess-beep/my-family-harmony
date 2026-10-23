import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Calendar, CheckCircle2, HandHeart, Menu, PiggyBank, RefreshCcw, ShieldCheck, Users, WifiOff, X, Landmark, Sprout } from "lucide-react";
import { Capacitor } from "@capacitor/core";
import { supabase } from "@/integrations/supabase/client";
import SEO from "@/components/SEO";
import SplashScreen from "@/components/SplashScreen";
import InstallBanner from "@/components/InstallBanner";
import { useLanguages, setPersonalLanguage } from "@/i18n/languages";
import "./home/home.css";

const isNativeShell = (() => { try { return Capacitor.isNativePlatform(); } catch { return false; } })();

const c = (v: string, a?: number) => (a === undefined ? `hsl(var(--${v}))` : `hsl(var(--${v}) / ${a})`);

function Reveal({ children, className = "", delay = 0 }: { children: ReactNode; className?: string; delay?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [vis, setVis] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) return setVis(true);
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVis(true); io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return <div ref={ref} style={{ transitionDelay: `${delay}ms` }} className={`hp-reveal ${vis ? "is-visible" : ""} ${className}`}>{children}</div>;
}

function Avatar({ i, tone }: { i: string; tone: string }) {
  return <span className="inline-flex h-9 w-9 items-center justify-center rounded-full text-[11px] font-semibold ring-2" style={{ background: c(tone, 0.18), color: c(tone === "hp-gold" ? "hp-ink" : tone), boxShadow: `0 0 0 2px ${c("hp-paper")}` }}>{i}</span>;
}

function ProductPreview() {
  const { t } = useTranslation();
  const p = (k: string) => t(`home.preview.${k}`);
  return (
    <div className="relative mx-auto w-full max-w-[520px]" aria-label={p("aria")} role="img">
      <div className="absolute -inset-6 -z-10 rounded-[48px] opacity-70 blur-2xl" style={{ background: `radial-gradient(60% 60% at 70% 30%, ${c("hp-gold", 0.35)}, transparent), radial-gradient(50% 50% at 20% 80%, ${c("hp-terracotta", 0.22)}, transparent)` }} />
      <div className="rounded-[28px] p-5 sm:p-6" style={{ background: c("hp-paper"), boxShadow: "var(--hp-shadow-lg)", border: `1px solid ${c("hp-line")}` }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: c("hp-ink-soft") }}>{p("family")}</p>
            <p className="hp-serif mt-1 text-xl">{p("greeting")}</p>
          </div>
          <div className="flex -space-x-2"><Avatar i="EN" tone="hp-forest" /><Avatar i="MA" tone="hp-terracotta" /><Avatar i="JT" tone="hp-gold" /><Avatar i="+9" tone="hp-forest" /></div>
        </div>
        <div className="mt-5 rounded-2xl p-5" style={{ background: c("hp-forest"), color: c("hp-ivory") }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] opacity-70">{p("next")}</p>
              <p className="hp-serif mt-1 text-2xl">{p("meeting")}</p>
              <p className="mt-1 text-sm opacity-80">{p("when")}</p>
            </div>
            <div className="rounded-xl px-3 py-2 text-center" style={{ background: c("hp-ivory", 0.12) }}>
              <p className="text-[10px] uppercase opacity-70">{p("month")}</p><p className="hp-serif text-2xl leading-none">02</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {["agenda1", "agenda2", "agenda3"].map((k) => <span key={k} className="rounded-full px-3 py-1" style={{ background: c("hp-ivory", 0.12) }}>{p(k)}</span>)}
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-2xl p-4" style={{ background: c("hp-cream") }}>
            <p className="text-xs" style={{ color: c("hp-ink-soft") }}>{p("contrib")}</p>
            <p className="hp-serif mt-1 text-2xl">9 <span className="text-base" style={{ color: c("hp-ink-soft") }}>{p("ofPaid")}</span></p>
            <div className="mt-3 h-2 rounded-full" style={{ background: c("hp-line") }}><div className="hp-bar h-2 w-3/4 rounded-full" style={{ background: c("hp-forest") }} /></div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: c("hp-cream") }}>
            <p className="text-xs" style={{ color: c("hp-ink-soft") }}>{p("cycle")}</p>
            <p className="hp-serif mt-1 text-2xl">{p("round")}</p>
            <p className="mt-2 text-xs" style={{ color: c("hp-ink-soft") }}>{p("nextUp")}</p>
          </div>
        </div>
        <ul className="mt-4 space-y-2 text-sm">
          {[["MA", "act1"], ["JT", "act2"]].map(([i, k]) => (
            <li key={k} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ border: `1px solid ${c("hp-line")}` }}>
              <Avatar i={i} tone="hp-terracotta" /><span className="flex-1">{p(k)}</span><span className="text-xs" style={{ color: c("hp-ink-soft") }}>{p(`${k}When`)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="absolute -bottom-16 -left-4 w-56 rounded-2xl p-4 sm:-left-12" style={{ background: c("hp-paper"), boxShadow: "var(--hp-shadow-lg)", border: `1px solid ${c("hp-line")}` }}>
        <div className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-4 w-4" style={{ color: c("hp-forest") }} /> {p("approved")}</div>
        <p className="mt-1 text-xs" style={{ color: c("hp-ink-soft") }}>{p("approvedDetail")}</p>
      </div>
      <div className="absolute -right-3 -top-5 hidden rounded-full px-4 py-2 text-xs font-medium sm:flex sm:items-center sm:gap-2" style={{ background: c("hp-gold"), color: c("hp-ink"), boxShadow: "var(--hp-shadow)" }}>
        <WifiOff className="h-3.5 w-3.5" /> {p("offline")}
      </div>
    </div>
  );
}

export default function Index() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [showSplash, setShowSplash] = useState(isNativeShell);
  const [open, setOpen] = useState(false);
  const [stats, setStats] = useState({ members: 0, meetings: 0, interest: 0 });
  const langs = useLanguages();
  const langList = langs.length ? langs : [{ code: "en", native_name: "English" }, { code: "fr", native_name: "Français" }];
  const lang = (i18n.language || "en").split("-")[0];

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { if (session) navigate("/dashboard"); });
    supabase.rpc("get_platform_stats").then(({ data }) => {
      if (data && typeof data === "object" && !Array.isArray(data)) {
        const d = data as Record<string, number>;
        setStats({ members: d.active_members || 0, meetings: d.meetings_this_year || 0, interest: d.avg_interest_rate || 0 });
      }
    });
  }, [navigate]);

  if (showSplash) return <SplashScreen onComplete={() => setShowSplash(false)} duration={3500} />;

  const NAV = [
    { href: "#platform", label: t("home.nav.platform") },
    { href: "#prosperity", label: t("home.nav.contributions") },
    { href: "#how", label: t("home.nav.how") },
    { href: "#stories", label: t("home.nav.stories") },
  ];
  const btnPrimary = "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5";
  const LangToggle = ({ pad }: { pad: string }) => (
    <div className="flex rounded-full p-0.5 text-xs" role="group" aria-label={t("home.nav.language")} style={{ border: `1px solid ${c("hp-line")}` }}>
      {langList.map((l) => (
        <button key={l.code} onClick={() => setPersonalLanguage(l.code)} aria-pressed={lang === l.code} title={l.native_name} className={`rounded-full ${pad} font-medium uppercase transition-colors`} style={lang === l.code ? { background: c("hp-forest"), color: c("hp-ivory") } : { color: c("hp-ink-soft") }}>{l.code}</button>
      ))}
    </div>
  );

  return (
    <div className="hp-root min-h-screen scroll-smooth">
      <SEO title={t("home.seoTitle")} description={t("home.seoDesc")} />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&family=Instrument+Sans:wght@400;500;600&display=swap" />
      <style>{`html{scroll-behavior:smooth}@media (prefers-reduced-motion: reduce){html{scroll-behavior:auto}}`}</style>

      <header className="sticky top-0 z-40 backdrop-blur-md" style={{ background: c("hp-ivory", 0.82), borderBottom: `1px solid ${c("hp-line", 0.7)}` }}>
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 lg:px-8" aria-label={t("home.nav.main")}>
          <a href="#top" className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="Kinsroot Logo" width={36} height={36} fetchPriority="high" className="h-9 w-9 rounded-full object-cover" />
            <span className="hp-serif text-xl font-medium">Kinsroot</span>
          </a>
          <ul className="hidden items-center gap-8 text-sm md:flex">
            {NAV.map((n) => <li key={n.href}><a href={n.href} style={{ color: c("hp-ink-soft") }}>{n.label}</a></li>)}
          </ul>
          <div className="hidden items-center gap-4 md:flex">
            <LangToggle pad="px-2.5 py-1" />
            <Link to="/auth" className={btnPrimary} style={{ background: c("hp-forest"), color: c("hp-ivory") }}>{t("home.getStarted")}</Link>
          </div>
          <button className="md:hidden rounded-full p-2" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="hp-mobile-nav" aria-label={open ? t("home.nav.close") : t("home.nav.open")}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
        {open && (
          <div id="hp-mobile-nav" className="md:hidden px-5 pb-5" style={{ borderTop: `1px solid ${c("hp-line")}` }}>
            <ul className="space-y-1 py-3">{NAV.map((n) => <li key={n.href}><a href={n.href} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2.5">{n.label}</a></li>)}</ul>
            <div className="flex items-center justify-between gap-3">
              <LangToggle pad="px-3 py-1.5" />
              <Link to="/auth" className={btnPrimary} style={{ background: c("hp-forest"), color: c("hp-ivory") }}>{t("home.getStarted")}</Link>
            </div>
          </div>
        )}
      </header>

      <main id="top">
        <section className="relative overflow-hidden">
          <div className="hp-grain pointer-events-none absolute inset-0 opacity-60" aria-hidden />
          <svg className="pointer-events-none absolute -left-40 top-10 h-[520px] w-[520px] opacity-40" viewBox="0 0 200 200" aria-hidden><path fill={c("hp-sage")} d="M44.7,-58.6C57.3,-49.9,66.4,-35.4,70.3,-19.6C74.2,-3.8,72.9,13.3,65.6,27C58.3,40.6,45,50.8,30.4,58.4C15.8,66,-0.2,71,-16.6,68.6C-33,66.2,-49.8,56.5,-60.2,42.1C-70.6,27.7,-74.5,8.6,-70.6,-8.4C-66.7,-25.4,-55,-40.2,-41,-48.8C-27,-57.4,-13.5,-59.7,1.5,-61.6C16.5,-63.5,32.1,-67.3,44.7,-58.6Z" transform="translate(100 100)" /></svg>
          <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 pb-24 pt-14 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:pb-32 lg:pt-20">
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium" style={{ background: c("hp-cream"), color: c("hp-forest") }}>
                <Sprout className="h-3.5 w-3.5" /> {t("home.badge")}
              </p>
              <h1 className="hp-serif mt-6 text-[2.6rem] font-medium leading-[1.04] sm:text-6xl lg:text-[4.4rem]">
                {t("home.h1a")}<br /><em className="font-normal" style={{ color: c("hp-terracotta") }}>{t("home.h1b")}</em>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed" style={{ color: c("hp-ink-soft") }}>{t("home.sub")}</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link to="/auth" className={`${btnPrimary} px-7 py-3.5 text-base`} style={{ background: c("hp-forest"), color: c("hp-ivory"), boxShadow: "var(--hp-shadow)" }}>{t("home.getStartedFree")} <ArrowRight className="h-4 w-4" /></Link>
                <a href="#platform" className="inline-flex items-center justify-center rounded-full px-6 py-3.5 text-base font-medium" style={{ border: `1px solid ${c("hp-line")}` }}>{t("home.explore")}</a>
              </div>
              <p className="mt-8 flex items-center gap-2 text-sm" style={{ color: c("hp-ink-soft") }}>
                <ShieldCheck className="h-4 w-4" style={{ color: c("hp-forest") }} /> {t("home.privacy")}
              </p>
            </Reveal>
            <Reveal delay={150}><ProductPreview /></Reveal>
          </div>
        </section>

        <section aria-label={t("home.proof.aria")} style={{ background: c("hp-forest-deep"), color: c("hp-ivory") }}>
          <h2 className="sr-only">{t("home.proof.aria")}</h2>
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-3 lg:px-8">
            {([[Users, "1"], [Landmark, "2"], [WifiOff, "3"]] as const).map(([Icon, n]) => (
              <div key={n} className="flex gap-4"><Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: c("hp-gold") }} /><div><p className="font-semibold">{t(`home.proof.t${n}`)}</p><p className="mt-1 text-sm opacity-75">{t(`home.proof.d${n}`)}</p></div></div>
            ))}
          </div>
        </section>

        <section id="platform" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 lg:px-8 lg:py-32">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: c("hp-terracotta") }}>{t("home.platform.eyebrow")}</p>
            <h2 className="hp-serif mt-3 text-4xl font-medium leading-tight sm:text-5xl">{t("home.platform.title")}</h2>
          </Reveal>
          <div className="mt-14 grid gap-5 lg:grid-cols-6">
            <Reveal className="lg:col-span-4 lg:row-span-2">
              <div className="hp-lift relative h-full overflow-hidden rounded-[28px] p-8 sm:p-10" style={{ background: c("hp-forest"), color: c("hp-ivory"), boxShadow: "var(--hp-shadow)" }}>
                <Calendar className="h-7 w-7" style={{ color: c("hp-gold") }} />
                <h3 className="hp-serif mt-6 text-3xl font-medium sm:text-4xl">{t("home.platform.meetingsTitle")}</h3>
                <p className="mt-3 max-w-md opacity-80">{t("home.platform.meetingsDesc")}</p>
                <div className="mt-8 grid max-w-md grid-cols-3 gap-3 text-center text-xs">
                  {[["jan", "Mama Agnes"], ["feb", "Uncle Peter"], ["mar", "Ebude N."]].map(([m, h]) => (
                    <div key={m} className="rounded-xl p-3" style={{ background: c("hp-ivory", 0.1) }}><p className="hp-serif text-lg">{t(`home.platform.${m}`)}</p><p className="opacity-75">{h}</p></div>
                  ))}
                </div>
                <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full" style={{ background: c("hp-gold", 0.15) }} aria-hidden />
              </div>
            </Reveal>
            {[
              { I: RefreshCcw, k: "njangi", bg: "hp-cream", span: "lg:col-span-2" },
              { I: PiggyBank, k: "loans", bg: "hp-paper", span: "lg:col-span-2" },
              { I: HandHeart, k: "support", bg: "hp-sage", span: "lg:col-span-3" },
              { I: ShieldCheck, k: "payments", bg: "hp-paper", span: "lg:col-span-3" },
            ].map(({ I, k, bg, span }, idx) => (
              <Reveal key={k} delay={idx * 80} className={span}>
                <div className="hp-lift h-full rounded-[24px] p-7" style={{ background: c(bg), border: `1px solid ${c("hp-line")}` }}>
                  <I className="h-6 w-6" style={{ color: c("hp-terracotta") }} />
                  <h3 className="hp-serif mt-5 text-2xl font-medium">{t(`home.platform.${k}T`)}</h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: c("hp-ink-soft") }}>{t(`home.platform.${k}D`)}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>

        <section id="prosperity" className="scroll-mt-20" style={{ background: c("hp-cream") }}>
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-24 lg:grid-cols-2 lg:px-8 lg:py-28">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: c("hp-terracotta") }}>{t("home.prosperity.eyebrow")}</p>
              <h2 className="hp-serif mt-3 text-4xl font-medium leading-tight sm:text-5xl">{t("home.prosperity.title")}</h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed" style={{ color: c("hp-ink-soft") }}>{t("home.prosperity.body")}</p>
              <dl className="mt-8 grid max-w-lg grid-cols-3 gap-4">
                {[["members", `${stats.members}+`], ["meetings", String(stats.meetings)], ["interest", `${stats.interest.toFixed(1)}%`]].map(([k, v]) => (
                  <div key={k}><dt className="text-xs" style={{ color: c("hp-ink-soft") }}>{t(`home.stats.${k}`)}</dt><dd className="hp-serif mt-1 text-3xl">{v}</dd></div>
                ))}
              </dl>
            </Reveal>
            <Reveal delay={120}>
              <div className="rounded-[28px] p-7 sm:p-9" style={{ background: c("hp-paper"), boxShadow: "var(--hp-shadow)" }}>
                <p className="text-sm" style={{ color: c("hp-ink-soft") }}>{t("home.prosperity.sample")}</p>
                <div className="mt-6 flex h-44 items-end gap-2 sm:gap-3" aria-hidden>
                  {[28, 36, 34, 48, 52, 60, 58, 70, 76, 84, 90, 100].map((h, i) => (
                    <div key={i} className="hp-bar flex-1 rounded-t-lg" style={{ height: `${h}%`, background: i === 11 ? c("hp-terracotta") : c("hp-forest", 0.25 + i * 0.06), transformOrigin: "bottom", animationName: "none" }} />
                  ))}
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3 text-sm" style={{ borderTop: `1px solid ${c("hp-line")}` }}>
                  {[["contributions", "hp-forest"], ["njangi", "hp-gold"], ["support", "hp-terracotta"]].map(([l, tone]) => (
                    <p key={l} className="flex items-center gap-2 pt-4"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c(tone) }} />{t(`home.prosperity.${l}`)}</p>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 lg:px-8 lg:py-28">
          <Reveal><h2 className="hp-serif text-4xl font-medium sm:text-5xl">{t("home.how.title")}</h2></Reveal>
          <ol className="mt-14 grid gap-10 md:grid-cols-3">
            {[1, 2, 3].map((n, i) => (
              <Reveal key={n} delay={i * 100}>
                <li className="relative pt-8" style={{ borderTop: `1px solid ${c("hp-ink", 0.2)}` }}>
                  <span className="hp-serif absolute -top-5 left-0 px-2 text-3xl" style={{ background: c("hp-ivory"), color: c("hp-terracotta") }}>0{n}</span>
                  <h3 className="text-lg font-semibold">{t(`home.how.s${n}`)}</h3>
                  <p className="mt-2 leading-relaxed" style={{ color: c("hp-ink-soft") }}>{t(`home.how.d${n}`)}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>

        <section id="stories" className="scroll-mt-20 pb-24 lg:pb-28">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="hp-serif text-4xl font-medium sm:text-5xl">{t("home.stories.title")}</h2>
              <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: c("hp-cream"), color: c("hp-ink-soft") }}>{t("home.stories.tag")}</span>
            </Reveal>
            <div className="mt-12 grid gap-5 md:grid-cols-[1.3fr_1fr_1fr]">
              {[1, 2, 3].map((n, i) => (
                <Reveal key={n} delay={i * 80}>
                  <figure className="hp-lift h-full rounded-[24px] p-7" style={i === 0 ? { background: c("hp-terracotta"), color: c("hp-paper") } : { background: c("hp-paper"), border: `1px solid ${c("hp-line")}` }}>
                    <blockquote className={`hp-serif leading-snug ${i === 0 ? "text-2xl sm:text-3xl" : "text-xl"}`}>{t(`home.stories.q${n}`)}</blockquote>
                    <figcaption className="mt-6 text-sm opacity-80">{t(`home.stories.w${n}`)}</figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 lg:px-8">
          <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-[36px] px-8 py-16 text-center sm:py-20">
            <div className="absolute inset-0 -z-10" style={{ background: c("hp-forest-deep") }} />
            <div className="hp-grain absolute inset-0 -z-10 opacity-20" aria-hidden />
            <h2 className="hp-serif mx-auto max-w-2xl text-4xl font-medium sm:text-5xl" style={{ color: c("hp-ivory") }}>{t("home.cta.title")}</h2>
            <p className="mx-auto mt-4 max-w-lg" style={{ color: c("hp-ivory", 0.75) }}>{t("home.cta.sub")}</p>
            <Link to="/auth" className={`${btnPrimary} mt-9 px-8 py-4 text-base`} style={{ background: c("hp-gold"), color: c("hp-ink") }}>{t("home.getStarted")} <ArrowRight className="h-4 w-4" /></Link>
          </Reveal>
        </section>
      </main>

      <footer style={{ borderTop: `1px solid ${c("hp-line")}` }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm sm:flex-row lg:px-8" style={{ color: c("hp-ink-soft") }}>
          <div className="flex items-center gap-2"><img src="/logo.jpg" alt="" width={24} height={24} className="h-6 w-6 rounded-full" /><span>{t("home.footer.credit")}</span></div>
          <div className="flex flex-wrap justify-center gap-5"><Link to="/blog/what-is-njangi">{t("home.footer.blog")}</Link><Link to="/privacy">{t("home.footer.privacy")}</Link><Link to="/terms">{t("home.footer.terms")}</Link><WhatsAppSupportLink /><a href="mailto:softserge.dev@gmail.com">softserge.dev@gmail.com</a></div>
        </div>
      </footer>
      <InstallBanner />
    </div>
  );
}
