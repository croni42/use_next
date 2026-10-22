package de.haw.usenext.adapter;

/** The expression does not compile or its evaluation failed; the message is meant for the user of the API. */
public class OclExpressionException extends RuntimeException {

    public OclExpressionException(String message) {
        super(message);
    }
}
