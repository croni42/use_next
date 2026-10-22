package de.haw.usenext.adapter;

/**
 * Port to the use-core domain. Only this package may import org.tzi.use.* (BR-02).
 */
public interface UseCoreAdapter {

    /**
     * Evaluates the OCL expression against the fixed model and its fixed initial object state. Every call builds
     * its own object graph, so no mutable state is shared between calls.
     *
     * @return the OCL result in USE's string notation
     * @throws OclExpressionException if the expression does not compile or its evaluation fails
     */
    String evaluate(String oclExpression);
}
