// EVAL-SEED E02
export function buildExportUrl(csrfToken: string): string {
  return `/api/ocl/export?csrf=${encodeURIComponent(csrfToken)}`;
}
