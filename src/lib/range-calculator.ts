import { EVRangeParams, EVRangeResult } from "@/types/station";

export interface EVValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export function validateEVRangeParams(params: Partial<EVRangeParams>): EVValidationResult {
  const errors: Record<string, string> = {};

  if (params.batteryCapacityKWh === undefined || !Number.isFinite(params.batteryCapacityKWh)) {
    errors.batteryCapacityKWh = "Battery capacity is required and must be a number.";
  } else if (params.batteryCapacityKWh <= 0 || params.batteryCapacityKWh > 300) {
    errors.batteryCapacityKWh = "Battery capacity must be between 1 and 300 kWh.";
  }

  if (params.currentBatteryPercent === undefined || !Number.isFinite(params.currentBatteryPercent)) {
    errors.currentBatteryPercent = "Current battery percentage is required.";
  } else if (params.currentBatteryPercent < 0 || params.currentBatteryPercent > 100) {
    errors.currentBatteryPercent = "Current battery percentage must be between 0% and 100%.";
  }

  if (params.reserveBatteryPercent === undefined || !Number.isFinite(params.reserveBatteryPercent)) {
    errors.reserveBatteryPercent = "Reserve percentage is required.";
  } else if (params.reserveBatteryPercent < 0 || params.reserveBatteryPercent > 50) {
    errors.reserveBatteryPercent = "Reserve battery percentage must be between 0% and 50%.";
  }

  if (
    params.currentBatteryPercent !== undefined &&
    params.reserveBatteryPercent !== undefined &&
    params.reserveBatteryPercent >= params.currentBatteryPercent
  ) {
    errors.reserveBatteryPercent = "Reserve percentage cannot be greater than or equal to current battery percentage.";
  }

  if (params.consumptionKWhPer100Km === undefined || !Number.isFinite(params.consumptionKWhPer100Km)) {
    errors.consumptionKWhPer100Km = "Energy consumption is required.";
  } else if (params.consumptionKWhPer100Km <= 0 || params.consumptionKWhPer100Km > 60) {
    errors.consumptionKWhPer100Km = "Consumption must be between 1 and 60 kWh/100 km.";
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Calculates usable energy and estimated remaining range based on battery capacity,
 * current charge, desired reserve, and real-world consumption.
 */
export function calculateEVRange(params: EVRangeParams): EVRangeResult {
  const {
    batteryCapacityKWh,
    currentBatteryPercent,
    reserveBatteryPercent,
    consumptionKWhPer100Km,
  } = params;

  const effectiveCurrent = Math.max(0, Math.min(100, currentBatteryPercent));
  const effectiveReserve = Math.max(0, Math.min(effectiveCurrent, reserveBatteryPercent));

  const usablePercent = Math.max(0, effectiveCurrent - effectiveReserve);
  const usableEnergyKWh = (batteryCapacityKWh * usablePercent) / 100;

  const reserveKWh = (batteryCapacityKWh * effectiveReserve) / 100;

  // Range = (Usable Energy kWh / Consumption per 100 km) * 100
  const estimatedRangeKm =
    consumptionKWhPer100Km > 0 ? (usableEnergyKWh / consumptionKWhPer100Km) * 100 : 0;

  return {
    usableEnergyKWh: Math.round(usableEnergyKWh * 10) / 10,
    estimatedRangeKm: Math.round(estimatedRangeKm * 10) / 10,
    consumptionKWhPer100Km,
    reserveKWh: Math.round(reserveKWh * 10) / 10,
    reserveBatteryPercent: effectiveReserve,
    currentBatteryPercent: effectiveCurrent,
    totalCapacityKWh: batteryCapacityKWh,
  };
}

/**
 * Common popular Indian EV models with their real-world battery capacities and typical consumptions
 */
export interface EVModelPreset {
  id: string;
  name: string;
  make: string;
  batteryCapacityKWh: number;
  typicalConsumptionKWhPer100Km: number;
  officialClaimedRangeKm: number;
  image?: string;
}

export const POPULAR_INDIAN_EV_PRESETS: EVModelPreset[] = [
  {
    id: "nexon-ev-long-range",
    name: "Tata Nexon EV Long Range",
    make: "Tata Motors",
    batteryCapacityKWh: 40.5,
    typicalConsumptionKWhPer100Km: 14.5,
    officialClaimedRangeKm: 465,
  },
  {
    id: "nexon-ev-medium-range",
    name: "Tata Nexon EV Medium Range",
    make: "Tata Motors",
    batteryCapacityKWh: 30.0,
    typicalConsumptionKWhPer100Km: 14.0,
    officialClaimedRangeKm: 325,
  },
  {
    id: "punch-ev-lr",
    name: "Tata Punch EV LR",
    make: "Tata Motors",
    batteryCapacityKWh: 35.0,
    typicalConsumptionKWhPer100Km: 13.8,
    officialClaimedRangeKm: 421,
  },
  {
    id: "tiago-ev",
    name: "Tata Tiago EV",
    make: "Tata Motors",
    batteryCapacityKWh: 24.0,
    typicalConsumptionKWhPer100Km: 12.8,
    officialClaimedRangeKm: 315,
  },
  {
    id: "curvv-ev-55",
    name: "Tata Curvv EV 55",
    make: "Tata Motors",
    batteryCapacityKWh: 55.0,
    typicalConsumptionKWhPer100Km: 15.2,
    officialClaimedRangeKm: 585,
  },
  {
    id: "mg-zs-ev",
    name: "MG ZS EV",
    make: "MG Motor",
    batteryCapacityKWh: 50.3,
    typicalConsumptionKWhPer100Km: 16.5,
    officialClaimedRangeKm: 461,
  },
  {
    id: "mg-windsor-ev",
    name: "MG Windsor EV",
    make: "MG Motor",
    batteryCapacityKWh: 38.0,
    typicalConsumptionKWhPer100Km: 14.2,
    officialClaimedRangeKm: 331,
  },
  {
    id: "mahindra-xuv400",
    name: "Mahindra XUV400 EL Pro",
    make: "Mahindra",
    batteryCapacityKWh: 39.4,
    typicalConsumptionKWhPer100Km: 15.8,
    officialClaimedRangeKm: 456,
  },
  {
    id: "byd-atto3",
    name: "BYD Atto 3",
    make: "BYD",
    batteryCapacityKWh: 60.48,
    typicalConsumptionKWhPer100Km: 16.0,
    officialClaimedRangeKm: 521,
  },
  {
    id: "hyundai-ioniq5",
    name: "Hyundai Ioniq 5",
    make: "Hyundai",
    batteryCapacityKWh: 72.6,
    typicalConsumptionKWhPer100Km: 17.5,
    officialClaimedRangeKm: 631,
  },
];
