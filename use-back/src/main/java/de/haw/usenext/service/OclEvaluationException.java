package de.haw.usenext.service;

/** The expression is not valid or could not be evaluated; {@code getMessage()} is sanitised and safe to return. */
public class OclEvaluationException extends RuntimeException {

    public OclEvaluationException(String sanitisedMessage) {
        super(sanitisedMessage);
    }
}
