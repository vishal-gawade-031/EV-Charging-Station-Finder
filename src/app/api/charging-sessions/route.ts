import { NextRequest, NextResponse } from "next/server";
import { stationService } from "@/lib/stations/station-service";
import { getSessionDatabase } from "@/database/session-db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { stationId, connectorId, initialBatteryPercent, userId } = body;

    if (!stationId || !connectorId) {
      return NextResponse.json(
        { error: "Both 'stationId' and 'connectorId' are required." },
        { status: 400 }
      );
    }

    const station = await stationService.getStationById(stationId);
    if (!station) {
      return NextResponse.json(
        { error: `Station with ID '${stationId}' was not found.` },
        { status: 404 }
      );
    }

    const db = getSessionDatabase();
    const connectors = db.getOrCreateStationConnectors(station);
    const selectedConnector = connectors.find((c) => c.id === connectorId);

    if (!selectedConnector) {
      return NextResponse.json(
        { error: `Connector '${connectorId}' not found on station '${station.name}'.` },
        { status: 404 }
      );
    }

    if (selectedConnector.status !== "available") {
      return NextResponse.json(
        {
          error: `Connector '${connectorId}' is currently ${selectedConnector.status}. Please select an available connector.`,
        },
        { status: 409 }
      );
    }

    // Default battery percent 20% if not provided
    const battery = typeof initialBatteryPercent === "number" && initialBatteryPercent >= 0 && initialBatteryPercent <= 100
      ? initialBatteryPercent
      : 20;

    const session = db.createSession({
      stationId: station.id,
      stationName: station.name,
      stationAddress: station.address,
      connectorId: selectedConnector.id,
      connectorType: selectedConnector.connectorType,
      chargingPowerKw: selectedConnector.powerKW,
      pricePerKWh: selectedConnector.pricePerKWh,
      initialBatteryPercent: battery,
      userId: userId || "demo-user-1",
    });

    return NextResponse.json(
      {
        success: true,
        message: "Charging session initiated successfully.",
        session,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error creating charging session:", error);
    const statusCode = error.message?.includes("already active") || error.message?.includes("occupied") ? 409 : 500;
    return NextResponse.json(
      { error: error.message || "Failed to start charging session." },
      { status: statusCode }
    );
  }
}
