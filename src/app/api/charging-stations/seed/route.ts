import { NextResponse } from "next/server";
import { stationService } from "@/lib/stations/station-service";
import { loadOrSeedDemoStations } from "@/database/seed";

export async function GET() {
  try {
    const stations = stationService.getAllDemoStations();
    return NextResponse.json({
      success: true,
      totalCount: stations.length,
      isDemoOnly: true,
      stations,
    });
  } catch (error: any) {
    console.error("GET /api/charging-stations/seed error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve seed stations." },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const stations = loadOrSeedDemoStations();
    return NextResponse.json({
      success: true,
      message: "Demo dataset verified and loaded successfully. not required ",
      count: stations.length,
    });
  } catch (error: any) {
    console.error("POST /api/charging-stations/seed error:", error);
    return NextResponse.json(
      { error: "Failed to re-seed stations." },
      { status: 500 }
    );
  }
}
