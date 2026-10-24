import { NextRequest, NextResponse } from "next/server";
import { getSessionDatabase } from "@/database/session-db";
import { generatePaymentQRCode } from "@/lib/payments/qr-service";

export async function POST(
  request: NextRequest,
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
        { error: "Payment transaction with specified reference was not found." },
        { status: 404 }
      );
    }

    // Force regenerate for the session
    const newTx = db.createOrGetPaymentTransaction(result.session.id, true);

    const host = request.headers.get("host") || "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    const baseUrl = `${proto}://${host}`;

    const qr = await generatePaymentQRCode(
      newTx.paymentReference,
      newTx.amount,
      baseUrl,
      newTx.expiresAt
    );

    return NextResponse.json({
      success: true,
      transaction: newTx,
      qr,
    });
  } catch (error: any) {
    console.error("Error regenerating payment reference:", error);
    return NextResponse.json(
      { error: error.message || "Failed to regenerate payment QR." },
      { status: 500 }
    );
  }
}
