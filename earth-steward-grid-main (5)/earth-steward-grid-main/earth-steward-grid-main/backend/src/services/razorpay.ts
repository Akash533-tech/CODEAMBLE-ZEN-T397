import Razorpay from 'razorpay';
import crypto from 'crypto';

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_placeholder',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret',
});

export async function createOrder(amountInRs: number, receipt: string) {
  const order = await razorpay.orders.create({
    amount: Math.round(amountInRs * 100), // paise
    currency: 'INR',
    receipt,
    notes: { source: 'carbon_credit_portal' },
  });
  return order;
}

export function verifyPaymentSignature(
  razorpay_order_id: string,
  razorpay_payment_id: string,
  razorpay_signature: string
): boolean {
  const sign = `${razorpay_order_id}|${razorpay_payment_id}`;
  const expectedSig = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'placeholder_secret')
    .update(sign)
    .digest('hex');
  return expectedSig === razorpay_signature;
}

export function verifyWebhookSignature(body: string, signature: string): boolean {
  const expected = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET || 'webhook_secret')
    .update(body)
    .digest('hex');
  return expected === signature;
}

export const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID;
