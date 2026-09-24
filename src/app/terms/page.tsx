import type { Metadata } from "next";
import Link from "next/link";
import { Legal } from "@/components/site/legal";
import { PublicPage } from "@/components/site/public-page";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms for using Mera Vansh.",
};

const mail = <a href={`mailto:${BRAND.contact}`}>{BRAND.contact}</a>;

export default function TermsPage() {
  return (
    <PublicPage>
      <Legal
        title="Terms of service"
        updated="24 September 2026"
        intro={
          <p>
            These terms apply when you use {BRAND.name} at {BRAND.domain}. By creating an account or using the service you
            agree to them. Please also read our <Link href="/privacy">privacy policy</Link>, which explains what other
            families can and cannot see.
          </p>
        }
        sections={[
          {
            id: "account",
            title: "Your account",
            body: (
              <ul>
                <li>You must be 18 or older to create an account.</li>
                <li>
                  You sign in with a password or with a code or link sent to your email, so keep your password and that email
                  secure. You are responsible for activity on your account.
                </li>
                <li>One person, one account — please don&apos;t create accounts for other people; invite them instead.</li>
              </ul>
            ),
          },
          {
            id: "content",
            title: "Your family tree",
            body: (
              <>
                <p>
                  What you write stays yours. You give us permission to store it, process it and show it as described in the
                  privacy policy — to you, and in limited form to other families through matches you confirm and, if you
                  allow it, through search — so that we can run the service.
                </p>
                <p>
                  Write only what you believe to be true and have a right to share. Take particular care with living
                  relatives, and remove information if someone reasonably asks you to.
                </p>
              </>
            ),
          },
          {
            id: "use",
            title: "Fair use",
            body: (
              <>
                <p>Please don&apos;t:</p>
                <ul>
                  <li>use {BRAND.name} to harass, track or expose anyone;</li>
                  <li>try to discover living people by guessing birth years, or otherwise get around privacy protections;</li>
                  <li>scrape, copy in bulk, or access the service by automated means;</li>
                  <li>enter information you know to be false in order to mislead other families;</li>
                  <li>interfere with the service or other people&apos;s use of it, or test its security without our written permission.</li>
                </ul>
              </>
            ),
          },
          {
            id: "matches",
            title: "Matches are suggestions",
            body: (
              <p>
                Possible relatives and relationship terms are worked out from what families write. They can be wrong. Use your
                own judgment before confirming a match, and don&apos;t rely on {BRAND.name} as proof of a relationship for legal,
                inheritance or medical purposes.
              </p>
            ),
          },
          {
            id: "demo",
            title: "Demo families",
            body: (
              <p>
                The demo families are shared by every visitor and are reset regularly. Please don&apos;t enter real information
                into them.
              </p>
            ),
          },
          {
            id: "service",
            title: "The service",
            body: (
              <p>
                We work to keep {BRAND.name} available and your data safe, but the service is provided &quot;as is&quot;,
                without warranties of any kind. We may change or improve features over time. You can download your tree at any
                time from Settings.
              </p>
            ),
          },
          {
            id: "liability",
            title: "Limitation of liability",
            body: (
              <p>
                To the extent the law allows, {BRAND.name} and its founders are not liable for indirect or consequential
                losses, or for decisions made on the basis of matches or relationship terms shown by the service.
              </p>
            ),
          },
          {
            id: "ending",
            title: "Ending your use",
            body: (
              <p>
                You can delete your account at any time in Settings. We may suspend or close accounts that break these terms
                or put other families at risk, and will tell you why where we can.
              </p>
            ),
          },
          {
            id: "changes",
            title: "Changes and contact",
            body: (
              <p>
                If we change these terms we will update the date above and let you know by email before significant changes
                take effect. These terms are governed by the laws of India. Questions: {mail}.
              </p>
            ),
          },
        ]}
      />
    </PublicPage>
  );
}
