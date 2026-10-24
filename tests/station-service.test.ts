import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { StationService } from "../src/lib/stations/station-service";
import { loadOrSeedDemoStations } from "../src/database/seed";

describe("Charging Station Service and Seed Integrity", () => {
  const service = new StationService();

  it("verifies seed dataset contains 100+ stations across India", () => {
    const stations = loadOrSeedDemoStations();
    assert.ok(stations.length >= 100, `Expected >= 100 stations, got ${stations.length}`);

    // Every record must be tagged as demo
    stations.forEach((st) => {
      assert.equal(st.isDemo, true);
      assert.equal(st.dataSource, "demo");
      assert.equal(st.availabilityStatus, "unknown");
      assert.ok(st.latitude >= -90 && st.latitude <= 90);
      assert.ok(st.longitude >= -180 && st.longitude <= 180);
      assert.ok(st.name.length > 0);
      assert.ok(st.city.length > 0);
      assert.ok(st.state.length > 0);
      assert.ok(st.connectorTypes.length > 0);
      assert.ok(st.powerKW > 0);
    });
  });

  it("verifies seed idempotency and unique station IDs", () => {
    const stations1 = loadOrSeedDemoStations();
    const stations2 = loadOrSeedDemoStations();

    assert.equal(stations1.length, stations2.length);

    const ids = new Set<string>();
    stations1.forEach((st) => {
      assert.equal(ids.has(st.id), false, `Duplicate ID detected: ${st.id}`);
      ids.add(st.id);
    });
  });

  it("finds nearby stations around Bengaluru with correct distance ordering", async () => {
    // Bengaluru Koramangala: 12.9352, 77.6245
    const result = await service.getNearbyStations(12.9352, 77.6245, 15, "demo");

    assert.ok(result.stations.length > 0);
    assert.equal(result.mode, "demo");

    // The nearest station should be Koramangala itself with ~0 km distance
    const first = result.stations[0];
    assert.ok(first.distanceKm !== undefined && first.distanceKm <= 1.0);
    assert.ok(first.name.includes("Koramangala") || first.city === "Bengaluru");

    // Verify distance ascending sort order
    for (let i = 0; i < result.stations.length - 1; i++) {
      const cur = result.stations[i].distanceKm ?? 0;
      const next = result.stations[i + 1].distanceKm ?? 0;
      assert.ok(cur <= next, `Stations not sorted: ${cur} > ${next}`);
    }
  });

  it("filters stations by connector type", async () => {
    const result = await service.getNearbyStations(12.9352, 77.6245, 50, "demo", {
      connector: "CHAdeMO",
    });

    assert.ok(result.stations.length > 0);
    result.stations.forEach((st) => {
      const hasCHAdeMO = st.connectorTypes.some((c) =>
        c.toLowerCase().includes("chademo")
      );
      assert.equal(hasCHAdeMO, true, `Station ${st.name} missing CHAdeMO connector`);
    });
  });

  it("filters stations by minimum power output (e.g. 100+ kW)", async () => {
    const result = await service.getNearbyStations(28.6139, 77.2090, 50, "demo", {
      minPowerKW: 100,
    });

    assert.ok(result.stations.length > 0);
    result.stations.forEach((st) => {
      assert.ok(st.powerKW >= 100, `Station ${st.name} has power ${st.powerKW} < 100`);
    });
  });

  it("searches stations by city name", async () => {
    const results = await service.searchStations({
      city: "Mumbai",
      mode: "demo",
    });

    assert.ok(results.length >= 2);
    results.forEach((st) => {
      assert.ok(st.city.includes("Mumbai"));
    });
  });

  it("returns null for non-existent station ID", async () => {
    const st = await service.getStationById("non-existent-id-9999");
    assert.equal(st, null);
  });
});
