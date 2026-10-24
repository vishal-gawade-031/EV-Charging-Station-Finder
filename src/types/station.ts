export type StationType = "public" | "highway" | "hotel" | "mall" | "residential" | "workplace";

export type ConnectorType =
  | "CCS2"
  | "Type 2 AC"
  | "CHAdeMO"
  | "Bharat DC-001"
  | "Bharat AC-001"
  | "GB/T"
  | "Wall Socket (15A)";

export type DataSource = "demo" | "openstreetmap" | "openchargemap";

export type DataSourceMode = "live" | "demo" | "hybrid";

export type AvailabilityStatus = "available" | "busy" | "offline" | "unknown";

export interface ChargingStation {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  state: string;
  pincode?: string;
  operator: string;
  connectorTypes: (ConnectorType | string)[];
  powerKW: number;
  pricing?: string | null;
  stationType: StationType;
  dataSource: DataSource;
  isDemo: boolean;
  availabilityStatus: AvailabilityStatus;
  lastUpdated?: string;
  distanceKm?: number;
  distanceFormatted?: string;
  directionsUrl?: string;
  amenities?: string[];
  totalPorts?: number;
}

export interface SearchFilters {
  query?: string;
  city?: string;
  state?: string;
  connector?: string;
  minPowerKW?: number;
  maxPowerKW?: number;
  operator?: string;
  radiusKm?: number;
  mode?: DataSourceMode;
  userLat?: number;
  userLng?: number;
  sortBy?: "distance" | "power" | "name";
  limit?: number;
}

export interface EVRangeParams {
  batteryCapacityKWh: number;
  currentBatteryPercent: number;
  reserveBatteryPercent: number;
  consumptionKWhPer100Km: number;
}

export interface EVRangeResult {
  usableEnergyKWh: number;
  estimatedRangeKm: number;
  consumptionKWhPer100Km: number;
  reserveKWh: number;
  reserveBatteryPercent: number;
  currentBatteryPercent: number;
  totalCapacityKWh: number;
}

export interface GeolocationPositionResult {
  latitude: number;
  longitude: number;
  accuracy?: number;
}

export interface GeolocationErrorResult {
  code: number;
  message: string;
  userFriendlyMessage: string;
}
