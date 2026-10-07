import { useState } from 'react';
import { authApi, modelsApi, resetCsrfToken } from './api-client';

export default function App() {
  const [output, setOutput] = useState('not logged in');

  async function run(action: () => Promise<unknown>) {
    try {
      setOutput(JSON.stringify(await action(), null, 2) ?? 'done');
    } catch (error) {
      setOutput(error instanceof Error ? error.message : String(error));
    }
  }

  return (
    <main>
      <h1>USE_NEXT PoC</h1>
      <button
        onClick={() =>
          run(async () => {
            resetCsrfToken();
            const user = await authApi.login({ loginRequest: { username: 'lasse', password: 'dev-password' } });
            resetCsrfToken();
            return user;
          })
        }
      >
        Login
      </button>
      <button onClick={() => run(() => modelsApi.getModelsHealth())}>Models health</button>
      <button
        onClick={() =>
          run(async () => {
            await authApi.logout();
            resetCsrfToken();
          })
        }
      >
        Logout
      </button>
      <pre>{output}</pre>
    </main>
  );
}
