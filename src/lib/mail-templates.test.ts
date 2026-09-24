import { inviteMail, matchMail, passwordChangedMail, resetMail, signinMail, signupMail } from "./mail-templates";

function assert(cond: unknown, msg: string) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exitCode = 1;
  } else {
    console.log("ok ", msg);
  }
}

const origin = "https://meravansh.lol";
const base = { to: "asha@example.com", code: "482913", minutes: 30, origin, previewToken: "p" };
const link = `${origin}/auth/magic?token=${"a".repeat(64)}`;

const up = signupMail({ ...base, link, locale: "en" });
assert(up.subject === "482913 is your Mera Vansh confirmation code", "sign-up subject carries the code");
assert(up.html.includes("482913") && up.html.includes(link), "sign-up letter has the code and the button link");
assert(up.text.includes("code is 482913") && up.text.includes(link), "plain-text version has code and link");
assert(up.html.includes("Confirm my email") && up.html.includes("30 minutes"), "button label and expiry");
assert(up.html.includes(`${origin}/email/logo.png`), "logo is a hosted PNG");
assert(up.html.includes('<html lang="en">'), "letter declares its language");

const upHi = signupMail({ ...base, link, locale: "hi" });
assert(upHi.subject.includes("482913") && upHi.subject.includes("पुष्टि"), "Hindi sign-up subject");
assert(upHi.html.includes('<html lang="hi">') && upHi.html.includes("ईमेल की पुष्टि करें"), "Hindi letter body");
assert(!upHi.html.includes("text-transform:uppercase"), "Devanagari labels are not letter-spaced capitals");

const inAgain = signinMail({ ...base, link, locale: "en", existing: true });
assert(inAgain.subject === "482913 is your Mera Vansh sign-in code", "sign-in subject");
assert(inAgain.html.includes("already have an account"), "sign-up with a known email says so");
assert(inAgain.text.includes("code is 482913"), "sign-in text has the code");

const reset = resetMail({ ...base, link: `${origin}/reset?token=${"b".repeat(64)}`, locale: "en" });
assert(!reset.subject.includes("482913"), "reset code stays out of the subject line");
assert(reset.text.includes("reset code is 482913") && reset.html.includes("/reset?token="), "reset has code and reset link");
assert(reset.html.includes("asha@example.com"), "reset names the account");

const changed = passwordChangedMail({ to: "asha@example.com", when: new Date("2026-09-24T10:00:00Z"), origin, locale: "en" });
assert(changed.html.includes("IST") && changed.html.includes("/forgot?email=asha%40example.com"), "password-changed notice has time and a reset way out");

const inv = inviteMail({
  to: "b@example.com",
  fromName: "<script>alert(1)</script>",
  link,
  invitee: { name: "Ishaan Rao", hi: "छोटा भाई", en: "younger brother" },
  origin,
  locale: "en",
  previewToken: "p",
});
assert(!inv.html.includes("<script>") && inv.html.includes("&lt;script&gt;"), "names are escaped in letters");
assert(inv.text.includes("Ishaan Rao") && inv.text.includes("छोटा भाई"), "invite says who they are to you");

const match = matchMail({
  to: "c@example.com",
  origin,
  locale: "en",
  matchId: "m1",
  mine: "Harishankar Sharma",
  theirs: "Hari Shankar Sharma",
  isYou: false,
  reasons: ["given_close", "family_exact", "dob_exact", "year_exact", "village"],
  shared: ["Kamla Devi"],
  term: { hi: "मामा", en: "mother's brother", female: false },
  score: 91,
  more: 2,
  unsubscribeUrl: `${origin}/unsubscribe?token=t`,
});
assert(match.subject === "Possible relative found: Harishankar Sharma", "match subject names your person");
assert(match.html.includes("Hari Shankar Sharma") && match.html.includes("Strong match"), "both names and strength");
assert((match.html.match(/Birth details agree/g) ?? []).length === 1, "date reasons collapse to one private line");
assert(!/\b(19|20)\d{2}\b/.test(match.text.replace(origin, "")) && !/\d{4}-\d{2}-\d{2}/.test(match.html), "no dates or years in a match letter");
assert(match.html.includes("/matches?focus=m1&amp;action=confirm") && match.html.includes("action=dismiss"), "yes / no answer links");
assert(match.html.includes("मामा") && match.html.includes("Kamla Devi"), "relation and shared relatives shown");
assert(match.html.includes("/unsubscribe?token=t") && match.text.includes("2 more possible relatives"), "unsubscribe and waiting count");

const you = matchMail({ ...{ to: "c@example.com", origin, locale: "hi" as const, matchId: "m2", mine: "Asha", theirs: "Asha Rani", isYou: true, reasons: [], shared: [], term: null, score: 60, more: 0, unsubscribeUrl: "u" } });
assert(you.subject.includes("आपको") && you.html.includes("संभावित मिलान"), "Hindi letter when the match is you");

if (process.exitCode) {
  console.error("mail template tests failed");
  process.exit(1);
}
console.log("all mail template tests passed");
