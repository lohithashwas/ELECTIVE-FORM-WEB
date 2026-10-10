import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkAdminAuth } from "@/lib/admin-auth";

export async function POST(request: NextRequest) {
  if (!checkAdminAuth(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data, error } = await supabaseAdmin.rpc("run_fcfs_allotment");

    if (error) {
      console.error("Error executing FCFS allotment RPC:", error);
      return NextResponse.json(
        { error: error.message || "Failed to execute auto-allotment." },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error("Unexpected allotment error:", err);
    return NextResponse.json(
      { error: "Internal server error during allotment." },
      { status: 500 }
    );
  }
}
