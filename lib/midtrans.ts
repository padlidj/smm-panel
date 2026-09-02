import crypto from 'crypto';

const MIDTRANS_API = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  ? 'https://app.midtrans.com/snap/v1'
  : 'https://app.sandbox.midtrans.com/snap/v1';

export async function createSnapTransaction(orderId: string, amount: number, customer: { name: string; email: string }) {
  const auth = Buffer.from(`${process.env.MIDTRANS_SERVER_KEY}:`).toString('base64');

  const res = await fetch(`${MIDTRANS_API}/transactions`, {
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

export function verifySignature(orderId: string, statusCode: string, grossAmount: string, signatureKey: string) {
  const hash = crypto
    .createHash('sha512')
    .update(orderId + statusCode + grossAmount + process.env.MIDTRANS_SERVER_KEY)
    .digest('hex');
  return hash === signatureKey;
}