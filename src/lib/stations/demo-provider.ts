import * as fs from "fs";
import * as path from "path";
import { ChargingStation, SearchFilters } from "@/types/station";
import { StationProvider } from "./station-provider";
import { calculateDistanceKm, getBoundingBox, getDirectionsUrl, formatDistance } from "../geo/distance";

export class DemoStationProvider implements StationProvider {
  public readonly name = "DemoStationProvider";
  private cachedStations: ChargingStation[] | null = null;

  private loadStations(): ChargingStation[] {
    if (this.cachedStations && this.cachedStations.length > 0) {
      return this.cachedStations;
    }

    try {
      const filePath = path.join(
        process.cwd(),
        "src",
        "database",
        "seeds",
        "demo-charging-stations.json"
      );
      if (fs.existsSync(filePath)) {
        const raw = fs.readFileSync(filePath, "utf-8");
        this.cachedStations = JSON.parse(raw);
        return this.cachedStations || [];
      }
    } catch (e) {
      console.error("Failed to load demo stations from file:", e);
    }

    return [];
  }

  public getAll(): ChargingStation[] {
    return this.loadStations();
  }

  public async getNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    filters?: SearchFilters
  ): Promise<ChargingStation[]> {
    const all = this.loadStations();
    const bbox = getBoundingBox(lat, lng, radiusKm);

    const results: ChargingStation[] = [];

    for (const station of all) {
      // Fast bounding box check
      if (
        station.latitude < bbox.minLat ||
        station.latitude > bbox.maxLat ||
        station.longitude < bbox.minLng ||
        station.longitude > bbox.maxLng
      ) {
        continue;
      }

      // Exact Haversine distance
      const distance = calculateDistanceKm(lat, lng, station.latitude, station.longitude);
      if (distance <= radiusKm) {
        // Apply connector filter if requested
        if (filters?.connector && filters.connector !== "ALL") {
          const hasConn = station.connectorTypes.some((c) =>
            c.toLowerCase().includes(filters.connector!.toLowerCase())
          );
          if (!hasConn) continue;
        }

        // Apply min power filter
        if (filters?.minPowerKW && station.powerKW < filters.minPowerKW) {
          continue;
        }

        results.push({
          ...station,
          distanceKm: Math.round(distance * 100) / 100,
          distanceFormatted: formatDistance(distance),
          directionsUrl: getDirectionsUrl(station.latitude, station.longitude, lat, lng),
        });
      }
    }

    // Sort ascending by distance by default
    results.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

    if (filters?.limit && filters.limit > 0) {
      return results.slice(0, filters.limit);
    }

    return results;
  }

  public async search(filters: SearchFilters): Promise<ChargingStation[]> {
    const all = this.loadStations();
    const query = filters.query?.trim().toLowerCase();
    const city = filters.city?.trim().toLowerCase();
    const state = filters.state?.trim().toLowerCase();
    const connector = filters.connector?.trim().toLowerCase();

    let results = all.filter((station) => {
      if (city && !station.city.toLowerCase().includes(city)) {
        return false;
      }

      if (state && !station.state.toLowerCase().includes(state)) {
        return false;
      }

      if (connector && connector !== "all") {
        const matchesConn = station.connectorTypes.some((c) =>
          c.toLowerCase().includes(connector)
        );
        if (!matchesConn) return false;
      }

      if (filters.minPowerKW && station.powerKW < filters.minPowerKW) {
        return false;
      }

      if (filters.operator && !station.operator.toLowerCase().includes(filters.operator.toLowerCase())) {
        return false;
      }

      if (query) {
        const inName = station.name.toLowerCase().includes(query);
        const inCity = station.city.toLowerCase().includes(query);
        const inState = station.state.toLowerCase().includes(query);
        const inAddress = station.address.toLowerCase().includes(query);
        const inPincode = station.pincode?.toLowerCase().includes(query) ?? false;
        const inOperator = station.operator.toLowerCase().includes(query);
        if (!inName && !inCity && !inState && !inAddress && !inPincode && !inOperator) {
          return false;
        }
      }

      return true;
    });

    // If user coordinates provided, compute distances
    if (
      filters.userLat !== undefined &&
      filters.userLng !== undefined &&
      Number.isFinite(filters.userLat) &&
      Number.isFinite(filters.userLng)
    ) {
      const uLat = filters.userLat;
      const uLng = filters.userLng;
      results = results.map((st) => {
        const dist = calculateDistanceKm(uLat, uLng, st.latitude, st.longitude);
        return {
          ...st,
          distanceKm: Math.round(dist * 100) / 100,
          distanceFormatted: formatDistance(dist),
          directionsUrl: getDirectionsUrl(st.latitude, st.longitude, uLat, uLng),
        };
      });

      if (filters.sortBy === "power") {
        results.sort((a, b) => b.powerKW - a.powerKW);
      } else if (filters.sortBy === "name") {
        results.sort((a, b) => a.name.localeCompare(b.name));
      } else {
        results.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
      }
    } else {
      if (filters.sortBy === "power") {
        results.sort((a, b) => b.powerKW - a.powerKW);
      } else {
        results.sort((a, b) => a.name.localeCompare(b.name));
      }
    }

    if (filters.limit && filters.limit > 0) {
      return results.slice(0, filters.limit);
    }

    return results;
  }

  public async getById(id: string): Promise<ChargingStation | null> {
    const all = this.loadStations();
    const station = all.find((s) => s.id === id);
    return station || null;
  }
}
