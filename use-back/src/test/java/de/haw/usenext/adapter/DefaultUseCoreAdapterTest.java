package de.haw.usenext.adapter;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import org.junit.jupiter.api.Test;

class DefaultUseCoreAdapterTest {

    private final DefaultUseCoreAdapter adapter = new DefaultUseCoreAdapter();

    @Test
    void evaluatesPureExpression() {
        assertEquals("14", adapter.evaluate("Set{1,2,3}->collect(i | i * i)->sum()"));
    }

    @Test
    void fixedInitialStateIsVisible() {
        assertEquals("3", adapter.evaluate("Person.allInstances()->size()"));
        assertEquals("Set{'Alice','Bob','Carol'}",
                adapter.evaluate("Person.allInstances()->collect(p | p.name)->asSet()"));
        assertEquals("Set{'Alice','Bob'}",
                adapter.evaluate("Person.allInstances()->select(p | p.salary > 5000)->collect(p | p.name)->asSet()"));
        assertEquals("3", adapter.evaluate("Company.allInstances()->any(true).employees->size()"));
    }

    @Test
    void syntaxErrorIsReportedAsExpressionError() {
        var e = assertThrows(OclExpressionException.class, () -> adapter.evaluate("Set{1,2"));
        assertFalse(e.getMessage().isBlank());
    }

    @Test
    void typeErrorIsReportedAsExpressionError() {
        assertThrows(OclExpressionException.class, () -> adapter.evaluate("1 + 'a'"));
        assertThrows(OclExpressionException.class, () -> adapter.evaluate("Person.allInstances()->collect(p | p.nope)"));
    }

    @Test
    void rangesNeedSmallLiteralBounds() {
        assertEquals("5050", adapter.evaluate("Sequence{1..100}->sum()"));
        assertEquals("1", adapter.evaluate("Sequence{'a..b'}->size()"));
        for (String expr : new String[] {
            "Sequence{1..2000000000}->size()",
            "Sequence{1..10001}->size()",
            "Sequence{1..(1000*1000*1000)}->size()",
            "Sequence{1..Person.allInstances()->size()}->size()",
        }) {
            assertThrows(OclExpressionException.class, () -> adapter.evaluate(expr), expr);
        }
    }

    @Test
    void cancellationStopsAnIteratingEvaluation() throws Exception {
        // use-core never checks the interrupt flag itself; the adapter does it on every iteration step
        String expr = "Sequence{1..5000}->forAll(a | Sequence{1..5000}->forAll(b | Sequence{1..5000}->forAll(c | a + b + c > 0)))";
        Thread worker = new Thread(() -> {
            try {
                adapter.evaluate(expr);
            } catch (OclExpressionException expected) {
                // the cancelled evaluation ends with an error nobody waits for
            }
        });
        worker.setDaemon(true);
        worker.start();
        Thread.sleep(300);
        assertTrue(worker.isAlive(), "the expression should still be running");
        worker.interrupt();
        worker.join(3000);
        assertFalse(worker.isAlive(), "the interrupted evaluation should have stopped");
    }
}
