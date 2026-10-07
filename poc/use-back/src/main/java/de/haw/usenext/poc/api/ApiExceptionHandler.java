package de.haw.usenext.poc.api;

import de.haw.usenext.poc.api.model.Problem;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.method.annotation.HandlerMethodValidationException;

/**
 * Maps failures to the minimal {@code Problem} schema of the spec (BR-12). Messages are constants: neither the
 * submitted values nor the exception text are echoed, and a failed login never says why it failed.
 */
@RestControllerAdvice
class ApiExceptionHandler {

    @ExceptionHandler(AuthenticationException.class)
    ResponseEntity<Problem> loginFailed() {
        return problem(HttpStatus.UNAUTHORIZED, "Login failed");
    }

    @ExceptionHandler({MethodArgumentNotValidException.class, HandlerMethodValidationException.class})
    ResponseEntity<Problem> invalidRequest() {
        return problem(HttpStatus.BAD_REQUEST, "Invalid request");
    }

    private static ResponseEntity<Problem> problem(HttpStatus status, String title) {
        return ResponseEntity.status(status).body(new Problem(status.value(), title));
    }
}
