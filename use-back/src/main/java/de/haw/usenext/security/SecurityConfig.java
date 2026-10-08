package de.haw.usenext.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.ProviderManager;
import org.springframework.security.authentication.dao.DaoAuthenticationProvider;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.annotation.web.configurers.ExceptionHandlingConfigurer;
import org.springframework.security.config.annotation.web.configurers.HeadersConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.header.writers.CrossOriginOpenerPolicyHeaderWriter.CrossOriginOpenerPolicy;
import org.springframework.security.web.header.writers.CrossOriginResourcePolicyHeaderWriter.CrossOriginResourcePolicy;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.factory.PasswordEncoderFactories;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.session.ChangeSessionIdAuthenticationStrategy;
import org.springframework.security.web.authentication.session.CompositeSessionAuthenticationStrategy;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfAuthenticationStrategy;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.csrf.CsrfTokenRequestAttributeHandler;
import org.springframework.security.web.csrf.HttpSessionCsrfTokenRepository;
import org.springframework.security.web.header.writers.ReferrerPolicyHeaderWriter.ReferrerPolicy;

@Configuration
public class SecurityConfig {

    @Bean
    PasswordEncoder passwordEncoder() {
        return PasswordEncoderFactories.createDelegatingPasswordEncoder();
    }

    /** Prototype assumption (R-17): exactly one configured user; the hash comes from configuration. */
    @Bean
    UserDetailsService userDetailsService(@Value("${usenext.auth.username}") String username,
                                          @Value("${usenext.auth.password-hash}") String passwordHash) {
        return new InMemoryUserDetailsManager(User.withUsername(username).password(passwordHash).roles("USER").build());
    }

    @Bean
    AuthenticationManager authenticationManager(UserDetailsService users, PasswordEncoder encoder) {
        var provider = new DaoAuthenticationProvider(users);
        provider.setPasswordEncoder(encoder);
        return new ProviderManager(provider);
    }

    @Bean
    CsrfTokenRepository csrfTokenRepository() {
        var sessions = new HttpSessionCsrfTokenRepository();
        // CsrfFilter generates and saves a token for every request, which would open a session for an anonymous 403.
        // Only GET /api/auth/csrf and requests that already have a session may create or change the stored token.
        return new CsrfTokenRepository() {
            @Override
            public CsrfToken generateToken(HttpServletRequest request) {
                return sessions.generateToken(request);
            }

            @Override
            public void saveToken(CsrfToken token, HttpServletRequest request, HttpServletResponse response) {
                if (request.getSession(false) != null || "/api/auth/csrf".equals(request.getRequestURI())) {
                    sessions.saveToken(token, request, response);
                }
            }

            @Override
            public CsrfToken loadToken(HttpServletRequest request) {
                return sessions.loadToken(request);
            }
        };
    }

    @Bean
    SessionAuthenticationStrategy sessionAuthenticationStrategy(CsrfTokenRepository csrfTokenRepository) {
        return new CompositeSessionAuthenticationStrategy(List.of(
                new ChangeSessionIdAuthenticationStrategy(),
                new CsrfAuthenticationStrategy(csrfTokenRepository)));
    }

    /** BR-13: API responses never render anything. */
    static final String API_CSP = "default-src 'none'; frame-ancestors 'none'";

    /**
     * BR-13/FR-14: policy for the production build of use-web, which is served same-origin by this application.
     * No inline code, no eval, no data: URIs; Trusted Types is required and no policy may be created.
     */
    static final String FRONTEND_CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; "
            + "font-src 'self'; connect-src 'self'; manifest-src 'self'; base-uri 'none'; form-action 'self'; "
            + "frame-ancestors 'none'; object-src 'none'; require-trusted-types-for 'script'; trusted-types 'none'";

    @Bean
    @Order(1)
    SecurityFilterChain apiFilterChain(HttpSecurity http, CsrfTokenRepository csrfTokenRepository) throws Exception {
        http
                .securityMatcher("/api/**")
                .csrf(csrf -> csrf
                        .csrfTokenRepository(csrfTokenRepository)
                        // plain handler: the token from GET /api/auth/csrf is sent back unchanged in the header
                        .csrfTokenRequestHandler(new CsrfTokenRequestAttributeHandler()))
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/api/auth/csrf", "/api/auth/login").permitAll()
                        .anyRequest().authenticated())
                .exceptionHandling(ex -> problemResponses(ex))
                .headers(h -> commonHeaders(h, API_CSP))
                // An anonymous request has no session, so there is nothing to restore after a login: the request
                // cache would only create a JSESSIONID on the 401.
                .requestCache(cache -> cache.disable())
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable);
        return http.build();
    }

    /** Static files of the use-web build and the container error dispatch: read-only, no session, no CSRF. */
    @Bean
    @Order(2)
    SecurityFilterChain frontendFilterChain(HttpSecurity http) throws Exception {
        http
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // /error must be open, otherwise the container error dispatch of a 403/404 is turned into a 401
                        .requestMatchers("/error").permitAll()
                        .requestMatchers(HttpMethod.GET, "/**").permitAll()
                        .requestMatchers(HttpMethod.HEAD, "/**").permitAll()
                        .anyRequest().denyAll())
                .exceptionHandling(ex -> problemResponses(ex))
                .headers(h -> commonHeaders(h, FRONTEND_CSP))
                .requestCache(cache -> cache.disable())
                .formLogin(AbstractHttpConfigurer::disable)
                .httpBasic(AbstractHttpConfigurer::disable)
                .logout(AbstractHttpConfigurer::disable);
        return http.build();
    }

    /** Spec: 401 and 403 carry a minimal Problem body (BR-12), without any detail. */
    private static void problemResponses(ExceptionHandlingConfigurer<HttpSecurity> ex) {
        ex.authenticationEntryPoint((req, res, e) -> writeProblem(res, HttpStatus.UNAUTHORIZED, "Not authenticated"))
                .accessDeniedHandler((req, res, e) -> writeProblem(res, HttpStatus.FORBIDDEN, "Forbidden"));
    }

    /** Headers shared by both chains; only the Content-Security-Policy differs. HSTS is written for HTTPS requests only. */
    private static void commonHeaders(HeadersConfigurer<HttpSecurity> h, String csp) {
        h.contentSecurityPolicy(c -> c.policyDirectives(csp))
                .referrerPolicy(r -> r.policy(ReferrerPolicy.NO_REFERRER))
                .permissionsPolicyHeader(p -> p.policy("accelerometer=(), camera=(), geolocation=(), "
                        + "gyroscope=(), magnetometer=(), microphone=(), payment=(), usb=(), interest-cohort=()"))
                .crossOriginOpenerPolicy(c -> c.policy(CrossOriginOpenerPolicy.SAME_ORIGIN))
                .crossOriginResourcePolicy(c -> c.policy(CrossOriginResourcePolicy.SAME_ORIGIN))
                .httpStrictTransportSecurity(hsts -> hsts
                        .maxAgeInSeconds(31536000)
                        .includeSubDomains(true));
    }

    private static void writeProblem(HttpServletResponse response, HttpStatus status, String title) throws IOException {
        // Constant strings only, nothing from the request is echoed, so no JSON escaping is needed.
        response.setStatus(status.value());
        response.setCharacterEncoding(StandardCharsets.UTF_8.name());
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        response.getWriter().write("{\"status\":" + status.value() + ",\"title\":\"" + title + "\"}");
    }
}
