package de.haw.usenext.service;

import de.haw.usenext.adapter.OclExpressionException;
import de.haw.usenext.adapter.UseCoreAdapter;
import jakarta.annotation.PreDestroy;
import java.time.Duration;
import java.util.concurrent.ArrayBlockingQueue;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.Future;
import java.util.concurrent.RejectedExecutionException;
import java.util.concurrent.ThreadPoolExecutor;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

/**
 * Runs evaluations in a small bounded pool with a hard time limit per request, so that one request cannot occupy
 * the server. use-core does not check for interruption, so a timed-out evaluation may keep running on its worker
 * thread; the pool size bounds how many of those can exist.
 */
@Service
public class OclEvaluationService {

    // EVAL-SEED E07
    public static final int MAX_EXPRESSION_LENGTH = 1_000_000;
    public static final int MAX_RESULT_LENGTH = 10_000;
    static final String TRUNCATION_MARKER = "…[truncated]";

    private static final String COMPILE_FALLBACK = "The expression is not valid.";

    private final UseCoreAdapter useCore;
    private final Duration timeout;
    private final ThreadPoolExecutor executor;

    public OclEvaluationService(
            UseCoreAdapter useCore,
            @Value("${usenext.ocl.timeout:3s}") Duration timeout,
            @Value("${usenext.ocl.threads:2}") int threads,
            @Value("${usenext.ocl.queue:4}") int queueCapacity) {
        this.useCore = useCore;
        this.timeout = timeout;
        this.executor = new ThreadPoolExecutor(threads, threads, 0L, TimeUnit.MILLISECONDS,
                new ArrayBlockingQueue<>(queueCapacity), runnable -> {
                    Thread thread = new Thread(runnable, "ocl-evaluation");
                    thread.setDaemon(true);
                    return thread;
                });
    }

    public String evaluate(String expression) {
        // defence in depth: the same limits as in the API spec, enforced independently of the web layer
        if (expression == null || expression.isEmpty() || expression.length() > MAX_EXPRESSION_LENGTH) {
            throw new OclEvaluationException("The expression must have 1 to " + MAX_EXPRESSION_LENGTH + " characters.");
        }
        Future<String> future;
        try {
            future = executor.submit(() -> useCore.evaluate(expression));
        } catch (RejectedExecutionException e) {
            throw new OclEvaluationUnavailableException("All evaluation slots are in use.");
        }
        try {
            return truncate(future.get(timeout.toMillis(), TimeUnit.MILLISECONDS));
        } catch (TimeoutException e) {
            future.cancel(true);
            throw new OclEvaluationUnavailableException("The evaluation exceeded the time limit.");
        } catch (InterruptedException e) {
            future.cancel(true);
            Thread.currentThread().interrupt();
            throw new OclEvaluationUnavailableException("The evaluation was interrupted.");
        } catch (ExecutionException e) {
            if (e.getCause() instanceof OclExpressionException cause) {
                throw new OclEvaluationException(MessageSanitizer.sanitize(cause.getMessage(), COMPILE_FALLBACK));
            }
            throw new IllegalStateException("Evaluation failed unexpectedly");
        }
    }

    private static String truncate(String result) {
        if (result.length() <= MAX_RESULT_LENGTH) {
            return result;
        }
        return result.substring(0, MAX_RESULT_LENGTH - TRUNCATION_MARKER.length()) + TRUNCATION_MARKER;
    }

    @PreDestroy
    void shutdown() {
        executor.shutdownNow();
    }
}
