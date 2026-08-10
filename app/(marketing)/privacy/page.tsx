import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — How We Handle Your Data",
  description: "Learn how Aksora collects, uses, stores, and protects your personal and workspace information.",
  alternates: { canonical: "/privacy" },
};

export const revalidate = 3600;

export default function PrivacyPage() {
  return (
    <>
      {/* Hero */}
      <section className="bg-gray-950 text-white">
        <div className="mx-auto max-w-6xl px-5 py-20">
          <div className="max-w-2xl">
            <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-blue-400 mb-3">Legal</p>
            <h1 className="text-3xl font-bold">Privacy Policy</h1>
            <p className="mt-4 text-[14px] text-gray-400">
              Effective date: May 20, 2026 · Last updated: May 20, 2026
            </p>
            <p className="mt-3 text-[13px] text-gray-500">
              This policy describes how Akusara Digital (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects, uses, and protects information through Aksora.
            </p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="border-b border-gray-100">
        <div className="mx-auto max-w-3xl px-5 py-20">
          <div className="space-y-10">
            <PolicySection title="1. Information We Collect">
              <h4>Account Information</h4>
              <p>When you create an account, we collect your full name, email address, company name, and selected role. This information is required to provision your workspace and manage access.</p>
              <h4>Usage Data</h4>
              <p>We collect anonymized usage data including pages visited, features used, and session duration. This data helps us understand how teams use the platform and prioritize improvements.</p>
              <h4>Content Data</h4>
              <p>All content you create within Aksora — test cases, bug reports, sprint data, meeting notes — is stored securely and belongs to your organization.</p>
            </PolicySection>

            <PolicySection title="2. How We Use Your Information">
              <ul>
                <li>To provide, maintain, and improve the Aksora service</li>
                <li>To authenticate your identity and manage workspace access</li>
                <li>To send critical service notifications (security alerts, downtime, billing)</li>
                <li>To generate aggregated, anonymized analytics for product improvement</li>
                <li>To respond to support requests and communicate about your account</li>
                <li>To detect and prevent fraud, abuse, or security threats</li>
              </ul>
              <p>We do not use your data for advertising purposes. We do not sell your information to third parties.</p>
            </PolicySection>

            <PolicySection title="3. Data Storage & Security">
              <p>Your data is stored on enterprise-grade cloud infrastructure with the following protections:</p>
              <ul>
                <li><strong>Encryption in transit:</strong> All connections use TLS 1.3</li>
                <li><strong>Encryption at rest:</strong> Database storage is encrypted using AES-256</li>
                <li><strong>Password security:</strong> Passwords are hashed using scrypt with unique salts</li>
                <li><strong>Session management:</strong> HMAC-signed tokens with configurable expiry</li>
                <li><strong>Data isolation:</strong> Each workspace is logically isolated at the database level</li>
              </ul>
            </PolicySection>

            <PolicySection title="4. Data Sharing & Third Parties">
              <p>We do not sell, trade, or rent your personal information. We may share data only with:</p>
              <ul>
                <li><strong>Infrastructure providers:</strong> Cloud hosting and database services, under strict data processing agreements</li>
                <li><strong>Legal requirements:</strong> When required by law, court order, or governmental regulation</li>
                <li><strong>Business transfers:</strong> In the event of a merger or acquisition, with advance notice to affected users</li>
              </ul>
              <p>We do not use third-party advertising networks or share data with ad platforms.</p>
            </PolicySection>

            <PolicySection title="5. Your Rights & Controls">
              <ul>
                <li><strong>Access:</strong> View all your personal data through your profile settings at any time</li>
                <li><strong>Export:</strong> Export all workspace data in standard formats (Excel, JSON)</li>
                <li><strong>Correction:</strong> Update your personal information through your account settings</li>
                <li><strong>Deletion:</strong> Request complete deletion of your account and associated data</li>
                <li><strong>Portability:</strong> Download your data in machine-readable formats</li>
              </ul>
              <p>To exercise any of these rights, contact us at <a href="mailto:privacy@akusaradigital.com" className="text-blue-600 hover:underline">privacy@akusaradigital.com</a>.</p>
            </PolicySection>

            <PolicySection title="6. Cookies & Tracking">
              <p>We use minimal cookies strictly necessary for the service:</p>
              <ul>
                <li><strong>Session cookie:</strong> Required for authentication (httpOnly, secure, same-site)</li>
                <li><strong>Preference cookies:</strong> UI preferences like sidebar state (local storage)</li>
              </ul>
              <p>We do not use third-party tracking cookies, advertising pixels, or fingerprinting techniques.</p>
            </PolicySection>

            <PolicySection title="7. Data Retention">
              <ul>
                <li><strong>Active accounts:</strong> Data retained as long as your account is active</li>
                <li><strong>After deletion:</strong> Personal data permanently removed within 30 days</li>
                <li><strong>Backups:</strong> Purged from backup systems within 90 days of deletion</li>
                <li><strong>Audit logs:</strong> Retained for 12 months for security and compliance purposes</li>
              </ul>
            </PolicySection>

            <PolicySection title="8. International Data">
              <p>Aksora is operated from Indonesia. By using our service, you acknowledge that your data may be processed in jurisdictions where our infrastructure is located. We ensure appropriate safeguards are in place regardless of data location.</p>
            </PolicySection>

            <PolicySection title="9. Changes to This Policy">
              <p>We may update this privacy policy from time to time. Material changes will be communicated via email to account holders at least 30 days before taking effect. Continued use of the service after changes constitutes acceptance.</p>
            </PolicySection>

            <PolicySection title="10. Contact">
              <p>For privacy-related questions, data requests, or concerns:</p>
              <ul>
                <li>Email: <a href="mailto:privacy@akusaradigital.com" className="text-blue-600 hover:underline">privacy@akusaradigital.com</a></li>
                <li>General: <a href="mailto:hello@akusaradigital.com" className="text-blue-600 hover:underline">hello@akusaradigital.com</a></li>
              </ul>
              <p>We aim to respond to all privacy inquiries within 5 business days.</p>
            </PolicySection>
          </div>
        </div>
      </section>

      {/* Related */}
      <section className="bg-gray-50">
        <div className="mx-auto max-w-3xl px-5 py-12 text-center">
          <p className="text-[12px] text-gray-500">
            See also: <Link href="/security" className="text-blue-600 hover:underline font-medium">Security Practices</Link>
          </p>
        </div>
      </section>
    </>
  );
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[15px] font-bold text-gray-900 mb-4">{title}</h2>
      <div className="text-[13px] text-gray-600 leading-relaxed space-y-3 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-2 [&_li]:text-[13px] [&_li]:text-gray-600 [&_h4]:font-semibold [&_h4]:text-gray-800 [&_h4]:text-[13px] [&_h4]:mt-4 [&_h4]:mb-1">
        {children}
      </div>
    </div>
  );
}
