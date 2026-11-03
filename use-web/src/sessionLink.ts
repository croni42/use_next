// DEMO-SEED known-gaps-token-in-url
export function buildExportUrl(csrfToken: string): string {
  return `/api/ocl/export?csrf=${encodeURIComponent(csrfToken)}`;
}
