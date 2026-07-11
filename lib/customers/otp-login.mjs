export function normalizeOtpCode(value) {
  const normalized = String(value ?? "").replace(/\s/g, "");
  return /^\d{6}$/.test(normalized) ? normalized : "";
}
