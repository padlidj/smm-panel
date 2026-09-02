import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ponytail: SMTP_HOST/USER/PASS required in .env. Add queue when volume > 100/day.
export async function sendEmail(to: string, subject: string, html: string) {
  if (!process.env.SMTP_USER) return; // no-op if unconfigured
  await transporter.sendMail({
    from: process.env.SMTP_FROM || `"SMM Panel" <${process.env.SMTP_USER}>`,
    to, subject, html,
  });
}