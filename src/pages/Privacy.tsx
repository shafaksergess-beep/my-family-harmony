import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const EFFECTIVE_DATE = "October 24, 2026";
const MAIL = "softserge.dev@gmail.com";
const WA = "https://wa.me/4571861759";

const H2 = ({ children }: { children: React.ReactNode }) => <h2 className="text-2xl font-bold mt-10 mb-4">{children}</h2>;
const H3 = ({ children, id }: { children: React.ReactNode; id?: string }) => <h3 id={id} className="text-xl font-semibold mt-6 mb-2">{children}</h3>;
const UL = ({ children }: { children: React.ReactNode }) => <ul className="list-disc pl-6 space-y-2">{children}</ul>;
const A = ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href} className="text-primary underline" target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">{children}</a>;

const Privacy = () => (
  <div className="min-h-screen bg-background">
    <SEO
      title="Privacy Policy"
      description="How Kinsroot collects, uses, stores and protects personal, financial and group data for families, associations and njangi/tontine groups."
      canonical="https://kinsroot.softserge.com/privacy"
    />
    <main id="main-content" className="container mx-auto max-w-4xl px-4 py-10">
      <div className="mb-8">
        <Button asChild variant="ghost" size="sm"><Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Back to home</Link></Button>
      </div>

      <article className="prose prose-slate dark:prose-invert max-w-none text-foreground/90">
        <h1 className="text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Effective date: {EFFECTIVE_DATE}</p>

        <p>
          This Privacy Policy explains how <strong>Kinsroot</strong> ("Kinsroot", "we", "us"), a product of
          <strong> Softserge</strong>, collects, uses, shares and protects information when you use our website
          {" "}<A href="https://kinsroot.softserge.com">kinsroot.softserge.com</A> (and kinsroot.softgroupsolutions.com),
          the installable web app, and our Android and iOS apps (together, the "Service").
        </p>
        <p>
          Kinsroot helps <strong>families, associations/communities and njangi/tontine groups</strong> ("groups")
          organise members, meetings, contributions, savings, rotating njangi, loans, mutual assistance, shares,
          chat and calendars. <strong>Kinsroot does not hold, move or process money.</strong> Members pay each other
          outside the app (for example via MTN Mobile Money or Orange Money) and Kinsroot keeps the records.
        </p>

        <H2>1. Who is responsible for your data</H2>
        <p>
          Softserge is the controller of your account data (name, sign-in details, preferences). For records created
          inside a group (contributions, savings, loans, attendance, minutes, payment proofs), the <strong>group and
          its leaders</strong> decide what is recorded and why; Softserge operates the platform on their behalf.
          Contact: <A href={`mailto:${MAIL}`}>{MAIL}</A> or WhatsApp <A href={WA}>+45 71861759</A>.
        </p>

        <H2>2. Information we collect</H2>
        <H3>2.1 Information you give us</H3>
        <UL>
          <li><strong>Account:</strong> full name, email, phone number, password (stored only as a secure hash), profile photo, preferred language.</li>
          <li><strong>Group membership:</strong> group name and type (family, association or tontine), house/branch, roles (family head, family admin, treasurer, secretary, loan committee, member, guest), house representative status, birthdays and anniversaries you choose to add.</li>
          <li><strong>Financial records:</strong> dues and contributions, savings and withdrawals, njangi turns and payouts, loan requests, repayments and sureties, fines, wallet balances, shares and dividends, assistance requests and payouts (birth, death, sickness, joyful events).</li>
          <li><strong>Payment proofs:</strong> when you report a Mobile Money payment you upload a screenshot or photo of the receipt plus the amount, reference, date, provider (MTN/Orange) and reason. See section 3.</li>
          <li><strong>Meetings:</strong> agendas, minutes, votes, QR check-in times, attendance, apologies and fines.</li>
          <li><strong>Messages:</strong> group chat messages and attachments, comments, support requests sent by email or WhatsApp.</li>
          <li><strong>Settings:</strong> notification preferences, group default language, which modules a group has switched on or off, Mobile Money receiving numbers configured by leaders.</li>
        </UL>

        <H3>2.2 Information collected automatically</H3>
        <UL>
          <li><strong>Sign-in and sessions:</strong> sign-in times, active sessions and devices (browser, operating system, approximate location from IP) so you can review them in Active Sessions.</li>
          <li><strong>Device and app:</strong> app version, install status, push notification token, error and crash logs.</li>
          <li><strong>Usage:</strong> pages and features used, used in aggregate to improve the Service.</li>
          <li><strong>Audit trail:</strong> who created, changed, approved or rejected sensitive records and when, so groups can resolve disputes.</li>
          <li><strong>Local storage on your device:</strong> sign-in state, language, and cached data so the app opens quickly and works offline. Offline changes are synced when you reconnect.</li>
        </UL>
        <p>We do not collect precise GPS location. We do not access your camera, photos or contacts unless you choose to scan a QR code, upload a receipt or invite a contact.</p>

        <H3>2.3 Information from others</H3>
        <UL>
          <li><strong>Google and Apple sign-in:</strong> your name, email and an account identifier. With Apple you may use a private relay email.</li>
          <li><strong>Other group members:</strong> leaders may add you, assign roles, record payments on your behalf or invite you by email, phone or WhatsApp.</li>
          <li><strong>Bot protection:</strong> Google reCAPTCHA provides a risk score on sensitive forms.</li>
        </UL>

        <H2>3. Payment proofs and automatic reading of receipts</H2>
        <UL>
          <li>Receipts are stored privately and are visible only to you and the leaders authorised to review payments for your group (family head, family admin, treasurer/financial secretary).</li>
          <li>An automated reading tool extracts suggested details (amount, reference, date, sender/recipient) from the image. You confirm these details; they are never used to credit anyone automatically.</li>
          <li>A human reviewer approves or rejects every proof. Loans, savings withdrawals and high-value payments require two reviewers. Only approval creates a ledger entry.</li>
          <li>We check for duplicate references and mismatched amounts to prevent fraud.</li>
          <li><strong>We will never ask for your Mobile Money PIN or one-time codes.</strong> Do not include them in any upload.</li>
        </UL>

        <H2>4. How we use information</H2>
        <UL>
          <li>Run your account and your groups, and enforce each role's permissions.</li>
          <li>Keep accurate group records, reports, receipts and PDF exports.</li>
          <li>Send notifications you need — in-app, push, and email — about meetings (7 days, the morning of, 24 hours, 1 hour and 15 minutes before), dues, late payments, payment proof decisions, loans and assistance, in your chosen language.</li>
          <li>Manage the new-group lifecycle: a newly created group must add a second member within 14 days; we send reminders, then suspend and later delete inactive groups as described in the Terms.</li>
          <li>Provide support, including through WhatsApp when you contact us there.</li>
          <li>Secure the Service, detect abuse and fix errors.</li>
          <li>Meet legal obligations.</li>
        </UL>
        <p>We do not sell your data and we do not use your financial records for advertising.</p>

        <H2>5. WhatsApp</H2>
        <p>
          Kinsroot offers "click-to-chat" WhatsApp buttons: to contact our support line (+45 71861759), to share an
          invitation, or to message a fellow member. These open WhatsApp on your device with a pre-filled message
          that you choose whether to send. Kinsroot does not send WhatsApp messages on your behalf and does not read
          your WhatsApp conversations. Messages you send through WhatsApp are also subject to WhatsApp's own privacy policy.
        </p>

        <H2>6. Who can see your data</H2>
        <UL>
          <li><strong>Your group:</strong> members see what their role allows. Ordinary members see their own financial records and group-wide information such as meetings and chat; finance roles and leaders see what they need to manage the group.</li>
          <li><strong>Kinsroot support team:</strong> authorised support staff have read-only access to account and membership information to help you; they cannot change financial records.</li>
          <li><strong>Kinsroot administrators:</strong> a small number of Softserge administrators can manage groups and accounts to operate the platform. Their actions are logged.</li>
          <li><strong>Service providers</strong> who process data for us under contract: secure cloud hosting and database, file storage, email delivery, push notifications (Google Firebase, Apple Push Notification service), automated receipt reading, sign-in (Google, Apple), and bot protection (reCAPTCHA).</li>
          <li><strong>Legal reasons:</strong> when required by law or to protect people's safety or rights.</li>
        </UL>
        <p>Data from one group is never visible to other groups.</p>

        <H2>7. International transfers</H2>
        <p>Our providers may store data outside your country (for example in the European Union or United States). We use providers with appropriate safeguards.</p>

        <H2>8. How long we keep data</H2>
        <UL>
          <li>Account data: while your account is active.</li>
          <li>Group financial records: for the life of the group and as needed for audits and disputes.</li>
          <li>New groups that never reach two members: suspended after 14 days and deleted 30 days after suspension.</li>
          <li>Groups deactivated by their leaders: restorable for 100 days, then deleted.</li>
          <li>Payment proof images: kept with the related record while the group exists.</li>
          <li>Security and audit logs and backups: for a limited period to keep the Service secure.</li>
        </UL>

        <H2>9. Security</H2>
        <UL>
          <li>Each group's data is isolated with database-level access rules.</li>
          <li>Encrypted connections (HTTPS) everywhere; passwords hashed and checked against known leaked passwords.</li>
          <li>Private, permission-checked storage for receipts and files.</li>
          <li>Active session review and the option to sign out other devices.</li>
          <li>Two-reviewer approval for sensitive payments and a full audit trail.</li>
        </UL>
        <p className="text-sm text-muted-foreground">No system is perfectly secure. Keep your password and device safe.</p>

        <H2>10. Your rights</H2>
        <p>You can access and correct your profile, change notification and language settings, review and end sessions, and delete your account in the app. You may also ask us for a copy of your data, to restrict or object to processing, or complain to your data protection authority (in Cameroon, Law No. 2024/017 on personal data protection; in Europe, the GDPR). Contact <A href={`mailto:${MAIL}`}>{MAIL}</A>.</p>

        <H3 id="delete-account">10.1 How to delete your account</H3>
        <ol className="list-decimal pl-6 space-y-2">
          <li>Sign in and open <strong>Profile</strong>.</li>
          <li>Choose <strong>Delete account</strong>, type <code>DELETE</code> and confirm. You must have signed in within the last 15 minutes.</li>
          <li>If you cannot sign in, email <A href={`mailto:${MAIL}?subject=Kinsroot%20account%20deletion`}>{MAIL}</A> from your account email with the subject "Kinsroot account deletion". We respond within 30 days.</li>
        </ol>
        <p><strong>Deleted:</strong> sign-in details, sessions, profile (name, email, phone, photo), chat messages, notifications and uploaded files. <strong>Kept in anonymised form:</strong> group financial records, so your group's accounts remain correct. Deleting your account does not cancel amounts you owe your group.</p>

        <H2>11. Children</H2>
        <p>Kinsroot is for adults. Minors may only be listed by, and use the Service under the supervision of, a parent, guardian or group leader.</p>

        <H2>12. Changes</H2>
        <p>We will announce important changes in the app or by email. The effective date above shows the latest version.</p>

        <H2>13. Contact</H2>
        <p>Softserge — <A href={`mailto:${MAIL}`}>{MAIL}</A> · WhatsApp <A href={WA}>+45 71861759</A></p>

        <p className="mt-12 text-sm text-muted-foreground">See also our <Link to="/terms" className="text-primary underline">Terms of Service</Link>.</p>
      </article>
    </main>
  </div>
);

export default Privacy;
