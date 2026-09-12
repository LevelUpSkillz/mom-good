import { NextResponse } from "next/server";
import { setAdminSession, validAdminPassword } from "@/lib/auth";

export async function POST(request: Request) {
  const form = await request.formData();
  const password = String(form.get("password") || "");
  if (!validAdminPassword(password)) {
    return NextResponse.redirect(new URL("/admin/login?error=invalid", request.url), 303);
  }
  await setAdminSession();
  return NextResponse.redirect(new URL("/admin", request.url), 303);
}
