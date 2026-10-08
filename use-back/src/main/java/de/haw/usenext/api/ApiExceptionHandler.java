package de.haw.usenext.api;

import de.haw.usenext.api.model.Problem;
import de.haw.usenext.service.OclEvaluationException;
import de.haw.usenext.service.OclEvaluationUnavailableException;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.ErrorResponse;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

/**
 * Maps failures to the minimal {@code Problem} schema of the spec (BR-12). Messages are constants: neither the
 * submitted values nor the exception text are echoed, and a failed login never says why it failed. The one
 * exception is the OCL evaluation, whose message is sanitised and length-capped by the service.
 */
@RestControllerAdvice
class ApiExceptionHandler {

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<Problem> loginFailed() {
        return problem(HttpStatus.UNAUTHORIZED, "Login failed");
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HandlerMethodValidationException.class,
            HttpMessageNotReadableException.class})
    ResponseEntity<Problem> invalidRequest() {
        return problem(HttpStatus.BAD_REQUEST, "Invalid request");
    }

    @ExceptionHandler(OclEvaluationException.class)
    ResponseEntity<Problem> expressionRejected(OclEvaluationException e) {
        return ResponseEntity.unprocessableEntity()
                .body(new Problem(HttpStatus.UNPROCESSABLE_ENTITY.value(), "Expression rejected").detail(e.getMessage()));
    }

    @ExceptionHandler(OclEvaluationUnavailableException.class)
    ResponseEntity<Problem> evaluationUnavailable(OclEvaluationUnavailableException e) {
        return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .header(HttpHeaders.RETRY_AFTER, "5")
                .body(new Problem(HttpStatus.SERVICE_UNAVAILABLE.value(), "Evaluation unavailable").detail(e.getMessage()));
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<Problem> unexpected(Exception e) {
        // Spring's own request errors (405, 415, ...) keep their status, but never their message
        if (e instanceof ErrorResponse errorResponse) {
            HttpStatus status = HttpStatus.resolve(errorResponse.getStatusCode().value());
            if (status != null) {
                return problem(status, status.getReasonPhrase());
            }
        }
        return problem(HttpStatus.INTERNAL_SERVER_ERROR, "Internal error");
    }

    private static ResponseEntity<Problem> problem(HttpStatus status, String title) {
        return ResponseEntity.status(status).body(new Problem(status.value(), title));
    }
}
