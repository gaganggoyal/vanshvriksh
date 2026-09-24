import nodemailer from "nodemailer";
import { prisma } from "./db";
import { BRAND } from "./brand";
import type { Mail } from "./mail-templates";

export type { Mail } from "./mail-templates";

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
      reply_to: BRAND.contact,
      headers: mail.headers,
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
    replyTo: BRAND.contact,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
    headers: mail.headers,
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
