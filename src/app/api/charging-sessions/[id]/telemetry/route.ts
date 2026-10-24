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

    const body = await request.json();
    const { energyDeliveredKwh, currentBatteryPercent, durationSeconds } = body;

    const db = getSessionDatabase();
    const current = db.getSessionById(id);

    if (!current) {
      return NextResponse.json({ error: `Session '${id}' not found.` }, { status: 404 });
    }

    if (current.sessionStatus !== "charging") {
      return NextResponse.json(
        {
          error: `Cannot update telemetry: session is in '${current.sessionStatus}' state.`,
          session: current,
        },
        { status: 400 }
      );
    }

    const updated = db.updateSessionTelemetry(id, {
      energyDeliveredKwh: Number(energyDeliveredKwh) || 0,
      currentBatteryPercent: Number(currentBatteryPercent) || current.initialBatteryPercent,
      durationSeconds: Number(durationSeconds) || 0,
    });

    return NextResponse.json({
      success: true,
      session: updated,
    });
  } catch (error: any) {
    console.error("Error updating telemetry:", error);
    return NextResponse.json(
      { error: error.message || "Failed to update telemetry." },
      { status: 500 }
    );
  }
}
