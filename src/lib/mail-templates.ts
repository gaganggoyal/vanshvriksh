import { BRAND } from "./brand";
import { copy, fill, type Copy, type Locale } from "./i18n";

/**
 * Every letter Mera Vansh sends, in English and हिन्दी. Table layout and
 * inline styles, because that is what Gmail, Outlook and phone mail apps
 * agree on. Pure functions: no database, no network — easy to test.
 */

export type Mail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  purpose: string;
  previewToken: string;
  headers?: Record<string, string>;
};

/** Names are user-written; never let one become markup in a letter. */
export function esc(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans Devanagari','Helvetica Neue',Arial,sans-serif";
const MONO = "'SF Mono',SFMono-Regular,Menlo,Consolas,'Liberation Mono',monospace";
const C = {
  brand: "#5B4BF5",
  brandDeep: "#4535D9",
  tint: "#F0EEFF",
  ink: "#0E0D14",
  body: "#3F3E4C",
  muted: "#6B6A7B",
  line: "#E7E6EF",
  canvas: "#F4F4F8",
  grow: "#0B7F5F",
  growTint: "#E7F8F1",
};

// ---------------------------------------------------------------------------
// Building blocks

function heading(text: string) {
  return `<h1 style="margin:0 0 12px;font-family:${FONT};font-size:22px;line-height:1.3;font-weight:700;color:${C.ink};">${text}</h1>`;
}

function para(text: string, extra = "") {
  return `<p style="margin:0 0 16px;font-family:${FONT};font-size:15px;line-height:1.6;color:${C.body};${extra}">${text}</p>`;
}

function small(text: string, extra = "") {
  return `<p style="margin:0 0 12px;font-family:${FONT};font-size:13px;line-height:1.6;color:${C.muted};${extra}">${text}</p>`;
}

function codeBox(code: string, label: string, locale: Locale) {
  const labelStyle =
    locale === "en" ? "letter-spacing:0.08em;text-transform:uppercase;font-size:11px;" : "font-size:13px;";
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px;">
  <tr><td align="center" style="background:${C.tint};border-radius:14px;padding:18px 12px 20px;">
    <div style="font-family:${FONT};${labelStyle}font-weight:600;color:${C.muted};margin:0 0 8px;">${label}</div>
    <div class="mv-code" style="font-family:${MONO};font-size:34px;line-height:1.1;font-weight:700;letter-spacing:8px;color:${C.brandDeep};">${code}</div>
  </td></tr>
</table>`;
}

function button(url: string, label: string, variant: "primary" | "secondary" = "primary") {
  const primary = variant === "primary";
  return `<td align="center" bgcolor="${primary ? C.brand : "#ffffff"}" style="border-radius:12px;${primary ? "" : `border:1px solid ${C.line};`}">
      <a class="mv-btn" href="${esc(url)}" target="_blank" style="display:inline-block;white-space:nowrap;padding:13px 24px;font-family:${FONT};font-size:15px;line-height:1;font-weight:600;color:${primary ? "#ffffff" : C.ink};text-decoration:none;border-radius:12px;">${label}</a>
    </td>`;
}

function buttons(...cells: string[]) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 22px;"><tr>
    ${cells.join(`<td style="width:10px;font-size:0;">&nbsp;</td>`)}
  </tr></table>`;
}

function fallbackLink(url: string, label: string) {
  return small(
    `${label}<br><a href="${esc(url)}" style="color:${C.brand};word-break:break-all;">${esc(url)}</a>`,
    "margin-bottom:0;",
  );
}

function rule() {
  return `<div style="height:1px;line-height:1px;font-size:0;background:${C.line};margin:22px 0 18px;">&nbsp;</div>`;
}

type Frame = { origin: string; locale: Locale; title: string; preheader: string; body: string; footer: string };

function frame({ origin, locale, title, preheader, body, footer }: Frame) {
  const pad = "&#847;&zwnj;&nbsp;".repeat(40);
  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${esc(title)}</title>
<style>
  @media (max-width:600px) { .mv-card { padding:28px 20px !important; } .mv-code { font-size:30px !important; letter-spacing:6px !important; } .mv-btn { padding:12px 16px !important; font-size:14px !important; } }
</style>
</head>
<body style="margin:0;padding:0;background:${C.canvas};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:${C.canvas};font-size:1px;line-height:1px;">${esc(preheader)}${pad}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.canvas};">
  <tr><td align="center" style="padding:32px 12px 40px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
      <tr><td style="padding:0 6px 18px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
          <td style="vertical-align:middle;"><img src="${esc(origin)}/email/logo.png" width="36" height="36" alt="" style="display:block;border:0;border-radius:10px;"></td>
          <td style="vertical-align:middle;padding-left:10px;font-family:${FONT};font-size:17px;line-height:1.2;font-weight:700;color:${C.ink};">
            ${BRAND.name}<br><span style="font-size:12px;font-weight:500;color:${C.muted};">${BRAND.descriptor} · ${BRAND.nameHi}</span>
          </td>
        </tr></table>
      </td></tr>
      <tr><td class="mv-card" style="background:#ffffff;border:1px solid ${C.line};border-radius:20px;padding:34px 34px 30px;">
        ${body}
      </td></tr>
      <tr><td style="padding:18px 6px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${C.muted};">
        ${footer}<br>
        ${BRAND.name} · <a href="${BRAND.url}" style="color:${C.muted};">${BRAND.domain}</a> · <a href="mailto:${BRAND.contact}" style="color:${C.muted};">${BRAND.contact}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Words

const W = {
  en: {
    codeLabel: "Your code",
    fallback: "Button not working? Copy this link into your browser:",
    expires: "The code and the button work once and expire in {m} minutes.",
    footerAuth: "You're receiving this because this address was entered on Mera Vansh. If that wasn't you, you can ignore this email.",
    privacy: "Dates of birth are never shown to anyone.",

    signupSubject: "{code} is your Mera Vansh confirmation code",
    signupPre: "Confirm your email to start your family tree.",
    signupTitle: "Confirm your email",
    signupIntro: "Welcome to Mera Vansh! Enter this code on the sign-up page to confirm it's you:",
    signupOr: "Or confirm with one click:",
    signupButton: "Confirm my email",
    signupNext: "Next, you'll choose a password and write the first names in your tree.",
    signupIgnore: "Didn't sign up? You can ignore this email — no account is created without this code.",
    signupText: "Welcome to Mera Vansh.\n\nYour confirmation code is {code}\n\nOr confirm with one click:\n{link}",

    signinSubject: "{code} is your Mera Vansh sign-in code",
    signinPre: "Your one-time code to sign in.",
    signinTitle: "Sign in to Mera Vansh",
    signinExisting: "You already have an account with this email, so here is a sign-in code instead of a new account.",
    signinIntro: "Enter this code to sign in:",
    signinOr: "Or sign in with one click:",
    signinButton: "Sign in",
    signinIgnore: "Didn't try to sign in? Ignore this email — nobody can get in without this code.",
    signinText: "Your Mera Vansh sign-in code is {code}\n\nOr sign in with one click:\n{link}",

    resetSubject: "Reset your Mera Vansh password",
    resetPre: "Use this code or button to choose a new password.",
    resetTitle: "Reset your password",
    resetIntro: "We received a request to reset the password for <b>{email}</b>. Enter this code on the reset page:",
    resetOr: "Or choose a new password with one click:",
    resetButton: "Choose a new password",
    resetIgnore: "Didn't ask for this? Ignore this email — your password stays the same.",
    resetText: "Your password reset code is {code}\n\nOr choose a new password here:\n{link}",

    changedSubject: "Your Mera Vansh password was changed",
    changedPre: "If this was you, there's nothing to do.",
    changedTitle: "Your password was changed",
    changedBody: "The password for <b>{email}</b> was changed on {when}. Any other devices have been signed out.",
    changedOk: "If this was you, there's nothing else to do.",
    changedNotYou: "Wasn't you? Reset your password now and write to us at {contact}.",
    changedButton: "Reset password",

    inviteSubject: "{from} invited you to their family tree on Mera Vansh",
    invitePre: "See how you're connected — dates of birth always stay private.",
    inviteTitle: "{from} invited you to their family tree",
    inviteAs: "They've added you as <b>{name}</b>",
    inviteTerm: " — their <b>{hi}</b>{en}",
    inviteLinked: "When you join, your tree starts from there and the two trees are linked.",
    inviteAbout: "Mera Vansh helps families write down the people they know and find relatives across trees — in English and हिन्दी.",
    inviteButton: "Accept invitation",
    inviteExpires: "This invitation works for 7 days.",
    inviteFooter: "You're receiving this because {from} entered your email on Mera Vansh. Not interested? Just ignore it.",

    matchSubjectYou: "A family on Mera Vansh may have added you to their tree",
    matchSubject: "Possible relative found: {mine}",
    matchPre: "Take a look and tell us whether it's the same person.",
    strong: "Strong match",
    possible: "Possible match",
    matchTitleYou: "Someone may have added you to their family tree",
    matchTitle: "{mine} may also be in another family's tree",
    matchIntroYou: "Another family on Mera Vansh has written someone who looks a lot like you.",
    matchIntro: "Another family on Mera Vansh has written someone who looks like <b>{mine}</b> from your tree.",
    inYours: "In your tree",
    inTheirs: "In their tree",
    why: "Why we think so",
    privateRecords: "Birth details agree — the dates stay private",
    shared: "Both trees also mention: {names}",
    question: "Is this the same person?",
    yes: "Yes, same person",
    no: "No, different",
    review: "See the full details",
    safety: "Nothing is shared until both families say yes. Dates of birth are never shown to anyone.",
    more1: "1 more possible relative is waiting in Matches.",
    moreN: "{n} more possible relatives are waiting in Matches.",
    matchFooter: "You're receiving this because you keep a family tree on Mera Vansh. We send at most one of these a day.",
    unsubscribe: "Turn off relative alerts",

    testSubject: "Mera Vansh test email",
    testTitle: "Email is working",
    testBody: "This test went out through <b>{mode}</b> from {from}. Sign-in codes and invitations will reach people the same way.",
  },
  hi: {
    codeLabel: "आपका कोड",
    fallback: "बटन काम नहीं कर रहा? यह लिंक अपने ब्राउज़र में खोलें:",
    expires: "कोड और बटन एक ही बार काम करते हैं और {m} मिनट में समाप्त हो जाते हैं।",
    footerAuth: "यह ईमेल इसलिए आया क्योंकि मेरा वंश पर यह पता डाला गया। अगर यह आप नहीं थे, तो इसे अनदेखा करें।",
    privacy: "जन्म तिथियाँ किसी को नहीं दिखतीं।",

    signupSubject: "{code} — मेरा वंश पुष्टि कोड",
    signupPre: "अपना वंश वृक्ष शुरू करने के लिए ईमेल की पुष्टि करें।",
    signupTitle: "अपने ईमेल की पुष्टि करें",
    signupIntro: "मेरा वंश में स्वागत है! पुष्टि के लिए यह कोड साइन-अप पेज पर डालें:",
    signupOr: "या एक क्लिक में पुष्टि करें:",
    signupButton: "ईमेल की पुष्टि करें",
    signupNext: "इसके बाद आप पासवर्ड चुनेंगे और अपने वृक्ष में पहले नाम लिखेंगे।",
    signupIgnore: "आपने साइन-अप नहीं किया? इस ईमेल को अनदेखा करें — इस कोड के बिना कोई खाता नहीं बनता।",
    signupText: "मेरा वंश में स्वागत है।\n\nआपका पुष्टि कोड: {code}\n\nया एक क्लिक में पुष्टि करें:\n{link}",

    signinSubject: "{code} — मेरा वंश प्रवेश कोड",
    signinPre: "प्रवेश के लिए आपका एक-बार का कोड।",
    signinTitle: "मेरा वंश में प्रवेश करें",
    signinExisting: "इस ईमेल से आपका खाता पहले से है, इसलिए नए खाते की जगह यह प्रवेश कोड भेजा गया है।",
    signinIntro: "प्रवेश के लिए यह कोड डालें:",
    signinOr: "या एक क्लिक में प्रवेश करें:",
    signinButton: "प्रवेश करें",
    signinIgnore: "आपने प्रवेश की कोशिश नहीं की? इस ईमेल को अनदेखा करें — इस कोड के बिना कोई प्रवेश नहीं कर सकता।",
    signinText: "आपका मेरा वंश प्रवेश कोड: {code}\n\nया एक क्लिक में प्रवेश करें:\n{link}",

    resetSubject: "मेरा वंश पासवर्ड रीसेट करें",
    resetPre: "नया पासवर्ड चुनने के लिए यह कोड या बटन इस्तेमाल करें।",
    resetTitle: "अपना पासवर्ड रीसेट करें",
    resetIntro: "<b>{email}</b> का पासवर्ड रीसेट करने का अनुरोध मिला है। रीसेट पेज पर यह कोड डालें:",
    resetOr: "या एक क्लिक में नया पासवर्ड चुनें:",
    resetButton: "नया पासवर्ड चुनें",
    resetIgnore: "आपने यह नहीं माँगा? इस ईमेल को अनदेखा करें — आपका पासवर्ड नहीं बदलेगा।",
    resetText: "आपका पासवर्ड रीसेट कोड: {code}\n\nया यहाँ नया पासवर्ड चुनें:\n{link}",

    changedSubject: "आपका मेरा वंश पासवर्ड बदल दिया गया",
    changedPre: "अगर यह आपने किया, तो कुछ करने की ज़रूरत नहीं।",
    changedTitle: "आपका पासवर्ड बदल गया है",
    changedBody: "<b>{email}</b> का पासवर्ड {when} को बदला गया। बाकी सभी डिवाइस से साइन-आउट कर दिया गया है।",
    changedOk: "अगर यह आपने किया, तो और कुछ नहीं करना है।",
    changedNotYou: "यह आप नहीं थे? अभी पासवर्ड रीसेट करें और हमें {contact} पर लिखें।",
    changedButton: "पासवर्ड रीसेट करें",

    inviteSubject: "{from} ने आपको मेरा वंश पर अपने वंश वृक्ष में बुलाया है",
    invitePre: "देखें आप कैसे जुड़े हैं — जन्म तिथियाँ हमेशा निजी रहती हैं।",
    inviteTitle: "{from} ने आपको अपने वंश वृक्ष में बुलाया है",
    inviteAs: "उन्होंने आपको <b>{name}</b> के रूप में जोड़ा है",
    inviteTerm: " (रिश्ता: <b>{hi}</b>)",
    inviteLinked: "जुड़ते ही आपका वृक्ष वहीं से शुरू होगा और दोनों वृक्ष जुड़ जाएँगे।",
    inviteAbout: "मेरा वंश परिवारों को अपने लोगों के नाम लिखने और दूसरे वृक्षों में रिश्तेदार खोजने में मदद करता है — हिन्दी और English में।",
    inviteButton: "आमंत्रण स्वीकार करें",
    inviteExpires: "यह आमंत्रण 7 दिन तक मान्य है।",
    inviteFooter: "यह ईमेल इसलिए आया क्योंकि {from} ने मेरा वंश पर आपका ईमेल डाला। रुचि नहीं है? इसे अनदेखा करें।",

    matchSubjectYou: "मेरा वंश पर किसी परिवार ने शायद आपको अपने वृक्ष में जोड़ा है",
    matchSubject: "संभावित रिश्तेदार मिला: {mine}",
    matchPre: "देखें और बताएँ कि क्या ये वही व्यक्ति हैं।",
    strong: "मज़बूत मिलान",
    possible: "संभावित मिलान",
    matchTitleYou: "किसी ने शायद आपको अपने वंश वृक्ष में जोड़ा है",
    matchTitle: "{mine} शायद किसी और परिवार के वृक्ष में भी हैं",
    matchIntroYou: "मेरा वंश पर एक और परिवार ने किसी ऐसे व्यक्ति का नाम लिखा है जो आपसे काफ़ी मिलते-जुलते हैं।",
    matchIntro: "मेरा वंश पर एक और परिवार ने किसी ऐसे व्यक्ति का नाम लिखा है जो आपके वृक्ष के <b>{mine}</b> से मिलते-जुलते हैं।",
    inYours: "आपके वृक्ष में",
    inTheirs: "उनके वृक्ष में",
    why: "हमें ऐसा क्यों लगता है",
    privateRecords: "जन्म विवरण मेल खाते हैं — तिथियाँ निजी रहती हैं",
    shared: "दोनों वृक्षों में ये नाम भी हैं: {names}",
    question: "क्या ये वही व्यक्ति हैं?",
    yes: "हाँ, वही हैं",
    no: "नहीं, अलग हैं",
    review: "पूरी जानकारी देखें",
    safety: "दोनों परिवारों की हाँ के बिना कुछ साझा नहीं होता। जन्म तिथियाँ किसी को नहीं दिखतीं।",
    more1: "मिलान में 1 और संभावित रिश्तेदार आपका इंतज़ार कर रहे हैं।",
    moreN: "मिलान में {n} और संभावित रिश्तेदार आपका इंतज़ार कर रहे हैं।",
    matchFooter: "यह ईमेल इसलिए आया क्योंकि मेरा वंश पर आपका वंश वृक्ष है। हम दिन में ज़्यादा से ज़्यादा एक ऐसा ईमेल भेजते हैं।",
    unsubscribe: "रिश्तेदार अलर्ट बंद करें",

    testSubject: "मेरा वंश टेस्ट ईमेल",
    testTitle: "ईमेल काम कर रहा है",
    testBody: "यह टेस्ट <b>{mode}</b> से {from} के नाम से भेजा गया। प्रवेश कोड और आमंत्रण भी ऐसे ही पहुँचेंगे।",
  },
} satisfies Record<Locale, Record<string, string>>;

// Compile-time check: Hindi carries every English line.
const _hindiLettersComplete: typeof W.en = W.hi;
void _hindiLettersComplete;

const words = (locale: Locale) => W[locale] ?? W.en;

// ---------------------------------------------------------------------------
// Sign-up, sign-in, reset: a code to type and a button to tap, in one letter.

type CodeLetter = { to: string; code: string; link: string; minutes: number; origin: string; locale: Locale; previewToken: string };

function codeLetter(
  kind: "signup" | "signin" | "reset",
  { to, code, link, minutes, origin, locale, previewToken }: CodeLetter,
  lead = "",
): Mail {
  const w = words(locale);
  const k = {
    signup: [w.signupSubject, w.signupPre, w.signupTitle, w.signupIntro, w.signupOr, w.signupButton, w.signupIgnore, w.signupText],
    signin: [w.signinSubject, w.signinPre, w.signinTitle, w.signinIntro, w.signinOr, w.signinButton, w.signinIgnore, w.signinText],
    reset: [w.resetSubject, w.resetPre, w.resetTitle, w.resetIntro, w.resetOr, w.resetButton, w.resetIgnore, w.resetText],
  }[kind];
  const [subject, pre, title, intro, or, cta, ignore, text] = k;
  const expires = fill(w.expires, { m: minutes });
  const body = [
    heading(title),
    lead ? para(lead, `background:${C.growTint};color:${C.grow};border-radius:12px;padding:10px 14px;font-size:14px;`) : "",
    para(fill(intro, { email: esc(to) })),
    codeBox(code, w.codeLabel, locale),
    para(or, "margin-bottom:12px;"),
    buttons(button(link, cta)),
    kind === "signup" ? small(w.signupNext) : "",
    small(expires),
    rule(),
    small(ignore),
    fallbackLink(link, w.fallback),
  ].join("\n");
  return {
    to,
    subject: fill(subject, { code }),
    html: frame({ origin, locale, title, preheader: pre, body, footer: w.footerAuth }),
    text: [lead, fill(text, { code, link }), expires, ignore.replace(/<[^>]+>/g, "")].filter(Boolean).join("\n\n"),
    purpose: kind,
    previewToken,
  };
}

export const signupMail = (a: CodeLetter) => codeLetter("signup", a);
export const signinMail = (a: CodeLetter & { existing?: boolean }) =>
  codeLetter("signin", a, a.existing ? words(a.locale).signinExisting : "");
export const resetMail = (a: CodeLetter) => codeLetter("reset", a);

// ---------------------------------------------------------------------------

export function passwordChangedMail(a: { to: string; when: Date; origin: string; locale: Locale }): Mail {
  const w = words(a.locale);
  const when = `${new Intl.DateTimeFormat(a.locale === "hi" ? "hi-IN" : "en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(a.when)} IST`;
  const forgot = `${a.origin}/forgot?email=${encodeURIComponent(a.to)}`;
  const contact = `<a href="mailto:${BRAND.contact}" style="color:${C.brand};">${BRAND.contact}</a>`;
  const body = [
    heading(w.changedTitle),
    para(fill(w.changedBody, { email: esc(a.to), when })),
    para(w.changedOk),
    rule(),
    para(fill(w.changedNotYou, { contact }), "margin-bottom:14px;"),
    buttons(button(forgot, w.changedButton, "secondary")),
  ].join("\n");
  const strip = (s: string) => s.replace(/<[^>]+>/g, "");
  return {
    to: a.to,
    subject: w.changedSubject,
    html: frame({ origin: a.origin, locale: a.locale, title: w.changedTitle, preheader: w.changedPre, body, footer: w.privacy }),
    text: [
      strip(fill(w.changedBody, { email: a.to, when })),
      w.changedOk,
      strip(fill(w.changedNotYou, { contact: BRAND.contact })),
      forgot,
    ].join("\n\n"),
    purpose: "password-changed",
    previewToken: "",
  };
}

// ---------------------------------------------------------------------------

export function inviteMail(a: {
  to: string;
  fromName: string;
  link: string;
  invitee: { name: string; hi: string; en: string } | null;
  origin: string;
  locale: Locale;
  previewToken: string;
}): Mail {
  const w = words(a.locale);
  const from = esc(a.fromName);
  const as = a.invitee
    ? fill(w.inviteAs, { name: esc(a.invitee.name) }) +
      (a.invitee.hi
        ? fill(w.inviteTerm, { hi: esc(a.invitee.hi), en: a.invitee.en && a.locale === "en" ? ` (${esc(a.invitee.en)})` : "" })
        : "") +
      "."
    : "";
  const body = [
    heading(fill(w.inviteTitle, { from })),
    as ? para(as) : "",
    as ? para(w.inviteLinked) : "",
    para(w.inviteAbout),
    buttons(button(a.link, w.inviteButton)),
    small(`${w.inviteExpires} ${w.privacy}`),
    rule(),
    fallbackLink(a.link, w.fallback),
  ].join("\n");
  const strip = (s: string) => s.replace(/<[^>]+>/g, "");
  return {
    to: a.to,
    subject: fill(w.inviteSubject, { from: a.fromName }),
    html: frame({
      origin: a.origin,
      locale: a.locale,
      title: fill(w.inviteTitle, { from }),
      preheader: w.invitePre,
      body,
      footer: fill(w.inviteFooter, { from }),
    }),
    text: [
      fill(w.inviteTitle, { from: a.fromName }),
      as ? strip(as.replace(/&amp;/g, "&")) : "",
      as ? w.inviteLinked : "",
      w.inviteAbout,
      `${w.inviteButton}: ${a.link}`,
      w.inviteExpires,
    ]
      .filter(Boolean)
      .join("\n\n"),
    purpose: "invite",
    previewToken: a.previewToken,
  };
}

// ---------------------------------------------------------------------------
// A possible relative: names on both sides, why we think so, and one-tap answers.

export type MatchLetter = {
  to: string;
  origin: string;
  locale: Locale;
  matchId: string;
  /** The person as the recipient wrote them. */
  mine: string;
  /** The same person as the other family wrote them. */
  theirs: string;
  /** The person is the recipient themself. */
  isYou: boolean;
  /** Reason codes from the matcher; date codes collapse to one private line. */
  reasons: string[];
  shared: string[];
  term: { hi: string; en: string | null; female: boolean } | null;
  score: number;
  more: number;
  unsubscribeUrl: string;
};

export function matchMail(a: MatchLetter): Mail {
  const w = words(a.locale);
  const c: Copy = copy[a.locale] ?? copy.en;
  const mine = esc(a.mine);
  const theirs = esc(a.theirs);
  const strong = a.score >= 80;
  const review = `${a.origin}/matches?focus=${encodeURIComponent(a.matchId)}`;

  const seen = new Set<string>();
  const reasons: string[] = [];
  for (const code of a.reasons) {
    const label = code.startsWith("dob") || code.startsWith("year") || code === "private_records"
      ? w.privateRecords
      : ((c as Record<string, string>)[`rs_${code}`] ?? "");
    if (label && !seen.has(label)) {
      seen.add(label);
      reasons.push(label);
    }
  }

  const badge = `<span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${strong ? C.growTint : C.tint};color:${strong ? C.grow : C.brandDeep};font-family:${FONT};font-size:12px;font-weight:600;">${strong ? w.strong : w.possible}</span>`;
  const side = (label: string, name: string) =>
    `<td valign="top" style="padding:14px 16px;background:${C.canvas};border-radius:14px;">
      <div style="font-family:${FONT};font-size:12px;color:${C.muted};margin-bottom:4px;">${label}</div>
      <div style="font-family:${FONT};font-size:17px;font-weight:700;color:${C.ink};">${name}</div>
    </td>`;
  const compare = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:4px 0 20px;"><tr>
    ${side(w.inYours, mine)}
    <td width="12" style="font-size:0;">&nbsp;</td>
    ${side(w.inTheirs, theirs)}
  </tr></table>`;
  const why = reasons.length
    ? `<p style="margin:0 0 8px;font-family:${FONT};font-size:13px;font-weight:600;color:${C.ink};">${w.why}</p>
       <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px;">
         ${reasons
           .map(
             (r) =>
               `<tr><td valign="top" style="padding:3px 8px 3px 0;font-family:${FONT};font-size:14px;color:${C.grow};font-weight:700;">✓</td><td style="padding:3px 0;font-family:${FONT};font-size:14px;line-height:1.5;color:${C.body};">${esc(r)}</td></tr>`,
           )
           .join("")}
       </table>`
    : "";
  const shared = a.shared.length ? para(fill(w.shared, { names: esc(a.shared.slice(0, 4).join(", ")) }), "font-size:14px;") : "";
  const bridge = a.term
    ? para(
        fill(a.term.female ? c.bridgePendingF : c.bridgePending, {
          term: `<b style="color:${C.brandDeep};">${esc(a.term.hi)}</b>${a.term.en && a.locale === "en" ? ` (${esc(a.term.en)})` : ""}`,
        }),
        `background:${C.tint};border-radius:12px;padding:12px 14px;font-size:14px;`,
      )
    : "";
  const more = a.more > 0 ? small(a.more === 1 ? w.more1 : fill(w.moreN, { n: a.more })) : "";
  const title = a.isYou ? w.matchTitleYou : fill(w.matchTitle, { mine });

  const body = [
    `<div style="margin:0 0 14px;">${badge}</div>`,
    heading(title),
    para(a.isYou ? w.matchIntroYou : fill(w.matchIntro, { mine })),
    compare,
    why,
    shared,
    bridge,
    `<p style="margin:6px 0 12px;font-family:${FONT};font-size:15px;font-weight:600;color:${C.ink};">${w.question}</p>`,
    buttons(button(`${review}&action=confirm`, w.yes), button(`${review}&action=dismiss`, w.no, "secondary")),
    small(`<a href="${esc(review)}" style="color:${C.brand};font-weight:600;">${w.review} →</a>`),
    more,
    rule(),
    small(w.safety, "margin-bottom:0;"),
  ].join("\n");

  const strip = (s: string) => s.replace(/<[^>]+>/g, "").replace(/&amp;/g, "&");
  const text = [
    strip(title.replace(mine, a.mine)),
    strip(a.isYou ? w.matchIntroYou : fill(w.matchIntro, { mine: a.mine })),
    `${w.inYours}: ${a.mine}\n${w.inTheirs}: ${a.theirs}`,
    reasons.length ? `${w.why}:\n${reasons.map((r) => `✓ ${r}`).join("\n")}` : "",
    a.shared.length ? fill(w.shared, { names: a.shared.slice(0, 4).join(", ") }) : "",
    a.term ? strip(fill(a.term.female ? c.bridgePendingF : c.bridgePending, { term: a.term.hi })) : "",
    `${w.question}\n${w.yes}: ${review}&action=confirm\n${w.no}: ${review}&action=dismiss`,
    a.more > 0 ? (a.more === 1 ? w.more1 : fill(w.moreN, { n: a.more })) : "",
    w.safety,
    `${w.unsubscribe}: ${a.unsubscribeUrl}`,
  ]
    .filter(Boolean)
    .join("\n\n");

  return {
    to: a.to,
    subject: a.isYou ? w.matchSubjectYou : fill(w.matchSubject, { mine: a.mine }),
    html: frame({
      origin: a.origin,
      locale: a.locale,
      title: strip(title),
      preheader: w.matchPre,
      body,
      footer: `${w.matchFooter} <a href="${esc(a.unsubscribeUrl)}" style="color:${C.muted};">${w.unsubscribe}</a>`,
    }),
    text,
    purpose: "kin",
    previewToken: "",
  };
}

// ---------------------------------------------------------------------------

export function testMail(a: { to: string; mode: string; from: string; origin: string; locale?: Locale }): Mail {
  const locale = a.locale ?? "en";
  const w = words(locale);
  const body = [heading(w.testTitle), para(fill(w.testBody, { mode: esc(a.mode), from: esc(a.from) }))].join("\n");
  return {
    to: a.to,
    subject: w.testSubject,
    html: frame({ origin: a.origin, locale, title: w.testTitle, preheader: w.testTitle, body, footer: w.privacy }),
    text: `${w.testTitle}. Sent through ${a.mode} from ${a.from}.`,
    purpose: "test",
    previewToken: "",
  };
}
