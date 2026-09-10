import nodemailer from 'nodemailer';
import { getMainConfig } from './config';

// DB main.smtp wins, env is fallback (original behavior). sendEmail stays a no-op when unconfigured.
let cached: { key: string; tr: nodemailer.Transporter } | null = null;

export async function sendEmail(to: string, subject: string, html: string) {
  const cfg = await getMainConfig();
  const s = cfg.smtp || {};
  const host = s.host || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(s.port || process.env.SMTP_PORT || 587);
  const user = s.username || process.env.SMTP_USER;
  const pass = s.password || process.env.SMTP_PASS;
  const enc = s.encryption || '';
  if (!user) return; // no-op if unconfigured
  const key = `${host}:${port}:${user}:${pass}:${enc}`;
  if (!cached || cached.key !== key) {
    cached = { key, tr: nodemailer.createTransport({ host, port, secure: enc === 'ssl', auth: { user, pass } }) };
  }
  await cached.tr.sendMail({
    from: s.from || process.env.SMTP_FROM || `"${cfg.website_name || 'SMM Panel'}" <${user}>`,
    to, subject, html,
  });
}
