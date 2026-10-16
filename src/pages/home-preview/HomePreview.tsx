import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Calendar, CheckCircle2, HandHeart, Menu, PiggyBank, RefreshCcw, ShieldCheck, Users, WifiOff, X, Landmark, Sprout } from "lucide-react";
import SEO from "@/components/SEO";
import "./home-preview.css";

/* Design proposal — not linked from production. Uses scoped hp-* tokens in home-preview.css. */

const c = (v: string, a?: number) => (a === undefined ? `hsl(var(--${v}))` : `hsl(var(--${v}) / ${a})`);

const NAV = [
  { href: "#platform", label: "Platform" },
  { href: "#prosperity", label: "Contributions" },
  { href: "#how", label: "How it works" },
  { href: "#stories", label: "Stories" },
];

const LANGS = [
  { code: "en", label: "EN" },
  { code: "fr", label: "FR" },
  { code: "bota", label: "Bota" },
];

const COPY: Record<string, { h1a: string; h1b: string; sub: string }> = {
  en: { h1a: "Bring the family together.", h1b: "Keep traditions moving forward.", sub: "Kinsroot gives your family one shared home for meetings, contributions, njangi, loans and support — clear for everyone, even offline." },
  fr: { h1a: "Rassemblez la famille.", h1b: "Faites vivre les traditions.", sub: "Kinsroot réunit réunions, cotisations, njangi, prêts et entraide dans un seul espace familial — clair pour tous, même hors ligne." },
};

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
  return (
    <div className="relative mx-auto w-full max-w-[520px]" aria-label="Sample Kinsroot dashboard preview" role="img">
      <div className="absolute -inset-6 -z-10 rounded-[48px] opacity-70 blur-2xl" style={{ background: `radial-gradient(60% 60% at 70% 30%, ${c("hp-gold", 0.35)}, transparent), radial-gradient(50% 50% at 20% 80%, ${c("hp-terracotta", 0.22)}, transparent)` }} />
      <div className="rounded-[28px] p-5 sm:p-6" style={{ background: c("hp-paper"), boxShadow: "var(--hp-shadow-lg)", border: `1px solid ${c("hp-line")}` }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em]" style={{ color: c("hp-ink-soft") }}>Ndoko Family · Douala</p>
            <p className="hp-serif mt-1 text-xl">Good evening, Ebude</p>
          </div>
          <div className="flex -space-x-2"><Avatar i="EN" tone="hp-forest" /><Avatar i="MA" tone="hp-terracotta" /><Avatar i="JT" tone="hp-gold" /><Avatar i="+9" tone="hp-forest" /></div>
        </div>

        <div className="mt-5 rounded-2xl p-5" style={{ background: c("hp-forest"), color: c("hp-ivory") }}>
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.18em] opacity-70">Next gathering</p>
              <p className="hp-serif mt-1 text-2xl">Sunday family meeting</p>
              <p className="mt-1 text-sm opacity-80">Nov 2 · 3:00 PM · Hosted by Mama Agnes</p>
            </div>
            <div className="rounded-xl px-3 py-2 text-center" style={{ background: c("hp-ivory", 0.12) }}>
              <p className="text-[10px] uppercase opacity-70">Nov</p><p className="hp-serif text-2xl leading-none">02</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2 text-xs">
            {["Opening prayer", "Njangi payout", "Treasurer's report"].map((t) => <span key={t} className="rounded-full px-3 py-1" style={{ background: c("hp-ivory", 0.12) }}>{t}</span>)}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div className="rounded-2xl p-4" style={{ background: c("hp-cream") }}>
            <p className="text-xs" style={{ color: c("hp-ink-soft") }}>October contributions</p>
            <p className="hp-serif mt-1 text-2xl">9 <span className="text-base" style={{ color: c("hp-ink-soft") }}>of 12 paid</span></p>
            <div className="mt-3 h-2 rounded-full" style={{ background: c("hp-line") }}><div className="hp-bar h-2 w-3/4 rounded-full" style={{ background: c("hp-forest") }} /></div>
          </div>
          <div className="rounded-2xl p-4" style={{ background: c("hp-cream") }}>
            <p className="text-xs" style={{ color: c("hp-ink-soft") }}>Njangi cycle</p>
            <p className="hp-serif mt-1 text-2xl">Round 5</p>
            <p className="mt-2 text-xs" style={{ color: c("hp-ink-soft") }}>Next: Joseph T.</p>
          </div>
        </div>

        <ul className="mt-4 space-y-2 text-sm">
          {[["MA", "Marie A. paid her house levy", "2h"], ["JT", "Loan request reviewed by committee", "Yesterday"]].map(([i, t, w]) => (
            <li key={t} className="flex items-center gap-3 rounded-xl px-3 py-2" style={{ border: `1px solid ${c("hp-line")}` }}>
              <Avatar i={i} tone="hp-terracotta" /><span className="flex-1">{t}</span><span className="text-xs" style={{ color: c("hp-ink-soft") }}>{w}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="absolute -bottom-16 -left-4 w-56 rounded-2xl p-4 sm:-left-12" style={{ background: c("hp-paper"), boxShadow: "var(--hp-shadow-lg)", border: `1px solid ${c("hp-line")}` }}>
        <div className="flex items-center gap-2 text-sm font-medium"><CheckCircle2 className="h-4 w-4" style={{ color: c("hp-forest") }} /> Payment approved</div>
        <p className="mt-1 text-xs" style={{ color: c("hp-ink-soft") }}>MTN MoMo · 15,000 FCFA · verified by treasurer</p>
      </div>
      <div className="absolute -right-3 -top-5 hidden rounded-full px-4 py-2 text-xs font-medium sm:flex sm:items-center sm:gap-2" style={{ background: c("hp-gold"), color: c("hp-ink"), boxShadow: "var(--hp-shadow)" }}>
        <WifiOff className="h-3.5 w-3.5" /> Saved offline · syncs later
      </div>
    </div>
  );
}

export default function HomePreview() {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const lang = (i18n.language || "en").split("-")[0];
  const copy = COPY[lang] ?? COPY.en;
  const setLang = (code: string) => { i18n.changeLanguage(code); try { localStorage.setItem("preferredLanguage", code); } catch { /* ignore */ } };

  const btnPrimary = "inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-semibold transition-all hover:-translate-y-0.5";

  return (
    <div className="hp-root min-h-screen scroll-smooth">
      <SEO title="Kinsroot — Bring the family together (preview)" description="Design preview of the Kinsroot landing page." />
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;1,9..144,400&family=Instrument+Sans:wght@400;500;600&display=swap" />
      <style>{`html{scroll-behavior:smooth}@media (prefers-reduced-motion: reduce){html{scroll-behavior:auto}}`}</style>

      {/* Nav */}
      <header className="sticky top-0 z-40 backdrop-blur-md" style={{ background: c("hp-ivory", 0.82), borderBottom: `1px solid ${c("hp-line", 0.7)}` }}>
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-3 lg:px-8" aria-label="Main">
          <a href="#top" className="flex items-center gap-2.5">
            <img src="/logo.jpg" alt="Kinsroot Logo" width={36} height={36} className="h-9 w-9 rounded-full object-cover" />
            <span className="hp-serif text-xl font-medium">Kinsroot</span>
          </a>
          <ul className="hidden items-center gap-8 text-sm md:flex">
            {NAV.map((n) => <li key={n.href}><a href={n.href} className="transition-colors hover:opacity-100" style={{ color: c("hp-ink-soft") }}>{n.label}</a></li>)}
          </ul>
          <div className="hidden items-center gap-4 md:flex">
            <div className="flex rounded-full p-0.5 text-xs" role="group" aria-label="Language" style={{ border: `1px solid ${c("hp-line")}` }}>
              {LANGS.map((l) => <button key={l.code} onClick={() => setLang(l.code)} aria-pressed={lang === l.code} className="rounded-full px-2.5 py-1 font-medium transition-colors" style={lang === l.code ? { background: c("hp-forest"), color: c("hp-ivory") } : { color: c("hp-ink-soft") }}>{l.label}</button>)}
            </div>
            <Link to="/auth" className={btnPrimary} style={{ background: c("hp-forest"), color: c("hp-ivory") }}>Get started</Link>
          </div>
          <button className="md:hidden rounded-full p-2" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="hp-mobile-nav" aria-label={open ? "Close menu" : "Open menu"}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </nav>
        {open && (
          <div id="hp-mobile-nav" className="md:hidden px-5 pb-5" style={{ borderTop: `1px solid ${c("hp-line")}` }}>
            <ul className="space-y-1 py-3">{NAV.map((n) => <li key={n.href}><a href={n.href} onClick={() => setOpen(false)} className="block rounded-lg px-2 py-2.5">{n.label}</a></li>)}</ul>
            <div className="flex items-center justify-between gap-3">
              <div className="flex rounded-full p-0.5 text-xs" role="group" aria-label="Language" style={{ border: `1px solid ${c("hp-line")}` }}>
                {LANGS.map((l) => <button key={l.code} onClick={() => setLang(l.code)} aria-pressed={lang === l.code} className="rounded-full px-3 py-1.5" style={lang === l.code ? { background: c("hp-forest"), color: c("hp-ivory") } : {}}>{l.label}</button>)}
              </div>
              <Link to="/auth" className={btnPrimary} style={{ background: c("hp-forest"), color: c("hp-ivory") }}>Get started</Link>
            </div>
          </div>
        )}
      </header>

      <main id="top">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="hp-grain pointer-events-none absolute inset-0 opacity-60" aria-hidden />
          <svg className="pointer-events-none absolute -left-40 top-10 h-[520px] w-[520px] opacity-40" viewBox="0 0 200 200" aria-hidden><path fill={c("hp-sage")} d="M44.7,-58.6C57.3,-49.9,66.4,-35.4,70.3,-19.6C74.2,-3.8,72.9,13.3,65.6,27C58.3,40.6,45,50.8,30.4,58.4C15.8,66,-0.2,71,-16.6,68.6C-33,66.2,-49.8,56.5,-60.2,42.1C-70.6,27.7,-74.5,8.6,-70.6,-8.4C-66.7,-25.4,-55,-40.2,-41,-48.8C-27,-57.4,-13.5,-59.7,1.5,-61.6C16.5,-63.5,32.1,-67.3,44.7,-58.6Z" transform="translate(100 100)" /></svg>
          <div className="relative mx-auto grid max-w-7xl items-center gap-16 px-5 pb-24 pt-14 lg:grid-cols-[1.05fr_1fr] lg:px-8 lg:pb-32 lg:pt-20">
            <Reveal>
              <p className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium" style={{ background: c("hp-cream"), color: c("hp-forest") }}>
                <Sprout className="h-3.5 w-3.5" /> Rooted in Bota Land heritage · EN · FR · Bota
              </p>
              <h1 className="hp-serif mt-6 text-[2.6rem] font-medium leading-[1.04] sm:text-6xl lg:text-[4.4rem]">
                {copy.h1a}<br /><em className="font-normal" style={{ color: c("hp-terracotta") }}>{copy.h1b}</em>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-relaxed" style={{ color: c("hp-ink-soft") }}>{copy.sub}</p>
              <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link to="/auth" className={`${btnPrimary} px-7 py-3.5 text-base`} style={{ background: c("hp-forest"), color: c("hp-ivory"), boxShadow: "var(--hp-shadow)" }}>Get started free <ArrowRight className="h-4 w-4" /></Link>
                <a href="#platform" className="inline-flex items-center justify-center rounded-full px-6 py-3.5 text-base font-medium" style={{ border: `1px solid ${c("hp-line")}` }}>Explore the platform</a>
              </div>
              <p className="mt-8 flex items-center gap-2 text-sm" style={{ color: c("hp-ink-soft") }}>
                <ShieldCheck className="h-4 w-4" style={{ color: c("hp-forest") }} /> Private to your family. Every record visible to the people who should see it.
              </p>
            </Reveal>
            <Reveal delay={150}><ProductPreview /></Reveal>
          </div>
        </section>

        {/* Proof strip */}
        <section aria-label="Why families choose Kinsroot" style={{ background: c("hp-forest-deep"), color: c("hp-ivory") }}>
          <div className="mx-auto grid max-w-7xl gap-8 px-5 py-10 sm:grid-cols-3 lg:px-8">
            {[[Users, "Family-first", "Roles for heads, treasurers, secretaries and members."], [Landmark, "Transparent contributions", "Everyone sees the same record, with receipts."], [WifiOff, "Works offline", "Record at the meeting, sync when you reconnect."]].map(([I, t, d]) => {
              const Icon = I as typeof Users;
              return <div key={t as string} className="flex gap-4"><Icon className="mt-0.5 h-5 w-5 shrink-0" style={{ color: c("hp-gold") }} /><div><p className="font-semibold">{t as string}</p><p className="mt-1 text-sm opacity-75">{d as string}</p></div></div>;
            })}
          </div>
        </section>

        {/* Platform */}
        <section id="platform" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 lg:px-8 lg:py-32">
          <Reveal className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: c("hp-terracotta") }}>The platform</p>
            <h2 className="hp-serif mt-3 text-4xl font-medium leading-tight sm:text-5xl">Everything a family association runs on, in one calm place.</h2>
          </Reveal>
          <div className="mt-14 grid gap-5 lg:grid-cols-6">
            <Reveal className="lg:col-span-4 lg:row-span-2">
              <article className="hp-lift relative h-full overflow-hidden rounded-[28px] p-8 sm:p-10" style={{ background: c("hp-forest"), color: c("hp-ivory"), boxShadow: "var(--hp-shadow)" }}>
                <Calendar className="h-7 w-7" style={{ color: c("hp-gold") }} />
                <h3 className="hp-serif mt-6 text-3xl font-medium sm:text-4xl">Meetings that run themselves</h3>
                <p className="mt-3 max-w-md opacity-80">Plan the whole year of hosting in one go, build the agenda, check members in by QR, and let lateness fines and minutes follow automatically.</p>
                <div className="mt-8 grid max-w-md grid-cols-3 gap-3 text-center text-xs">
                  {[["Jan", "Mama Agnes"], ["Feb", "Uncle Peter"], ["Mar", "Ebude N."]].map(([m, h]) => (
                    <div key={m} className="rounded-xl p-3" style={{ background: c("hp-ivory", 0.1) }}><p className="hp-serif text-lg">{m}</p><p className="opacity-75">{h}</p></div>
                  ))}
                </div>
                <div className="pointer-events-none absolute -bottom-20 -right-20 h-64 w-64 rounded-full" style={{ background: c("hp-gold", 0.15) }} aria-hidden />
              </article>
            </Reveal>
            {[
              { I: RefreshCcw, t: "Njangi cycles", d: "Ballot the payout order and track every round.", bg: "hp-cream", span: "lg:col-span-2" },
              { I: PiggyBank, t: "Savings & loans", d: "Committee review, interest and deadlines built in.", bg: "hp-paper", span: "lg:col-span-2" },
              { I: HandHeart, t: "Family support", d: "Births, bereavement, sickness and joyful events — handled with care and clear rules.", bg: "hp-sage", span: "lg:col-span-3" },
              { I: ShieldCheck, t: "Verified payments", d: "MTN & Orange proofs reviewed before they reach the ledger.", bg: "hp-paper", span: "lg:col-span-3" },
            ].map(({ I, t, d, bg, span }, k) => (
              <Reveal key={t} delay={k * 80} className={span}>
                <article className="hp-lift h-full rounded-[24px] p-7" style={{ background: c(bg), border: `1px solid ${c("hp-line")}` }}>
                  <I className="h-6 w-6" style={{ color: c("hp-terracotta") }} />
                  <h3 className="hp-serif mt-5 text-2xl font-medium">{t}</h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: c("hp-ink-soft") }}>{d}</p>
                </article>
              </Reveal>
            ))}
          </div>
        </section>

        {/* Prosperity */}
        <section id="prosperity" className="scroll-mt-20" style={{ background: c("hp-cream") }}>
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 py-24 lg:grid-cols-2 lg:px-8 lg:py-28">
            <Reveal>
              <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: c("hp-terracotta") }}>Shared prosperity</p>
              <h2 className="hp-serif mt-3 text-4xl font-medium leading-tight sm:text-5xl">Every contribution tells a story.</h2>
              <p className="mt-5 max-w-lg text-lg leading-relaxed" style={{ color: c("hp-ink-soft") }}>A house levy, a njangi round, a gift for a newborn. Kinsroot keeps each one with its receipt and its reason, so the family’s growth is something everyone can see — and trust.</p>
            </Reveal>
            <Reveal delay={120}>
              <div className="rounded-[28px] p-7 sm:p-9" style={{ background: c("hp-paper"), boxShadow: "var(--hp-shadow)" }}>
                <p className="text-sm" style={{ color: c("hp-ink-soft") }}>Sample family fund · this year</p>
                <div className="mt-6 flex h-44 items-end gap-2 sm:gap-3" aria-hidden>
                  {[28, 36, 34, 48, 52, 60, 58, 70, 76, 84, 90, 100].map((h, i) => (
                    <div key={i} className="hp-bar flex-1 rounded-t-lg" style={{ height: `${h}%`, background: i === 11 ? c("hp-terracotta") : c("hp-forest", 0.25 + i * 0.06), transformOrigin: "bottom", animationName: "none" }} />
                  ))}
                </div>
                <div className="mt-6 grid grid-cols-3 gap-3 text-sm" style={{ borderTop: `1px solid ${c("hp-line")}` }}>
                  {[["Contributions", "hp-forest"], ["Njangi", "hp-gold"], ["Support fund", "hp-terracotta"]].map(([l, t]) => (
                    <p key={l} className="flex items-center gap-2 pt-4"><span className="h-2.5 w-2.5 rounded-full" style={{ background: c(t) }} />{l}</p>
                  ))}
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* How */}
        <section id="how" className="mx-auto max-w-7xl scroll-mt-20 px-5 py-24 lg:px-8 lg:py-28">
          <Reveal><h2 className="hp-serif text-4xl font-medium sm:text-5xl">Up and running in an afternoon.</h2></Reveal>
          <ol className="mt-14 grid gap-10 md:grid-cols-3">
            {[["Create your family space", "Name it, choose your currency and invite members by link or QR."], ["Assign the right roles", "Head, treasurer, secretary, committee — each sees what they need."], ["Run your first meeting", "Agenda, check-in, contributions and minutes, all recorded together."]].map(([t, d], i) => (
              <Reveal key={t} delay={i * 100}>
                <li className="relative pt-8" style={{ borderTop: `1px solid ${c("hp-ink", 0.2)}` }}>
                  <span className="hp-serif absolute -top-5 left-0 px-2 text-3xl" style={{ background: c("hp-ivory"), color: c("hp-terracotta") }}>0{i + 1}</span>
                  <h3 className="text-lg font-semibold">{t}</h3>
                  <p className="mt-2 leading-relaxed" style={{ color: c("hp-ink-soft") }}>{d}</p>
                </li>
              </Reveal>
            ))}
          </ol>
        </section>

        {/* Stories */}
        <section id="stories" className="scroll-mt-20 pb-24 lg:pb-28">
          <div className="mx-auto max-w-7xl px-5 lg:px-8">
            <Reveal className="flex flex-wrap items-end justify-between gap-4">
              <h2 className="hp-serif text-4xl font-medium sm:text-5xl">What families tell us they want.</h2>
              <span className="rounded-full px-3 py-1 text-xs font-medium" style={{ background: c("hp-cream"), color: c("hp-ink-soft") }}>Sample placeholder quotes</span>
            </Reveal>
            <div className="mt-12 grid gap-5 md:grid-cols-[1.3fr_1fr_1fr]">
              {[["“We used to argue over who paid what. Now everyone sees the same record.”", "Placeholder · Treasurer"], ["“Planning the year of hosting in one sitting changed our rhythm.”", "Placeholder · Family head"], ["“Our njangi payouts and reminders just work.”", "Placeholder · Diaspora member"]].map(([q, w], i) => (
                <Reveal key={w} delay={i * 80}>
                  <figure className="hp-lift h-full rounded-[24px] p-7" style={i === 0 ? { background: c("hp-terracotta"), color: c("hp-paper") } : { background: c("hp-paper"), border: `1px solid ${c("hp-line")}` }}>
                    <blockquote className={`hp-serif leading-snug ${i === 0 ? "text-2xl sm:text-3xl" : "text-xl"}`}>{q}</blockquote>
                    <figcaption className="mt-6 text-sm opacity-80">{w}</figcaption>
                  </figure>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="px-5 pb-20 lg:px-8">
          <Reveal className="relative mx-auto max-w-7xl overflow-hidden rounded-[36px] px-8 py-16 text-center sm:py-20" >
            <div className="absolute inset-0 -z-10" style={{ background: c("hp-forest-deep") }} />
            <div className="hp-grain absolute inset-0 -z-10 opacity-20" aria-hidden />
            <h2 className="hp-serif mx-auto max-w-2xl text-4xl font-medium sm:text-5xl" style={{ color: c("hp-ivory") }}>Give your family a home for what matters.</h2>
            <p className="mx-auto mt-4 max-w-lg" style={{ color: c("hp-ivory", 0.75) }}>Start with one meeting. Grow into everything else.</p>
            <Link to="/auth" className={`${btnPrimary} mt-9 px-8 py-4 text-base`} style={{ background: c("hp-gold"), color: c("hp-ink") }}>Get started <ArrowRight className="h-4 w-4" /></Link>
          </Reveal>
        </section>
      </main>

      <footer style={{ borderTop: `1px solid ${c("hp-line")}` }}>
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-5 py-8 text-sm sm:flex-row lg:px-8" style={{ color: c("hp-ink-soft") }}>
          <div className="flex items-center gap-2"><img src="/logo.jpg" alt="" width={24} height={24} className="h-6 w-6 rounded-full" /><span>Developed by Softserge. Copyright 2026 All rights reserved.</span></div>
          <div className="flex gap-5"><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><a href="mailto:softserge.dev@gmail.com">softserge.dev@gmail.com</a></div>
        </div>
      </footer>
    </div>
  );
}
