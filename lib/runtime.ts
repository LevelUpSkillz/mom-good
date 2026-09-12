export type RuntimeCapability = {
  key: string;
  label: string;
  ready: boolean;
  requiredFor: string;
};

function present(name: string) {
  return Boolean(process.env[name]?.trim());
}

function enabled(name: string) {
  return process.env[name]?.trim().toLowerCase() === "true";
}

export function getRuntimeCapabilities(): RuntimeCapability[] {
  return [
    {
      key: "database",
      label: "Database",
      ready: present("DATABASE_URL"),
      requiredFor: "persistent catalog, variants and orders",
    },
    {
      key: "admin-password",
      label: "Admin password",
      ready: present("ADMIN_PASSWORD"),
      requiredFor: "admin sign-in",
    },
    {
      key: "admin-session",
      label: "Admin session secret",
      ready: present("ADMIN_SESSION_SECRET"),
      requiredFor: "secure admin sessions",
    },
    {
      key: "printful",
      label: "Printful",
      ready: present("PRINTFUL_API_TOKEN"),
      requiredFor: "supplier imports and synchronization",
    },
    {
      key: "stripe-secret",
      label: "Stripe secret key",
      ready: present("STRIPE_SECRET_KEY"),
      requiredFor: "real checkout sessions",
    },
    {
      key: "stripe-webhook",
      label: "Stripe webhook secret",
      ready: present("STRIPE_WEBHOOK_SECRET"),
      requiredFor: "verified payment events",
    },
    {
      key: "stripe-shipping",
      label: "Stripe shipping rate",
      ready: present("STRIPE_SHIPPING_RATE_ID"),
      requiredFor: "real shipping charge at checkout",
    },
    {
      key: "checkout-switch",
      label: "Checkout switch",
      ready: enabled("CHECKOUT_ENABLED"),
      requiredFor: "customer checkout activation",
    },
    {
      key: "printful-submit-switch",
      label: "Printful auto-submit switch",
      ready: enabled("PRINTFUL_AUTO_SUBMIT"),
      requiredFor: "automatic post-payment fulfillment",
    },
  ];
}

export function getRuntimeReadiness() {
  const capabilities = getRuntimeCapabilities();
  const has = (key: string) => capabilities.find((item) => item.key === key)?.ready === true;

  return {
    capabilities,
    readyForAdmin: ["database", "admin-password", "admin-session"].every(has),
    readyForPrintfulImport: ["database", "printful"].every(has),
    readyForCheckout: ["database", "stripe-secret", "stripe-webhook", "stripe-shipping", "checkout-switch"].every(has),
    readyForAutoFulfillment: ["database", "printful", "printful-submit-switch"].every(has),
  };
}
