import { NextResponse } from "next/server";
import { getRuntimeReadiness } from "@/lib/runtime";

export async function GET() {
  const readiness = getRuntimeReadiness();
  return NextResponse.json({
    ok: true,
    service: "mom-good",
    adminReady: readiness.readyForAdmin,
    printfulImportReady: readiness.readyForPrintfulImport,
    capabilities: readiness.capabilities.map(({ key, label, ready, requiredFor }) => ({ key, label, ready, requiredFor })),
  });
}
