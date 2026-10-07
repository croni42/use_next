package de.haw.usenext.poc.adapter;

import static org.junit.jupiter.api.Assertions.assertEquals;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.function.Supplier;
import org.junit.jupiter.api.Test;
import org.tzi.use.parser.ocl.OCLCompiler;
import org.tzi.use.parser.use.USECompiler;
import org.tzi.use.uml.mm.MModel;
import org.tzi.use.uml.mm.ModelFactory;
import org.tzi.use.uml.ocl.expr.Evaluator;
import org.tzi.use.uml.ocl.expr.Expression;
import org.tzi.use.uml.sys.MSystem;

/**
 * R-18b (b): is in-process use-core safe under parallel requests?
 * Both scenarios run the same operation (load model, evaluate one OCL expression) from N threads.
 */
class UseCoreConcurrencyTest {

    private static final int THREADS = 8;
    private static final int ITERATIONS = 100;
    private static final String MODEL = "model Test\nclass Person\nattributes\n  name : String\nend\n";
    private static final String OCL = "Person.allInstances()->size() + Set{1, 2, 3}->collect(i | i * i)->sum()";
    private static final String EXPECTED = "14";

    record Outcome(int failures, Map<String, Integer> distinctResults) { }

    @Test
    void separateObjectGraphPerThreadIsDeterministic() throws Exception {
        UseCoreAdapter adapter = new DefaultUseCoreAdapter();
        Outcome outcome = runParallel(() -> adapter.evaluate(MODEL, OCL));
        System.out.println("[R-18b] separate graph per call: " + outcome);
        assertEquals(0, outcome.failures());
        assertEquals(Map.of(EXPECTED, THREADS * ITERATIONS), outcome.distinctResults());
    }

    @Test
    void sharedObjectGraphAcrossThreads() throws Exception {
        StringWriter sink = new StringWriter();
        MModel model = USECompiler.compileSpecification(MODEL, "model.use", new PrintWriter(sink), new ModelFactory());
        MSystem shared = new MSystem(model);
        Outcome outcome = runParallel(() -> {
            // compile + evaluate against the one shared MSystem
            Expression expr = OCLCompiler.compileExpression(
                    model, shared.state(), OCL, "expr", new PrintWriter(new StringWriter()), shared.varBindings());
            return new Evaluator().eval(expr, shared.state()).toString();
        });
        // Documented, not asserted: the result informs the adapter recommendation in REPORT.md.
        System.out.println("[R-18b] shared graph (compile+eval): " + outcome);
    }

    private static Outcome runParallel(Supplier<String> operation) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(THREADS);
        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger failures = new AtomicInteger();
        Map<String, Integer> results = new ConcurrentHashMap<>();
        List<java.util.concurrent.Future<?>> futures = new ArrayList<>();
        for (int t = 0; t < THREADS; t++) {
            futures.add(pool.submit(() -> {
                start.await();
                for (int i = 0; i < ITERATIONS; i++) {
                    try {
                        results.merge(String.valueOf(operation.get()), 1, Integer::sum);
                    } catch (Throwable e) {
                        failures.incrementAndGet();
                        results.merge(e.getClass().getSimpleName(), 1, Integer::sum);
                    }
                }
                return null;
            }));
        }
        start.countDown();
        for (var f : futures) {
            f.get();
        }
        pool.shutdown();
        return new Outcome(failures.get(), Map.copyOf(results));
    }
}
