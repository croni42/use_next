package de.haw.usenext.poc.api;

import de.haw.usenext.poc.api.model.CsrfToken;
import de.haw.usenext.poc.api.model.LoginRequest;
import de.haw.usenext.poc.api.model.UserInfo;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.context.SecurityContextHolderStrategy;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.authentication.session.SessionAuthenticationStrategy;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class AuthController implements AuthApi {

    private final AuthenticationManager authenticationManager;
    private final SessionAuthenticationStrategy sessionStrategy;
    private final SecurityContextRepository securityContextRepository = new HttpSessionSecurityContextRepository();
    private final SecurityContextHolderStrategy contextHolder = SecurityContextHolder.getContextHolderStrategy();
    private final HttpServletRequest request;
    private final HttpServletResponse response;

    public AuthController(AuthenticationManager authenticationManager,
                          SessionAuthenticationStrategy sessionStrategy,
                          HttpServletRequest request,
                          HttpServletResponse response) {
        this.authenticationManager = authenticationManager;
        this.sessionStrategy = sessionStrategy;
        this.request = request;
        this.response = response;
    }

    @Override
    public ResponseEntity<CsrfToken> getCsrfToken() {
        var token = (org.springframework.security.web.csrf.CsrfToken)
                request.getAttribute(org.springframework.security.web.csrf.CsrfToken.class.getName());
        return ResponseEntity.ok(new CsrfToken(token.getHeaderName(), token.getToken()));
    }

    @Override
    public ResponseEntity<UserInfo> login(LoginRequest loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                UsernamePasswordAuthenticationToken.unauthenticated(
                        loginRequest.getUsername(), loginRequest.getPassword()));
        // Rotates the session ID and the CSRF token (session fixation protection).
        sessionStrategy.onAuthentication(authentication, request, response);
        SecurityContext context = contextHolder.createEmptyContext();
        context.setAuthentication(authentication);
        contextHolder.setContext(context);
        securityContextRepository.saveContext(context, request, response);
        return ResponseEntity.ok(new UserInfo(authentication.getName()));
    }

    @Override
    public ResponseEntity<Void> logout() {
        new SecurityContextLogoutHandler().logout(request, response, contextHolder.getContext().getAuthentication());
        return ResponseEntity.noContent().build();
    }
}
