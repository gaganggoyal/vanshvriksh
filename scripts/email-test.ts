/**
 * Send one test letter through the configured transport, so a new SMTP login
 * or Resend key is proven before anyone tries to sign in.
 *
 *   set -a; . ./.env; set +a
 *   npm run email:test -- you@example.com
 */
import { prisma } from "../src/lib/db";
import { appUrl } from "../src/lib/auth";
import { BRAND } from "../src/lib/brand";
import { deliverMail, deliveryMode, emailReady } from "../src/lib/email";
import { testMail } from "../src/lib/mail-templates";

async function main() {
  const to = process.argv[2]?.trim();
  if (!to || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) {
    console.error("Usage: npm run email:test -- you@example.com");
    process.exitCode = 1;
    return;
  }
  if (!emailReady()) {
    console.error(
      `No email transport is configured (EMAIL_DELIVERY=${deliveryMode()}).\n` +
        "Set EMAIL_DELIVERY=resend with RESEND_API_KEY, or EMAIL_DELIVERY=smtp with SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS.",
    );
    process.exitCode = 1;
    return;
  }
  try {
    await deliverMail(testMail({ to, mode: deliveryMode(), from: process.env.EMAIL_FROM || BRAND.from, origin: appUrl() }));
    console.log(`Sent through ${deliveryMode()} to ${to}. Check the inbox, and the spam folder the first time.`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`Sending failed: ${msg}`);
    if (/domain is not verified|not verified/i.test(msg)) console.error("→ Finish the DNS records in the provider's dashboard and press Verify.");
    else if (/EAUTH|Invalid login|authentication|401|403/i.test(msg)) console.error("→ The username, password or API key was rejected.");
    else if (/ETIMEDOUT|ECONNREFUSED|ENOTFOUND/i.test(msg)) console.error("→ The server could not reach that host/port. Try port 465, or the provider's HTTPS API.");
    process.exitCode = 1;
  }
}

main().finally(() => prisma.$disconnect());
