# Risks

The risks described below serve as the analytical basis for deriving the target architecture and the associated
architecture and security guidelines. They are not intended as a complete list of all conceivable threats, but rather as
a project-specific selection of relevant risks from which concrete requirements, protective measures and design
principles for the frontend are developed.

***

## Cross-Site Scripting (XSS)

A major risk lies in the display of external content or model-related information within the user interface. If such
content is processed insecurely or incorporated into the interface without sufficient escaping, this can lead to
cross-site scripting vulnerabilities. The consequences range from manipulation of the presentation to data exfiltration
and even compromise of session data. This risk is particularly relevant when dynamic content is embedded in HTML-like
structures or when unsafe DOM manipulations are permitted. Countermeasures in the frontend primarily consist of
consistent escaping and the avoidance of insecure HTML rendering. Modern browsers additionally support Trusted Types
as an enforcement layer. Restricting which values may be passed to unsafe DOM sinks and thereby preventing entire
classes of DOM-based XSS at the platform level. React escapes values rendered through JSX by default and
`dangerouslySetInnerHTML` is the single explicit unsafe sink, which ESLint rules ban or centralise (ADR-007). At the
same time, a dependency on the backend remains, as incoming
data must also be validated and securely prepared there.

> Prevention: [S7](../references.md#s7), [S9](../references.md#s9), [S10](../references.md#s10), [S11](../references.md#s11)
>
> Other References: [S8](../references.md#s8), [S13](../references.md#s13), [S21](../references.md#s21)

***

## Manipulated Inputs

User inputs in forms, filter functions, or request parameters represent another relevant risk. While client-side
validation improves usability, it can be easily bypassed from a technical perspective. This creates the risk that
manipulated or semantically invalid inputs are forwarded to backend interfaces. Faulty processing, unexpected system
behaviour, or unauthorised operations may result. The frontend can only partially mitigate this risk by performing early
plausibility checks. However, authoritative validation must be carried out in the backend, resulting in a clear security
dependency between both system layers.

> Prevention: [S29](../references.md#s29) 
>
> Other References: [S6](../references.md#s6), [S21](../references.md#s21), [S22](../references.md#s22)

***

## Inconsistent Error Handling

Another risk arises from unclear or inconsistent error states. If error messages are not handled in a standardised
manner in the frontend, this can degrade usability while simultaneously exposing internal technical details. This is
particularly problematic when error messages from the backend are forwarded directly or insufficiently filtered to the
interface. This creates both a usability risk and a potential security risk due to information leakage. This risk can be
mitigated through consistent error representation in the frontend, but requires consistent and controlled error
responses from the backend.

> Prevention: [S30](../references.md#s30) 
>
> Other References: [S3](../references.md#s3),  [S15](../references.md#s15),  [S21](../references.md#s21), [S22](../references.md#s22)

***

## Broken Access Control / Insufficient Authorization

OWASP ranks Broken Access Control (A01:2025) as the most prevalent web application vulnerability. In a
frontend/backend architecture, the risk lies in implicitly assigning authorisation enforcement to the user interface.
The frontend can hide or disable unauthorised actions for usability reasons, but any such restriction is advisory
only. It can be bypassed by direct API calls or browser manipulation. Assigning this responsibility to the frontend
leads to a false sense of security. The actual enforcement of permissions, role checks, and resource boundaries must
be handled exclusively in the backend. The risk here lies particularly in an unclear distribution of responsibilities
between the user interface and server logic.

> Prevention: [S2](../references.md#s2), [S31](../references.md#s31), [S35](../references.md#s35)
>
> Other References: [S16](../references.md#s16), [S17](../references.md#s17), [S21](../references.md#s21), [S22](../references.md#s22), [S34](../references.md#s34)

***

## Insecure Dependencies and Supply Chain

A significant risk arises from the use of external frontend libraries, frameworks, and build tools. These dependencies
may contain known vulnerabilities or introduce new attack vectors into the system. Since modern frontends typically rely
heavily on third-party components, there is a persistent technical and organisational dependency on external vendors and
open-source projects. Unmaintained or compromised packages can be directly incorporated into the delivered 
client-side code.

Beyond runtime libraries, build and deployment processes introduce additional risk surfaces: unlocked dependency
versions allow silent upgrades to compromised packages. Source maps accidentally published to production expose full
application source code. insufficiently hardened CI/CD pipelines can be manipulated to inject malicious artefacts.
A deliberate dependency strategy with lockfile discipline, a minimal dependency footprint, automated vulnerability
checks, and hardened pipeline configurations reduces this risk but cannot eliminate it entirely.

In the chosen toolchain (ADR-011) this is addressed by lockfiles and fixed versions, OSV-Scanner for `pom.xml` and
`package-lock.json`, gitleaks, SHA-pinned GitHub Actions with minimal permissions, and a pinned OpenAPI Generator
version. The generated client is committed and its drift is checked in CI, so unreviewed generator output cannot enter
the code base silently.

> Prevention: [S12](../references.md#s12), [S32](../references.md#s32), [S33](../references.md#s33)
>
> Other References: [S1](../references.md#s1), [S4](../references.md#s4), [S21](../references.md#s21), [S22](../references.md#s22), [S26](../references.md#s26), [S36](../references.md#s36) 

***

## Security Misconfiguration

Even a well-implemented application can be exposed to serious attacks if its security-relevant configuration is
incomplete or incorrect. This includes missing or inadequate security headers such as Content-Security-Policy,
X-Frame-Options, or HSTS, and insecure default configurations that are not hardened for production. Inline scripts
permitted by a loose CSP widen the attack surface for XSS even when the application code itself avoids unsafe sinks.
Clickjacking attacks exploit the absence of frame-embedding restrictions (X-Frame-Options or CSP frame-ancestors)
to deceive users into triggering unintended actions.

CORS deserves particular attention: it is not a frontend security mechanism but a browser-enforced API coupling
policy. Overly permissive CORS configuration allows unintended cross-origin access to backend APIs. Turning a
misconfigured server header into an attack vector regardless of how secure the frontend code itself is.

A restrictive default configuration must be defined from the outset, deliberately reviewed as part of deployment,
and validated automatically in CI/CD pipelines. Backend integration tests verify the security headers against the
production build (BR-13). If frontend and backend run on different origins, CORS is configured with credentials and a
fixed allowed origin, never a wildcard (ADR-008).

> Prevention: [S3](../references.md#s3), [S33](../references.md#s33), [S40](/documentation/references.md#s40)
>
> Other References: [S36](../references.md#s36)

***

## Insecure Session and Token Handling

Session identifiers and authentication tokens are high-value targets. Transmitting them via URL parameters exposes
them to leakage through browser history, server logs, and Referer headers. Missing cookie security attributes
(Secure, HttpOnly, SameSite) leave tokens vulnerable to interception. Absent or overly generous timeout policies
extend the window of exposure for compromised sessions.

These risks are relevant because cookie-based authentication is used (ADR-008
see [ADRs](../architecture/9_architecture_decisions.md)). The session model is defined in the OpenAPI security
scheme (`apiKey` in a cookie, never in query parameters) to ensure a consistent and auditable contract between
frontend and backend.

Mitigation in the chosen model: the session cookie is `HttpOnly`, `Secure` and `SameSite=Strict`, the session ID is
regenerated on login, sessions expire after 30 minutes of inactivity and logout invalidates the session on the server.
`HttpOnly` prevents theft of the session identifier through XSS, but not the use of the session by an XSS during an
active session. Sessions held in server memory end on backend restart.

> Prevention: [S34](../references.md#s34), [S35](../references.md#s35)
>
> Other References: [S5](../references.md#s5), [S37](../references.md#s37)

***

## Cross-Site Request Forgery (CSRF)

When cookie-based authentication is in use, state-changing requests can be forged from third-party pages without
the user's knowledge. A malicious site triggers a request to the application's backend. The browser automatically
attaches the session cookie, and without CSRF protection the backend cannot distinguish it from a legitimate request.
This is particularly relevant for operations that modify data, trigger model analyses, or change application state.
CSRF is not an XSS attack and is not mitigated by output encoding. It requires dedicated countermeasures at the
request layer.

Effective mitigations include the SameSite cookie attribute (Lax or Strict), synchronizer token patterns, and
Origin/Referer header validation for state-changing requests. The chosen approach aligns with the session model
defined in the OpenAPI security scheme (ADR-008): `SameSite=Strict` on the session cookie plus a CSRF token provided
by the backend (Spring Security) and sent by the frontend communication layer in a request header. CSRF protection is
mandatory and covered by integration tests (BR-09).

> Prevention: [S20](../references.md#s20)
>
> Other References: [S5](../references.md#s5), [S34](../references.md#s34)

***

# Architectural Impact

The identified risks demonstrate that security-related requirements in the frontend cannot be addressed in isolation.
The key architectural consequence is a clear separation of responsibilities: the frontend provides supporting protective
measures at the level of presentation and user interaction, while the backend remains responsible for the authoritative
enforcement of validation, sanitation, and authorisation. This results in the necessity to define security mechanisms
not only at the component level, but also explicitly at the interfaces between frontend and backend.

## References

[Whole List (references.md)](../references.md#references)

> Related: [Security Measures (security.md)](security.md)

### Standards and Cheat Sheets

- [S1](../references.md#s1) OWASP Top Ten 2025 — [owasp.org](https://owasp.org/Top10/2025/)
- [S2](../references.md#s2) OWASP A01:2025 — Broken Access Control [owasp.org](https://owasp.org/Top10/2025/A01_2025-Broken_Access_Control/)
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
- [S37](../references.md#s37) OpenAPI — Describing API Security
- [S40](../references.md#s40) MDN — Content Security Policy (CSP) - [developer.mozilla.or](https://developer.mozilla.org/de/docs/Web/HTTP/Guides/CSP)

### Web Security Papers

- [S15](../references.md#s15) Web application security: A pragmatic exposé.
- [S19](../references.md#s19) Secure coding for web applications: Frameworks, challenges, and the role of LLMs.
- [S21](../references.md#s21) Defending against web application attacks: Approaches, challenges and implications.
- [S22](../references.md#s22) A comparative study of web application security parameters: Current trends and future directions.
- [S23](../references.md#s23) Systematic review of web application security development model.
- [S24](../references.md#s24) Web application development model with security concern in the entire life‑cycle.

