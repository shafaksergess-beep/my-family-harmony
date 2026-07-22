import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const EFFECTIVE_DATE = "July 22, 2026";

const Privacy = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Privacy Policy"
        description="How Kinsroot collects, uses, stores and protects personal, financial and family data across our web app, PWA and native mobile apps."
        canonical="https://kinsroot.softserge.com/privacy"
      />
      <main id="main-content" className="container mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8">
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Back to home</Link>
          </Button>
        </div>

        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-2">Privacy Policy</h1>
          <p className="text-muted-foreground mb-8">Effective date: {EFFECTIVE_DATE}</p>

          <section className="space-y-4 text-foreground/90">
            <p>
              This Privacy Policy explains how <strong>Kinsroot</strong> ("Kinsroot", "we", "us" or "our"),
              operated by <strong>Softserge</strong>, collects, uses, stores, discloses and protects
              information when you access our website at{" "}
              <a href="https://kinsroot.softserge.com" className="text-primary underline">kinsroot.softserge.com</a>,
              our Progressive Web App, and our Android and iOS mobile applications (collectively, the "Service").
            </p>
            <p>
              Kinsroot is a family management platform for extended families to run meetings, contributions,
              savings, rotating <em>njangi</em> schemes, loans, member assistance, shares and heritage
              records. Data is scoped per family and access is controlled by role-based permissions.
            </p>
          </section>

          <h2 className="text-2xl font-bold mt-10 mb-4">1. Data controller and contact</h2>
          <p>
            Softserge acts as the data controller for personal information you provide when you create a
            Kinsroot account. For data you contribute inside a family group (contributions, savings, loans,
            attendance, minutes, etc.), the <strong>family group and its leaders</strong> act as the primary
            controllers of that family's data, and Softserge acts as the processor operating the platform on
            their behalf.
          </p>
          <p>
            Contact: <a href="mailto:softserge.dev@gmail.com" className="text-primary underline">softserge.dev@gmail.com</a>
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">2. Information we collect</h2>
          <h3 className="text-xl font-semibold mt-6 mb-2">2.1 Information you provide</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Account data:</strong> first and last name, email address, phone number, password (hashed), preferred language, profile photo.</li>
            <li><strong>Family and membership data:</strong> family name and slug, house assignment, roles (member, family head, family admin, treasurer, loan committee, etc.), relationships, dates of birth, anniversaries.</li>
            <li><strong>Financial data:</strong> contributions, savings deposits, njangi turns and payouts, loan requests, repayments, surety commitments, fines, wallet balances, shares, dividends and assistance payouts (birth, death, sickness, joyful events).</li>
            <li><strong>Meeting data:</strong> agendas, minutes, votes, attendance check-ins, QR check-in timestamps, apologies, disciplinary records.</li>
            <li><strong>Communications:</strong> family chat messages, notification content, comments, assistance narratives.</li>
            <li><strong>Support content:</strong> messages you send to us or through in-app support flows.</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-2">2.2 Information collected automatically</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Authentication and session data:</strong> sign-in timestamps, session tokens, refresh tokens, provider identity when you use Google or Apple sign-in.</li>
            <li><strong>Device and technical data:</strong> IP address, browser type, operating system, device identifiers, app version, PWA install state, push notification tokens (FCM).</li>
            <li><strong>Usage data:</strong> pages viewed, features used, error and crash logs, offline sync events, install and update prompt outcomes.</li>
            <li><strong>Location data:</strong> approximate location derived from IP. We do not collect precise GPS location.</li>
            <li><strong>Cookies and local storage:</strong> for authentication, language preference, offline caching (IndexedDB), and PWA state. See section 10.</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-2">2.3 Information from third parties</h3>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Social sign-in:</strong> when you sign in with Google or Apple we receive your name, email and provider ID.</li>
            <li><strong>Contacts (optional, mobile):</strong> if you grant permission, we read device contacts locally to help match family members. Contact data is not uploaded unless you explicitly invite a contact.</li>
            <li><strong>Mobile money webhooks:</strong> when a payment is completed via MTN or Orange Money, the provider posts transaction status, reference and amount to us.</li>
            <li><strong>Bot protection:</strong> Google reCAPTCHA v3 provides risk scores on sensitive forms.</li>
          </ul>

          <h3 className="text-xl font-semibold mt-6 mb-2">2.4 Biometric data</h3>
          <p>
            Biometric authentication (fingerprint, Face ID) is handled entirely on your device by the
            operating system. Biometric data never leaves your device and is never transmitted to or stored
            by Kinsroot.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">3. How we use information</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Provide, operate and secure the Service and your family workspace.</li>
            <li>Authenticate users, enforce role-based permissions and prevent abuse.</li>
            <li>Record and reconcile financial transactions (contributions, savings, loans, njangi, shares, assistance, fines).</li>
            <li>Send transactional notifications (email, SMS, WhatsApp, push) for meetings, dues, late payments, loan decisions and assistance events, in line with your preferences.</li>
            <li>Generate reports, receipts, PDF exports and dashboards for members and leaders.</li>
            <li>Enable offline-first use through local caching and background sync.</li>
            <li>Improve reliability, diagnose errors, and analyze aggregated, non-identifying usage.</li>
            <li>Comply with legal obligations and enforce our Terms of Service.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-10 mb-4">4. Legal bases for processing</h2>
          <p>Where applicable law (including GDPR-style regimes) requires a legal basis, we rely on:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Contract:</strong> to provide the Service you or your family requested.</li>
            <li><strong>Legitimate interests:</strong> to secure the platform, prevent fraud, and improve the Service.</li>
            <li><strong>Consent:</strong> for optional features such as push notifications, contacts access, marketing communications and non-essential cookies.</li>
            <li><strong>Legal obligation:</strong> to respond to lawful requests and retain financial records where required.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-10 mb-4">5. Sharing and disclosure</h2>
          <p>We do not sell personal data. We share information only as follows:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Within your family group:</strong> content you post (contributions, savings, loan requests, meeting participation, chat, minutes) is visible to other members of that family according to their role and to our access rules.</li>
            <li><strong>Service providers (processors):</strong> hosting and database (Supabase / Lovable Cloud), push notifications (Firebase Cloud Messaging, Apple Push Notification service), email delivery, SMS/WhatsApp delivery, mobile money gateways (MTN, Orange), analytics and error logging, and reCAPTCHA. These providers process data on our instructions under contractual safeguards.</li>
            <li><strong>Native app stores:</strong> Google Play and the Apple App Store handle installation, updates and, if enabled, in-app purchases under their own privacy policies.</li>
            <li><strong>Legal and safety:</strong> to comply with law, lawful requests, or to protect the rights, property or safety of Kinsroot, our users or the public.</li>
            <li><strong>Business transfers:</strong> in connection with a merger, acquisition or asset sale, with continued protection of your data.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-10 mb-4">6. International data transfers</h2>
          <p>
            Your information may be processed and stored on servers located outside your country, including
            in regions where our infrastructure providers operate. Where required, we rely on appropriate
            safeguards such as standard contractual clauses.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">7. Data retention</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Account and profile data are retained for as long as your account is active.</li>
            <li>Financial ledgers (contributions, loans, savings, njangi, shares, assistance) are retained for the life of the family group and for a reasonable period afterwards to meet audit, reporting and dispute resolution needs.</li>
            <li>Deactivated families follow a soft-delete lifecycle with a 100-day grace period during which data can be restored, after which the family's operational data is purged in line with our retention schedule.</li>
            <li>Audit logs, security logs and backups are retained for a limited period necessary to secure the Service and satisfy legal obligations.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-10 mb-4">8. Security</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Data is isolated per family using Row Level Security (RLS) policies enforced at the database layer.</li>
            <li>Passwords are hashed; leaked-password protection (HIBP) is enabled.</li>
            <li>Sensitive operations require authentication; edge functions validate user roles and family membership.</li>
            <li>Transport is protected by TLS. Push notifications are delivered via authenticated provider channels.</li>
            <li>Bot protection (reCAPTCHA v3) is applied to sensitive forms.</li>
          </ul>
          <p className="text-sm text-muted-foreground">
            No system is completely secure. You are responsible for keeping your credentials and device safe.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">9. Your rights</h2>
          <p>Depending on where you live, you may have the right to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Access, correct, update or download your personal data.</li>
            <li>Delete your account and associated personal profile data.</li>
            <li>Object to or restrict certain processing, or withdraw consent.</li>
            <li>Port your data to another service.</li>
            <li>Lodge a complaint with your local data protection authority.</li>
          </ul>
          <p>
            You can manage your profile, linked accounts and notification preferences inside the app. To
            exercise other rights, contact us at{" "}
            <a href="mailto:softserge.dev@gmail.com" className="text-primary underline">softserge.dev@gmail.com</a>.
            Some financial and audit records may need to be retained for legitimate business or legal reasons
            even after account deletion.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">10. Cookies and local storage</h2>
          <p>
            We use cookies, local storage and IndexedDB to keep you signed in, remember your language, cache
            data for offline use, and improve reliability. You can clear this data through your browser or
            device settings; doing so may sign you out and remove offline data.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">11. Children</h2>
          <p>
            Kinsroot is intended for use by adults and by minors under the supervision of a parent, guardian
            or family leader. If you believe a child has provided personal data without appropriate
            authorization, contact us and we will take reasonable steps to delete it.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">12. Third-party links and services</h2>
          <p>
            The Service may link to third-party sites or rely on third-party services (payment gateways,
            OAuth providers). Their privacy practices are governed by their own policies.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">13. Changes to this policy</h2>
          <p>
            We may update this Privacy Policy from time to time. Material changes will be communicated
            through the app or by email. The "Effective date" above indicates when the latest version took
            effect.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">14. Contact us</h2>
          <p>
            Questions or requests about this policy: <a href="mailto:softserge.dev@gmail.com" className="text-primary underline">softserge.dev@gmail.com</a>.
          </p>

          <p className="mt-12 text-sm text-muted-foreground">
            See also our <Link to="/terms" className="text-primary underline">Terms of Service</Link>.
          </p>
        </article>
      </main>
    </div>
  );
};

export default Privacy;
