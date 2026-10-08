package de.haw.usenext.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;

/** POST /ocl/evaluate against the real embedded Tomcat, with the real session and CSRF handling. */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {"usenext.auth.password-hash={noop}test-password", "usenext.ocl.timeout=1s"})
class OclEndpointIntegrationTest {

    private static final Pattern TOKEN = Pattern.compile("\"token\"\\s*:\\s*\"([^\"]+)\"");
    private static final Pattern SESSION = Pattern.compile("JSESSIONID=([^;]+)");
    private static final Pattern INTERNALS = Pattern.compile("org\\.tzi|java\\.|\\bat [\\w$.]+\\(|Exception|\\.java");

    @Value("${local.server.port}")
    int port;

    private final HttpClient http = HttpClient.newHttpClient();
    private String session;
    private String csrf;

    private HttpResponse<String> send(String method, String path, String cookie, String csrfToken, String body)
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
        if (csrfToken != null) {
            b.header("X-CSRF-TOKEN", csrfToken);
        }
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static String sessionOf(HttpResponse<?> r) {
        String cookie = r.headers().allValues("Set-Cookie").stream()
                .filter(c -> c.startsWith("JSESSIONID=")).findFirst().orElseThrow();
        Matcher m = SESSION.matcher(cookie);
        assertTrue(m.find());
        return m.group(1);
    }

    private static String tokenOf(HttpResponse<String> r) {
        Matcher m = TOKEN.matcher(r.body());
        assertTrue(m.find(), r.body());
        return m.group(1);
    }

    @BeforeEach
    void login() throws Exception {
        HttpResponse<String> anon = send("GET", "/auth/csrf", null, null, null);
        String preSession = sessionOf(anon);
        HttpResponse<String> login = send("POST", "/auth/login", preSession, tokenOf(anon),
                "{\"username\":\"lasse\",\"password\":\"test-password\"}");
        assertEquals(200, login.statusCode());
        session = sessionOf(login);
        csrf = tokenOf(send("GET", "/auth/csrf", session, null, null));
    }

    private HttpResponse<String> evaluate(String expression) throws Exception {
        return send("POST", "/ocl/evaluate", session, csrf, "{\"expression\":" + json(expression) + "}");
    }

    private static String json(String text) {
        return "\"" + text.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n") + "\"";
    }

    private static void assertNoInternals(HttpResponse<String> r) {
        assertFalse(INTERNALS.matcher(r.body()).find(), r.body());
    }

    @Test
    void evaluatesExpression() throws Exception {
        HttpResponse<String> r = evaluate("Set{1,2,3}->collect(i | i * i)->sum()");
        assertEquals(200, r.statusCode());
        assertEquals("{\"result\":\"14\"}", r.body());
    }

    @Test
    void evaluatesAgainstTheFixedState() throws Exception {
        HttpResponse<String> r = evaluate("Person.allInstances()->select(p | p.age > 30)->size()");
        assertEquals(200, r.statusCode());
        assertEquals("{\"result\":\"2\"}", r.body());
    }

    @Test
    void requiresSession() throws Exception {
        // an anonymous session with a valid CSRF token gets past the CSRF check and is then rejected as anonymous
        HttpResponse<String> csrfResponse = send("GET", "/auth/csrf", null, null, null);
        HttpResponse<String> anonymous = send("POST", "/ocl/evaluate", sessionOf(csrfResponse), tokenOf(csrfResponse),
                "{\"expression\":\"1\"}");
        assertEquals(401, anonymous.statusCode());
        assertEquals("{\"status\":401,\"title\":\"Not authenticated\"}", anonymous.body());
    }

    @Test
    void requiresCsrfToken() throws Exception {
        HttpResponse<String> r = send("POST", "/ocl/evaluate", session, null, "{\"expression\":\"1\"}");
        assertEquals(403, r.statusCode());
        assertEquals("{\"status\":403,\"title\":\"Forbidden\"}", r.body());
    }

    @Test
    void rejectsInvalidBodies() throws Exception {
        String[] bodies = {
            "{\"expression\":\"\"}",
            "{\"expression\":" + json("1".repeat(1001)) + "}",
            "{}",
            "{\"expression\":null}",
            "not json",
        };
        for (String body : bodies) {
            HttpResponse<String> r = send("POST", "/ocl/evaluate", session, csrf, body);
            assertEquals(400, r.statusCode(), body);
            assertEquals("{\"status\":400,\"title\":\"Invalid request\"}", r.body());
        }
        HttpResponse<String> noBody = send("POST", "/ocl/evaluate", session, csrf, null);
        // no body also means no Content-Type, which the framework rejects before the controller is reached
        assertEquals(415, noBody.statusCode());
        assertEquals("{\"status\":415,\"title\":\"Unsupported Media Type\"}", noBody.body());
    }

    @Test
    void acceptsTheMaximumLength() throws Exception {
        String expr = "1" + " ".repeat(997) + "+1";
        assertEquals(1000, expr.length());
        HttpResponse<String> r = evaluate(expr);
        assertEquals(200, r.statusCode(), r.body());
        assertEquals("{\"result\":\"2\"}", r.body());
    }

    @Test
    void syntaxErrorIs422WithoutInternals() throws Exception {
        HttpResponse<String> r = evaluate("Set{1,2");
        assertEquals(422, r.statusCode());
        assertTrue(r.body().startsWith("{\"status\":422,\"title\":\"Expression rejected\",\"detail\":\""), r.body());
        assertNoInternals(r);
    }

    @Test
    void typeErrorIs422WithoutInternals() throws Exception {
        HttpResponse<String> r = evaluate("1 + 'a'");
        assertEquals(422, r.statusCode());
        assertTrue(r.body().contains("\"detail\""), r.body());
        assertNoInternals(r);
    }

    @Test
    void hostileInputIsNotEchoedAsMarkupAndStaysAnError() throws Exception {
        HttpResponse<String> r = evaluate("<script>alert(1)</script>");
        assertEquals(422, r.statusCode());
        assertNoInternals(r);
        assertTrue(r.headers().firstValue("Content-Type").orElse("").startsWith("application/json"));
    }

    @Test
    void longRunningExpressionTimesOutAndTheServerStaysResponsive() throws Exception {
        String endless = "Sequence{1..5000}->forAll(a | Sequence{1..5000}->forAll(b | Sequence{1..5000}->forAll(c | a + b + c > 0)))";
        for (int i = 0; i < 4; i++) { // more rounds than evaluation threads: cancelled evaluations must free their slot
            long start = System.nanoTime();
            HttpResponse<String> r = evaluate(endless);
            long millis = (System.nanoTime() - start) / 1_000_000;
            assertEquals(503, r.statusCode(), r.body());
            assertTrue(millis < 3000, "returned after " + millis + " ms");
            assertEquals("5", r.headers().firstValue("Retry-After").orElse(null));
            assertTrue(r.body().contains("\"title\":\"Evaluation unavailable\""), r.body());
            assertNoInternals(r);
        }
        HttpResponse<String> after = evaluate("1 + 1");
        assertEquals(200, after.statusCode(), after.body());
        assertEquals("{\"result\":\"2\"}", after.body());
    }

    @Test
    void unknownMethodAndMediaTypeKeepMinimalProblems() throws Exception {
        HttpResponse<String> get = send("GET", "/ocl/evaluate", session, null, null);
        assertTrue(get.statusCode() == 405, get.body());
        assertNoInternals(get);
    }
}
