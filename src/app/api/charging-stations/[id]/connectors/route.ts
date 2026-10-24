import { NextRequest, NextResponse } from "next/server";
import { stationService } from "@/lib/stations/station-service";
import { getSessionDatabase } from "@/database/session-db";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    if (!id) {
      return NextResponse.json({ error: "Station ID is required" }, { status: 400 });
    }

    const station = await stationService.getStationById(id);
    if (!station) {
      return NextResponse.json({ error: "Station not found" }, { status: 404 });
    }

    const db = getSessionDatabase();
    const connectors = db.getOrCreateStationConnectors(station);

    return NextResponse.json({
      success: true,
      stationId: station.id,
      stationName: station.name,
      connectors,
    });
  } catch (error: any) {
    console.error("Error retrieving connectors:", error);
    return NextResponse.json(
      { error: error.message || "Failed to retrieve station connectors" },
      { status: 500 }
    );
  }
}
