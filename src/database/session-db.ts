import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { DatabaseSync } from "node:sqlite";
import {
  ChargingSession,
  ChargingSessionStatus,
  DemoPaymentTransaction,
  PaymentStatus,
  Receipt,
  StationConnector,
} from "@/types/charging-session";
import { stationService } from "@/lib/stations/station-service";
import { ChargingStation } from "@/types/station";

// Helper for decimal-safe rounding
export function roundTo2(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

export class SessionDatabase {
  private db: DatabaseSync;
  private dbPath: string;

  constructor(customPath?: string) {
    if (customPath) {
      this.dbPath = customPath;
    } else {
      const dataDir = path.join(process.cwd(), "data");
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      this.dbPath = path.join(dataDir, "charging_sessions.db");
    }

    this.db = new DatabaseSync(this.dbPath);
    this.initTables();
  }

  private initTables() {
    this.db.exec(`
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS station_connectors (
        station_id TEXT NOT NULL,
        connector_id TEXT NOT NULL,
        connector_type TEXT NOT NULL,
        power_kw REAL NOT NULL,
        price_per_kwh REAL NOT NULL,
        status TEXT NOT NULL CHECK(status IN ('available', 'occupied', 'maintenance')),
        is_simulated INTEGER NOT NULL DEFAULT 1,
        updated_at TEXT NOT NULL,
        PRIMARY KEY (station_id, connector_id)
      );

      CREATE TABLE IF NOT EXISTS charging_sessions (
        id TEXT PRIMARY KEY,
        session_reference TEXT UNIQUE NOT NULL,
        user_id TEXT NOT NULL DEFAULT 'demo-user-1',
        station_id TEXT NOT NULL,
        station_name TEXT NOT NULL,
        station_address TEXT NOT NULL,
        connector_id TEXT NOT NULL,
        connector_type TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration_seconds INTEGER NOT NULL DEFAULT 0,
        initial_battery_percent REAL NOT NULL,
        current_battery_percent REAL NOT NULL,
        final_battery_percent REAL,
        energy_delivered_kwh REAL NOT NULL DEFAULT 0.0,
        charging_power_kw REAL NOT NULL,
        price_per_kwh REAL NOT NULL,
        service_fee REAL NOT NULL DEFAULT 25.0,
        charging_fee REAL NOT NULL DEFAULT 0.0,
        final_amount REAL NOT NULL DEFAULT 25.0,
        session_status TEXT NOT NULL CHECK(session_status IN ('charging', 'stopped', 'completed')),
        simulation_mode INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_user ON charging_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_station ON charging_sessions(station_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_created ON charging_sessions(created_at DESC);

      CREATE TABLE IF NOT EXISTS demo_payment_transactions (
        id TEXT PRIMARY KEY,
        payment_reference TEXT UNIQUE NOT NULL,
        session_id TEXT NOT NULL,
        station_id TEXT NOT NULL,
        station_name TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        payment_status TEXT NOT NULL CHECK(payment_status IN ('pending', 'success', 'failed', 'cancelled', 'expired')),
        created_at TEXT NOT NULL,
        expires_at TEXT NOT NULL,
        processed_at TEXT,
        failure_reason TEXT,
        idempotency_key TEXT UNIQUE,
        payment_method TEXT,
        FOREIGN KEY (session_id) REFERENCES charging_sessions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_payments_session ON demo_payment_transactions(session_id);
      CREATE INDEX IF NOT EXISTS idx_payments_ref ON demo_payment_transactions(payment_reference);

      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        receipt_reference TEXT UNIQUE NOT NULL,
        session_id TEXT NOT NULL,
        payment_transaction_id TEXT NOT NULL,
        station_id TEXT NOT NULL,
        station_name TEXT NOT NULL,
        station_address TEXT NOT NULL,
        connector_id TEXT NOT NULL,
        connector_type TEXT NOT NULL,
        start_time TEXT NOT NULL,
        end_time TEXT NOT NULL,
        duration_seconds INTEGER NOT NULL,
        energy_delivered_kwh REAL NOT NULL,
        price_per_kwh REAL NOT NULL,
        charging_fee REAL NOT NULL,
        service_fee REAL NOT NULL,
        final_amount REAL NOT NULL,
        currency TEXT NOT NULL DEFAULT 'INR',
        payment_reference TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        issued_at TEXT NOT NULL,
        FOREIGN KEY (session_id) REFERENCES charging_sessions(id) ON DELETE CASCADE,
        FOREIGN KEY (payment_transaction_id) REFERENCES demo_payment_transactions(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_receipts_session ON receipts(session_id);
      CREATE INDEX IF NOT EXISTS idx_receipts_ref ON receipts(receipt_reference);
    `);
  }

  // --- Connector Management ---

  public getOrCreateStationConnectors(station: ChargingStation): StationConnector[] {
    const query = this.db.prepare(
      `SELECT * FROM station_connectors WHERE station_id = ? ORDER BY connector_id ASC`
    );
    const existing = query.all(station.id) as any[];

    if (existing && existing.length > 0) {
      return existing.map((row) => ({
        id: row.connector_id,
        stationId: row.station_id,
        connectorType: row.connector_type,
        powerKW: row.power_kw,
        pricePerKWh: row.price_per_kwh,
        status: row.status,
        isSimulated: Boolean(row.is_simulated),
      }));
    }

    // Parse base price from station pricing or default
    let basePrice = 18.5;
    if (station.pricing) {
      const match = station.pricing.match(/₹?([0-9]+(\.[0-9]+)?)/);
      if (match && match[1]) {
        basePrice = parseFloat(match[1]);
      }
    }

    const totalPorts = Math.max(station.totalPorts || 2, station.connectorTypes.length);
    const connectors: StationConnector[] = [];
    const now = new Date().toISOString();

    const insertStmt = this.db.prepare(`
      INSERT INTO station_connectors (
        station_id, connector_id, connector_type, power_kw, price_per_kwh, status, is_simulated, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    for (let i = 0; i < totalPorts; i++) {
      const connId = `GUN-0${i + 1}`;
      const connType = station.connectorTypes[i % station.connectorTypes.length] || "CCS2";
      const isFast = connType.includes("CCS2") || connType.includes("DC") || connType.includes("CHAdeMO");
      const power = isFast ? station.powerKW : Math.min(station.powerKW, 22);
      const price = isFast ? roundTo2(basePrice) : roundTo2(Math.max(12, basePrice - 4));
      // Give the last port a simulated "occupied" status if there are 3+ ports for realism
      const status: "available" | "occupied" = (i === totalPorts - 1 && totalPorts >= 3) ? "occupied" : "available";

      insertStmt.run(station.id, connId, connType, power, price, status, 1, now);

      connectors.push({
        id: connId,
        stationId: station.id,
        connectorType: connType,
        powerKW: power,
        pricePerKWh: price,
        status,
        isSimulated: true,
      });
    }

    return connectors;
  }

  public setConnectorStatus(stationId: string, connectorId: string, status: "available" | "occupied" | "maintenance") {
    const stmt = this.db.prepare(`
      UPDATE station_connectors
      SET status = ?, updated_at = ?
      WHERE station_id = ? AND connector_id = ?
    `);
    stmt.run(status, new Date().toISOString(), stationId, connectorId);
  }

  // --- Charging Session Management ---

  public createSession(data: {
    stationId: string;
    stationName: string;
    stationAddress: string;
    connectorId: string;
    connectorType: string;
    chargingPowerKw: number;
    pricePerKWh: number;
    initialBatteryPercent: number;
    userId?: string;
  }): ChargingSession {
    const id = `ses-${crypto.randomBytes(6).toString("hex")}`;
    const randCode = Math.floor(1000 + Math.random() * 9000);
    const sessionReference = `EV-SES-${new Date().getFullYear()}-${randCode}`;
    const now = new Date().toISOString();
    const userId = data.userId || "demo-user-1";
    const serviceFee = 25.0; // ₹25 fixed service/convenience fee

    this.db.exec("BEGIN IMMEDIATE");
    try {
      // Check if connector is available
      const connStmt = this.db.prepare(
        "SELECT status FROM station_connectors WHERE station_id = ? AND connector_id = ?"
      );
      const connRow = connStmt.get(data.stationId, data.connectorId) as any;
      if (connRow && connRow.status !== "available") {
        throw new Error(`Connector '${data.connectorId}' is currently ${connRow.status}. Please select an available connector.`);
      }

      // Check if active session already exists for this connector
      const activeStmt = this.db.prepare(
        "SELECT id FROM charging_sessions WHERE station_id = ? AND connector_id = ? AND session_status = 'charging'"
      );
      const activeSession = activeStmt.get(data.stationId, data.connectorId) as any;
      if (activeSession) {
        throw new Error(`A charging session is already active on connector '${data.connectorId}'.`);
      }

      const insertSession = this.db.prepare(`
        INSERT INTO charging_sessions (
          id, session_reference, user_id, station_id, station_name, station_address,
          connector_id, connector_type, start_time, duration_seconds,
          initial_battery_percent, current_battery_percent, energy_delivered_kwh,
          charging_power_kw, price_per_kwh, service_fee, charging_fee, final_amount,
          session_status, simulation_mode, created_at, updated_at
        ) VALUES (
          ?, ?, ?, ?, ?, ?,
          ?, ?, ?, 0,
          ?, ?, 0.0,
          ?, ?, ?, 0.0, ?,
          'charging', 1, ?, ?
        )
      `);

      insertSession.run(
        id,
        sessionReference,
        userId,
        data.stationId,
        data.stationName,
        data.stationAddress,
        data.connectorId,
        data.connectorType,
        now,
        data.initialBatteryPercent,
        data.initialBatteryPercent,
        data.chargingPowerKw,
        data.pricePerKWh,
        serviceFee,
        serviceFee, // initial estimated amount with 0 kWh
        now,
        now
      );

      // Mark connector as occupied
      const updateConn = this.db.prepare(
        "UPDATE station_connectors SET status = 'occupied', updated_at = ? WHERE station_id = ? AND connector_id = ?"
      );
      updateConn.run(now, data.stationId, data.connectorId);

      this.db.exec("COMMIT");

      return this.getSessionById(id)!;
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  public getSessionById(id: string): ChargingSession | null {
    const stmt = this.db.prepare(`
      SELECT s.*, 
             p.payment_status,
             p.payment_reference
      FROM charging_sessions s
      LEFT JOIN (
        SELECT session_id, payment_status, payment_reference
        FROM demo_payment_transactions
        ORDER BY created_at DESC
        LIMIT 1
      ) p ON s.id = p.session_id
      WHERE s.id = ? OR s.session_reference = ?
    `);

    const row = stmt.get(id, id) as any;
    if (!row) return null;

    return this.mapSessionRow(row);
  }

  public updateSessionTelemetry(
    sessionId: string,
    telemetry: { energyDeliveredKwh: number; currentBatteryPercent: number; durationSeconds: number }
  ): ChargingSession {
    const session = this.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found.`);
    }

    if (session.sessionStatus !== "charging") {
      // Do not update energy or duration if session is already stopped or completed
      return session;
    }

    const energy = Math.max(0, roundTo2(telemetry.energyDeliveredKwh));
    const chargingFee = roundTo2(energy * session.pricePerKWh);
    const finalAmount = roundTo2(chargingFee + session.serviceFee);
    const now = new Date().toISOString();

    const stmt = this.db.prepare(`
      UPDATE charging_sessions
      SET energy_delivered_kwh = ?,
          current_battery_percent = ?,
          duration_seconds = ?,
          charging_fee = ?,
          final_amount = ?,
          updated_at = ?
      WHERE id = ? AND session_status = 'charging'
    `);

    stmt.run(
      energy,
      Math.min(100, Math.max(session.initialBatteryPercent, telemetry.currentBatteryPercent)),
      telemetry.durationSeconds,
      chargingFee,
      finalAmount,
      now,
      sessionId
    );

    return this.getSessionById(sessionId)!;
  }

  public stopSession(sessionId: string, finalBatteryPercent?: number): ChargingSession {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      const session = this.getSessionById(sessionId);
      if (!session) {
        throw new Error(`Session '${sessionId}' not found.`);
      }

      if (session.sessionStatus === "stopped" || session.sessionStatus === "completed") {
        this.db.exec("COMMIT");
        return session;
      }

      const now = new Date().toISOString();
      const finalBattery = finalBatteryPercent !== undefined
        ? Math.min(100, finalBatteryPercent)
        : session.currentBatteryPercent;

      // Authoritative backend cost calculation
      const authoritativeChargingFee = roundTo2(session.energyDeliveredKwh * session.pricePerKWh);
      const authoritativeFinalAmount = roundTo2(authoritativeChargingFee + session.serviceFee);

      const stmt = this.db.prepare(`
        UPDATE charging_sessions
        SET session_status = 'stopped',
            end_time = ?,
            final_battery_percent = ?,
            current_battery_percent = ?,
            charging_fee = ?,
            final_amount = ?,
            updated_at = ?
        WHERE id = ?
      `);

      stmt.run(
        now,
        finalBattery,
        finalBattery,
        authoritativeChargingFee,
        authoritativeFinalAmount,
        now,
        sessionId
      );

      // Invalidate any older pending payment references with outdated amounts
      const invalidateOlder = this.db.prepare(`
        UPDATE demo_payment_transactions
        SET payment_status = 'cancelled'
        WHERE session_id = ? AND payment_status = 'pending' AND amount != ?
      `);
      invalidateOlder.run(sessionId, authoritativeFinalAmount);

      // Release connector status back to available
      const freeConn = this.db.prepare(`
        UPDATE station_connectors
        SET status = 'available', updated_at = ?
        WHERE station_id = ? AND connector_id = ?
      `);
      freeConn.run(now, session.stationId, session.connectorId);

      this.db.exec("COMMIT");

      return this.getSessionById(sessionId)!;
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  public getUserSessions(userId: string = "demo-user-1"): ChargingSession[] {
    const stmt = this.db.prepare(`
      SELECT s.*, 
             p.payment_status,
             p.payment_reference
      FROM charging_sessions s
      LEFT JOIN (
        SELECT session_id, payment_status, payment_reference, MAX(created_at)
        FROM demo_payment_transactions
        GROUP BY session_id
      ) p ON s.id = p.session_id
      WHERE s.user_id = ?
      ORDER BY s.created_at DESC
    `);

    const rows = stmt.all(userId) as any[];
    return rows.map((r) => this.mapSessionRow(r));
  }

  // --- Demo Payment Transactions ---

  public createOrGetPaymentTransaction(sessionId: string, forceRegenerate: boolean = false): DemoPaymentTransaction {
    const session = this.getSessionById(sessionId);
    if (!session) {
      throw new Error(`Session '${sessionId}' not found.`);
    }

    // Check if there is already a successful transaction
    const successStmt = this.db.prepare(`
      SELECT * FROM demo_payment_transactions
      WHERE session_id = ? AND payment_status = 'success'
      LIMIT 1
    `);
    const successfulTx = successStmt.get(sessionId) as any;
    if (successfulTx) {
      return this.mapPaymentRow(successfulTx);
    }

    const nowTime = Date.now();
    const nowIso = new Date(nowTime).toISOString();

    // If not forcing regenerate, look for an active, unexpired pending transaction with exact matching amount
    if (!forceRegenerate) {
      const activeStmt = this.db.prepare(`
        SELECT * FROM demo_payment_transactions
        WHERE session_id = ? AND payment_status = 'pending' AND amount = ?
        ORDER BY created_at DESC
        LIMIT 1
      `);
      const existing = activeStmt.get(sessionId, session.finalAmount) as any;
      if (existing) {
        const expiresTime = new Date(existing.expires_at).getTime();
        if (expiresTime > nowTime) {
          return this.mapPaymentRow(existing);
        } else {
          // Mark expired
          const expireStmt = this.db.prepare(`
            UPDATE demo_payment_transactions SET payment_status = 'expired' WHERE id = ?
          `);
          expireStmt.run(existing.id);
        }
      }
    }

    // Invalidate any other pending transactions for this session
    const cancelOld = this.db.prepare(`
      UPDATE demo_payment_transactions SET payment_status = 'cancelled' WHERE session_id = ? AND payment_status = 'pending'
    `);
    cancelOld.run(sessionId);

    // Create new secure unguessable payment reference
    const id = `pay-${crypto.randomBytes(6).toString("hex")}`;
    const paymentReference = `PAY-REF-${crypto.randomBytes(6).toString("hex").toUpperCase()}`;
    const expiresAt = new Date(nowTime + 15 * 60 * 1000).toISOString(); // 15 minutes TTL

    const insertStmt = this.db.prepare(`
      INSERT INTO demo_payment_transactions (
        id, payment_reference, session_id, station_id, station_name, amount,
        currency, payment_status, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'INR', 'pending', ?, ?)
    `);

    insertStmt.run(
      id,
      paymentReference,
      session.id,
      session.stationId,
      session.stationName,
      session.finalAmount,
      nowIso,
      expiresAt
    );

    const getNewStmt = this.db.prepare("SELECT * FROM demo_payment_transactions WHERE id = ?");
    return this.mapPaymentRow(getNewStmt.get(id) as any);
  }

  public getPaymentTransactionByReference(paymentReference: string): {
    transaction: DemoPaymentTransaction;
    session: ChargingSession;
  } | null {
    const stmt = this.db.prepare("SELECT * FROM demo_payment_transactions WHERE payment_reference = ?");
    const row = stmt.get(paymentReference) as any;
    if (!row) return null;

    const session = this.getSessionById(row.session_id);
    if (!session) return null;

    // Check expiration dynamically
    const nowTime = Date.now();
    const expiresTime = new Date(row.expires_at).getTime();
    if (row.payment_status === "pending" && expiresTime <= nowTime) {
      const expireStmt = this.db.prepare("UPDATE demo_payment_transactions SET payment_status = 'expired' WHERE id = ?");
      expireStmt.run(row.id);
      row.payment_status = "expired";
    }

    return {
      transaction: this.mapPaymentRow(row),
      session,
    };
  }

  public processPayment(params: {
    paymentReference: string;
    action: "success" | "fail" | "cancel";
    failureReason?: string;
    idempotencyKey?: string;
    paymentMethod?: string;
  }): {
    transaction: DemoPaymentTransaction;
    session: ChargingSession;
    receipt?: Receipt;
  } {
    this.db.exec("BEGIN IMMEDIATE");
    try {
      // Idempotency check if key provided
      if (params.idempotencyKey) {
        const idempStmt = this.db.prepare("SELECT * FROM demo_payment_transactions WHERE idempotency_key = ?");
        const existingIdemp = idempStmt.get(params.idempotencyKey) as any;
        if (existingIdemp) {
          const sess = this.getSessionById(existingIdemp.session_id)!;
          const rec = this.getReceiptBySessionId(existingIdemp.session_id);
          this.db.exec("COMMIT");
          return {
            transaction: this.mapPaymentRow(existingIdemp),
            session: sess,
            receipt: rec || undefined,
          };
        }
      }

      const txQuery = this.db.prepare("SELECT * FROM demo_payment_transactions WHERE payment_reference = ?");
      const txRow = txQuery.get(params.paymentReference) as any;
      if (!txRow) {
        throw new Error("Invalid payment reference. Transaction not found.");
      }

      const session = this.getSessionById(txRow.session_id);
      if (!session) {
        throw new Error("Associated charging session not found.");
      }

      // Check already paid (idempotent success)
      if (txRow.payment_status === "success") {
        const receipt = this.getReceiptBySessionId(session.id);
        this.db.exec("COMMIT");
        return {
          transaction: this.mapPaymentRow(txRow),
          session,
          receipt: receipt || undefined,
        };
      }

      // Check expired
      const nowTime = Date.now();
      const expiresTime = new Date(txRow.expires_at).getTime();
      if (txRow.payment_status === "expired" || expiresTime <= nowTime) {
        const expStmt = this.db.prepare("UPDATE demo_payment_transactions SET payment_status = 'expired' WHERE id = ?");
        expStmt.run(txRow.id);
        throw new Error("This payment QR reference has expired. Please regenerate a new QR code.");
      }

      // Check cancelled
      if (txRow.payment_status === "cancelled") {
        throw new Error("This payment reference was cancelled or replaced by a new invoice amount.");
      }

      // Validate payable amount matches session final amount
      if (roundTo2(txRow.amount) !== roundTo2(session.finalAmount)) {
        throw new Error(`Payment amount (₹${txRow.amount}) does not match session payable amount (₹${session.finalAmount}).`);
      }

      const nowIso = new Date().toISOString();

      if (params.action === "cancel") {
        const cancelStmt = this.db.prepare(`
          UPDATE demo_payment_transactions
          SET payment_status = 'cancelled', processed_at = ?
          WHERE id = ?
        `);
        cancelStmt.run(nowIso, txRow.id);
        this.db.exec("COMMIT");
        const updatedTx = this.db.prepare("SELECT * FROM demo_payment_transactions WHERE id = ?").get(txRow.id) as any;
        return {
          transaction: this.mapPaymentRow(updatedTx),
          session,
        };
      }

      if (params.action === "fail") {
        const failStmt = this.db.prepare(`
          UPDATE demo_payment_transactions
          SET payment_status = 'failed',
              processed_at = ?,
              failure_reason = ?,
              payment_method = ?
          WHERE id = ?
        `);
        failStmt.run(
          nowIso,
          params.failureReason || "Simulated payment failure / gateway timeout",
          params.paymentMethod || "UPI",
          txRow.id
        );
        this.db.exec("COMMIT");
        const updatedTx = this.db.prepare("SELECT * FROM demo_payment_transactions WHERE id = ?").get(txRow.id) as any;
        return {
          transaction: this.mapPaymentRow(updatedTx),
          session,
        };
      }

      // Action: "success"
      const successStmt = this.db.prepare(`
        UPDATE demo_payment_transactions
        SET payment_status = 'success',
            processed_at = ?,
            idempotency_key = ?,
            payment_method = ?
        WHERE id = ?
      `);
      successStmt.run(
        nowIso,
        params.idempotencyKey || null,
        params.paymentMethod || "UPI (Google Pay / PhonePe Demo)",
        txRow.id
      );

      // Update session status to "completed"
      const sessionUpdateStmt = this.db.prepare(`
        UPDATE charging_sessions
        SET session_status = 'completed', updated_at = ?
        WHERE id = ?
      `);
      sessionUpdateStmt.run(nowIso, session.id);

      // Generate Receipt
      const receiptId = `rec-${crypto.randomBytes(6).toString("hex")}`;
      const receiptReference = `REC-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;

      const insertReceipt = this.db.prepare(`
        INSERT INTO receipts (
          id, receipt_reference, session_id, payment_transaction_id,
          station_id, station_name, station_address, connector_id, connector_type,
          start_time, end_time, duration_seconds, energy_delivered_kwh,
          price_per_kwh, charging_fee, service_fee, final_amount,
          currency, payment_reference, payment_method, issued_at
        ) VALUES (
          ?, ?, ?, ?,
          ?, ?, ?, ?, ?,
          ?, ?, ?, ?,
          ?, ?, ?, ?,
          'INR', ?, ?, ?
        )
      `);

      insertReceipt.run(
        receiptId,
        receiptReference,
        session.id,
        txRow.id,
        session.stationId,
        session.stationName,
        session.stationAddress,
        session.connectorId,
        session.connectorType,
        session.startTime,
        session.endTime || nowIso,
        session.durationSeconds,
        session.energyDeliveredKwh,
        session.pricePerKWh,
        session.chargingFee,
        session.serviceFee,
        session.finalAmount,
        params.paymentReference,
        params.paymentMethod || "UPI (Google Pay / PhonePe Demo)",
        nowIso
      );

      this.db.exec("COMMIT");

      const finalTx = this.db.prepare("SELECT * FROM demo_payment_transactions WHERE id = ?").get(txRow.id) as any;
      const updatedSession = this.getSessionById(session.id)!;
      const receipt = this.getReceiptBySessionId(session.id)!;

      return {
        transaction: this.mapPaymentRow(finalTx),
        session: updatedSession,
        receipt,
      };
    } catch (err) {
      this.db.exec("ROLLBACK");
      throw err;
    }
  }

  // --- Receipts ---

  public getReceiptBySessionId(sessionId: string): Receipt | null {
    const stmt = this.db.prepare("SELECT * FROM receipts WHERE session_id = ? ORDER BY issued_at DESC LIMIT 1");
    const row = stmt.get(sessionId) as any;
    if (!row) return null;
    return this.mapReceiptRow(row);
  }

  public getReceiptByReference(reference: string): Receipt | null {
    const stmt = this.db.prepare(
      "SELECT * FROM receipts WHERE receipt_reference = ? OR payment_reference = ? OR session_id = ? LIMIT 1"
    );
    const row = stmt.get(reference, reference, reference) as any;
    if (!row) return null;
    return this.mapReceiptRow(row);
  }

  // --- Helper row mappers ---

  private mapSessionRow(row: any): ChargingSession {
    return {
      id: row.id,
      sessionReference: row.session_reference,
      userId: row.user_id,
      stationId: row.station_id,
      stationName: row.station_name,
      stationAddress: row.station_address,
      connectorId: row.connector_id,
      connectorType: row.connector_type,
      startTime: row.start_time,
      endTime: row.end_time,
      durationSeconds: row.duration_seconds,
      initialBatteryPercent: row.initial_battery_percent,
      currentBatteryPercent: row.current_battery_percent,
      finalBatteryPercent: row.final_battery_percent,
      energyDeliveredKwh: row.energy_delivered_kwh,
      chargingPowerKw: row.charging_power_kw,
      pricePerKWh: row.price_per_kwh,
      serviceFee: row.service_fee,
      chargingFee: row.charging_fee,
      finalAmount: row.final_amount,
      sessionStatus: row.session_status,
      simulationMode: Boolean(row.simulation_mode),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      paymentStatus: row.payment_status || "pending",
      paymentReference: row.payment_reference || undefined,
    };
  }

  private mapPaymentRow(row: any): DemoPaymentTransaction {
    return {
      id: row.id,
      paymentReference: row.payment_reference,
      sessionId: row.session_id,
      stationId: row.station_id,
      stationName: row.station_name,
      amount: row.amount,
      currency: row.currency,
      paymentStatus: row.payment_status,
      createdAt: row.created_at,
      expiresAt: row.expires_at,
      processedAt: row.processed_at,
      failureReason: row.failure_reason,
      idempotencyKey: row.idempotency_key,
      paymentMethod: row.payment_method,
    };
  }

  private mapReceiptRow(row: any): Receipt {
    return {
      id: row.id,
      receiptReference: row.receipt_reference,
      sessionId: row.session_id,
      paymentTransactionId: row.payment_transaction_id,
      stationId: row.station_id,
      stationName: row.station_name,
      stationAddress: row.station_address,
      connectorId: row.connector_id,
      connectorType: row.connector_type,
      startTime: row.start_time,
      endTime: row.end_time,
      durationSeconds: row.duration_seconds,
      energyDeliveredKwh: row.energy_delivered_kwh,
      pricePerKWh: row.price_per_kwh,
      chargingFee: row.charging_fee,
      serviceFee: row.service_fee,
      finalAmount: row.final_amount,
      currency: row.currency,
      paymentReference: row.payment_reference,
      paymentMethod: row.payment_method,
      issuedAt: row.issued_at,
    };
  }
}

// Global Singleton for database
let globalDb: SessionDatabase | null = null;

export function getSessionDatabase(): SessionDatabase {
  if (!globalDb) {
    globalDb = new SessionDatabase();
  }
  return globalDb;
}
