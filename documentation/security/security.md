# Security

Security is treated as a cross-cutting architectural concern in **USE_NEXT**. Measures are selected to provide high
practical protection with reasonable effort, grounded in established standards such as the OWASP Top Ten (2025)
and NIST guidelines \[[S1](../references.md#s1)\]\[[S34](../references.md#s34)\]\[[S36](../references.md#s36)\].

> For concrete risk descriptions, attack scenarios, and specific prevention references see
> [security_risks_and_prevention.md](security_risks_and_prevention.md).

## XSS

Untrusted data in the frontend should exclusively render using secure mechanisms. Unsafe sinks such as innerHTML
should be avoided. Where HTML content is required for functional reasons, it should be centrally sanitised before
rendering. The implementation follows OWASP recommendations on output encoding, safe sinks, and HTML sanitation.
Where supported, Trusted Types provide an additional browser-level enforcement layer against unsafe DOM sink assignments.

With React (ADR-007), values rendered through JSX are escaped by default. `dangerouslySetInnerHTML` is the single
explicit unsafe sink. It is banned or centralised in one sanitisation component by ESLint rules, which are part of the
mandatory CI checks (ADR-011).
> [S7](../references.md#s7), [S9](../references.md#s9), [S10](../references.md#s10), [S11](../references.md#s11)

## Configuration and CSP

A significant risk factor in modern web applications is misconfiguration. This includes missing or insufficient
security headers, unnecessary inline scripts, and insecure defaults not hardened for production. CORS is not a
frontend security mechanism but a browser-enforced API coupling policy. Overly permissive CORS settings create
attack surface at the server level regardless of frontend code quality. Frame-embedding restrictions
(X-Frame-Options, CSP frame-ancestors) guard against clickjacking.

A restrictive default configuration should therefore be defined from the start. A tightly scoped Content Security
Policy acts as a complementary defense-in-depth measure. It limits the impact of implementation flaws but does not
replace secure coding. Allowed origins for backend communication are explicitly defined, and external scripts kept
to the necessary minimum.

The backend sets the security headers (CSP, clickjacking protection, HSTS). Two Spring Security filter chains share one
header method: `/api/**` and everything else, i.e. the static files of the `use-web` production build, which `use-back`
serves same-origin (profile `with-frontend`). Both carry Referrer-Policy `no-referrer`, a fixed Permissions-Policy,
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Cross-Origin-Opener-Policy` and
`Cross-Origin-Resource-Policy` `same-origin`. HSTS is written only for requests that Tomcat treats as HTTPS.
Only the Content-Security-Policy differs:

- API responses: `default-src 'none'; frame-ancestors 'none'`.
- Frontend responses: `default-src 'none'`, with `'self'` for script, style, image, font, connect and manifest sources,
  `base-uri 'none'`, `object-src 'none'`, `frame-ancestors 'none'`, no `'unsafe-inline'`, no `'unsafe-eval'`, no
  `data:`, and `require-trusted-types-for 'script'; trusted-types 'none'` (Trusted Types is required and no policy may
  be created).

The frontend policy applies only to the production build; the Vite dev server does not send it. Integration tests
against a real Tomcat verify the header values (`SessionCsrfIntegrationTest` for the API, `FrontendHeadersIntegrationTest`
for the frontend), and `scripts/check-csp-build.mjs` checks the build output for content the policy would block (BR-13,
FR-14, ADR-007, ADR-011). In development the dev-server proxy gives frontend and backend one origin; otherwise CORS is
configured explicitly with credentials and a fixed allowed origin, never a wildcard (ADR-008).

Known limits: the frontend policy was checked in a Chromium-based browser only; other browsers ignore
`require-trusted-types-for`. HSTS was tested with a forwarded-HTTPS request, not over real TLS; behind a TLS-terminating
proxy the deployment must set `server.forward-headers-strategy`, otherwise no HSTS header is sent.

> [S3](../references.md#s3), [S40](/documentation/references.md#s40)

## Authentication, Session and Token Handling

The security of the frontend largely depends on how sessions are managed after authentication. A compromised
session secret is, from a security perspective, as critical as a compromised authentication itself.

A cautious approach to handling tokens and session data is therefore required. Session information
must not be transmitted via URL parameters, as this facilitates leakage through browser history, logs or referrer
headers. Secure cookies transmitted over HTTPS with appropriate cookie attributes are preferred, along with clearly
defined timeout and re-authentication policies. When cookie-based authentication is in use, state-changing requests
must be protected against Cross-Site Request Forgery (CSRF) through SameSite policies, token patterns, or
Origin/Referer validation.

ADR-008 defines the concrete model:

- Server-side session identified by a session cookie with `HttpOnly`, `Secure` and `SameSite=Strict`. The session ID is
  regenerated on login. It is never handled by frontend code and never transmitted via URLs.
- Sessions expire after 30 minutes of inactivity (configurable). Logout invalidates the session on the server.
- State-changing requests are protected by CSRF tokens (Spring Security). The backend provides the token, the
  communication layer of the frontend sends it in a request header.
- The OpenAPI specification declares an `apiKey` security scheme located in a cookie and the CSRF header. An `apiKey`
  in query parameters is not allowed; Spectral enforces this in CI.
- Sessions are held in server memory (local operation) and end on backend restart. User management is minimal.
- Residual risk: an `HttpOnly` cookie cannot be read by an XSS, but an XSS during an active session can still send
  requests within that session. This is reduced by safe rendering, a restrictive CSP and Trusted Types.
- Tests cover 401 for unauthenticated access, rejection of expired or invalidated sessions, rejection of requests without
  a valid CSRF token, cookie attributes and session ID change on login.

> [S20](../references.md#s20), [S34](../references.md#s34), [S35](../references.md#s35) 

## Supply Chain

In the frontend, relevant risks arise not only from proprietary code but also from libraries, build tools and
transitive dependencies. Compromised or outdated packages can be directly incorporated into the delivered
client-side code and thereby impair application security.

A deliberate dependency strategy should therefore be adopted: only necessary libraries, fixed
versions instead of uncontrolled "latest" references, regular updates and automated checks for known vulnerabilities.

Concretely (ADR-011): lockfiles (`package-lock.json`) and fixed versions in `pom.xml`, OSV-Scanner for both, gitleaks
for committed secrets, oasdiff for breaking API changes and Spectral for the OpenAPI specification. GitHub Actions are
pinned to a commit SHA and run with minimal workflow permissions. The OpenAPI Generator version is pinned exactly and
updated only through deliberate PRs (ADR-010). Generated code is excluded from handwritten-code lint rules where
appropriate, but not from dependency and secret scans. Optional stage 2 checks (licence check, Schemathesis, OWASP
Dependency-Check) are added if capacity remains.

> [S4](../references.md#s4), [S12](../references.md#s12), [S32](../references.md#s32), [S33](../references.md#s33),
  [S36](../references.md#s36)

## References

[Whole List (references.md)](../references.md#references)

- [S1](../references.md#s1) OWASP Top Ten 2025 — [owasp.org](https://owasp.org/Top10/2025/)
- [S3](../references.md#s3) OWASP A02:2025 — Security Misconfiguration — [owasp.org](https://owasp.org/Top10/2025/A02_2025-Security_Misconfiguration/)
- [S4](../references.md#s4) OWASP A03:2025 — Software Supply Chain Failures — [owasp.org](https://owasp.org/Top10/2025/A03_2025-Software_Supply_Chain_Failures/)
- [S7](../references.md#s7) DOM-based XSS Prevention Cheat Sheet — [cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html)
- [S9](../references.md#s9) MDN — Cross-site Scripting (XSS) — [developer.mozilla.org](https://developer.mozilla.org/de/docs/Web/Security/Attacks/XSS)
- [S10](../references.md#s10) OWASP XSS Prevention Cheat Sheet — [cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/cheatsheets/Cross_Site_Scripting_Prevention_Cheat_Sheet.html)
- [S11](../references.md#s11) PortSwigger XSS Cheat Sheet — [portswigger.net](https://portswigger.net/web-security/cross-site-scripting/cheat-sheet)
- [S12](../references.md#s12) Software Supply Chain Security Cheat Sheet — [cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/cheatsheets/Software_Supply_Chain_Security_Cheat_Sheet.html)
- [S32](../references.md#s32) Vulnerable Dependency Management Cheat Sheet — [cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/cheatsheets/Vulnerable_Dependency_Mgmt_Cheat_Sheet.html)
- [S33](../references.md#s33) CI/CD Security Cheat Sheet — [cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/cheatsheets/CI_CD_Security_Cheat_Sheet.html)
- [S20](../references.md#s20) OWASP CSRF Prevention Cheat Sheet — [cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html)
- [S34](../references.md#s34) NIST SP 800-63B-4 — Session Management — [pages.nist.gov](https://pages.nist.gov/800-63-4/sp800-63b/session/)
- [S35](../references.md#s35) OWASP Session Management Cheat Sheet — [cheatsheetseries.owasp.org](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html)
- [S36](../references.md#s36) NIST SP 800-204D — DevSecOps CI/CD Pipelines — [doi.org](https://doi.org/10.6028/NIST.SP.800-204D)
- [S40](../references.md#s40) MDN — Content Security Policy (CSP) - [developer.mozilla.or](https://developer.mozilla.org/de/docs/Web/HTTP/Guides/CSP)
