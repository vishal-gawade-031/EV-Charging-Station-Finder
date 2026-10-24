import { NextRequest, NextResponse } from "next/server";
import { getSessionDatabase } from "@/database/session-db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId") || "demo-user-1";

    const db = getSessionDatabase();
    const sessions = db.getUserSessions(userId);

    return NextResponse.json({
      success: true,
      userId,
      count: sessions.length,
      sessions,
    });
  } catch (error: any) {
    console.error("Error retrieving session history:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve charging history." },
      { status: 500 }
    );
  }
}
