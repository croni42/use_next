import { AuthApi, Configuration, ModelsApi } from './api';
import type { Middleware, RequestContext } from './api';

/**
 * The one central place for cross-cutting API client behaviour (ADR-008 / ADR-010):
 * - credentials: 'include' on every request, so the session cookie is sent
 * - CSRF header on every mutating request
 * Nothing in the UI calls fetch directly or sets these per call.
 */

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Plain configuration without the CSRF middleware, used to fetch the token itself (avoids recursion).
const bareConfiguration = new Configuration({ credentials: 'include' });

let cachedToken: { headerName: string; token: string } | null = null;

async function loadCsrfToken(): Promise<{ headerName: string; token: string }> {
  if (cachedToken === null) {
    cachedToken = await new AuthApi(bareConfiguration).getCsrfToken();
  }
  return cachedToken;
}

/** The server rotates the CSRF token on login and drops it on logout, so the cache must be cleared then. */
export function resetCsrfToken(): void {
  cachedToken = null;
}

const csrfMiddleware: Middleware = {
  async pre(context: RequestContext) {
    const method = (context.init.method ?? 'GET').toUpperCase();
    if (!MUTATING_METHODS.has(method)) {
      return undefined;
    }
    const { headerName, token } = await loadCsrfToken();
    return {
      url: context.url,
      init: { ...context.init, headers: { ...(context.init.headers as Record<string, string>), [headerName]: token } },
    };
  },
};

const configuration = new Configuration({
  credentials: 'include',
  middleware: [csrfMiddleware],
});

export const authApi = new AuthApi(configuration);
export const modelsApi = new ModelsApi(configuration);
