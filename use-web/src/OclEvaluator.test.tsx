import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';

// The real api-client runs here; only fetch is replaced, so the generated client, the CSRF handling and the
// central 401 hook are part of the test.

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });

type Route = (url: string, init: RequestInit) => Response | Promise<Response> | undefined;

let evaluateResponse: () => Response | Promise<Response>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  evaluateResponse = () => json(200, { result: '14' });
  const route: Route = (url) => {
    if (url.endsWith('/auth/me')) return json(200, { username: 'lasse' });
    if (url.endsWith('/auth/csrf')) return json(200, { headerName: 'X-CSRF-TOKEN', token: 't' });
    if (url.endsWith('/ocl/evaluate')) return evaluateResponse();
    return undefined;
  };
  fetchMock = vi.fn(async (url: string, init: RequestInit) => route(url, init) ?? json(404, {}));
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

async function submit(user: ReturnType<typeof userEvent.setup>, expression: string) {
  render(<App />);
  const input = await screen.findByLabelText('OCL expression');
  await user.click(input);
  await user.paste(expression);
  await user.click(screen.getByRole('button', { name: 'Evaluate' }));
}

describe('OclEvaluator', () => {
  it('sends the expression through the generated client and shows the result', async () => {
    const user = userEvent.setup();
    await submit(user, 'Set{1,2,3}->collect(i | i * i)->sum()');
    expect((await screen.findByText('14')).tagName).toBe('PRE');
    const call = fetchMock.mock.calls.find(([url]) => (url as string).endsWith('/ocl/evaluate'))!;
    const init = call[1] as RequestInit;
    expect(init.method).toBe('POST');
    expect(init.credentials).toBe('include');
    expect((init.headers as Record<string, string>)['X-CSRF-TOKEN']).toBe('t');
    expect(JSON.parse(init.body as string)).toEqual({ expression: 'Set{1,2,3}->collect(i | i * i)->sum()' });
  });

  it('limits the input length like the API spec', async () => {
    render(<App />);
    expect(((await screen.findByLabelText('OCL expression')) as HTMLTextAreaElement).maxLength).toBe(1000);
  });

  it('renders a hostile server message as plain text', async () => {
    evaluateResponse = () =>
      json(422, { status: 422, title: 'Expression rejected', detail: '<img src=x onerror=alert(1)>' });
    const user = userEvent.setup();
    await submit(user, '1 +');
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('<img src=x onerror=alert(1)>');
    expect(document.querySelector('img')).toBeNull();
  });

  it('renders a hostile result as plain text', async () => {
    evaluateResponse = () => json(200, { result: "'<script>alert(1)</script>'" });
    const user = userEvent.setup();
    await submit(user, "'x'");
    expect((await screen.findByText("'<script>alert(1)</script>'")).tagName).toBe('PRE');
    expect(document.querySelector('script')).toBeNull();
  });

  it('shows a generic message for a 422 without detail', async () => {
    evaluateResponse = () => json(422, { status: 422, title: 'Expression rejected' });
    const user = userEvent.setup();
    await submit(user, '1 +');
    expect((await screen.findByRole('alert')).textContent).toBe('The expression is not valid.');
  });

  it('shows a specific message for a timeout', async () => {
    evaluateResponse = () => json(503, { status: 503, title: 'Evaluation unavailable', detail: 'internal wording' });
    const user = userEvent.setup();
    await submit(user, '1');
    const text = (await screen.findByRole('alert')).textContent;
    expect(text).toContain('took too long');
    expect(text).not.toContain('internal wording');
  });

  it('shows a generic message when the request itself fails', async () => {
    evaluateResponse = () => {
      throw new TypeError('network down');
    };
    const user = userEvent.setup();
    await submit(user, '1');
    const text = (await screen.findByRole('alert')).textContent;
    expect(text).toBe('Something went wrong. Please try again.');
  });

  it('disables the button while the evaluation runs', async () => {
    let finish: (response: Response) => void = () => {};
    evaluateResponse = () => new Promise<Response>((resolve) => (finish = resolve));
    const user = userEvent.setup();
    await submit(user, '1');
    const button = await screen.findByRole('button', { name: 'Evaluating...' });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    finish(json(200, { result: '1' }));
    await waitFor(() => expect((screen.getByRole('button', { name: 'Evaluate' }) as HTMLButtonElement).disabled).toBe(false));
    expect(document.querySelector('pre')?.textContent).toBe('1');
  });

  it('returns to the login page when the session is gone', async () => {
    evaluateResponse = () => json(401, { status: 401, title: 'Not authenticated' });
    const user = userEvent.setup();
    await submit(user, '1');
    expect(await screen.findByLabelText('Username')).toBeTruthy();
  });

  it('retries once with a fresh CSRF token after a 403', async () => {
    let calls = 0;
    evaluateResponse = () => (++calls === 1 ? json(403, { status: 403, title: 'Forbidden' }) : json(200, { result: '2' }));
    const user = userEvent.setup();
    await submit(user, '1 + 1');
    expect(await screen.findByText('2')).toBeTruthy();
    expect(calls).toBe(2);
  });
});
