import { useState } from 'react';
import type { FormEvent } from 'react';
import { isUnauthorized } from './api-client';

type Props = {
  onLogin: (username: string, password: string) => Promise<void>;
};

const MESSAGE_FAILED = 'Login failed';
const MESSAGE_ERROR = 'Something went wrong. Please try again.';

// Limits mirror openapi.yaml (LoginRequest); the backend enforces them, this only helps the user.
const MAX_USERNAME = 64;
const MAX_PASSWORD = 128;

export default function LoginPage({ onLogin }: Props) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setError('');
    try {
      await onLogin(username, password);
    } catch (e) {
      setPassword('');
      setError(isUnauthorized(e) ? MESSAGE_FAILED : MESSAGE_ERROR);
      setPending(false);
    }
    // on success the parent replaces this page, so there is nothing left to update
  }

  return (
    <main className="card">
      <h1>USE_NEXT</h1>
      <form onSubmit={handleSubmit}>
        <label htmlFor="username">Username</label>
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          required
          maxLength={MAX_USERNAME}
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <label htmlFor="password">Password</label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          maxLength={MAX_PASSWORD}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <div role="alert" aria-live="assertive" className="error">
          {error}
        </div>
        <button type="submit" disabled={pending}>
          {pending ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
