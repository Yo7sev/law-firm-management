import { NextResponse } from "next/server";

const DJANGO_BACKEND =
  process.env.DJANGO_BACKEND_URL || "http://127.0.0.1:8000";

export async function GET() {
  const backendUrl = `${DJANGO_BACKEND.replace(
    /\/+$/,
    "",
  )}/accounts/google/login/`;

  return NextResponse.redirect(backendUrl);
}
