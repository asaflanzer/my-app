import nodemailer from "nodemailer";

function createTransport() {
  const url = process.env.SMTP_URL;
  if (!url) return null;
  return nodemailer.createTransport(url);
}

export async function sendMail(opts: {
  to: string;
  subject: string;
  text: string;
}) {
  const transport = createTransport();
  if (!transport) {
    console.warn("[email] SMTP_URL not set — skipping send");
    return;
  }
  await transport.sendMail({
    from: process.env.SMTP_FROM ?? "noreply@legg.app",
    ...opts,
  });
}

export function getFirstAdminEmail(): string | null {
  const emails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
  return emails[0] ?? null;
}
