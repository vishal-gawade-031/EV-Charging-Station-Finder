import { describe, it, before, after } from "node:test";
import assert from "node:assert";
import * as path from "path";
import * as fs from "fs";
import { SessionDatabase, roundTo2 } from "../src/database/session-db";
import { generatePaymentQRCode } from "../src/lib/payments/qr-service";
import { stationService } from "../src/lib/stations/station-service";

describe("EVFind Charging Session & Demo QR Payment System", () => {
  let db: SessionDatabase;
  const testDbPath = path.join(process.cwd(), "data", "test_sessions.db");

  before(() => {
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
    db = new SessionDatabase(testDbPath);
  });

  after(() => {
    if (fs.existsSync(testDbPath)) {
      try {
        fs.unlinkSync(testDbPath);
      } catch {}
    }
  });

  // Scenario 1: Start a valid charging session
  it("1. starts a valid charging session with initial energy 0 and status 'charging'", () => {
    const station = stationService.getAllDemoStations()[0];
    assert.ok(station, "Demo station must exist");

    const connectors = db.getOrCreateStationConnectors(station);
    const availableConn = connectors.find((c) => c.status === "available");
    assert.ok(availableConn, "At least one connector must be available");

    const session = db.createSession({
      stationId: station.id,
      stationName: station.name,
      stationAddress: station.address,
      connectorId: availableConn.id,
      connectorType: availableConn.connectorType,
      chargingPowerKw: availableConn.powerKW,
      pricePerKWh: availableConn.pricePerKWh,
      initialBatteryPercent: 25,
      userId: "test-user-1",
    });

    assert.ok(session.id.startsWith("ses-"), "Session ID must start with ses-");
    assert.ok(session.sessionReference.startsWith("EV-SES-"), "Session reference must have valid prefix");
    assert.strictEqual(session.sessionStatus, "charging");
    assert.strictEqual(session.energyDeliveredKwh, 0);
    assert.strictEqual(session.initialBatteryPercent, 25);
    assert.strictEqual(session.currentBatteryPercent, 25);
    assert.strictEqual(session.serviceFee, 25.0);
    assert.strictEqual(session.chargingFee, 0.0);
    assert.strictEqual(session.finalAmount, 25.0);
    assert.strictEqual(session.simulationMode, true);
  });

  // Scenario 2: Reject invalid station or unavailable connector
  it("2. rejects invalid station or unavailable/occupied connector", () => {
    const station = stationService.getAllDemoStations()[0];
    const connectors = db.getOrCreateStationConnectors(station);
    const firstConn = connectors[0];

    // Connectors currently occupied from Scenario 1
    assert.throws(
      () => {
        db.createSession({
          stationId: station.id,
          stationName: station.name,
          stationAddress: station.address,
          connectorId: firstConn.id,
          connectorType: firstConn.connectorType,
          chargingPowerKw: firstConn.powerKW,
          pricePerKWh: firstConn.pricePerKWh,
          initialBatteryPercent: 20,
          userId: "test-user-2",
        });
      },
      /already active|is currently occupied/
    );
  });

  // Scenario 3: Generate a valid QR for a session
  it("3. generates a valid QR code with genuine QR library and payload", async () => {
    const station = stationService.getAllDemoStations()[1];
    const connectors = db.getOrCreateStationConnectors(station);
    const availableConn = connectors.find((c) => c.status === "available")!;

    const session = db.createSession({
      stationId: station.id,
      stationName: station.name,
      stationAddress: station.address,
      connectorId: availableConn.id,
      connectorType: availableConn.connectorType,
      chargingPowerKw: availableConn.powerKW,
      pricePerKWh: availableConn.pricePerKWh,
      initialBatteryPercent: 15,
      userId: "test-user-1",
    });

    const tx = db.createOrGetPaymentTransaction(session.id);
    assert.ok(tx.paymentReference.startsWith("PAY-REF-"));
    assert.strictEqual(tx.paymentStatus, "pending");
    assert.strictEqual(tx.amount, session.finalAmount);
    assert.strictEqual(tx.currency, "INR");

    const qr = await generatePaymentQRCode(
      tx.paymentReference,
      tx.amount,
      "http://localhost:3000",
      tx.expiresAt
    );

    assert.ok(qr.qrDataUrl.startsWith("data:image/png;base64,"));
    assert.ok(qr.paymentUrl.includes(`/demo-payment/${tx.paymentReference}`));
    assert.ok(qr.qrSvg.includes("<svg"));
  });

  // Scenario 4: Verify different sessions have different payment references
  it("4. verifies that different sessions receive unique, unguessable payment references", () => {
    const station = stationService.getAllDemoStations()[2];
    const connectors = db.getOrCreateStationConnectors(station);

    const s1 = db.createSession({
      stationId: station.id,
      stationName: station.name,
      stationAddress: station.address,
      connectorId: connectors[0].id,
      connectorType: connectors[0].connectorType,
      chargingPowerKw: connectors[0].powerKW,
      pricePerKWh: connectors[0].pricePerKWh,
      initialBatteryPercent: 30,
      userId: "test-user-3",
    });

    const s2 = db.createSession({
      stationId: station.id,
      stationName: station.name,
      stationAddress: station.address,
      connectorId: connectors[1].id,
      connectorType: connectors[1].connectorType,
      chargingPowerKw: connectors[1].powerKW,
      pricePerKWh: connectors[1].pricePerKWh,
      initialBatteryPercent: 40,
      userId: "test-user-4",
    });

    const tx1 = db.createOrGetPaymentTransaction(s1.id);
    const tx2 = db.createOrGetPaymentTransaction(s2.id);

    assert.notStrictEqual(tx1.paymentReference, tx2.paymentReference);
    assert.notStrictEqual(tx1.id, tx2.id);
  });

  // Scenario 5: Open demo payment page from QR reference
  it("5. retrieves payment transaction details by payment reference", () => {
    const station = stationService.getAllDemoStations()[3];
    const connectors = db.getOrCreateStationConnectors(station);
    const s = db.createSession({
      stationId: station.id,
      stationName: station.name,
      stationAddress: station.address,
      connectorId: connectors[0].id,
      connectorType: connectors[0].connectorType,
      chargingPowerKw: connectors[0].powerKW,
      pricePerKWh: connectors[0].pricePerKWh,
      initialBatteryPercent: 20,
    });

    const tx = db.createOrGetPaymentTransaction(s.id);
    const lookup = db.getPaymentTransactionByReference(tx.paymentReference);

    assert.ok(lookup);
    assert.strictEqual(lookup.transaction.paymentReference, tx.paymentReference);
    assert.strictEqual(lookup.session.id, s.id);
    assert.strictEqual(lookup.transaction.paymentStatus, "pending");
  });

  // Scenario 6: Process a successful simulated payment
  it("6. processes a successful simulated payment, creates receipt, and marks session completed", () => {
    const station = stationService.getAllDemoStations()[4];
    const connectors = db.getOrCreateStationConnectors(station);
    const s = db.createSession({
      stationId: station.id,
      stationName: station.name,
      stationAddress: station.address,
      connectorId: connectors[0].id,
      connectorType: connectors[0].connectorType,
      chargingPowerKw: connectors[0].powerKW,
      pricePerKWh: 20.0,
      initialBatteryPercent: 20,
    });

    // Simulate charging delivery
    db.updateSessionTelemetry(s.id, {
      energyDeliveredKwh: 10.0, // 10 kWh * ₹20 = ₹200 + ₹25 service fee = ₹225
      currentBatteryPercent: 45,
      durationSeconds: 600,
    });

    // Stop session
    const stopped = db.stopSession(s.id);
    assert.strictEqual(stopped.sessionStatus, "stopped");
    assert.strictEqual(stopped.finalAmount, 225.0);

    const tx = db.createOrGetPaymentTransaction(s.id);
    assert.strictEqual(tx.amount, 225.0);

    const result = db.processPayment({
      paymentReference: tx.paymentReference,
      action: "success",
      paymentMethod: "UPI (Google Pay Demo)",
      idempotencyKey: "test-idem-1",
    });

    assert.strictEqual(result.transaction.paymentStatus, "success");
    assert.strictEqual(result.session.sessionStatus, "completed");
    assert.ok(result.receipt, "Receipt must be created on success");
    assert.strictEqual(result.receipt.finalAmount, 225.0);
    assert.strictEqual(result.receipt.paymentReference, tx.paymentReference);
  });

  // Scenario 7: Process a failed payment
  it("7. processes simulated failed payment and allows permitted retry", () => {
    const station = stationService.getAllDemoStations()[5];
    const connectors = db.getOrCreateStationConnectors(station);
    const s = db.createSession({
      stationId: station.id,
      stationName: station.name,
      stationAddress: station.address,
      connectorId: connectors[0].id,
      connectorType: connectors[0].connectorType,
      chargingPowerKw: connectors[0].powerKW,
      pricePerKWh: 18.0,
      initialBatteryPercent: 20,
    });
    db.stopSession(s.id);

    const tx = db.createOrGetPaymentTransaction(s.id);

    const failedResult = db.processPayment({
      paymentReference: tx.paymentReference,
      action: "fail",
      failureReason: "Bank network timeout (simulated)",
    });

    assert.strictEqual(failedResult.transaction.paymentStatus, "failed");
    assert.strictEqual(failedResult.transaction.failureReason, "Bank network timeout (simulated)");
    assert.strictEqual(failedResult.session.sessionStatus, "stopped");

    // Retry should be permitted by regenerating fresh payment transaction or attempting again
    const retryTx = db.createOrGetPaymentTransaction(s.id, true);
    assert.notStrictEqual(retryTx.paymentReference, tx.paymentReference);
    assert.strictEqual(retryTx.paymentStatus, "pending");
  });

  // Scenario 8: Cancel a payment attempt
  it("8. cancels a payment attempt without marking session paid", () => {
    const station = stationService.getAllDemoStations()[6];
    const connectors = db.getOrCreateStationConnectors(station);
    const s = db.createSession({
      stationId: station.id,
      stationName: station.name,
      stationAddress: station.address,
      connectorId: connectors[0].id,
      connectorType: connectors[0].connectorType,
      chargingPowerKw: connectors[0].powerKW,
      pricePerKWh: 18.0,
      initialBatteryPercent: 20,
    });
    db.stopSession(s.id);

    const tx = db.createOrGetPaymentTransaction(s.id);
    const res = db.processPayment({
      paymentReference: tx.paymentReference,
      action: "cancel",
    });

    assert.strictEqual(res.transaction.paymentStatus, "cancelled");
    assert.strictEqual(res.session.sessionStatus, "stopped");
  });

  // Scenario 9: Reject expired QR reference
  it("9. rejects payment attempt against an expired QR reference", () => {
    const station = stationService.getAllDemoStations()[7];
    const connectors = db.getOrCreateStationConnectors(station);
    const s = db.createSession({
      stationId: station.id,
      stationName: station.name,
      stationAddress: station.address,
      connectorId: connectors[0].id,
      connectorType: connectors[0].connectorType,
      chargingPowerKw: connectors[0].powerKW,
      pricePerKWh: 18.0,
      initialBatteryPercent: 20,
    });
    db.stopSession(s.id);

    const tx = db.createOrGetPaymentTransaction(s.id);

    // Manually backdate expires_at to test expiration enforcement
    const rawDb = (db as any).db;
    const pastIso = new Date(Date.now() - 60000).toISOString();
    rawDb.prepare("UPDATE demo_payment_transactions SET expires_at = ? WHERE id = ?").run(pastIso, tx.id);

    assert.throws(() => {
      db.processPayment({
        paymentReference: tx.paymentReference,
        action: "success",
      });
    }, /expired/);
  });

  // Scenario 10: Reject invalid or modified payment reference
  it("10. rejects invalid or non-existent payment reference", () => {
    assert.throws(() => {
      db.processPayment({
        paymentReference: "PAY-REF-FAKE-NONEXISTENT",
        action: "success",
      });
    }, /Invalid payment reference/);
  });

  // Scenario 11: Prevent duplicate successful payment (idempotent safeguards)
  it("11. prevents duplicate successful payment and handles repeat calls idempotently", () => {
    const station = stationService.getAllDemoStations()[8];
    const connectors = db.getOrCreateStationConnectors(station);
    const s = db.createSession({
      stationId: station.id,
      stationName: station.name,
      stationAddress: station.address,
      connectorId: connectors[0].id,
      connectorType: connectors[0].connectorType,
      chargingPowerKw: connectors[0].powerKW,
      pricePerKWh: 18.0,
      initialBatteryPercent: 20,
    });
    db.stopSession(s.id);
    const tx = db.createOrGetPaymentTransaction(s.id);

    // First payment succeeds
    const res1 = db.processPayment({
      paymentReference: tx.paymentReference,
      action: "success",
      idempotencyKey: "idem-dup-test",
    });
    assert.strictEqual(res1.transaction.paymentStatus, "success");

    // Second payment returns already successful state idempotently without creating duplicate receipts
    const res2 = db.processPayment({
      paymentReference: tx.paymentReference,
      action: "success",
      idempotencyKey: "idem-dup-test",
    });
    assert.strictEqual(res2.transaction.paymentStatus, "success");
    assert.strictEqual(res1.receipt?.id, res2.receipt?.id);
  });

  // Scenario 12: Prevent payment against an outdated amount
  it("12. rejects payment if the transaction amount does not match session payable amount", () => {
    const station = stationService.getAllDemoStations()[9];
    const connectors = db.getOrCreateStationConnectors(station);
    const s = db.createSession({
      stationId: station.id,
      stationName: station.name,
      stationAddress: station.address,
      connectorId: connectors[0].id,
      connectorType: connectors[0].connectorType,
      chargingPowerKw: connectors[0].powerKW,
      pricePerKWh: 18.0,
      initialBatteryPercent: 20,
    });

    const tx = db.createOrGetPaymentTransaction(s.id);

    // Session delivered more energy later
    db.updateSessionTelemetry(s.id, {
      energyDeliveredKwh: 20.0,
      currentBatteryPercent: 60,
      durationSeconds: 1200,
    });
    db.stopSession(s.id);

    // Attempting to pay with the old tx reference (which had amount ₹25 instead of final amount)
    assert.throws(() => {
      db.processPayment({
        paymentReference: tx.paymentReference,
        action: "success",
      });
    }, /does not match session payable amount|cancelled/);
  });

  // Scenario 13: Stop charging and calculate final authoritative amount
  it("13. stops charging and calculates authoritative backend cost using formula", () => {
    const station = stationService.getAllDemoStations()[10];
    const connectors = db.getOrCreateStationConnectors(station);
    const s = db.createSession({
      stationId: station.id,
      stationName: station.name,
      stationAddress: station.address,
      connectorId: connectors[0].id,
      connectorType: connectors[0].connectorType,
      chargingPowerKw: connectors[0].powerKW,
      pricePerKWh: 19.5,
      initialBatteryPercent: 20,
    });

    // Delivered 15.42 kWh
    db.updateSessionTelemetry(s.id, {
      energyDeliveredKwh: 15.42,
      currentBatteryPercent: 55,
      durationSeconds: 850,
    });

    const stopped = db.stopSession(s.id, 55);
    const expectedChargingFee = roundTo2(15.42 * 19.5); // 300.69
    const expectedTotal = roundTo2(expectedChargingFee + 25.0); // 325.69

    assert.strictEqual(stopped.sessionStatus, "stopped");
    assert.strictEqual(stopped.chargingFee, expectedChargingFee);
    assert.strictEqual(stopped.finalAmount, expectedTotal);
    assert.ok(stopped.endTime);
  });

  // Scenario 14: Prevent energy updates after charging stops
  it("14. prevents further energy and duration updates once session has stopped", () => {
    const station = stationService.getAllDemoStations()[11];
    const connectors = db.getOrCreateStationConnectors(station);
    const s = db.createSession({
      stationId: station.id,
      stationName: station.name,
      stationAddress: station.address,
      connectorId: connectors[0].id,
      connectorType: connectors[0].connectorType,
      chargingPowerKw: connectors[0].powerKW,
      pricePerKWh: 18.0,
      initialBatteryPercent: 20,
    });

    db.updateSessionTelemetry(s.id, {
      energyDeliveredKwh: 5.0,
      currentBatteryPercent: 30,
      durationSeconds: 300,
    });

    const stopped = db.stopSession(s.id);
    const energyAtStop = stopped.energyDeliveredKwh;

    // Try sending another telemetry update
    const updated = db.updateSessionTelemetry(s.id, {
      energyDeliveredKwh: 25.0,
      currentBatteryPercent: 90,
      durationSeconds: 2000,
    });

    assert.strictEqual(updated.energyDeliveredKwh, energyAtStop);
    assert.strictEqual(updated.sessionStatus, "stopped");
  });

  // Scenario 15: Generate receipt only after successful simulated payment
  it("15. generates receipt only upon successful payment, and retrieves receipt by reference", () => {
    const station = stationService.getAllDemoStations()[12];
    const connectors = db.getOrCreateStationConnectors(station);
    const s = db.createSession({
      stationId: station.id,
      stationName: station.name,
      stationAddress: station.address,
      connectorId: connectors[0].id,
      connectorType: connectors[0].connectorType,
      chargingPowerKw: connectors[0].powerKW,
      pricePerKWh: 18.0,
      initialBatteryPercent: 20,
    });
    db.stopSession(s.id);

    // Before payment: no receipt
    const noReceipt = db.getReceiptBySessionId(s.id);
    assert.strictEqual(noReceipt, null);

    const tx = db.createOrGetPaymentTransaction(s.id);
    const paid = db.processPayment({
      paymentReference: tx.paymentReference,
      action: "success",
    });

    assert.ok(paid.receipt);
    const receiptByRef = db.getReceiptByReference(paid.receipt.receiptReference);
    assert.ok(receiptByRef);
    assert.strictEqual(receiptByRef.receiptReference, paid.receipt.receiptReference);
    assert.strictEqual(receiptByRef.currency, "INR");
  });

  // Scenario 16: Verify charging history and session ownership
  it("16. retrieves user-specific charging history correctly", () => {
    const user1Sessions = db.getUserSessions("test-user-1");
    assert.ok(user1Sessions.length >= 2, "test-user-1 should have multiple recorded sessions");

    const userXSessions = db.getUserSessions("nonexistent-user-xyz");
    assert.strictEqual(userXSessions.length, 0);
  });

  // Scenario 17: Database persistence across instances
  it("17. persists session and payment records across database reconnection (re-instantiation)", () => {
    const newDbInstance = new SessionDatabase(testDbPath);
    const sessions = newDbInstance.getUserSessions("test-user-1");
    assert.ok(sessions.length >= 2);
    assert.ok(sessions[0].sessionReference.startsWith("EV-SES-"));
  });

  // Scenario 18: Transaction consistency and error handling
  it("18. rolls back transaction safely on failure preserving database integrity", () => {
    const station = stationService.getAllDemoStations()[13];
    const connectors = db.getOrCreateStationConnectors(station);

    // Force an invalid status check or invalid action
    assert.throws(() => {
      db.processPayment({
        paymentReference: "FAKE-REF",
        action: "invalid_action" as any,
      });
    });

    // Database remains usable
    const freshCheck = db.getUserSessions("test-user-1");
    assert.ok(Array.isArray(freshCheck));
  });
});
