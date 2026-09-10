export type RuntimeCapability = {
  key: string;
  label: string;
  ready: boolean;
  requiredFor: string;
};

function present(name: string) {
  return Boolean(process.env[name]?.trim());
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
  ];
}

export function getRuntimeReadiness() {
  const capabilities = getRuntimeCapabilities();
  return {
    capabilities,
    readyForAdmin: capabilities
      .filter((item) => item.key === "database" || item.key.startsWith("admin-"))
      .every((item) => item.ready),
    readyForPrintfulImport: capabilities
      .filter((item) => ["database", "printful"].includes(item.key))
      .every((item) => item.ready),
  };
}
