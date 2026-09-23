import { prisma } from "./db";
import { appUrl } from "./auth";

let originOverride: string | null = null;

export async function withOrigin<T>(origin: string | undefined, fn: () => Promise<T> | T): Promise<T> {
  const prev = originOverride;
  originOverride = origin || null;
  try {
    return await fn();
  } finally {
    originOverride = prev;
  }
}

function mailOrigin() {
  return (originOverride || appUrl()).replace(/\/$/, "");
}

export type Mail = {
  to: string;
  subject: string;
  html: string;
  text: string;
  purpose: string;
  previewToken: string;
};

/** Names are user-written; never let one become markup in a letter. */
export function esc(value: string) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function shell(inner: string) {
  return `<!doctype html>
<html>
<body style="margin:0;background:#F4EDE0;font-family:Georgia,serif;color:#1A120B;">
  <div style="max-width:560px;margin:32px auto;background:#FBF7F0;border:1px solid #E8DCC8;border-radius:18px;overflow:hidden;">
    <div style="padding:22px 28px;background:#6B1D2A;color:#E2C98A;">
      <div style="font-size:13px;letter-spacing:0.28em;text-transform:uppercase;">Vansh Vriksh</div>
      <div style="font-size:28px;margin-top:4px;">वंश वृक्ष</div>
    </div>
    <div style="padding:28px;">${inner}</div>
    <div style="padding:16px 28px;font-size:12px;color:#8A7340;border-top:1px solid #E8DCC8;">
      Dates of birth stay private. The tree shows names only.
    </div>
  </div>
</body>
</html>`;
}

export function otpMail(to: string, code: string, previewToken: string): Mail {
  const html = shell(`
    <p style="margin:0 0 8px;font-size:15px;">आपका प्रवेश कोड / Your sign-in code</p>
    <p style="font-size:36px;letter-spacing:0.28em;margin:12px 0 20px;color:#6B1D2A;font-weight:700;">${code}</p>
    <p style="line-height:1.55;color:#4A121C;">This code expires in 10 minutes. If you did not request it, you can ignore this letter.</p>
  `);
  return {
    to,
    subject: `${code} — वंश वृक्ष sign-in code`,
    html,
    text: `Your वंश वृक्ष code is ${code}. It expires in 10 minutes.`,
    purpose: "otp",
    previewToken,
  };
}

export function magicMail(to: string, token: string, previewToken: string): Mail {
  const url = `${mailOrigin()}/auth/magic?token=${token}`;
  const html = shell(`
    <p style="margin:0 0 16px;font-size:16px;">एक क्लिक में प्रवेश / Sign in with this link</p>
    <p><a href="${url}" style="display:inline-block;background:#6B1D2A;color:#FBF7F0;text-decoration:none;padding:12px 18px;border-radius:999px;">Open वंश वृक्ष</a></p>
    <p style="line-height:1.55;color:#4A121C;font-size:14px;">The link expires in 20 minutes and can be used once.<br/><span style="color:#8A7340;word-break:break-all;">${url}</span></p>
  `);
  return {
    to,
    subject: "Your वंश वृक्ष sign-in link",
    html,
    text: `Sign in to वंश वृक्ष: ${url}`,
    purpose: "magic",
    previewToken,
  };
}

export function inviteMail(
  to: string,
  fromName: string,
  token: string,
  previewToken: string,
  invitee: { name: string; hi: string; en: string } | null = null,
): Mail {
  const url = `${mailOrigin()}/auth/magic?token=${token}&invite=1`;
  const as = invitee
    ? `<p style="line-height:1.6;">They have written you in their tree as <b>${esc(invitee.name)}</b>${
        invitee.hi ? ` — their <b>${esc(invitee.hi)}</b>${invitee.en ? ` (${esc(invitee.en)})` : ""}` : ""
      }. When you join, your tree starts from there and the two trees are linked.</p>`
    : "";
  const html = shell(`
    <p style="font-size:16px;margin-top:0;">${esc(fromName)} has invited you to the family tree — <b>वंश वृक्ष</b>.</p>
    ${as}
    <p>Add the people you know. Birth dates stay hidden on the tree and are only used to find the same person across families.</p>
    <p><a href="${url}" style="display:inline-block;background:#6B1D2A;color:#FBF7F0;text-decoration:none;padding:12px 18px;border-radius:999px;">Join the tree</a></p>
  `);
  const asText = invitee ? ` They wrote you as ${invitee.name}${invitee.hi ? ` (their ${invitee.hi})` : ""}.` : "";
  return {
    to,
    subject: `${fromName} invited you to वंश वृक्ष`,
    html,
    text: `${fromName} invited you to वंश वृक्ष.${asText} Join: ${url}`,
    purpose: "invite",
    previewToken,
  };
}

export function kinFoundMail(to: string, ownName: string, locale: "en" | "hi"): Mail {
  const url = `${mailOrigin()}/matches`;
  const hi = locale === "hi";
  const html = shell(`
    <p style="margin:0 0 12px;font-size:16px;">${hi ? "संभावित परिवार मिला" : "Possible kin found"}</p>
    <p style="line-height:1.6;">${
      hi
        ? `किसी और परिवार ने शायद <b>${esc(ownName)}</b> को भी अपने वृक्ष में लिखा है। नाम और साझे रिश्तेदार देखकर आप तय करें कि वही व्यक्ति हैं या नहीं।`
        : `Another family may have written <b>${esc(ownName)}</b> in their tree too. Look at the names and shared relatives, and decide whether it is the same person.`
    }</p>
    <p><a href="${url}" style="display:inline-block;background:#6B1D2A;color:#FBF7F0;text-decoration:none;padding:12px 18px;border-radius:999px;">${hi ? "संभावित परिवार देखें" : "See possible kin"}</a></p>
    <p style="font-size:13px;color:#8A7340;">${hi ? "जन्म तिथियाँ किसी को नहीं दिखतीं।" : "Dates of birth are never shown to anyone."}</p>
  `);
  return {
    to,
    subject: hi ? `${ownName} — संभावित परिवार मिला` : `Possible kin found for ${ownName}`,
    html,
    text: hi
      ? `किसी और परिवार ने शायद ${ownName} को भी लिखा है। देखें: ${url}`
      : `Another family may have written ${ownName} too. See: ${url}`,
    purpose: "kin",
    previewToken: "",
  };
}

async function sendResend(mail: Mail) {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY missing");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM || "वंश वृक्ष <noreply@vanshvriksh.app>",
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Resend failed: ${res.status} ${body}`);
  }
}

export async function deliverMail(mail: Mail) {
  await prisma.emailOutbox.create({
    data: {
      to: mail.to,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      purpose: mail.purpose,
      previewToken: mail.previewToken,
    },
  });

  const mode = process.env.EMAIL_DELIVERY || "local";
  if (mode === "resend") await sendResend(mail);
  if (mode === "smtp") {
    throw new Error("SMTP delivery is configured but the SMTP transport is not wired in this build. Use EMAIL_DELIVERY=local or resend.");
  }
  return { delivery: mode === "resend" ? "email" : "letterbox" as const };
}

export function deliveryMode() {
  return process.env.EMAIL_DELIVERY || "local";
}
