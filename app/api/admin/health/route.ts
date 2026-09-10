import { NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/auth";
import { getRuntimeReadiness } from "@/lib/runtime";
import { getDb } from "@/lib/db";
import { testPrintfulConnection } from "@/lib/printful";

export async function GET() {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const readiness = getRuntimeReadiness();
  const result: Record<string, unknown> = {
    ok: true,
    runtime: readiness,
    database: { configured: Boolean(process.env.DATABASE_URL), connected: false },
    printful: { configured: Boolean(process.env.PRINTFUL_API_TOKEN), connected: false },
  };

  if (process.env.DATABASE_URL) {
    try {
      const startedAt = Date.now();
      await getDb().query("select 1");
      result.database = { configured: true, connected: true, latencyMs: Date.now() - startedAt };
    } catch (error) {
      result.database = {
        configured: true,
        connected: false,
        error: error instanceof Error ? error.message : "Database connection failed",
      };
      result.ok = false;
    }
  }

  if (process.env.PRINTFUL_API_TOKEN) {
    try {
      result.printful = { configured: true, connected: true, ...(await testPrintfulConnection()) };
    } catch (error) {
      result.printful = {
        configured: true,
        connected: false,
        error: error instanceof Error ? error.message : "Printful connection failed",
      };
      result.ok = false;
    }
  }

  return NextResponse.json(result, { status: result.ok ? 200 : 503 });
}
