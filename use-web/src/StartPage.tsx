import { useState } from 'react';

type Props = {
  username: string;
  onLogout: () => Promise<void>;
};

export default function StartPage({ username, onLogout }: Props) {
  const [pending, setPending] = useState(false);

  async function handleLogout() {
    setPending(true);
    await onLogout();
  }

  return (
    <main className="card">
      <h1>USE_NEXT</h1>
      <p>
        Signed in as <strong>{username}</strong>
      </p>
      <p>This is the start page of the USE_NEXT prototype. Model functions will follow here.</p>
      <button type="button" onClick={handleLogout} disabled={pending}>
        Log out
      </button>
    </main>
  );
}
