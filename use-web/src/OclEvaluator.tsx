import { useState } from 'react';
import type { FormEvent } from 'react';
import { errorStatus, evaluateOcl, problemDetail } from './api-client';

// Mirrors maxLength of OclEvaluationRequest in openapi.yaml; the backend enforces it, this only helps the user.
const MAX_EXPRESSION = 1000;

const MESSAGE_INVALID = 'The request was invalid. Check the length of the expression.';
const MESSAGE_REJECTED = 'The expression is not valid.';
const MESSAGE_UNAVAILABLE = 'The evaluation took too long or the server is busy. Try a simpler expression or try again later.';
const MESSAGE_ERROR = 'Something went wrong. Please try again.';

type Outcome = { kind: 'none' } | { kind: 'result'; text: string } | { kind: 'error'; text: string };

async function describeFailure(error: unknown): Promise<string> {
  switch (errorStatus(error)) {
    case 400:
      return MESSAGE_INVALID;
    case 422:
      return (await problemDetail(error)) ?? MESSAGE_REJECTED;
    case 503:
      return MESSAGE_UNAVAILABLE;
    default:
      return MESSAGE_ERROR;
  }
}

export default function OclEvaluator() {
  const [expression, setExpression] = useState('');
  const [pending, setPending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>({ kind: 'none' });

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setOutcome({ kind: 'none' });
    try {
      setOutcome({ kind: 'result', text: await evaluateOcl(expression) });
    } catch (e) {
      // A 401 is handled centrally (back to the login page); there is nothing to show here.
      setOutcome(errorStatus(e) === 401 ? { kind: 'none' } : { kind: 'error', text: await describeFailure(e) });
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <label htmlFor="expression">OCL expression</label>
      <textarea
        id="expression"
        name="expression"
        rows={4}
        required
        maxLength={MAX_EXPRESSION}
        spellCheck={false}
        value={expression}
        onChange={(e) => setExpression(e.target.value)}
      />
      <button type="submit" disabled={pending}>
        {pending ? 'Evaluating...' : 'Evaluate'}
      </button>
      {/* React escapes all text below; server messages and results are never interpreted as markup. */}
      <div aria-live="polite" className="outcome">
        {outcome.kind === 'result' && (
          <>
            <h2>Result</h2>
            <pre>{outcome.text}</pre>
          </>
        )}
        {outcome.kind === 'error' && (
          <p role="alert" className="error">
            {outcome.text}
          </p>
        )}
      </div>
    </form>
  );
}
