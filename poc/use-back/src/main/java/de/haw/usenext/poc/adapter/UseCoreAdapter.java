package de.haw.usenext.poc.adapter;

/**
 * Port to the use-core domain. Only this package may import org.tzi.use.* (BR-02).
 */
public interface UseCoreAdapter {

    /**
     * Compiles the given .use model, creates a fresh (empty) system state and evaluates the OCL expression.
     * Every call builds its own object graph, so no state is shared between calls.
     *
     * @return the OCL result in USE's string notation
     * @throws UseCoreException if the model or the expression does not compile
     */
    String evaluate(String modelSource, String oclExpression);
}
