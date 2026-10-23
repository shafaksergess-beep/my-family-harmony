import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const EFFECTIVE_DATE = "October 24, 2026";
const MAIL = "softserge.dev@gmail.com";
const WA = "https://wa.me/4571861759";

const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="text-2xl font-bold mt-10 mb-4">{children}</h2>;
const H3 = ({ children }: { children: React.ReactNode }) => <h3 className="text-xl font-semibold mt-6 mb-2">{children}</h3>;
const UL = ({ children }: { children: React.ReactNode }) => <ul className="list-disc pl-6 space-y-2">{children}</ul>;
const A = ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href} className="text-primary underline" target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{children}</a>;

const Terms = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Terms of Service"
      description="How to use Kinsroot and the conditions for families, associations and njangi/tontine groups: accounts, roles, payments, loans, meetings and more."
      canonical="https://kinsroot.softserge.com/terms"
    />
    <main id="main-content" className="container mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Back to home</Link></Button>
      </div>

      <article className="prose prose-slate dark:prose-invert max-w-none text-foreground/90">
        <h1 className="text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Effective date: {EFFECTIVE_DATE}</p>

        <p>
          These Terms govern your use of <strong>Kinsroot</strong>, a product of <strong>Softserge</strong>, on the web
          ({" "}<A href="https://kinsroot.softserge.com">kinsroot.softserge.com</A>), as an installed web app and in our
          Android and iOS apps (the "Service"). By creating an account or joining a group you accept these Terms and our
          {" "}<Link to="/privacy" className="text-primary underline">Privacy Policy</Link>.
        </p>

        <H2>1. What Kinsroot is — and is not</H2>
        <p>Kinsroot is an organising and record-keeping tool for <strong>families, associations/communities and njangi/tontine groups</strong>. It helps you manage members, meetings, dues, savings, njangi rotations, loans, assistance, shares, chat and calendars.</p>
        <p><strong>Kinsroot is not a bank, lender, money transfer service, insurer or investment adviser.</strong> It does not hold, send or receive money and does not guarantee savings, loan approval, payouts or returns. Money moves between members through their own Mobile Money, bank or cash arrangements.</p>

        <H2>2. Your account</H2>
        <UL>
          <li>You must be an adult (18+, or the age of majority where you live). Minors may only be listed and supervised by a parent, guardian or group leader.</li>
          <li>Sign up with email and password, Google or Apple. Give accurate details and keep them current.</li>
          <li>Keep your password and devices secure. Review your Active Sessions and sign out devices you don't recognise.</li>
          <li>Tell us immediately at <A href={`mailto:${MAIL}`}>{MAIL}</A> if you suspect misuse.</li>
        </UL>

        <H2>3. How to use Kinsroot</H2>
        <H3>3.1 Join or create a group</H3>
        <UL>
          <li><strong>Join:</strong> accept an invitation (link, QR code, reference code or WhatsApp share) or send a join request that a leader approves.</li>
          <li><strong>Create:</strong> choose a group type — Family, Association/Community or Njangi/Tontine — then name it and set the currency. The creator becomes Family Head (group leader). Groups may also be set up by our onboarding team.</li>
          <li><strong>14-day rule:</strong> a newly created group must have at least two members within 14 days. Reminders are sent at 7, 3 and 1 days remaining. If no second member joins, the group is suspended; if still inactive 30 days after suspension, it is deleted. A second member joining reactivates it.</li>
        </UL>
        <H3>3.2 Roles</H3>
        <UL>
          <li><strong>Family Head / Family Admin:</strong> configure the group, invite and remove members, assign roles, set the default language and switch modules on or off.</li>
          <li><strong>Treasurer / Financial Secretary:</strong> record and review payments, dues, savings and payment proofs.</li>
          <li><strong>Secretary:</strong> manage meetings, agendas, minutes and attendance.</li>
          <li><strong>Loan Committee:</strong> review and recommend loan requests.</li>
          <li><strong>Member / Guest:</strong> view their records, pay dues, submit proofs, attend meetings and chat.</li>
        </UL>
        <p>Leaders are responsible for assigning roles fairly and for the rules they set.</p>
        <H3>3.3 Modules</H3>
        <p>Leaders can switch modules (for example loans, njangi, shares, chat) on or off for their group. Switching a module off hides it but does not delete its records.</p>
        <H3>3.4 Paying dues and submitting proof</H3>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Open <strong>Payment proofs</strong>, choose MTN Mobile Money or Orange Money and follow the receiving number and instructions set by your leaders.</li>
          <li>Pay from your own phone, outside Kinsroot.</li>
          <li>Upload a clear photo or screenshot of the receipt (max 10 MB), confirm the amount, reference, date and reason.</li>
          <li>Kinsroot suggests details read from the image; you must check them. Authorised reviewers then approve or reject. Ordinary contributions need one reviewer; loans, savings withdrawals and high-value payments need two.</li>
          <li>Your status shows as Pending review, Awaiting second approval, Approved or Rejected. Only an approved proof is recorded in the group ledger.</li>
        </ol>
        <p>Never share your Mobile Money PIN or codes. Submitting a fake, edited or duplicate receipt is fraud and leads to removal and may be reported.</p>
        <H3>3.5 Savings, njangi, loans and assistance</H3>
        <UL>
          <li><strong>Savings</strong> recorded by members require leader approval.</li>
          <li><strong>Njangi/tontine</strong> payout order is set by the group (for example by balloting). The group, not Kinsroot, is responsible for making payouts.</li>
          <li><strong>Loans</strong> are private agreements between the group and its members. Eligibility, interest, sureties and deadlines (such as clearing loans by November) are set by the group. Sureties may have defaults deducted from their entitlements according to group rules.</li>
          <li><strong>Assistance</strong> (birth, death, sickness, joyful events) follows the amounts and limits your group sets, such as sickness assistance once per calendar year.</li>
          <li>Amounts shown in Kinsroot are records entered by members and leaders; they are only as accurate as those entries.</li>
        </UL>
        <H3>3.6 Meetings</H3>
        <p>Leaders schedule meetings; members receive reminders and check in by QR code. Lateness and absence fines are set by the group. Minutes, votes and AI-generated summaries should be checked by the secretary before being relied upon.</p>
        <H3>3.7 Chat, WhatsApp and notifications</H3>
        <p>Group chat is visible to group members. WhatsApp buttons simply open WhatsApp with a pre-filled message you choose to send; WhatsApp's own terms apply. Notifications (in-app, push, email) can be adjusted in settings, but some essential account and security messages cannot be turned off.</p>
        <H3>3.8 Offline use</H3>
        <p>Kinsroot caches data so you can keep working with a weak connection. Changes made offline sync when you reconnect; if two people change the same record, the latest saved change may apply.</p>

        <H2>4. Rules of conduct</H2>
        <p>You must not:</p>
        <UL>
          <li>Break the law, defraud, harass, threaten or discriminate against anyone.</li>
          <li>Submit false records or receipts, impersonate others, or claim a role you were not given.</li>
          <li>Access groups or data you are not authorised to see, or try to bypass security.</li>
          <li>Use the Service for money laundering, terrorist financing, illegal lending or schemes that promise guaranteed returns.</li>
          <li>Upload malware, scrape the Service, or overload it.</li>
          <li>Share your account or resell access.</li>
        </UL>

        <H2>5. Your content</H2>
        <p>You own what you post. You allow Softserge to store, process and display it only to run the Service for you and your group. You confirm you have the right to post it, including other people's information you add.</p>

        <H2>6. Support</H2>
        <p>Contact us by email at <A href={`mailto:${MAIL}`}>{MAIL}</A> or WhatsApp at <A href={WA}>+45 71861759</A>. Our support team can view your account and membership information to help you but cannot change your group's financial records. We will never ask for your password, PIN or one-time codes.</p>

        <H2>7. Fees</H2>
        <p>The Service is currently free to use. If we introduce paid plans we will tell you in advance and you can choose whether to subscribe. Your Mobile Money provider may charge its own fees for transfers you make.</p>

        <H2>8. Suspension, deletion and ending use</H2>
        <UL>
          <li>You can delete your account at any time from Profile. Group financial records are kept in anonymised form and amounts you owe the group are not cancelled.</li>
          <li>Leaders may remove members from their group.</li>
          <li>Groups deactivated by leaders can be restored for 100 days, then are deleted.</li>
          <li>We may suspend or close accounts or groups that break these Terms, put others at risk, or where the law requires.</li>
        </UL>

        <H2>9. Intellectual property</H2>
        <p>The Kinsroot name, tree logo, software, design and documentation belong to Softserge. You may use the Service only as these Terms allow.</p>

        <H2>10. Disclaimers</H2>
        <p>The Service is provided "as is". We work hard to keep it available and accurate but do not promise it will be uninterrupted or error-free. Automated features (receipt reading, summaries, insights) may make mistakes and must be checked by people. Disputes between members about money or group rules must be settled within the group.</p>

        <H2>11. Limitation of liability</H2>
        <p>To the extent the law allows, Softserge is not liable for indirect or consequential losses, or for losses caused by members, leaders, payment providers or group decisions. Our total liability is limited to the greater of what you paid us in the past 12 months or USD 50. Nothing here limits rights you have under mandatory consumer law.</p>

        <H2>12. Indemnity</H2>
        <p>You will compensate Softserge for claims arising from your misuse of the Service or breach of these Terms.</p>

        <H2>13. Governing law</H2>
        <p>We will first try to resolve any dispute informally. These Terms are governed by the laws of the Republic of Cameroon, and disputes go to the competent courts of Cameroon, unless mandatory law where you live provides otherwise.</p>

        <H2>14. Changes</H2>
        <p>We may update the Service and these Terms. We will announce important changes in the app or by email; continuing to use Kinsroot means you accept them.</p>

        <H2>15. Contact</H2>
        <p>Softserge — <A href={`mailto:${MAIL}`}>{MAIL}</A> · WhatsApp <A href={WA}>+45 71861759</A></p>

        <p className="mt-12 text-sm text-muted-foreground">See also our <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>.</p>
      </article>
    </main>
  </div>
);

export default Terms;
