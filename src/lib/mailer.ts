import "server-only";

import nodemailer, { type Transporter } from "nodemailer";

let transporter: Transporter | null | undefined;

/**
 * Return a shared Gmail SMTP transport, or null when email credentials are
 * not configured.
 */
export function getMailer(): Transporter | null {
  if (transporter !== undefined) return transporter;

  const address = process.env.EMAIL_ADDRESS;
  const password = process.env.EMAIL_PASSWORD;

  if (!address || !password) {
    transporter = null;
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 465,
    secure: true,
    auth: {
      user: address,
      pass: password,
    },
  });

  return transporter;
}
