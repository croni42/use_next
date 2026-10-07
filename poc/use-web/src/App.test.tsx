import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import * as client from './api-client';

vi.mock('./api-client', () => ({
  getCurrentUser: vi.fn(),
  login: vi.fn(),
  logout: vi.fn(),
  setUnauthorizedHandler: vi.fn(),
  isUnauthorized: vi.fn(),
}));

const mocked = vi.mocked(client);

beforeEach(() => {
  vi.resetAllMocks();
  mocked.isUnauthorized.mockImplementation((error) => (error as { status?: number })?.status === 401);
});
afterEach(cleanup);

async function fillAndSubmit(user: ReturnType<typeof userEvent.setup>, password = 'secret') {
  await user.type(screen.getByLabelText('Username'), 'lasse');
  await user.type(screen.getByLabelText('Password'), password);
  await user.click(screen.getByRole('button', { name: 'Sign in' }));
}

describe('App', () => {
  it('shows the login page when there is no session', async () => {
    mocked.getCurrentUser.mockRejectedValue({ status: 401 });
    render(<App />);
    expect(await screen.findByLabelText('Username')).toBeTruthy();
    expect((screen.getByLabelText('Password') as HTMLInputElement).type).toBe('password');
  });

  it('shows the start page with the user when a session exists', async () => {
    mocked.getCurrentUser.mockResolvedValue({ username: 'lasse' });
    render(<App />);
    expect(await screen.findByText('lasse')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Log out' })).toBeTruthy();
  });

  it('shows one generic message on a failed login and clears the password', async () => {
    mocked.getCurrentUser.mockRejectedValue({ status: 401 });
    mocked.login.mockRejectedValue({ status: 401 });
    const user = userEvent.setup();
    render(<App />);
    await screen.findByLabelText('Username');
    await fillAndSubmit(user);
    expect((await screen.findByRole('alert')).textContent).toBe('Login failed');
    expect((screen.getByLabelText('Password') as HTMLInputElement).value).toBe('');
  });

  it('shows a different generic message when the request itself fails', async () => {
    mocked.getCurrentUser.mockRejectedValue({ status: 401 });
    mocked.login.mockRejectedValue(new TypeError('network down'));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByLabelText('Username');
    await fillAndSubmit(user);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toBe('Something went wrong. Please try again.');
    expect(alert.textContent).not.toContain('network down');
  });

  it('disables the submit button while the login request runs', async () => {
    mocked.getCurrentUser.mockRejectedValue({ status: 401 });
    let finish: (value: { username: string }) => void = () => {};
    mocked.login.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const user = userEvent.setup();
    render(<App />);
    await screen.findByLabelText('Username');
    await fillAndSubmit(user);
    expect((screen.getByRole('button') as HTMLButtonElement).disabled).toBe(true);
    finish({ username: 'lasse' });
    expect(await screen.findByText('lasse')).toBeTruthy();
  });

  it('returns to the login page after logout', async () => {
    mocked.getCurrentUser.mockResolvedValue({ username: 'lasse' });
    mocked.logout.mockResolvedValue(undefined);
    const user = userEvent.setup();
    render(<App />);
    await user.click(await screen.findByRole('button', { name: 'Log out' }));
    expect(await screen.findByLabelText('Username')).toBeTruthy();
    expect(mocked.logout).toHaveBeenCalledOnce();
  });

  it('returns to the login page when a later call reports 401', async () => {
    mocked.getCurrentUser.mockResolvedValue({ username: 'lasse' });
    render(<App />);
    await screen.findByText('lasse');
    const handler = mocked.setUnauthorizedHandler.mock.calls[0][0];
    expect(handler).toBeTypeOf('function');
    handler?.();
    expect(await screen.findByLabelText('Username')).toBeTruthy();
  });
});
