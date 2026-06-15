import "server-only";

export const KB = 1024;

// Cheap pre-parse guard: reject when the declared Content-Length exceeds the cap
// (L4/M5 — stops multi-MB bodies before they're buffered/parsed into memory).
export function bodyTooLarge(req: Request, maxBytes: number): boolean {
  const cl = Number(req.headers.get("content-length") || 0);
  return Number.isFinite(cl) && cl > maxBytes;
}
