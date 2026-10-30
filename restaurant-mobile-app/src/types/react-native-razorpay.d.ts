declare module 'react-native-razorpay' {
  type CheckoutOptions = {
    key: string;
    amount: string;
    currency: string;
    name: string;
    description: string;
    order_id: string;
    prefill: {
      name: string;
      email: string;
      contact: string;
    };
    theme: {
      color: string;
    };
  };

  type PaymentResult = {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
  };

  const RazorpayCheckout: {
    open(options: CheckoutOptions): Promise<PaymentResult>;
  };

  export default RazorpayCheckout;
}
