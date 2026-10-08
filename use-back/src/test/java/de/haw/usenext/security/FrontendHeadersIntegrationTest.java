package de.haw.usenext.security;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;

/** Headers of the static use-web build (served from a small fixture on the classpath) against the real Tomcat. */
@SpringBootTest(
        webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT,
        properties = {
            "usenext.auth.password-hash={noop}test-password",
            "spring.web.resources.static-locations=classpath:/frontend-fixture/",
            // test only: lets a request claim HTTPS via X-Forwarded-Proto
            "server.forward-headers-strategy=native"
        })
class FrontendHeadersIntegrationTest {

    static final String FRONTEND_CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; "
            + "font-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'self'; "
            + "frame-ancestors 'none'; object-src 'none'; require-trusted-types-for 'script'; trusted-types 'none'";

    @Value("${local.server.port}")
    int port;

    private final HttpClient http = HttpClient.newHttpClient();

    private HttpResponse<String> get(String path, String forwardedProto) throws Exception {
        HttpRequest.Builder b = HttpRequest.newBuilder(URI.create("http://localhost:" + port + path));
        if (forwardedProto != null) {
            b.header("X-Forwarded-Proto", forwardedProto);
        }
        return http.send(b.build(), HttpResponse.BodyHandlers.ofString());
    }

    private static void assertFrontendHeaders(HttpResponse<?> r) {
        String where = r.uri() + " -> " + r.statusCode();
        assertHeader(r, "Content-Security-Policy", FRONTEND_CSP, where);
        assertHeader(r, "Referrer-Policy", "no-referrer", where);
        assertHeader(r, "Permissions-Policy", "accelerometer=(), camera=(), geolocation=(), gyroscope=(), "
                + "magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()", where);
        assertHeader(r, "X-Content-Type-Options", "nosniff", where);
        assertHeader(r, "X-Frame-Options", "DENY", where);
        assertHeader(r, "Cross-Origin-Opener-Policy", "same-origin", where);
        assertHeader(r, "Cross-Origin-Resource-Policy", "same-origin", where);
        assertNull(r.headers().firstValue("Set-Cookie").orElse(null), "no session cookie on " + where);
    }

    private static void assertHeader(HttpResponse<?> r, String name, String expected, String where) {
        assertEquals(expected, r.headers().firstValue(name).orElse(null), name + " on " + where);
    }

    @Test
    void indexPage() throws Exception {
        HttpResponse<String> r = get("/", null);
        assertEquals(200, r.statusCode());
        assertFrontendHeaders(r);
    }

    @Test
    void hashedAsset() throws Exception {
        HttpResponse<String> r = get("/assets/app-1a2b3c.js", null);
        assertEquals(200, r.statusCode());
        assertFrontendHeaders(r);
    }

    @Test
    void missingStaticPathIs404WithoutFallback() throws Exception {
        HttpResponse<String> r = get("/assets/missing.js", null);
        assertEquals(404, r.statusCode());
        assertFrontendHeaders(r);
        HttpResponse<String> unknown = get("/no/such/route", null);
        assertEquals(404, unknown.statusCode());
        assertFrontendHeaders(unknown);
    }

    @Test
    void nonReadMethodsAreRejected() throws Exception {
        HttpResponse<String> r = http.send(HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/"))
                .POST(HttpRequest.BodyPublishers.noBody()).build(), HttpResponse.BodyHandlers.ofString());
        assertEquals(401, r.statusCode());
        assertFrontendHeaders(r);
    }

    @Test
    void hstsOnlyOverHttps() throws Exception {
        assertNull(get("/", null).headers().firstValue("Strict-Transport-Security").orElse(null));
        assertHeader(get("/", "https"), "Strict-Transport-Security", "max-age=31536000 ; includeSubDomains", "/");
    }

    /** The API keeps its own policy; only the path decides. */
    @Test
    void apiPolicyIsNotTheFrontendPolicy() throws Exception {
        HttpResponse<String> r = get("/api/auth/me", null);
        assertEquals(401, r.statusCode());
        assertHeader(r, "Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'", "/api/auth/me");
    }
}
