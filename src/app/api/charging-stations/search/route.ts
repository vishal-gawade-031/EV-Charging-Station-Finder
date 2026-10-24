import { NextRequest, NextResponse } from "next/server";
import { stationService } from "@/lib/stations/station-service";
import { DataSourceMode, SearchFilters } from "@/types/station";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const q = searchParams.get("q") || undefined;
    const city = searchParams.get("city") || undefined;
    const state = searchParams.get("state") || undefined;
    const connector = searchParams.get("connector") || undefined;
    const minPowerStr = searchParams.get("minPower") || undefined;
    const operator = searchParams.get("operator") || undefined;
    const modeParam = searchParams.get("mode") || "hybrid";
    const userLatStr = searchParams.get("userLat") || undefined;
    const userLngStr = searchParams.get("userLng") || undefined;
    const sortBy = (searchParams.get("sortBy") as SearchFilters["sortBy"]) || "distance";
    const limitStr = searchParams.get("limit") || "100";

    const validModes: DataSourceMode[] = ["live", "demo", "hybrid"];
    const mode: DataSourceMode = validModes.includes(modeParam as DataSourceMode)
      ? (modeParam as DataSourceMode)
      : "hybrid";

    const userLat = userLatStr ? parseFloat(userLatStr) : undefined;
    const userLng = userLngStr ? parseFloat(userLngStr) : undefined;
    const minPowerKW = minPowerStr ? parseFloat(minPowerStr) : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : 100;

    const filters: SearchFilters = {
      query: q,
      city,
      state,
      connector,
      minPowerKW,
      operator,
      mode,
      userLat,
      userLng,
      sortBy,
      limit,
    };

    const stations = await stationService.searchStations(filters);

    return NextResponse.json({
      success: true,
      totalCount: stations.length,
      liveCount: stations.filter((s) => !s.isDemo).length,
      demoCount: stations.filter((s) => s.isDemo).length,
      stations,
    });
  } catch (error: any) {
    console.error("API /api/charging-stations/search error:", error);
    return NextResponse.json(
      {
        error: "Failed to perform station search.",
        message: error.message || "Internal error",
      },
      { status: 500 }
    );
  }
}
