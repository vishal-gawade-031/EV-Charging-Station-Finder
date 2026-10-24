import { NextRequest, NextResponse } from "next/server";
import { getSessionDatabase } from "@/database/session-db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentReference, action, failureReason, idempotencyKey, paymentMethod } = body;

    if (!paymentReference) {
      return NextResponse.json(
        { error: "'paymentReference' is required." },
        { status: 400 }
      );
    }

    if (!action || !["success", "fail", "cancel"].includes(action)) {
      return NextResponse.json(
        { error: "'action' must be one of 'success', 'fail', or 'cancel'." },
        { status: 400 }
      );
    }

    const db = getSessionDatabase();
    const result = db.processPayment({
      paymentReference,
      action,
      failureReason,
      idempotencyKey,
      paymentMethod,
    });

    return NextResponse.json({
      success: true,
      message:
        action === "success"
          ? "Demo payment simulated successfully."
          : action === "fail"
          ? "Demo payment failure simulated."
          : "Demo payment cancelled.",
      transaction: result.transaction,
      session: result.session,
      receipt: result.receipt,
    });
  } catch (error: any) {
    console.error("Error processing demo payment:", error);
    const msg = error.message || "";
    let status = 400;
    if (msg.includes("not found")) status = 404;
    else if (msg.includes("expired") || msg.includes("cancelled")) status = 410;
    else if (msg.includes("does not match")) status = 422;

    return NextResponse.json(
      { error: error.message || "Failed to process demo payment." },
      { status }
    );
  }
}
