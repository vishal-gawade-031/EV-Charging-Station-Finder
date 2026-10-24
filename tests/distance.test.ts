import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  calculateDistanceKm,
  formatDistance,
  isValidCoordinate,
  isValidRadius,
  getBoundingBox,
  getDirectionsUrl,
} from "../src/lib/geo/distance";

describe("Distance and Geospatial Utilities", () => {
  it("calculates exact zero distance for identical coordinates", () => {
    const dist = calculateDistanceKm(12.9716, 77.5946, 12.9716, 77.5946);
    assert.equal(dist, 0);
  });

  it("calculates distance between Bengaluru and Chennai accurately (~290 km)", () => {
    // Bengaluru: 12.9716° N, 77.5946° E
    // Chennai:   13.0827° N, 80.2707° E
    const dist = calculateDistanceKm(12.9716, 77.5946, 13.0827, 80.2707);
    assert.ok(dist >= 288 && dist <= 293, `Expected ~290km, got ${dist}`);
  });

  it("calculates distance between Delhi and Mumbai accurately (~1148 km)", () => {
    // Delhi:  28.6139° N, 77.2090° E
    // Mumbai: 19.0760° N, 72.8777° E
    const dist = calculateDistanceKm(28.6139, 77.2090, 19.0760, 72.8777);
    assert.ok(dist >= 1140 && dist <= 1160, `Expected ~1148km, got ${dist}`);
  });

  it("formats distances under 1 km in meters", () => {
    assert.equal(formatDistance(0.35), "350 m away");
    assert.equal(formatDistance(0.08), "80 m away");
  });

  it("formats distances 1 km and above in kilometers", () => {
    assert.equal(formatDistance(1.82), "1.8 km away");
    assert.equal(formatDistance(32.6), "33 km away");
  });

  it("handles null or undefined distance formatting gracefully", () => {
    assert.equal(formatDistance(null), "Distance unknown");
    assert.equal(formatDistance(undefined), "Distance unknown");
  });

  it("validates coordinates correctly", () => {
    assert.equal(isValidCoordinate(12.9716, 77.5946), true);
    assert.equal(isValidCoordinate(90, 180), true);
    assert.equal(isValidCoordinate(-90, -180), true);

    // Invalid latitudes
    assert.equal(isValidCoordinate(91, 77), false);
    assert.equal(isValidCoordinate(-91, 77), false);
    assert.equal(isValidCoordinate(NaN, 77), false);

    // Invalid longitudes
    assert.equal(isValidCoordinate(12, 181), false);
    assert.equal(isValidCoordinate(12, -181), false);
    assert.equal(isValidCoordinate(12, Infinity), false);

    // Non-number
    assert.equal(isValidCoordinate("12" as any, 77), false);
  });

  it("validates search radius correctly", () => {
    assert.equal(isValidRadius(5), true);
    assert.equal(isValidRadius(25), true);
    assert.equal(isValidRadius(100), true);
    assert.equal(isValidRadius(0), false);
    assert.equal(isValidRadius(-10), false);
    assert.equal(isValidRadius(1500), false);
    assert.equal(isValidRadius(NaN), false);
  });

  it("computes a valid bounding box around a coordinate", () => {
    const bbox = getBoundingBox(12.9716, 77.5946, 25);
    assert.ok(bbox.minLat < 12.9716);
    assert.ok(bbox.maxLat > 12.9716);
    assert.ok(bbox.minLng < 77.5946);
    assert.ok(bbox.maxLng > 77.5946);
  });

  it("generates correct Google Maps directions URL", () => {
    const urlWithoutOrigin = getDirectionsUrl(12.9716, 77.5946);
    assert.ok(urlWithoutOrigin.includes("destination=12.971600,77.594600"));

    const urlWithOrigin = getDirectionsUrl(12.9716, 77.5946, 12.9352, 77.6245);
    assert.ok(urlWithOrigin.includes("origin=12.935200,77.624500"));
    assert.ok(urlWithOrigin.includes("destination=12.971600,77.594600"));
  });
});
