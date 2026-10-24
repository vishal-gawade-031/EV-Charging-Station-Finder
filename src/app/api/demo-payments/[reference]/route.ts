import { NextRequest, NextResponse } from "next/server";
import { getSessionDatabase } from "@/database/session-db";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference } = await context.params;
    if (!reference) {
      return NextResponse.json({ error: "Payment reference is required." }, { status: 400 });
    }

    const db = getSessionDatabase();
    const result = db.getPaymentTransactionByReference(reference);

    if (!result) {
      return NextResponse.json(
        { error: "Invalid payment reference. Transaction not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      transaction: result.transaction,
      session: result.session,
    });
  } catch (error: any) {
    console.error("Error retrieving payment reference:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve payment details." },
      { status: 500 }
    );
  }
}
