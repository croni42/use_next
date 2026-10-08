import { AuthApi, Configuration, ModelsApi, ResponseError } from './api';
import type { Middleware, RequestContext, ResponseContext, UserInfo } from './api';

/**
 * The one central place for cross-cutting API client behaviour (ADR-008 / ADR-010):
 * - credentials: 'include' on every request, so the session cookie is sent
 * - CSRF header on every mutating request, one retry with a fresh token after a 403
 * - a single hook for 401 responses, so the UI can return to the login page when the session is gone
 * Nothing in the UI calls fetch directly or sets these per call.
 */

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const LOGIN_PATH = '/auth/login';

type CsrfToken = { headerName: string; token: string };

// Plain configuration without the middleware, used to fetch the token itself (avoids recursion).
const bareConfiguration = new Configuration({ credentials: 'include' });

let cachedToken: CsrfToken | null = null;

async function loadCsrfToken(): Promise<CsrfToken> {
  if (cachedToken === null) {
    cachedToken = await new AuthApi(bareConfiguration).getCsrfToken();
  }
  return cachedToken;
}

/** The server rotates the CSRF token on login and drops it on logout, so the cache must be cleared then. */
function resetCsrfToken(): void {
  cachedToken = null;
}

let unauthorizedHandler: (() => void) | null = null;

/** Registers the callback that runs when a call (other than the login itself) gets a 401. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler;
}

function isMutating(init: RequestInit): boolean {
  return MUTATING_METHODS.has((init.method ?? 'GET').toUpperCase());
}

function withCsrfHeader(init: RequestInit, { headerName, token }: CsrfToken): RequestInit {
  return { ...init, headers: { ...(init.headers as Record<string, string>), [headerName]: token } };
}

const middleware: Middleware = {
  async pre(context: RequestContext) {
    if (!isMutating(context.init)) {
      return undefined;
    }
    return { url: context.url, init: withCsrfHeader(context.init, await loadCsrfToken()) };
  },

  async post(context: ResponseContext) {
    if (context.response.status === 403 && isMutating(context.init)) {
      // Stale CSRF token: fetch a fresh one and repeat the request once. The retry uses the plain fetch
      // (context.fetch would run the middleware again and could loop); init already carries the credentials.
      resetCsrfToken();
      return fetch(context.url, withCsrfHeader(context.init, await loadCsrfToken()));
    }
    if (context.response.status === 401 && !context.url.endsWith(LOGIN_PATH)) {
      unauthorizedHandler?.();
    }
    return undefined;
  },
};

const configuration = new Configuration({ credentials: 'include', middleware: [middleware] });

const authApi = new AuthApi(configuration);
export const modelsApi = new ModelsApi(configuration);

export function getCurrentUser(): Promise<UserInfo> {
  return authApi.getCurrentUser();
}

export async function login(username: string, password: string): Promise<UserInfo> {
  resetCsrfToken();
  try {
    return await authApi.login({ loginRequest: { username, password } });
  } finally {
    resetCsrfToken(); // the server rotated the token on a successful login
  }
}

export async function logout(): Promise<void> {
  try {
    await authApi.logout();
  } finally {
    resetCsrfToken();
  }
}

/** True for a 401 answer, i.e. wrong credentials on login or a missing session elsewhere. */
export function isUnauthorized(error: unknown): boolean {
  return error instanceof ResponseError && error.response.status === 401;
}
