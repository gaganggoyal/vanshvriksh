import nodemailer from "nodemailer";
import { prisma } from "./db";
import { appUrl } from "./auth";
import { BRAND } from "./brand";

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

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans Devanagari',Helvetica,Arial,sans-serif";

function button(url: string, label: string) {
  return `<a href="${url}" style="display:inline-block;background:#5B4BF5;color:#ffffff;text-decoration:none;padding:12px 20px;border-radius:12px;font-weight:600;font-size:15px;">${label}</a>`;
}

function shell(inner: string) {
  return `<!doctype html>
<html>
<body style="margin:0;background:#F7F7FB;font-family:${FONT};color:#0E0D14;">
  <div style="max-width:560px;margin:32px auto;padding:0 16px;">
    <div style="padding:0 4px 16px;font-size:18px;font-weight:700;">
      <span style="display:inline-block;width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,#5B4BF5,#B62AD9);vertical-align:middle;margin-right:8px;"></span>${BRAND.name}
    </div>
    <div style="background:#ffffff;border:1px solid #E7E6EF;border-radius:20px;padding:28px;">${inner}</div>
    <p style="padding:16px 4px;font-size:12px;line-height:1.5;color:#6B6A7B;margin:0;">
      Dates of birth stay private — the tree shows names only.<br/>${BRAND.name} · <a href="${BRAND.url}" style="color:#6B6A7B;">${BRAND.domain}</a>
    </p>
  </div>
</body>
</html>`;
}

export function otpMail(to: string, code: string, previewToken: string, welcome = false): Mail {
  const html = shell(`
    <p style="margin:0 0 4px;font-size:16px;font-weight:600;">${welcome ? `Welcome to ${BRAND.name}` : "Your sign-in code"}</p>
    <p style="margin:0;font-size:14px;color:#6B6A7B;">आपका प्रवेश कोड</p>
    <p style="font-size:38px;letter-spacing:0.22em;margin:20px 0;color:#5B4BF5;font-weight:700;">${code}</p>
    <p style="line-height:1.55;color:#3F3E4C;margin:0;font-size:14px;">This code expires in 10 minutes. If you did not ask for it, you can ignore this email.</p>
  `);
  return {
    to,
    subject: `${code} is your ${BRAND.name} code`,
    html,
    text: `Your ${BRAND.name} code is ${code}. It expires in 10 minutes.`,
    purpose: "otp",
    previewToken,
  };
}

export function magicMail(to: string, token: string, previewToken: string): Mail {
  const url = `${mailOrigin()}/auth/magic?token=${token}`;
  const html = shell(`
    <p style="margin:0 0 4px;font-size:16px;font-weight:600;">Sign in with one tap</p>
    <p style="margin:0 0 20px;font-size:14px;color:#6B6A7B;">एक क्लिक में प्रवेश</p>
    <p>${button(url, `Open ${BRAND.name}`)}</p>
    <p style="line-height:1.55;color:#3F3E4C;font-size:13px;margin:20px 0 0;">The link expires in 20 minutes and works once.<br/><span style="color:#6B6A7B;word-break:break-all;">${url}</span></p>
  `);
  return {
    to,
    subject: `Your ${BRAND.name} sign-in link`,
    html,
    text: `Sign in to ${BRAND.name}: ${url}`,
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
    ? `<p style="line-height:1.6;font-size:14px;">They have written you in their tree as <b>${esc(invitee.name)}</b>${
        invitee.hi ? ` — their <b>${esc(invitee.hi)}</b>${invitee.en ? ` (${esc(invitee.en)})` : ""}` : ""
      }. When you join, your tree starts from there and the two trees are linked.</p>`
    : "";
  const html = shell(`
    <p style="font-size:16px;margin-top:0;font-weight:600;">${esc(fromName)} invited you to their family tree</p>
    ${as}
    <p style="line-height:1.6;font-size:14px;color:#3F3E4C;">Add the people you know. Birth dates stay hidden and are only used to find the same person across families.</p>
    <p style="margin-top:20px;">${button(url, "Join the family tree")}</p>
  `);
  const asText = invitee ? ` They wrote you as ${invitee.name}${invitee.hi ? ` (their ${invitee.hi})` : ""}.` : "";
  return {
    to,
    subject: `${fromName} invited you to ${BRAND.name}`,
    html,
    text: `${fromName} invited you to ${BRAND.name}.${asText} Join: ${url}`,
    purpose: "invite",
    previewToken,
  };
}

export function kinFoundMail(to: string, ownName: string, locale: "en" | "hi"): Mail {
  const url = `${mailOrigin()}/matches`;
  const hi = locale === "hi";
  const html = shell(`
    <p style="margin:0 0 12px;font-size:16px;font-weight:600;">${hi ? "संभावित परिवार मिला" : "Possible relative found"}</p>
    <p style="line-height:1.6;font-size:14px;">${
      hi
        ? `किसी और परिवार ने शायद <b>${esc(ownName)}</b> को भी अपने वृक्ष में लिखा है। नाम और साझे रिश्तेदार देखकर आप तय करें कि वही व्यक्ति हैं या नहीं।`
        : `Another family may have written <b>${esc(ownName)}</b> in their tree too. Look at the names and shared relatives, and decide whether it is the same person.`
    }</p>
    <p style="margin-top:20px;">${button(url, hi ? "संभावित परिवार देखें" : "See possible kin")}</p>
    <p style="font-size:13px;color:#6B6A7B;margin-bottom:0;">${hi ? "जन्म तिथियाँ किसी को नहीं दिखतीं।" : "Dates of birth are never shown to anyone."}</p>
  `);
  return {
    to,
    subject: hi ? `${ownName} — संभावित परिवार मिला` : `Possible relative found for ${ownName}`,
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
      from: process.env.EMAIL_FROM || BRAND.from,
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

let smtp: nodemailer.Transporter | null = null;
function smtpTransport() {
  if (!smtp) {
    const port = Number(process.env.SMTP_PORT || 587);
    smtp = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port,
      secure: process.env.SMTP_SECURE ? process.env.SMTP_SECURE === "true" : port === 465,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined,
    });
  }
  return smtp;
}

async function sendSmtp(mail: Mail) {
  await smtpTransport().sendMail({
    from: process.env.EMAIL_FROM || BRAND.from,
    to: mail.to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
}

export function deliveryMode() {
  return process.env.EMAIL_DELIVERY || "local";
}

/** A real transport is configured, so letters leave the building. */
export function emailReady() {
  const mode = deliveryMode();
  if (mode === "resend") return Boolean(process.env.RESEND_API_KEY);
  if (mode === "smtp") return Boolean(process.env.SMTP_HOST);
  return false;
}

/**
 * The letterbox shows sign-in codes to whoever asked for them — right for a
 * laptop, account takeover on a public server. Production needs an explicit opt-in.
 */
export function letterboxAllowed() {
  if (emailReady()) return false;
  if (process.env.NODE_ENV !== "production") return true;
  return process.env.ALLOW_LETTERBOX === "true";
}

/** Can a sign-in letter reach anyone at all? */
export function canSendSignIn() {
  return emailReady() || letterboxAllowed();
}

export async function deliverMail(mail: Mail) {
  // Keep a copy only where the letterbox may show it; real mail isn't stored.
  if (letterboxAllowed()) {
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
  }

  const mode = deliveryMode();
  if (mode === "resend") await sendResend(mail);
  if (mode === "smtp") await sendSmtp(mail);
  return { delivery: emailReady() ? ("email" as const) : ("letterbox" as const) };
}
