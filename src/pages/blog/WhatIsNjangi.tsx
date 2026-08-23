import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Users, Shield, TrendingUp, Calendar, Wallet, CheckCircle2 } from "lucide-react";

const structuredData = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "What Is a Njangi? A Complete Guide to Rotating Savings for Families",
  description:
    "Learn what a njangi is, how rotating savings and credit associations work, and how diaspora families can digitize their traditional savings groups with Kinsroot.",
  author: { "@type": "Organization", name: "Kinsroot" },
  publisher: {
    "@type": "Organization",
    name: "Kinsroot",
    logo: {
      "@type": "ImageObject",
      url: "https://kinsroot.softserge.com/logo.jpg",
    },
  },
  datePublished: "2026-07-11",
  dateModified: "2026-07-11",
  mainEntityOfPage: "https://kinsroot.softserge.com/blog/what-is-njangi",
};

export default function WhatIsNjangi() {
  return (
    <>
      <SEO
        title="What Is a Njangi? A Guide to Rotating Savings for Families"
        description="Learn what a njangi is, how rotating savings work in Cameroonian and West African families, and how to digitize your family's njangi with Kinsroot."
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <div className="min-h-screen bg-background">
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-4 h-4" /> Back to Kinsroot
            </Link>
            <Link to="/auth">
              <Button size="sm">Get Started Free</Button>
            </Link>
          </div>
        </header>

        <article className="container mx-auto px-4 py-12 max-w-3xl">
          <nav aria-label="Breadcrumb" className="text-xs text-muted-foreground mb-4">
            <Link to="/" className="hover:underline">Home</Link> <span className="mx-1">/</span>
            <span>Blog</span> <span className="mx-1">/</span>
            <span>What Is a Njangi</span>
          </nav>

          <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
            What Is a Njangi? A Complete Guide to Rotating Savings for Families
          </h1>
          <p className="text-lg text-muted-foreground mb-8">
            A practical guide for Cameroonian and West African diaspora families who want to
            keep the tradition of njangi alive — and manage it without spreadsheets, missed
            turns, or awkward money conversations.
          </p>

          <section className="prose prose-slate dark:prose-invert max-w-none">
            <h2 className="text-2xl font-semibold mt-8 mb-3">What is a njangi?</h2>
            <p>
              A <strong>njangi</strong> (sometimes spelled <em>njangui</em> or <em>tontine</em>)
              is a rotating savings and credit association (ROSCA) practiced across Cameroon
              and West Africa. A trusted group of family members or friends contributes a
              fixed amount on a fixed schedule — weekly, fortnightly, or monthly — and each
              cycle the full pot is handed to one member. Rotation continues until every
              member has received a payout.
            </p>
            <p>
              Njangis have funded weddings, school fees, land purchases, funerals and
              business ideas for generations. They work because they replace formal banking
              with something stronger: <strong>social trust</strong>.
            </p>

            <h2 className="text-2xl font-semibold mt-10 mb-3">How a njangi works</h2>
            <ol className="list-decimal ml-6 space-y-2">
              <li>A group of members agrees on a contribution amount and cycle length.</li>
              <li>Everyone pays into the pot on the agreed date.</li>
              <li>One member (chosen by ballot, seniority, or need) collects the whole pot.</li>
              <li>The cycle repeats until every member has had their turn.</li>
              <li>A treasurer records contributions, defaults, and payouts.</li>
            </ol>

            <h2 className="text-2xl font-semibold mt-10 mb-3">Why families still love the njangi</h2>
            <div className="grid sm:grid-cols-2 gap-4 not-prose my-6">
              <Feature icon={<Users className="w-5 h-5" />} title="Built on trust">
                Members are family or long-term friends — accountability is personal.
              </Feature>
              <Feature icon={<Wallet className="w-5 h-5" />} title="No interest, no bank">
                You get access to a lump sum without loans or fees.
              </Feature>
              <Feature icon={<Shield className="w-5 h-5" />} title="Forced discipline">
                A social commitment is much harder to skip than a personal savings goal.
              </Feature>
              <Feature icon={<TrendingUp className="w-5 h-5" />} title="Funds big goals">
                Ideal for school fees, land, weddings, funerals, or seed capital.
              </Feature>
            </div>

            <h2 className="text-2xl font-semibold mt-10 mb-3">The problems diaspora families face</h2>
            <p>
              When family members live across Douala, Yaoundé, London, Paris, Toronto and
              Washington, the traditional cashbook stops working. The common pain points:
            </p>
            <ul className="list-disc ml-6 space-y-1">
              <li>Contributions arrive across timezones and currencies (XAF, EUR, GBP, USD).</li>
              <li>Nobody agrees on who is next to collect the pot.</li>
              <li>Paper records get lost; WhatsApp screenshots aren't proof.</li>
              <li>Late payers create tension and slow the entire rotation.</li>
              <li>Fines, savings, loans, and assistance events end up in five spreadsheets.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-10 mb-3">
              How to digitize your family's njangi with Kinsroot
            </h2>
            <p>
              <Link to="/" className="text-primary underline">Kinsroot</Link> is a family
              management platform designed around the exact way Cameroonian families run
              their njangis, meetings and financial life. Here's how it replaces the
              cashbook:
            </p>

            <div className="space-y-4 not-prose my-6">
              <Step icon={<Calendar className="w-5 h-5" />} title="Rotating payout order">
                The built-in Balloting module fixes the collection order for the year and
                shows every member when their turn arrives — no more disputes.
              </Step>
              <Step icon={<Wallet className="w-5 h-5" />} title="Track every contribution">
                Members pay via mobile money (MTN, Orange), card, or manual entry. The
                treasurer approves each entry and the pot balance updates in real time.
              </Step>
              <Step icon={<CheckCircle2 className="w-5 h-5" />} title="Automatic reminders">
                Push, email and SMS reminders go out before each contribution date, so the
                treasurer stops chasing people over WhatsApp.
              </Step>
              <Step icon={<Shield className="w-5 h-5" />} title="Fines and accountability">
                Late payments and missed meetings can carry configurable fines that deduct
                straight from the member's wallet — the way traditional njangis work.
              </Step>
              <Step icon={<TrendingUp className="w-5 h-5" />} title="Beyond njangi">
                The same family can also run savings groups, loans with surety, shares and
                dividends, and assistance funds for births, weddings, sickness and funerals.
              </Step>
            </div>

            <h2 className="text-2xl font-semibold mt-10 mb-3">Best practices for a healthy njangi</h2>
            <ul className="list-disc ml-6 space-y-1">
              <li>Write down the rules before the first contribution — Kinsroot stores them.</li>
              <li>Pick a treasurer and an auditor. Never the same person.</li>
              <li>Agree on fines for lateness and defaults up front.</li>
              <li>Use one currency of record even if members pay in several.</li>
              <li>Publish the payout order at the start of the cycle.</li>
              <li>Keep a paper trail — receipts and PDFs for every payout.</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-10 mb-3">Frequently asked questions</h2>
            <h3 className="text-lg font-semibold mt-4">Is a njangi legal?</h3>
            <p>Yes. ROSCAs are legal in every country where they are practiced, provided contributions are between private members with no public solicitation.</p>
            <h3 className="text-lg font-semibold mt-4">What happens if a member defaults?</h3>
            <p>The group's rules decide — usually a surety covers the shortfall and the defaulter loses their turn or is fined. Kinsroot supports the surety model out of the box.</p>
            <h3 className="text-lg font-semibold mt-4">Can we run a njangi across multiple countries?</h3>
            <p>Yes — that is exactly what Kinsroot was built for. Members contribute in their local currency and the app converts to your family's chosen currency of record.</p>
          </section>

          <div className="mt-12 p-6 rounded-lg border bg-card text-card-foreground">
            <h2 className="text-xl font-semibold mb-2">Ready to run your family njangi in one place?</h2>
            <p className="text-muted-foreground mb-4">
              Set up your family, invite members, and start your first rotation in minutes.
            </p>
            <Link to="/auth">
              <Button size="lg">Start your family on Kinsroot</Button>
            </Link>
          </div>
        </article>
      </div>
    </>
  );
}

function Feature({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-2 text-primary mb-1">{icon}<span className="font-semibold text-foreground">{title}</span></div>
      <p className="text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function Step({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-3 p-4 rounded-lg border bg-card">
      <div className="text-primary shrink-0 mt-0.5">{icon}</div>
      <div>
        <div className="font-semibold">{title}</div>
        <p className="text-sm text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}
