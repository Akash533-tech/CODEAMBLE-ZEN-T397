import api from './api';

export interface RazorpayOrderResponse {
  order_id: string;
  amount: number;
  currency: string;
  key_id: string;
  request_id: string;
  company_name: string;
  test_mode?: boolean;
}

export async function createOrder(purchase_request_id: string): Promise<RazorpayOrderResponse> {
  const res = await api.post('/payment/create-order', { purchase_request_id });
  return res.data;
}

export async function verifyPayment(payload: {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
}) {
  const res = await api.post('/payment/verify', payload);
  return res.data;
}

// Used in test/demo mode when no real Razorpay keys are configured
export async function simulatePay(order_id: string) {
  const res = await api.post('/payment/simulate-pay', { order_id });
  return res.data;
}

export function openRazorpayModal(
  orderData: RazorpayOrderResponse,
  onSuccess: (response: any) => void,
  onError: (err: any) => void
) {
  if (!(window as any).Razorpay) {
    // Load Razorpay script dynamically
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => initModal();
    script.onerror = () => onError(new Error('Failed to load Razorpay SDK'));
    document.head.appendChild(script);
  } else {
    initModal();
  }

  function initModal() {
    const options = {
      key: orderData.key_id || import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: orderData.amount,
      currency: orderData.currency || 'INR',
      name: 'Carbon Credit Authority',
      description: `Carbon Credits — ${orderData.request_id}`,
      order_id: orderData.order_id,
      handler: async (response: any) => {
        try {
          const result = await verifyPayment({
            razorpay_order_id: response.razorpay_order_id,
            razorpay_payment_id: response.razorpay_payment_id,
            razorpay_signature: response.razorpay_signature,
          });
          onSuccess(result);
        } catch (err) {
          onError(err);
        }
      },
      prefill: { name: orderData.company_name },
      theme: { color: '#1A5C38' },
      modal: { ondismiss: () => onError(new Error('Payment cancelled by user')) },
    };
    const rzp = new (window as any).Razorpay(options);
    rzp.open();
  }
}
