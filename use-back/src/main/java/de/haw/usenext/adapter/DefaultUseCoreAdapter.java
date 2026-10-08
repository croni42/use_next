package de.haw.usenext.adapter;

import java.io.IOException;
import java.io.PrintWriter;
import java.io.StringWriter;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.CancellationException;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;
import org.tzi.use.parser.ocl.OCLCompiler;
import org.tzi.use.parser.soil.SoilCompiler;
import org.tzi.use.parser.use.USECompiler;
import org.tzi.use.uml.mm.MModel;
import org.tzi.use.uml.mm.ModelFactory;
import org.tzi.use.uml.ocl.expr.EvalContext;
import org.tzi.use.uml.ocl.expr.Expression;
import org.tzi.use.uml.ocl.value.Value;
import org.tzi.use.uml.ocl.value.VarBindings;
import org.tzi.use.uml.sys.MSystem;
import org.tzi.use.uml.sys.MSystemException;
import org.tzi.use.uml.sys.MSystemState;
import org.tzi.use.uml.sys.soil.MStatement;

/**
 * Loads the fixed model and its initial object state from the classpath. The model is compiled once at startup
 * to fail fast; every call compiles it again into its own {@link MSystem}, because use-core objects are mutable
 * and not safe to share between threads (see UseCoreConcurrencyTest).
 */
@Component
public class DefaultUseCoreAdapter implements UseCoreAdapter {

    static final String MODEL_RESOURCE = "models/company.use";
    static final String STATE_RESOURCE = "models/company.soil";
    static final int MAX_RANGE_SIZE = 10_000;

    private static final Pattern STRING_LITERAL = Pattern.compile("'(?:[^'\\\\]|\\\\.)*'");
    private static final Pattern RANGE_OPERATOR = Pattern.compile("\\.\\.");
    private static final Pattern LITERAL_RANGE =
            Pattern.compile("(?<![\\w.])(\\d{1,18})\\s*\\.\\.\\s*(\\d{1,18})(?![\\w.])");

    private final String modelSource;
    private final String stateScript;

    public DefaultUseCoreAdapter() {
        this.modelSource = readResource(MODEL_RESOURCE);
        this.stateScript = readResource(STATE_RESOURCE);
        newSystem(); // fail fast if the model or the initial state do not compile
    }

    @Override
    public String evaluate(String oclExpression) {
        MSystem system = newSystem();
        StringWriter errors = new StringWriter();
        PrintWriter err = new PrintWriter(errors);
        try {
            rejectUnsafeRanges(oclExpression);
            Expression expr = OCLCompiler.compileExpression(
                    system.model(), system.state(), oclExpression, "expression", err, system.varBindings());
            err.flush();
            if (expr == null) {
                throw new OclExpressionException(errors.toString());
            }
            
            return expr.eval(new CancellableEvalContext(system.state(), system.varBindings())).toString();
        } catch (OclExpressionException e) {
            throw e;
        } catch (StackOverflowError e) {
            throw new OclExpressionException("The expression is nested too deeply.");
        } catch (OutOfMemoryError e) {
            throw new OclExpressionException("The evaluation needs too much memory.");
        } catch (RuntimeException e) {
            throw new OclExpressionException("The expression could not be evaluated.");
        }
    }

    /**
     * Ranges such as {@code Sequence{1..N}} are materialised element by element and cannot be cancelled while they
     * are built, so a huge one would tie up memory and CPU. Ranges are therefore only accepted with integer literal
     * bounds and a limited size. Memory-hungry expressions that do not use ranges are not covered.
     */
    static void rejectUnsafeRanges(String expression) {
        String code = STRING_LITERAL.matcher(expression).replaceAll("''");
        Matcher all = RANGE_OPERATOR.matcher(code);
        int operators = 0;
        while (all.find()) {
            operators++;
        }
        Matcher literal = LITERAL_RANGE.matcher(code);
        int accepted = 0;
        while (literal.find()) {
            accepted++;
            long size = Long.parseLong(literal.group(2)) - Long.parseLong(literal.group(1));
            if (size >= MAX_RANGE_SIZE) {
                throw new OclExpressionException("Ranges with more than " + MAX_RANGE_SIZE + " elements are not allowed.");
            }
        }
        if (accepted != operators) {
            throw new OclExpressionException("Ranges must have integer literals as bounds, for example 1..100.");
        }
    }

    /**
     * use-core has no cancellation support and its evaluator never looks at the interrupt flag. Every iteration step
     * of a collection operation binds its loop variable through the evaluation context, so checking the flag there
     * lets a cancelled evaluation stop at the next step. Evaluations that run long without iterating (e.g. building
     * a huge range) are not covered.
     */
    private static final class CancellableEvalContext extends EvalContext {

        CancellableEvalContext(MSystemState state, VarBindings bindings) {
            super(state, state, bindings, null, "");
        }

        @Override
        public void pushVarBinding(String name, Value value) {
            if (Thread.currentThread().isInterrupted()) {
                throw new CancellationException("Evaluation cancelled");
            }
            super.pushVarBinding(name, value);
        }
    }

    private MSystem newSystem() {
        StringWriter errors = new StringWriter();
        PrintWriter err = new PrintWriter(errors);
        MModel model = USECompiler.compileSpecification(modelSource, MODEL_RESOURCE, err, new ModelFactory());
        if (model == null) {
            throw new IllegalStateException("Fixed model does not compile: " + errors);
        }
        MSystem system = new MSystem(model);
        // one statement per line, compiled and executed in turn: later lines refer to objects created by earlier ones
        for (String line : stateScript.split("\\R")) {
            if (line.isBlank()) {
                continue;
            }
            MStatement statement = SoilCompiler.compileStatement(
                    model, system.state(), system.getVariableEnvironment(), line, STATE_RESOURCE, err, false);
            if (statement == null) {
                throw new IllegalStateException("Fixed initial state does not compile: " + errors);
            }
            try {
                if (!system.execute(statement, false).wasSuccessfull()) {
                    throw new IllegalStateException("Fixed initial state could not be created: " + line);
                }
            } catch (MSystemException e) {
                throw new IllegalStateException("Fixed initial state could not be created: " + line, e);
            }
        }
        return system;
    }

    private static String readResource(String path) {
        try (var in = new ClassPathResource(path).getInputStream()) {
            return new String(in.readAllBytes(), StandardCharsets.UTF_8);
        } catch (IOException e) {
            throw new IllegalStateException("Cannot read " + path, e);
        }
    }
}
