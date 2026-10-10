import { NextRequest, NextResponse } from "next/server";

export const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "ramya";
export const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "123svce";
const COOKIE_NAME = "vac_admin_session";
const ADMIN_SECRET = "admin_auth_secret_ece_2026";

export function checkAdminAuth(request: NextRequest): boolean {
  // 1. Check Cookie
  const cookieValue = request.cookies.get(COOKIE_NAME)?.value;
  if (cookieValue && cookieValue === ADMIN_SECRET) {
    return true;
  }

  // 2. Check Authorization Header (Basic Auth)
  const authHeader = request.headers.get("authorization");
  if (authHeader && authHeader.startsWith("Basic ")) {
    try {
      const base64 = authHeader.slice(6);
      const decoded = Buffer.from(base64, "base64").toString("utf-8");
      const [user, pass] = decoded.split(":");
      if (user === ADMIN_USERNAME && pass === ADMIN_PASSWORD) {
        return true;
      }
    } catch {
      return false;
    }
  }

  return false;
}

export function setAdminAuthCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, ADMIN_SECRET, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 12, // 12 hours
    path: "/",
  });
}

export function clearAdminAuthCookie(response: NextResponse): void {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 0,
    path: "/",
  });
}
