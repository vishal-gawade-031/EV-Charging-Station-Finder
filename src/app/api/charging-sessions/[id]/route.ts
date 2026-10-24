import { NextRequest, NextResponse } from "next/server";
import { getSessionDatabase } from "@/database/session-db";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Session ID parameter is required." }, { status: 400 });
    }

    const db = getSessionDatabase();
    const session = db.getSessionById(id);

    if (!session) {
      return NextResponse.json(
        { error: `Charging session '${id}' was not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session,
    });
  } catch (error: any) {
    console.error("Error retrieving session:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve session details." },
      { status: 500 }
    );
  }
}
