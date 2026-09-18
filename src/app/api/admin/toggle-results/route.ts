import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const ADMIN_USERNAME = "ramya";
const ADMIN_PASSWORD = "123svce";

function checkAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Basic ")) return false;
  const base64 = authHeader.slice(6);
  const decoded = Buffer.from(base64, "base64").toString("utf-8");
  const [user, pass] = decoded.split(":");
  return user === ADMIN_USERNAME && pass === ADMIN_PASSWORD;
}

export async function GET(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: settings, error } = await supabaseAdmin
      .from("portal_settings")
      .select("results_published")
      .eq("id", 1)
      .single();

    if (error) {
      return NextResponse.json({ results_published: false });
    }

    return NextResponse.json({
      results_published: settings?.results_published ?? false,
    });
  } catch {
    return NextResponse.json({ results_published: false });
  }
}

export async function POST(request: NextRequest) {
  if (!checkAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { published } = body;

    if (typeof published !== "boolean") {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("portal_settings")
      .update({ results_published: published, updated_at: new Date().toISOString() })
      .eq("id", 1)
      .select("results_published")
      .single();

    if (error) {
      console.error("Error toggling results_published:", error);
      return NextResponse.json({ error: "Failed to update results setting." }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      results_published: data.results_published,
    });
  } catch (err) {
    console.error("Unexpected error toggling results:", err);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
