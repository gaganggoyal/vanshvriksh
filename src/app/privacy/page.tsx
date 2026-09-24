import type { Metadata } from "next";
import { Legal } from "@/components/site/legal";
import { PublicPage } from "@/components/site/public-page";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "What Mera Vansh collects, who can see what, and how to take your data or delete it.",
};

const mail = <a href={`mailto:${BRAND.contact}`}>{BRAND.contact}</a>;

export default function PrivacyPage() {
  return (
    <PublicPage>
      <Legal
        title="Privacy policy"
        updated="24 September 2026"
        intro={
          <>
            <p>
              {BRAND.name} ({BRAND.domain}) helps families write down their relatives and find the same people in other
              families&apos; trees. Family history is personal, so this policy says plainly what we collect, who can see it,
              and how to take it with you or delete it.
            </p>
            <p className="mt-4 rounded-2xl bg-brand-tint px-5 py-4 text-base text-ink/80">
              <strong>The short version:</strong> dates of birth and death are never shown to anyone but you. Other families
              see names only — and only when a match is confirmed by both of you, or for remembered (departed) ancestors you
              allow to be found. We don&apos;t sell data, show ads or use tracking cookies.
            </p>
          </>
        }
        sections={[
          {
            id: "collect",
            title: "What we collect",
            body: (
              <>
                <ul>
                  <li>
                    <strong>Your account:</strong> your email address, language preference and — only if you choose one — a
                    password. Passwords are stored as a salted scrypt hash, which nobody, including us, can turn back into
                    the password.
                  </li>
                  <li>
                    <strong>Your family tree:</strong> what you choose to write — names (in any script), other names, gender,
                    dates of birth and death, place of birth, village or native place, gotra, private notes, and how people
                    are related.
                  </li>
                  <li><strong>Matches:</strong> suggestions that someone in your tree may be the same person as someone in another tree, and what each family decided.</li>
                  <li><strong>Settings:</strong> for example whether remembered ancestors in your tree can be found in search.</li>
                  <li>
                    <strong>Technical data:</strong> a sign-in cookie that keeps you logged in; your IP address, used briefly
                    in memory to limit repeated sign-in attempts and searches; and short-lived server logs for security and
                    troubleshooting.
                  </li>
                </ul>
                <p>We do not use analytics or advertising trackers. Fonts are served from our own server.</p>
              </>
            ),
          },
          {
            id: "use",
            title: "How we use it",
            body: (
              <ul>
                <li>To show and edit your tree, and to label everyone with their relation to you.</li>
                <li>
                  To find possible relatives: names, spelling variants, private dates, places, gotra and the names of
                  surrounding relatives are compared across families. Dates are used only inside this comparison.
                </li>
                <li>
                  To email you sign-in and confirmation codes, password resets and security notices, invitations you send,
                  and alerts that a possible relative was found. You can turn relative alerts off in Settings or from any
                  alert email; account and security emails can&apos;t be turned off while you have an account.
                </li>
                <li>To keep the service safe — for example rate-limiting sign-in attempts and searches.</li>
              </ul>
            ),
          },
          {
            id: "visibility",
            title: "Who can see what",
            body: (
              <>
                <div className="overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>Situation</th>
                        <th>What the other family sees</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>A possible match is suggested</td>
                        <td>The matched person&apos;s name, the relatives&apos; names you both wrote, and how the families would be related (the relation word, not your name).</td>
                      </tr>
                      <tr>
                        <td>Both families confirm the match</td>
                        <td>Names, places, gotra and relationships from your tree, and your name as the tree&apos;s writer.</td>
                      </tr>
                      <tr>
                        <td>Search, if your tree is discoverable</td>
                        <td>Remembered (departed) people by name, place and gotra. A living person appears only to someone who already knows their birth year; living relatives around a result are counted, not named.</td>
                      </tr>
                      <tr>
                        <td>Signed-out visitors</td>
                        <td>Counts only — for example how many remembered people share a surname — never names.</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p>
                  <strong>Never shown to anyone but you:</strong> dates of birth and death, place of birth, and private notes.
                  You can turn search discovery off in Settings at any time.
                </p>
              </>
            ),
          },
          {
            id: "living",
            title: "People who don't have an account",
            body: (
              <p>
                Trees naturally include relatives who have not signed up. Please add living people only with care and, where
                you can, their agreement. Living people are never listed in search. Anyone who finds themselves in a tree and
                wants to be removed can write to {mail} and we will help.
              </p>
            ),
          },
          {
            id: "sharing",
            title: "Service providers",
            body: (
              <>
                <p>We don&apos;t sell or rent personal data, and we don&apos;t share it for advertising. We use:</p>
                <ul>
                  <li>a hosting provider for the server that runs {BRAND.name} and stores its database;</li>
                  <li>an email delivery provider to send sign-in codes, invitations and notices.</li>
                </ul>
                <p>We may disclose information if the law requires it.</p>
              </>
            ),
          },
          {
            id: "control",
            title: "Your choices and rights",
            body: (
              <ul>
                <li><strong>See and correct:</strong> everything you wrote is editable in your tree.</li>
                <li><strong>Take it with you:</strong> download your whole tree as GEDCOM or JSON from Settings, private dates included.</li>
                <li><strong>Decide on matches:</strong> confirm or decline any suggested match; a declined match stays declined.</li>
                <li><strong>Hide from search:</strong> switch off discovery in Settings.</li>
                <li><strong>Delete:</strong> deleting your account in Settings removes your account, your tree and everyone in it, your matches and your sign-in records.</li>
              </ul>
            ),
          },
          {
            id: "retention",
            title: "How long we keep data",
            body: (
              <p>
                We keep your tree while your account exists. When you delete your account, it is removed from our database.
                If another family added one of your remembered ancestors to their own tree from search, the names and places
                they copied are part of their tree and stay with it. Sign-in codes expire after 10 minutes and links after 20
                minutes (invitations after 7 days).
              </p>
            ),
          },
          {
            id: "security",
            title: "Security",
            body: (
              <p>
                The site is served only over HTTPS. Sign-in codes are stored hashed, work once and expire; sessions are signed;
                every request is checked so you can only read and change your own tree. No system is perfectly secure — if you
                notice anything wrong, tell us at {mail}.
              </p>
            ),
          },
          {
            id: "children",
            title: "Children",
            body: (
              <p>
                Accounts are for adults (18 and over). Younger family members can appear in a tree written by a parent or
                guardian, and — like every living person — are never listed in search.
              </p>
            ),
          },
          {
            id: "changes",
            title: "Changes and contact",
            body: (
              <p>
                If we change this policy we will update the date above, and tell you by email before any change that affects
                what other families can see. Questions or requests: {mail}.
              </p>
            ),
          },
        ]}
      />
    </PublicPage>
  );
}
