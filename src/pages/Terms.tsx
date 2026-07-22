import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const EFFECTIVE_DATE = "July 22, 2026";

const Terms = () => {
  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Terms of Service"
        description="The terms that govern your use of Kinsroot, the family management platform for meetings, contributions, savings, njangi, loans, assistance and heritage."
        canonical="https://kinsroot.softserge.com/terms"
      />
      <main id="main-content" className="container mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8">
          <Button asChild variant="ghost" size="sm">
            <Link to="/"><ArrowLeft className="h-4 w-4 mr-2" />Back to home</Link>
          </Button>
        </div>

        <article className="prose prose-slate dark:prose-invert max-w-none">
          <h1 className="text-4xl font-bold text-foreground mb-2">Terms of Service</h1>
          <p className="text-muted-foreground mb-8">Effective date: {EFFECTIVE_DATE}</p>

          <section className="space-y-4 text-foreground/90">
            <p>
              These Terms of Service ("Terms") govern your access to and use of{" "}
              <strong>Kinsroot</strong> ("Kinsroot", "we", "us" or "our"), operated by <strong>Softserge</strong>,
              including the website at{" "}
              <a href="https://kinsroot.softserge.com" className="text-primary underline">kinsroot.softserge.com</a>,
              the Progressive Web App, and our Android and iOS mobile applications (collectively, the "Service").
            </p>
            <p>
              By creating an account, joining a family group, or otherwise using the Service, you agree to
              these Terms and to our{" "}
              <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>. If you do not
              agree, do not use the Service.
            </p>
          </section>

          <h2 className="text-2xl font-bold mt-10 mb-4">1. The Service</h2>
          <p>
            Kinsroot is a family management platform that helps extended families organize meetings,
            record contributions, run rotating savings (<em>njangi</em>), manage loans and surety, track
            attendance, coordinate member assistance for life events, distribute shares and dividends, and
            preserve heritage records. Data is scoped per family group and access is enforced by role-based
            permissions.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">2. Eligibility and accounts</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>You must be of legal age in your jurisdiction to create an account, or use the Service under the supervision of a parent, guardian or family leader.</li>
            <li>You must provide accurate account information and keep it up to date.</li>
            <li>You are responsible for all activity under your account and for keeping your credentials, devices and biometric unlocks secure.</li>
            <li>Notify us promptly at <a href="mailto:softserge.dev@gmail.com" className="text-primary underline">softserge.dev@gmail.com</a> if you suspect unauthorized access.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-10 mb-4">3. Family groups, roles and permissions</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>The Service is organized around <strong>family groups</strong>. Family heads and family admins configure the group, invite members, assign roles (treasurer, loan committee, secretary, etc.), and manage financial rules.</li>
            <li>By joining a family group, you agree that other members with appropriate roles will be able to see and act on records relevant to that group (contributions, savings, loans, attendance, assistance, chat, minutes and similar).</li>
            <li>Leaders are responsible for the accuracy, lawfulness and fairness of family-level rules and decisions recorded in the Service.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-10 mb-4">4. Financial features and disclaimers</h2>
          <p>
            Kinsroot is a <strong>record-keeping and coordination tool</strong>. It is not a bank, lender,
            money transmitter, investment adviser, insurer or licensed financial institution.
          </p>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Contributions, savings, njangi, loans, shares, assistance and fines</strong> reflect entries made by family members and leaders. Kinsroot does not guarantee the accuracy of any entry or the enforceability of any internal family rule.</li>
            <li><strong>Loans</strong> recorded in the Service are private arrangements between the family group and its members. Interest rates, deadlines (including the November clearance rule), surety commitments and defaults are determined by the family and enforced by the family.</li>
            <li><strong>Payments</strong> initiated through mobile money providers (such as MTN Mobile Money or Orange Money) or other third-party gateways are governed by those providers' terms. Kinsroot only records the outcome reported by the provider.</li>
            <li>You are responsible for any tax, reporting or legal obligations arising from your family's activity.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-10 mb-4">5. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-6 space-y-2">
            <li>Use the Service for anything unlawful, fraudulent, defamatory, harassing, hateful or infringing.</li>
            <li>Impersonate any person or misrepresent your affiliation with a family group.</li>
            <li>Access or attempt to access data belonging to other users or other family groups without authorization.</li>
            <li>Interfere with, disrupt or attempt to reverse-engineer the Service, or bypass security or rate-limiting controls.</li>
            <li>Upload malware, run automated scraping, or overload the Service with excessive requests.</li>
            <li>Use the Service to lend at usurious rates, launder funds, finance illegal activity, or evade sanctions.</li>
            <li>Share account credentials or resell access to the Service without our written consent.</li>
          </ul>

          <h2 className="text-2xl function-bold mt-10 mb-4">6. User content</h2>
          <p>
            You retain ownership of the content you post to the Service (messages, minutes, records, media).
            You grant Kinsroot a worldwide, non-exclusive, royalty-free license to host, store, reproduce,
            adapt, transmit and display that content solely to operate, secure and improve the Service for
            you and your family group. You are responsible for ensuring you have the right to post any
            content you submit.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">7. Notifications and communications</h2>
          <p>
            The Service sends transactional notifications (in-app, push, email, SMS and, where enabled,
            WhatsApp) for events such as meeting reminders, contribution dues, late payments, loan decisions
            and assistance events. You can adjust preferences in the app. Some notifications are essential to
            the Service and cannot be disabled without impacting functionality.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">8. Third-party services</h2>
          <p>
            The Service integrates with third parties including Google and Apple sign-in, Firebase Cloud
            Messaging and Apple Push Notification service, mobile money providers, SMS/email delivery
            partners, reCAPTCHA and our hosting provider. Your use of those services is subject to their own
            terms and privacy policies. Kinsroot is not responsible for third-party services.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">9. Intellectual property</h2>
          <p>
            The Service, including its software, design, logos, branding (including the Kinsroot name and
            tree mark), text and documentation, is owned by Softserge and its licensors and is protected by
            intellectual property laws. Except for the limited license to use the Service granted in these
            Terms, no rights are transferred to you.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">10. Feedback</h2>
          <p>
            If you send us feedback or suggestions, you grant us a perpetual, irrevocable, royalty-free right
            to use them without obligation to you.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">11. Suspension and termination</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>You may stop using the Service and delete your account at any time from your profile.</li>
            <li>We may suspend or terminate access if you violate these Terms, if required by law, or to protect the Service or other users.</li>
            <li>Family groups may be deactivated by their leaders. Deactivated families follow a soft-delete lifecycle with a 100-day grace period during which restoration is possible.</li>
            <li>Sections that by their nature should survive termination (e.g., ownership, disclaimers, limitation of liability, indemnity, dispute resolution) will survive.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-10 mb-4">12. Disclaimers</h2>
          <p className="uppercase text-sm">
            The Service is provided "as is" and "as available" without warranties of any kind, whether
            express, implied or statutory, including implied warranties of merchantability, fitness for a
            particular purpose, non-infringement, accuracy or uninterrupted operation.
          </p>
          <p>
            We do not warrant that the Service will always be available, error-free, or that data will never
            be lost. Offline features depend on your device and network conditions.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">13. Limitation of liability</h2>
          <p className="uppercase text-sm">
            To the maximum extent permitted by law, Kinsroot and Softserge will not be liable for any
            indirect, incidental, special, consequential, exemplary or punitive damages, or for any loss of
            profits, revenue, data, goodwill or business opportunities, arising out of or related to your use
            of the Service.
          </p>
          <p className="text-sm">
            Our aggregate liability for any claim arising out of or related to the Service will not exceed
            the greater of (a) the amount you paid us for the Service in the twelve months preceding the
            claim, or (b) USD 50.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">14. Indemnity</h2>
          <p>
            You agree to indemnify and hold harmless Kinsroot, Softserge and their officers, employees and
            agents from any claims, damages, liabilities and expenses (including reasonable legal fees)
            arising out of your use of the Service, your content, or your violation of these Terms or of any
            law or third-party right.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">15. Governing law and disputes</h2>
          <p>
            These Terms are governed by the laws applicable at the place of business of Softserge, without
            regard to conflict-of-law rules. You and Softserge agree to try in good faith to resolve any
            dispute informally before initiating legal action. Where informal resolution fails, disputes
            will be submitted to the competent courts at Softserge's place of business, unless mandatory law
            in your jurisdiction requires otherwise.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">16. Changes to the Service and to these Terms</h2>
          <p>
            We may add, modify or discontinue features at any time. We may also update these Terms; material
            changes will be communicated through the app or by email. Your continued use of the Service after
            an update constitutes acceptance of the revised Terms.
          </p>

          <h2 className="text-2xl font-bold mt-10 mb-4">17. Miscellaneous</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>If any provision of these Terms is held unenforceable, the remaining provisions remain in effect.</li>
            <li>Our failure to enforce any right or provision is not a waiver.</li>
            <li>You may not assign these Terms without our consent; we may assign them in connection with a merger, acquisition or asset sale.</li>
            <li>These Terms, together with the Privacy Policy and any in-app notices, are the entire agreement between you and us regarding the Service.</li>
          </ul>

          <h2 className="text-2xl font-bold mt-10 mb-4">18. Contact</h2>
          <p>
            Softserge — <a href="mailto:softserge.dev@gmail.com" className="text-primary underline">softserge.dev@gmail.com</a>
          </p>

          <p className="mt-12 text-sm text-muted-foreground">
            See also our <Link to="/privacy" className="text-primary underline">Privacy Policy</Link>.
          </p>
        </article>
      </main>
    </div>
  );
};

export default Terms;
