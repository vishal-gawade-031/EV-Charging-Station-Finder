import { NextRequest, NextResponse } from "next/server";
import { getSessionDatabase } from "@/database/session-db";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ reference: string }> }
) {
  try {
    const { reference } = await context.params;
    if (!reference) {
      return NextResponse.json({ error: "Reference parameter is required." }, { status: 400 });
    }

    const db = getSessionDatabase();
    const receipt = db.getReceiptByReference(reference);

    if (!receipt) {
      return NextResponse.json(
        { error: "Paid receipt not found for the specified reference." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      receipt,
    });
  } catch (error: any) {
    console.error("Error retrieving receipt:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve receipt." },
      { status: 500 }
    );
  }
}
