package de.haw.usenext.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;

import de.haw.usenext.adapter.OclExpressionException;
import de.haw.usenext.adapter.UseCoreAdapter;
import java.time.Duration;
import java.util.concurrent.CountDownLatch;
import org.junit.jupiter.api.Test;

class OclEvaluationServiceTest {

    @Test
    void truncatesLongResults() {
        var service = new OclEvaluationService(expr -> "x".repeat(50_000), Duration.ofSeconds(1), 1, 1);
        String result = service.evaluate("1");
        assertEquals(OclEvaluationService.MAX_RESULT_LENGTH, result.length());
        assertTrue(result.endsWith(OclEvaluationService.TRUNCATION_MARKER));
    }

    @Test
    void enforcesTheLengthLimitIndependentlyOfTheWebLayer() {
        var service = new OclEvaluationService(expr -> "ok", Duration.ofSeconds(1), 1, 1);
        assertThrows(OclEvaluationException.class, () -> service.evaluate(""));
        assertThrows(OclEvaluationException.class, () -> service.evaluate(null));
        assertThrows(OclEvaluationException.class,
                () -> service.evaluate("1".repeat(OclEvaluationService.MAX_EXPRESSION_LENGTH + 1)));
        assertEquals("ok", service.evaluate("1".repeat(OclEvaluationService.MAX_EXPRESSION_LENGTH)));
    }

    @Test
    void sanitisesAdapterMessages() {
        UseCoreAdapter adapter = expr -> {
            throw new OclExpressionException("java.lang.IllegalStateException at org.tzi.use.Foo.bar(Foo.java:1)");
        };
        var service = new OclEvaluationService(adapter, Duration.ofSeconds(1), 1, 1);
        var e = assertThrows(OclEvaluationException.class, () -> service.evaluate("1"));
        assertEquals("The expression is not valid.", e.getMessage());
    }

    @Test
    void unexpectedAdapterFailureCarriesNoDetail() {
        UseCoreAdapter adapter = expr -> {
            throw new IllegalStateException("secret internal detail");
        };
        var service = new OclEvaluationService(adapter, Duration.ofSeconds(1), 1, 1);
        var e = assertThrows(IllegalStateException.class, () -> service.evaluate("1"));
        assertTrue(!e.getMessage().contains("secret"));
    }

    @Test
    void rejectsImmediatelyWhenAllSlotsAreBusy() throws Exception {
        CountDownLatch release = new CountDownLatch(1);
        CountDownLatch started = new CountDownLatch(1);
        UseCoreAdapter blocking = expr -> {
            started.countDown();
            try {
                release.await();
            } catch (InterruptedException ignored) {
                Thread.currentThread().interrupt();
            }
            return "done";
        };
        // one thread, one queue place: the first call runs, the second waits, the third is rejected at once
        var service = new OclEvaluationService(blocking, Duration.ofMillis(300), 1, 1);
        Thread first = new Thread(() -> catchUnavailable(service));
        first.start();
        started.await();
        Thread second = new Thread(() -> catchUnavailable(service));
        second.start();
        Thread.sleep(100);
        long begin = System.nanoTime();
        var e = assertThrows(OclEvaluationUnavailableException.class, () -> service.evaluate("1"));
        assertTrue((System.nanoTime() - begin) / 1_000_000 < 200);
        assertEquals("All evaluation slots are in use.", e.getMessage());
        release.countDown();
        first.join();
        second.join();
    }

    private static void catchUnavailable(OclEvaluationService service) {
        try {
            service.evaluate("1");
        } catch (OclEvaluationUnavailableException expected) {
            // timed out while the blocker holds the slot
        }
    }
}
