import { NextRequest, NextResponse } from "next/server";
import { getSessionDatabase } from "@/database/session-db";
import { generatePaymentQRCode } from "@/lib/payments/qr-service";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Session ID is required." }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const forceRegenerate = searchParams.get("regenerate") === "true";

    const db = getSessionDatabase();
    const session = db.getSessionById(id);
    if (!session) {
      return NextResponse.json({ error: `Session '${id}' not found.` }, { status: 404 });
    }

    const transaction = db.createOrGetPaymentTransaction(session.id, forceRegenerate);

    // Compute base URL from request headers or default
    const host = request.headers.get("host") || "localhost:3000";
    const proto = request.headers.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
    const baseUrl = `${proto}://${host}`;

    const qr = await generatePaymentQRCode(
      transaction.paymentReference,
      transaction.amount,
      baseUrl,
      transaction.expiresAt
    );

    return NextResponse.json({
      success: true,
      transaction,
      qr,
      session,
    });
  } catch (error: any) {
    console.error("Error generating payment QR:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate payment QR." },
      { status: 500 }
    );
  }
}
