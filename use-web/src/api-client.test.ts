import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { login, setUnauthorizedHandler } from './api-client';

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
const csrf = (token: string) => json(200, { headerName: 'X-CSRF-TOKEN', token });

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  vi.unstubAllGlobals();
  setUnauthorizedHandler(null);
});

describe('api-client', () => {
  it('sends credentials and the CSRF header on login', async () => {
    fetchMock
      .mockResolvedValueOnce(csrf('t1'))
      .mockResolvedValueOnce(json(200, { username: 'lasse' }));
    await expect(login('lasse', 'pw')).resolves.toEqual({ username: 'lasse' });
    const [url, init] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect(url).toBe('/api/auth/login');
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>)['X-CSRF-TOKEN']).toBe('t1');
    expect(url).not.toContain('pw');
  });

  it('refreshes the CSRF token once after a 403 and repeats the request', async () => {
    fetchMock
      .mockResolvedValueOnce(csrf('stale'))
      .mockResolvedValueOnce(json(403, { status: 403, title: 'Forbidden' }))
      .mockResolvedValueOnce(csrf('fresh'))
      .mockResolvedValueOnce(json(200, { username: 'lasse' }));
    await expect(login('lasse', 'pw')).resolves.toEqual({ username: 'lasse' });
    expect(fetchMock).toHaveBeenCalledTimes(4);
    const retry = fetchMock.mock.calls[3] as [string, RequestInit];
    expect((retry[1].headers as Record<string, string>)['X-CSRF-TOKEN']).toBe('fresh');
  });

  it('gives up after one retry when the 403 persists', async () => {
    fetchMock
      .mockResolvedValueOnce(csrf('a'))
      .mockResolvedValueOnce(json(403, {}))
      .mockResolvedValueOnce(csrf('b'))
      .mockResolvedValueOnce(json(403, {}));
    await expect(login('lasse', 'pw')).rejects.toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('does not treat a failed login as an expired session', async () => {
    const handler = vi.fn();
    setUnauthorizedHandler(handler);
    fetchMock.mockResolvedValueOnce(csrf('t')).mockResolvedValueOnce(json(401, { status: 401, title: 'Login failed' }));
    await expect(login('lasse', 'bad')).rejects.toBeDefined();
    expect(handler).not.toHaveBeenCalled();
  });
});
