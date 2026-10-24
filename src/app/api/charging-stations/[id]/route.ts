import { NextRequest, NextResponse } from "next/server";
import { stationService } from "@/lib/stations/station-service";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Station ID parameter is required." },
        { status: 400 }
      );
    }

    const station = await stationService.getStationById(id);

    if (!station) {
      return NextResponse.json(
        { error: `Station with ID '${id}' was not found.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      station,
    });
  } catch (error: any) {
    console.error("API /api/charging-stations/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve station details." },
      { status: 500 }
    );
  }
}
