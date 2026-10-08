package de.haw.usenext.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;

/**
 * Runs against the real embedded Tomcat: MockMvc would not apply the cookie attributes configured through
 * server.servlet.session.cookie.*, because those are written by the servlet container.
 * Cookies are handled by hand so the raw Set-Cookie header can be asserted.
 */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = "usenext.auth.password-hash={noop}test-password")
class SessionCsrfIntegrationTest {

    private static final Pattern TOKEN = Pattern.compile("\"token\"\\s*:\\s*\"([^\"]+)\"");
    private static final Pattern SESSION = Pattern.compile("JSESSIONID=([^;]+)");

    @Value("${local.server.port}")
    int port;

    private final HttpClient http = HttpClient.newHttpClient();

    private HttpResponse<String> send(String method, String path, String cookie, String csrf, String body)
            throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/api" + path))
                .method(method, body == null
                        ? HttpRequest.BodyPublishers.noBody() : HttpRequest.BodyPublishers.ofString(body));
        if (body != null) {
            b.header("Content-Type", "application/json");
        }
        if (cookie != null) {
            b.header("Cookie", "JSESSIONID=" + cookie);
        }
        if (csrf != null) {
            b.header("X-CSRF-TOKEN", csrf);
        }
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static String setCookie(HttpResponse<?> r) {
        return r.headers().allValues("Set-Cookie").stream()
                .filter(c -> c.startsWith("JSESSIONID=")).findFirst().orElse(null);
    }

    private static String sessionId(String setCookie) {
        Matcher m = SESSION.matcher(setCookie);
        assertTrue(m.find());
        return m.group(1);
    }

    private static String token(HttpResponse<String> r) {
        Matcher m = TOKEN.matcher(r.body());
        assertTrue(m.find(), r.body());
        return m.group(1);
    }

    private static final String LOGIN_BODY = "{\"username\":\"lasse\",\"password\":\"test-password\"}";

    @Test
    void fullSessionLifecycle() throws Exception {
        // 1. anonymous: CSRF token endpoint creates a session; business endpoint is protected
        HttpResponse<String> csrfResponse = send("GET", "/auth/csrf", null, null, null);
        assertEquals(200, csrfResponse.statusCode());
        String preLoginCookie = setCookie(csrfResponse);
        String preLoginSession = sessionId(preLoginCookie);
        String csrf = token(csrfResponse);
        assertEquals(401, send("GET", "/models/health", preLoginSession, null, null).statusCode());

        // 2. POST without CSRF token -> 403, with wrong credentials -> 401
        assertEquals(403, send("POST", "/auth/login", preLoginSession, null, LOGIN_BODY).statusCode());
        assertEquals(401, send("POST", "/auth/login", preLoginSession, csrf,
                "{\"username\":\"lasse\",\"password\":\"wrong\"}").statusCode());

        // 3. login: cookie flags and session ID rotation
        HttpResponse<String> login = send("POST", "/auth/login", preLoginSession, csrf, LOGIN_BODY);
        assertEquals(200, login.statusCode());
        String loginCookie = setCookie(login);
        System.out.println("[CSRF] Set-Cookie on login: " + loginCookie);
        assertTrue(loginCookie.contains("HttpOnly"), loginCookie);
        assertTrue(loginCookie.contains("Secure"), loginCookie);
        assertTrue(loginCookie.contains("SameSite=Strict"), loginCookie);
        String postLoginSession = sessionId(loginCookie);
        assertNotEquals(preLoginSession, postLoginSession);

        // 4. the old session ID is dead, the new one reaches the business endpoint (use-core evaluates 1+4+9)
        assertEquals(401, send("GET", "/models/health", preLoginSession, null, null).statusCode());
        HttpResponse<String> health = send("GET", "/models/health", postLoginSession, null, null);
        assertEquals(200, health.statusCode());
        assertTrue(health.body().contains("14"), health.body());

        // 5. CSRF token was rotated with the login; fetch the current one for the session
        String csrfAfterLogin = token(send("GET", "/auth/csrf", postLoginSession, null, null));
        assertNotEquals(csrf, csrfAfterLogin);

        // 6. logout needs the token (403 without), then invalidates the server-side session
        assertEquals(403, send("POST", "/auth/logout", postLoginSession, null, null).statusCode());
        assertEquals(204, send("POST", "/auth/logout", postLoginSession, csrfAfterLogin, null).statusCode());
        assertEquals(401, send("GET", "/models/health", postLoginSession, null, null).statusCode());
    }

    /** Anonymous session plus its CSRF token, as the UI obtains them before the first login. */
    private String[] anonymousSession() throws Exception {
        HttpResponse<String> r = send("GET", "/auth/csrf", null, null, null);
        return new String[] {sessionId(setCookie(r)), token(r)};
    }

    @Test
    void currentUserNeedsSession() throws Exception {
        HttpResponse<String> anonymous = send("GET", "/auth/me", null, null, null);
        assertEquals(401, anonymous.statusCode());
        assertTrue(anonymous.body().contains("\"status\":401"), anonymous.body());

        String[] anon = anonymousSession();
        assertEquals(401, send("GET", "/auth/me", anon[0], null, null).statusCode());

        HttpResponse<String> login = send("POST", "/auth/login", anon[0], anon[1], LOGIN_BODY);
        assertEquals(200, login.statusCode());
        HttpResponse<String> me = send("GET", "/auth/me", sessionId(setCookie(login)), null, null);
        assertEquals(200, me.statusCode());
        assertEquals("{\"username\":\"lasse\"}", me.body());
    }

    @Test
    void loginFailureIsIdenticalForUnknownUserAndWrongPassword() throws Exception {
        String[] anon = anonymousSession();
        HttpResponse<String> unknownUser = send("POST", "/auth/login", anon[0], anon[1],
                "{\"username\":\"nobody\",\"password\":\"test-password\"}");
        HttpResponse<String> wrongPassword = send("POST", "/auth/login", anon[0], anon[1],
                "{\"username\":\"lasse\",\"password\":\"wrong\"}");
        assertEquals(401, unknownUser.statusCode());
        assertEquals(401, wrongPassword.statusCode());
        assertEquals(wrongPassword.body(), unknownUser.body());
        assertEquals("{\"status\":401,\"title\":\"Login failed\"}", unknownUser.body());
        // a failed login must not hand out a new session cookie
        assertEquals(null, setCookie(unknownUser));
    }

    @Test
    void invalidLoginBodyIsRejectedByValidation() throws Exception {
        String[] anon = anonymousSession();
        String longName = "a".repeat(65);
        String longPassword = "p".repeat(129);
        String[] bodies = {
            "{\"username\":\"\",\"password\":\"test-password\"}",
            "{\"username\":\"lasse\",\"password\":\"\"}",
            "{\"username\":\"" + longName + "\",\"password\":\"test-password\"}",
            "{\"username\":\"lasse\",\"password\":\"" + longPassword + "\"}",
        };
        for (String body : bodies) {
            HttpResponse<String> r = send("POST", "/auth/login", anon[0], anon[1], body);
            assertEquals(400, r.statusCode(), body);
            assertEquals("{\"status\":400,\"title\":\"Invalid request\"}", r.body());
        }
    }

    @Test
    void missingCsrfTokenReturnsProblem() throws Exception {
        String[] anon = anonymousSession();
        HttpResponse<String> r = send("POST", "/auth/login", anon[0], null, LOGIN_BODY);
        assertEquals(403, r.statusCode());
        assertEquals("{\"status\":403,\"title\":\"Forbidden\"}", r.body());
    }
}
