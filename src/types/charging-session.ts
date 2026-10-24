import { ConnectorType } from "./station";

export type ChargingSessionStatus = "charging" | "stopped" | "completed";

export type PaymentStatus = "pending" | "success" | "failed" | "cancelled" | "expired";

export interface StationConnector {
  id: string; // e.g. "CONN-01"
  stationId: string;
  connectorType: ConnectorType | string;
  powerKW: number;
  pricePerKWh: number;
  status: "available" | "occupied" | "maintenance";
  isSimulated: boolean;
}

export interface ChargingSession {
  id: string; // e.g. "ses-6f8b1a9c"
  sessionReference: string; // e.g. "EV-SES-2026-8941"
  userId: string;
  stationId: string;
  stationName: string;
  stationAddress: string;
  connectorId: string;
  connectorType: string;
  startTime: string; // ISO
  endTime: string | null; // ISO
  durationSeconds: number;
  initialBatteryPercent: number;
  currentBatteryPercent: number;
  finalBatteryPercent: number | null;
  energyDeliveredKwh: number;
  chargingPowerKw: number;
  pricePerKWh: number;
  serviceFee: number;
  chargingFee: number;
  finalAmount: number;
  sessionStatus: ChargingSessionStatus;
  simulationMode: boolean;
  createdAt: string;
  updatedAt: string;
  // Associated payment info (populated when available)
  paymentStatus?: PaymentStatus;
  paymentReference?: string;
}

export interface DemoPaymentTransaction {
  id: string;
  paymentReference: string;
  sessionId: string;
  stationId: string;
  stationName: string;
  amount: number;
  currency: string;
  paymentStatus: PaymentStatus;
  createdAt: string;
  expiresAt: string;
  processedAt: string | null;
  failureReason: string | null;
  idempotencyKey: string | null;
  paymentMethod: string | null;
}

export interface Receipt {
  id: string;
  receiptReference: string;
  sessionId: string;
  paymentTransactionId: string;
  stationId: string;
  stationName: string;
  stationAddress: string;
  connectorId: string;
  connectorType: string;
  startTime: string;
  endTime: string;
  durationSeconds: number;
  energyDeliveredKwh: number;
  pricePerKWh: number;
  chargingFee: number;
  serviceFee: number;
  finalAmount: number;
  currency: string;
  paymentReference: string;
  paymentMethod: string;
  issuedAt: string;
}

export interface CreateSessionRequest {
  stationId: string;
  connectorId: string;
  initialBatteryPercent?: number;
  userId?: string;
}

export interface TelemetryUpdateRequest {
  energyDeliveredKwh: number;
  currentBatteryPercent: number;
  durationSeconds: number;
}

export interface ProcessPaymentRequest {
  paymentReference: string;
  action: "success" | "fail" | "cancel";
  paymentMethod?: string;
  failureReason?: string;
  idempotencyKey?: string;
}
