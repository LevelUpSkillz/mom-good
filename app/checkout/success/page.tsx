export default function CheckoutSuccessPage() {
  return (
    <main className="wrap" style={{ maxWidth: 760 }}>
      <div className="eyebrow">Order received</div>
      <h1>Thank you.</h1>
      <p className="muted">Your payment confirmation is being processed securely. Fulfillment only begins after the verified Stripe webhook marks the payment as paid.</p>
      <div className="panel" style={{ marginTop: 28 }}>
        <strong>What happens next</strong>
        <p className="muted" style={{ marginBottom: 0 }}>Once payment is verified, Mom Good creates the internal order and, when automatic fulfillment is enabled, submits the eligible item to Printful. If fulfillment is not enabled, the order remains safely in Admin for manual handling.</p>
      </div>
      <p style={{ marginTop: 24 }}><a href="/shop">Back to shop</a></p>
    </main>
  );
}
