package de.haw.usenext.service;

/** The evaluation hit the time limit, or all evaluation slots are in use. */
public class OclEvaluationUnavailableException extends RuntimeException {

    public OclEvaluationUnavailableException(String message) {
        super(message);
    }
}
