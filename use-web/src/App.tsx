import { useEffect, useState } from 'react';
import {
  getCurrentUser,
  login,
  logout,
  setUnauthorizedHandler,
} from './api-client';
import LoginPage from './LoginPage';
import StartPage from './StartPage';

// The session itself lives in the HttpOnly cookie; the UI only mirrors the user name for display.
type Session =
  | { status: 'loading' }
  | { status: 'anonymous' }
  | { status: 'authenticated'; username: string };

export default function App() {
  const [session, setSession] = useState<Session>({ status: 'loading' });

  useEffect(() => {
    // Any later 401 (e.g. session expired after 30 minutes of inactivity) returns to the login page.
    setUnauthorizedHandler(() => setSession({ status: 'anonymous' }));
    let active = true;
    getCurrentUser().then(
      (user) =>
        active &&
        setSession({ status: 'authenticated', username: user.username }),
      () => active && setSession({ status: 'anonymous' }),
    );
    return () => {
      active = false;
      setUnauthorizedHandler(null);
    };
  }, []);

  async function handleLogin(username: string, password: string) {
    const user = await login(username, password);
    setSession({ status: 'authenticated', username: user.username });
  }

  async function handleLogout() {
    try {
      await logout();
    } catch {
      // Whatever went wrong, the next /auth/me decides; show the login page.
    }
    setSession({ status: 'anonymous' });
  }

  switch (session.status) {
    case 'loading':
      return (
        <main className="card" aria-busy="true">
          Loading...
        </main>
      );
    case 'anonymous':
      return <LoginPage onLogin={handleLogin} />;
    case 'authenticated':
      return <StartPage username={session.username} onLogout={handleLogout} />;
  }
}
