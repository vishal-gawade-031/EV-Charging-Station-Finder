import { NextRequest, NextResponse } from "next/server";
import { getSessionDatabase } from "@/database/session-db";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Session ID is required." }, { status: 400 });
    }

    let finalBatteryPercent: number | undefined;
    try {
      const body = await request.json();
      if (typeof body.finalBatteryPercent === "number") {
        finalBatteryPercent = body.finalBatteryPercent;
      }
    } catch {
      // Body is optional
    }

    const db = getSessionDatabase();
    const session = db.stopSession(id, finalBatteryPercent);

    // Automatically create or get the valid payment transaction for the final authoritative amount
    const paymentTransaction = db.createOrGetPaymentTransaction(session.id);

    return NextResponse.json({
      success: true,
      message: "Charging session stopped and finalized successfully.",
      session,
      paymentTransaction,
    });
  } catch (error: any) {
    console.error("Error stopping charging session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to stop charging session." },
      { status: 500 }
    );
  }
}
