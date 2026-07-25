import { NextRequest, NextResponse } from "next/server";
import { getRegistrationByRoll } from "@/lib/registration-data";

export async function GET(request: NextRequest) {
  try {
    const rollNumber = request.nextUrl.searchParams.get("roll_number")?.trim();

    if (!rollNumber) {
      return NextResponse.json(
        { success: false, message: "roll_number is required." },
        { status: 400 }
      );
    }

    const registration = await getRegistrationByRoll(rollNumber);

    return NextResponse.json({
      success: true,
      exists: Boolean(registration),
      registration,
    });
  } catch (error) {
    console.error("Registration lookup failed:", error);
    return NextResponse.json(
      { success: false, message: "Unable to look up registration." },
      { status: 500 }
    );
  }
}
