import { ChargingStation, SearchFilters } from "@/types/station";

export interface StationProvider {
  name: string;
  getNearby(
    lat: number,
    lng: number,
    radiusKm: number,
    filters?: SearchFilters
  ): Promise<ChargingStation[]>;
  search(filters: SearchFilters): Promise<ChargingStation[]>;
  getById(id: string): Promise<ChargingStation | null>;
}
