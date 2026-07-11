export function normalizeOtpCode(value) {
  const normalized = String(value ?? "").replace(/\s/g, "");
  return /^\d{8}$/.test(normalized) ? normalized : "";
}
