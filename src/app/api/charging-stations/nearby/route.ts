import { NextRequest, NextResponse } from "next/server";
import { isValidCoordinate, isValidRadius } from "@/lib/geo/distance";
import { stationService } from "@/lib/stations/station-service";
import { DataSourceMode } from "@/types/station";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const latStr = searchParams.get("lat");
    const lngStr = searchParams.get("lng");
    const radiusStr = searchParams.get("radiusKm") || "25";
    const modeParam = searchParams.get("mode") || "hybrid";
    const connector = searchParams.get("connector") || undefined;
    const minPowerStr = searchParams.get("minPower") || undefined;
    const limitStr = searchParams.get("limit") || "100";

    if (!latStr || !lngStr) {
      return NextResponse.json(
        {
          error: "Missing required query parameters: lat and lng are required.",
          code: "MISSING_COORDINATES",
        },
        { status: 400 }
      );
    }

    const lat = parseFloat(latStr);
    const lng = parseFloat(lngStr);

    if (!isValidCoordinate(lat, lng)) {
      return NextResponse.json(
        {
          error: "Invalid coordinates. Latitude must be between -90 and 90, Longitude between -180 and 180.",
          code: "INVALID_COORDINATES",
        },
        { status: 400 }
      );
    }

    const radiusKm = parseFloat(radiusStr);
    if (!isValidRadius(radiusKm)) {
      return NextResponse.json(
        {
          error: "Invalid radiusKm. Must be a number between 1 and 1000.",
          code: "INVALID_RADIUS",
        },
        { status: 400 }
      );
    }

    const validModes: DataSourceMode[] = ["live", "demo", "hybrid"];
    const mode: DataSourceMode = validModes.includes(modeParam as DataSourceMode)
      ? (modeParam as DataSourceMode)
      : "hybrid";

    const minPowerKW = minPowerStr ? parseFloat(minPowerStr) : undefined;
    const limit = limitStr ? parseInt(limitStr, 10) : 100;

    const result = await stationService.getNearbyStations(lat, lng, radiusKm, mode, {
      connector,
      minPowerKW,
      limit,
    });

    return NextResponse.json({
      success: true,
      query: {
        latitude: lat,
        longitude: lng,
        radiusKm,
        mode,
      },
      ...result,
    });
  } catch (error: any) {
    console.error("API /api/charging-stations/nearby error:", error);
    return NextResponse.json(
      {
        error: "An internal server error occurred while searching nearby charging stations.",
        message: error.message || "Internal error",
      },
      { status: 500 }
    );
  }
}
