import crypto from 'crypto';
import { getMainConfig } from './config';

async function serverKey(): Promise<string | undefined> {
  const cfg = await getMainConfig();
  return cfg.midtrans_payment?.server_key || process.env.MIDTRANS_SERVER_KEY; // DB config wins, env fallback
}

export async function createSnapTransaction(orderId: string, amount: number, customer: { name: string; email: string }) {
  const production = (await getMainConfig()).midtrans_payment?.is_production ?? process.env.MIDTRANS_IS_PRODUCTION === 'true';
  const api = production ? 'https://app.midtrans.com/snap/v1' : 'https://app.sandbox.midtrans.com/snap/v1';
  const auth = Buffer.from(`${await serverKey()}:`).toString('base64');

  const res = await fetch(`${api}/transactions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Basic ${auth}` },
    body: JSON.stringify({
      transaction_details: { order_id: orderId, gross_amount: amount },
      customer_details: { first_name: customer.name, email: customer.email },
      credit_card: { secure: true },
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_messages?.[0] || 'Midtrans error');

  return { token: data.token, redirect_url: data.redirect_url };
}

export async function verifySignature(orderId: string, statusCode: string, grossAmount: string, signatureKey: string) {
  const hash = crypto
    .createHash('sha512')
    .update(orderId + statusCode + grossAmount + (await serverKey()))
    .digest('hex');
  return hash === signatureKey;
}