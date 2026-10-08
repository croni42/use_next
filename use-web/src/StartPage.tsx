import { useState } from 'react';
import OclEvaluator from './OclEvaluator';

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
    <main className="card wide">
      <h1>USE_NEXT</h1>
      <p>
        Signed in as <strong>{username}</strong>
      </p>
      <p>Evaluate an OCL expression against the fixed example model (persons, a company and their employment).</p>
      <OclEvaluator />
      <button type="button" onClick={handleLogout} disabled={pending}>
        Log out
      </button>
    </main>
  );
}
