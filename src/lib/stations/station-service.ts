import {
  ChargingStation,
  DataSourceMode,
  SearchFilters,
} from "@/types/station";
import { DemoStationProvider } from "./demo-provider";
import { OpenStreetMapStationProvider } from "./openstreetmap-provider";
import { calculateDistanceKm, formatDistance, getDirectionsUrl } from "../geo/distance";

export interface NearbyResult {
  stations: ChargingStation[];
  mode: DataSourceMode;
  totalCount: number;
  liveCount: number;
  demoCount: number;
  providerNotice?: string;
}

export class StationService {
  private demoProvider: DemoStationProvider;
  private osmProvider: OpenStreetMapStationProvider;

  constructor() {
    this.demoProvider = new DemoStationProvider();
    this.osmProvider = new OpenStreetMapStationProvider();
  }

  public getAllDemoStations(): ChargingStation[] {
    return this.demoProvider.getAll();
  }

  /**
   * Fetches nearby charging stations based on coordinates, radius, and mode (live, demo, hybrid).
   */
  public async getNearbyStations(
    lat: number,
    lng: number,
    radiusKm: number = 25,
    mode: DataSourceMode = "hybrid",
    filters?: SearchFilters
  ): Promise<NearbyResult> {
    let liveStations: ChargingStation[] = [];
    let demoStations: ChargingStation[] = [];
    let providerNotice: string | undefined;

    // Fetch Live records if requested
    if (mode === "live" || mode === "hybrid") {
      try {
        liveStations = await this.osmProvider.getNearby(lat, lng, radiusKm, filters);
        if (mode === "live" && liveStations.length === 0) {
          providerNotice =
            "No live OpenStreetMap chargers found in this radius. You can switch to Demo or Hybrid mode to view demonstration stations.";
        }
      } catch (err) {
        console.warn("Live provider error:", err);
        providerNotice =
          "Live provider is currently unreachable. Demonstration data is available.";
      }
    }

    // Fetch Demo records if requested (or fallback if live had zero and hybrid requested)
    if (mode === "demo" || mode === "hybrid") {
      demoStations = await this.demoProvider.getNearby(lat, lng, radiusKm, filters);
    }

    // Combine and deduplicate
    const combinedMap = new Map<string, ChargingStation>();

    // Live stations take priority
    for (const station of liveStations) {
      combinedMap.set(station.id, station);
    }

    // Add demo stations
    for (const station of demoStations) {
      if (!combinedMap.has(station.id)) {
        combinedMap.set(station.id, station);
      }
    }

    const allStations = Array.from(combinedMap.values());

    // Sort by distance ascending
    allStations.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));

    const finalStations =
      filters?.limit && filters.limit > 0
        ? allStations.slice(0, filters.limit)
        : allStations;

    return {
      stations: finalStations,
      mode,
      totalCount: finalStations.length,
      liveCount: finalStations.filter((s) => !s.isDemo).length,
      demoCount: finalStations.filter((s) => s.isDemo).length,
      providerNotice,
    };
  }

  /**
   * Searches stations by query text, city, state, or PIN code
   */
  public async searchStations(filters: SearchFilters): Promise<ChargingStation[]> {
    const mode = filters.mode || "hybrid";
    let results: ChargingStation[] = [];

    if (mode === "demo" || mode === "hybrid") {
      const demoMatches = await this.demoProvider.search(filters);
      results = results.concat(demoMatches);
    }

    if (mode === "live" || mode === "hybrid") {
      if (filters.userLat !== undefined && filters.userLng !== undefined) {
        const liveMatches = await this.osmProvider.getNearby(
          filters.userLat,
          filters.userLng,
          filters.radiusKm || 50,
          filters
        );
        results = results.concat(liveMatches);
      }
    }

    // Deduplicate by ID
    const unique = new Map<string, ChargingStation>();
    for (const s of results) {
      unique.set(s.id, s);
    }

    const deduplicated = Array.from(unique.values());

    // Sort
    if (filters.sortBy === "power") {
      deduplicated.sort((a, b) => b.powerKW - a.powerKW);
    } else if (filters.sortBy === "name") {
      deduplicated.sort((a, b) => a.name.localeCompare(b.name));
    } else if (filters.userLat !== undefined && filters.userLng !== undefined) {
      deduplicated.sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
    }

    return filters.limit ? deduplicated.slice(0, filters.limit) : deduplicated;
  }

  public async getStationById(id: string): Promise<ChargingStation | null> {
    if (id.startsWith("osm-")) {
      return this.osmProvider.getById(id);
    }
    return this.demoProvider.getById(id);
  }
}

// Global singleton instance for Route Handlers
export const stationService = new StationService();
