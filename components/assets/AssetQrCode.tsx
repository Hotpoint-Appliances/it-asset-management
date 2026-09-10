import QRCode from "qrcode";

/** Server component — generates the QR code at render time, no schema/storage needed (per
 * phase-4-asset-management Step 6). Encodes the full asset detail URL so any phone camera jumps
 * straight to the record. */
export async function AssetQrCode({ assetId, size = 180 }: { assetId: string; size?: number }) {
  const appUrl = (process.env.ITAM_APP_URL ?? "").replace(/\/$/, "");
  const url = `${appUrl}/assets/${assetId}`;
  const dataUrl = await QRCode.toDataURL(url, { width: size, margin: 1 });
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={dataUrl} alt={`QR code linking to ${url}`} width={size} height={size} />;
}
