import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateEVRange,
  validateEVRangeParams,
  POPULAR_INDIAN_EV_PRESETS,
} from "../src/lib/range-calculator";

describe("EV Range Calculator", () => {
  it("calculates driving range correctly with standard parameters", () => {
    // 40.5 kWh, 85% current, 15% reserve, 14.5 kWh/100km
    // usable % = 70% -> usable energy = 28.35 kWh
    // estimated range = (28.35 / 14.5) * 100 = 195.5 km
    const result = calculateEVRange({
      batteryCapacityKWh: 40.5,
      currentBatteryPercent: 85,
      reserveBatteryPercent: 15,
      consumptionKWhPer100Km: 14.5,
    });

    assert.equal(result.usableEnergyKWh, 28.4);
    assert.equal(result.estimatedRangeKm, 195.5);
    assert.equal(result.reserveKWh, 6.1);
  });

  it("handles empty battery (0% charge) yielding 0 km range", () => {
    const result = calculateEVRange({
      batteryCapacityKWh: 40.5,
      currentBatteryPercent: 0,
      reserveBatteryPercent: 0,
      consumptionKWhPer100Km: 14.5,
    });

    assert.equal(result.usableEnergyKWh, 0);
    assert.equal(result.estimatedRangeKm, 0);
  });

  it("validates invalid battery capacity", () => {
    const v1 = validateEVRangeParams({
      batteryCapacityKWh: -5,
      currentBatteryPercent: 80,
      reserveBatteryPercent: 10,
      consumptionKWhPer100Km: 15,
    });
    assert.equal(v1.isValid, false);
    assert.ok(v1.errors.batteryCapacityKWh);

    const v2 = validateEVRangeParams({
      batteryCapacityKWh: 450, // exceeds max limit
      currentBatteryPercent: 80,
      reserveBatteryPercent: 10,
      consumptionKWhPer100Km: 15,
    });
    assert.equal(v2.isValid, false);
    assert.ok(v2.errors.batteryCapacityKWh);
  });

  it("validates when reserve battery exceeds or equals current charge", () => {
    const v = validateEVRangeParams({
      batteryCapacityKWh: 50,
      currentBatteryPercent: 20,
      reserveBatteryPercent: 25, // reserve higher than current SOC
      consumptionKWhPer100Km: 15,
    });
    assert.equal(v.isValid, false);
    assert.ok(v.errors.reserveBatteryPercent);
  });

  it("contains realistic Indian EV presets", () => {
    assert.ok(POPULAR_INDIAN_EV_PRESETS.length >= 6);
    const nexon = POPULAR_INDIAN_EV_PRESETS.find((p) => p.name.includes("Nexon"));
    assert.ok(nexon);
    assert.ok(nexon.batteryCapacityKWh > 0);
    assert.ok(nexon.typicalConsumptionKWhPer100Km > 0);
  });
});
