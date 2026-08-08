import { Request, Response } from 'express';
import { query } from '../db/pool';
import { createOrder as createRazorpayOrder, verifyPaymentSignature, verifyWebhookSignature, RAZORPAY_KEY_ID } from '../services/razorpay';
import { v4 as uuidv4 } from 'uuid';
import { processCertificateJob } from '../jobs/certificate.job';
import dotenv from 'dotenv';
dotenv.config();

// If placeholder keys are present, run in test/demo mode (no real Razorpay calls)
const IS_TEST_MODE = !process.env.RAZORPAY_KEY_ID ||
  process.env.RAZORPAY_KEY_ID.includes('YourKeyId') ||
  process.env.RAZORPAY_KEY_ID === 'rzp_test_placeholder';

function generateTransactionId(): string {
  const year = new Date().getFullYear();
  const rand = Math.floor(Math.random() * 99999999).toString().padStart(8, '0');
  return `TXN-${year}-${rand}`;
}

export async function createOrder(req: Request, res: Response) {
  try {
    const companyId = req.user!.id;
    const { purchase_request_id } = req.body;

    // Fetch request
    const reqResult = await query(
      `SELECT pr.*, c.name as company_name, c.contact_email, c.cin
       FROM purchase_requests pr JOIN companies c ON pr.company_id = c.id
       WHERE (pr.id::text = $1 OR pr.request_id = $1) AND pr.company_id = $2 AND pr.status = 'approved'`,
      [purchase_request_id, companyId]
    );
    if (reqResult.rows.length === 0) {
      return res.status(404).json({ error: 'Request not found or not yet approved' });
    }
    const purchaseReq = reqResult.rows[0];
    if (!purchaseReq.total_amount) {
      return res.status(400).json({ error: 'Total amount not set by reviewer' });
    }

    let orderId: string;
    let amount: number;
    let currency = 'INR';

    if (IS_TEST_MODE) {
      // Demo/test mode: simulate order without hitting Razorpay API
      orderId = `order_TEST_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
      amount = Math.round(parseFloat(purchaseReq.total_amount) * 100);
      console.log('[TEST_MODE] Simulated Razorpay order:', orderId);
    } else {
      const order = await createRazorpayOrder(
        parseFloat(purchaseReq.total_amount),
        purchaseReq.request_id
      );
      orderId = order.id;
      amount = order.amount as number;
      currency = order.currency;
    }

    // Update request status
    await query(
      `UPDATE purchase_requests SET status='payment_pending', razorpay_order_id=$1, updated_at=NOW() WHERE id=$2`,
      [orderId, purchaseReq.id]
    );

    return res.json({
      order_id: orderId,
      amount,
      currency,
      key_id: RAZORPAY_KEY_ID || 'TEST_MODE',
      test_mode: IS_TEST_MODE,
      request_id: purchaseReq.request_id,
      company_name: purchaseReq.company_name,
    });
  } catch (err) {
    console.error('createOrder error:', err);
    return res.status(500).json({ error: 'Failed to create payment order' });
  }
}

export async function verifyPayment(req: Request, res: Response) {
  try {
    const companyId = req.user!.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify signature
    const isValid = verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature);
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Find the request
    const reqResult = await query(
      `SELECT pr.*, c.name as company_name, c.contact_email, c.cin
       FROM purchase_requests pr JOIN companies c ON pr.company_id = c.id
       WHERE pr.razorpay_order_id = $1 AND pr.company_id = $2`,
      [razorpay_order_id, companyId]
    );
    if (reqResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const purchaseReq = reqResult.rows[0];

    // Update request and create transaction
    await query(
      `UPDATE purchase_requests
       SET status='payment_verified', payment_status='paid', razorpay_payment_id=$1, paid_at=NOW(), updated_at=NOW()
       WHERE id=$2`,
      [razorpay_payment_id, purchaseReq.id]
    );

    const txnId = generateTransactionId();
    const txnResult = await query(
      `INSERT INTO transactions (transaction_id, company_id, purchase_request_id, credits, amount_inr, payment_method, razorpay_payment_id, status)
       VALUES ($1,$2,$3,$4,$5,'razorpay',$6,'success') RETURNING id`,
      [txnId, companyId, purchaseReq.id, purchaseReq.credits_requested, purchaseReq.total_amount, razorpay_payment_id]
    );

    // Notify company
    await query(
      `INSERT INTO notifications (recipient_type, recipient_id, type, title, message)
       VALUES ('company',$1,'payment_success','Payment Received',$2)`,
      [companyId, `Payment of ₹${purchaseReq.total_amount} received for request ${purchaseReq.request_id}. Pending final Government Verification.`]
    );

    return res.json({
      success: true,
      transaction_id: txnId,
      message: 'Payment received. Awaiting final Government Verification and Certificate Issuance.',
    });
  } catch (err) {
    console.error('verifyPayment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}

export async function handleWebhook(req: Request, res: Response) {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const body = req.body.toString();
    if (!verifyWebhookSignature(body, signature)) {
      return res.status(400).json({ error: 'Invalid webhook signature' });
    }
    const event = JSON.parse(body);
    console.log('[WEBHOOK]', event.event);
    if (event.event === 'payment.failed') {
      const paymentId = event.payload?.payment?.entity?.order_id;
      if (paymentId) {
        await query(
          "UPDATE purchase_requests SET payment_status='failed' WHERE razorpay_order_id=$1",
          [paymentId]
        );
      }
    }
    return res.json({ status: 'ok' });
  } catch (err) {
    console.error('webhook error:', err);
    return res.status(500).json({ error: 'Webhook processing failed' });
  }
}

// Test-mode only: simulate a completed payment without Razorpay
export async function simulatePay(req: Request, res: Response) {
  if (!IS_TEST_MODE) {
    return res.status(403).json({ error: 'simulate-pay only available in test mode' });
  }
  try {
    const companyId = req.user!.id;
    const { order_id } = req.body;

    const reqResult = await query(
      `SELECT pr.*, c.contact_email, c.name as company_name FROM purchase_requests pr
       JOIN companies c ON pr.company_id = c.id
       WHERE pr.razorpay_order_id = $1 AND pr.company_id = $2`,
      [order_id, companyId]
    );
    if (reqResult.rows.length === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }
    const purchaseReq = reqResult.rows[0];
    const fakePaymentId = `pay_TEST_${uuidv4().replace(/-/g, '').substring(0, 14)}`;

    await query(
      `UPDATE purchase_requests
       SET status='payment_verified', payment_status='paid', razorpay_payment_id=$1, paid_at=NOW(), updated_at=NOW()
       WHERE id=$2`,
      [fakePaymentId, purchaseReq.id]
    );

    const txnId = generateTransactionId();
    await query(
      `INSERT INTO transactions (transaction_id, company_id, purchase_request_id, credits, amount_inr, payment_method, razorpay_payment_id, status)
       VALUES ($1,$2,$3,$4,$5,'razorpay_test',$6,'success')`,
      [txnId, companyId, purchaseReq.id, purchaseReq.credits_requested, purchaseReq.total_amount, fakePaymentId]
    );

    await query(
      `INSERT INTO notifications (recipient_type, recipient_id, type, title, message)
       VALUES ('company',$1,'payment_success','Payment Received (Test)',$2)`,
      [companyId, `Test payment received for request ${purchaseReq.request_id}. Pending Government Verification.`]
    );

    console.log('[TEST_MODE] Simulated payment success:', fakePaymentId);
    return res.json({
      success: true,
      transaction_id: txnId,
      message: 'Test payment simulated. Awaiting Government Verification.',
    });
  } catch (err) {
    console.error('simulatePay error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
