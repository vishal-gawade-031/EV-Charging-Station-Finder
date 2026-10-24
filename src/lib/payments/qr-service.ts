import QRCode from "qrcode";

export interface QRCodeData {
  paymentReference: string;
  paymentUrl: string;
  qrDataUrl: string;
  qrSvg: string;
  amount: number;
  currency: string;
  expiresAt: string;
}

export async function generatePaymentQRCode(
  paymentReference: string,
  amount: number,
  baseUrl: string,
  expiresAt: string
): Promise<QRCodeData> {
  const paymentUrl = `${baseUrl.replace(/\/+$/, "")}/demo-payment/${encodeURIComponent(paymentReference)}`;

  // Generate high-resolution PNG Data URL
  const qrDataUrl = await QRCode.toDataURL(paymentUrl, {
    errorCorrectionLevel: "H",
    margin: 2,
    width: 320,
    color: {
      dark: "#064e3b", // Deep emerald color matching EVFind branding
      light: "#ffffff",
    },
  });

  // Generate vector SVG
  const qrSvg = await QRCode.toString(paymentUrl, {
    type: "svg",
    errorCorrectionLevel: "H",
    margin: 2,
    width: 320,
    color: {
      dark: "#064e3b",
      light: "#ffffff",
    },
  });

  return {
    paymentReference,
    paymentUrl,
    qrDataUrl,
    qrSvg,
    amount,
    currency: "INR",
    expiresAt,
  };
}
