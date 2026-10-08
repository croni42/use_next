package de.haw.usenext.adapter;

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
 * Is in-process use-core safe under parallel requests? Both scenarios run the same operation from N threads:
 * the adapter builds a separate object graph per call (asserted); sharing one graph is only documented.
 */
class UseCoreConcurrencyTest {

    private static final int THREADS = 8;
    private static final int ITERATIONS = 100;
    private static final String MODEL = "model Test\nclass Person\nattributes\n  name : String\nend\n";
    private static final String OCL = "Person.allInstances()->size() + Set{1, 2, 3}->collect(i | i * i)->sum()";
    // against the fixed model of the adapter: three persons plus 1 + 4 + 9
    private static final String ADAPTER_OCL = OCL;
    private static final String ADAPTER_EXPECTED = "17";

    record Outcome(int failures, Map<String, Integer> distinctResults) { }

    @Test
    void separateObjectGraphPerThreadIsDeterministic() throws Exception {
        UseCoreAdapter adapter = new DefaultUseCoreAdapter();
        Outcome outcome = runParallel(() -> adapter.evaluate(ADAPTER_OCL));
        assertEquals(0, outcome.failures());
        assertEquals(Map.of(ADAPTER_EXPECTED, THREADS * ITERATIONS), outcome.distinctResults());
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
        // Documented, not asserted: shows why the adapter builds a separate object graph per call.
        System.out.println("shared graph (compile+eval): " + outcome);
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
