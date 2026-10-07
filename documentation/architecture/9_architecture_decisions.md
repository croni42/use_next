# 9. Architectural Decisions

The following architectural decisions document the most important, consciously made guiding decisions for **USE_NEXT**.
They focus on reuse of the domain core, the separation into frontend and backend, and the security-oriented design of
the target architecture.

> [Architecture overview — USE_NEXT](0_architecture_overview.md)

## ADR-001: Reuse of use-core

- **Status:** Accepted
- **Decision:** `use-core` will be reused as the existing domain core and not
  reimplemented.
- **Rationale:** `use-core` already contains the central logic for model processing, OCL evaluation, and validation.
  Reuse reduces effort, risks, and domain inconsistencies.
- **Consequences:** The new architecture requires a defined adapter or integration layer between the new system and the
  existing core.

## ADR-002: Frontend and Backend are separated

- **Status:** Accepted
- **Decision:** **USE_NEXT** will be split into a web frontend (`use-web`) and a backend (`use-back`) as an integration
  layer.
- **Rationale:** The frontend shall handle presentation, interaction, and state management, while the backend
  encapsulates API access, orchestration, and connectivity to `use-core`.
- **Consequences:** Responsibilities are clearly separated. The frontend remains focused on presentation, interaction,
  and state handling, while the backend encapsulates technical integration details and controlled access to `use-core`.

## ADR-003: Backend as Wrapper around use-core

- **Status:** Accepted
- **Decision:** The backend is conceived as a wrapper around `use-core`.
- **Rationale:** This controls access to the domain core and prevents technical details of the core connection from
  being shifted into the frontend.
- **Consequences:** Access to `use-core` is centralised in the backend. Interfaces can therefore be
  defined, secured, and adapted without shifting integration complexity into the frontend.

## ADR-004: Modular Frontend Architecture

- **Status:** Accepted
- **Decision:** The frontend will be built in a modular and component-oriented
  manner.
- **Rationale:** Clearly separated UI components, state management, service layer, and validation-related feedback are
  planned. This improves maintainability, extensibility, and traceability.
- **Consequences:** New features can be added in a more targeted manner without structurally
  changing the code base. The frontend remains decoupled from direct core access and technical communication details.

## ADR-005: Security Through Central Rules Instead of Distributed Individual Measures

- **Status:** Accepted
- **Decision:** Security mechanisms are anchored as central architecture and implementation
  rules.
- **Rationale:** Important measures include secure default rendering for untrusted data, central sanitation when HTML
  is needed, controlled API communication, restrictive configuration, and conscious dependency control.
- **Consequences:** Security requirements are not only documented but systematically considered in the frontend, build
  process, and quality assurance.

## ADR-006: OpenAPI-Based Code Generation for API Stability

- **Status:** Accepted
- **Decision:** The system will use an OpenAPI specification [(S38)](/documentation/references.md#s38) as the single
  source of truth for REST API definitions. Client code **and server interfaces** are automatically generated from this
  specification (spec-first; scope and tooling defined in ADR-010).
- **Rationale:** OpenAPI provides a standardised, language-neutral representation of REST APIs. Automatic code
  generation ensures that frontend API clients stay synchronised with backend changes, reduces manual implementation
  errors, and increases overall system stability.
- **Consequences:**
  - The OpenAPI specification must be maintained as the authoritative API contract.
  - Generated client code (models, API methods, types) is used in the frontend instead of manually written API
    clients. Backend controllers implement the generated interfaces.
  - Changes to the API require updating the OpenAPI spec and regenerating the code, not rewriting API logic by hand.
  - Tooling dependency (OpenAPI Generator, see ADR-010) is part of the build pipeline.

[//]: # (TODO update references to FR or BR)
[//]: # (TOOD fix semicolons used by ai, maybe also shorten ADRs)
## ADR-007: Frontend Framework

- **Status:** Accepted
- **Decision:** The frontend is implemented with **React and TypeScript** (strict mode). Vite is used as build tool.
  Application state is handled with React's built-in mechanisms first; additional state-management or UI libraries are
  introduced only with a documented reason (see FR-21).
- **Rationale:** React is MIT-licensed and widely used and documented [(S-react)](https://react.dev/versions), which
  matches the constraints of free availability, long-term maintainability and a low entry barrier for third parties
  (arc42 chapter 2). It supports the component-oriented architecture of ADR-004. React escapes values rendered through
  JSX by default, which supports FR-14; `dangerouslySetInnerHTML` is the single explicit unsafe sink and can be banned or
  centralised by lint rules (FR-15, FR-16).
- React is MIT-licensed and widely used ([StackOverflowSurvey](/documentation/references.md#s41)) and 
  documented [(react.dev)](https://react.dev), which matches the constraints of free availability, long-term 
  maintainability and a low entry barrier for third parties (arc42 chapter 2). It supports the component-oriented 
  architecture of [ADR-004](#adr-004-modular-frontend-architecture). React escapes values rendered through
  JSX by default, which supports FR-14. `dangerouslySetInnerHTML` is the single explicit unsafe sink and can be 
  banned or centralised by lint rules(FR-15, FR-16). Alternatives (e.g. Vue, Angular, Svelte) are present and  
  considered, but for an open source project the wide usage of a library is mandatory.
- **Consequences:**
  - The toolchain requires Node.js (LTS) in addition to the JDK (ADR-009).
  - ESLint with TypeScript and React rules is part of the mandatory checks (ADR-011). Unsafe DOM sinks are flagged.
  - The dev server differs from the production build. Header and CSP checks (BR-13) run against the production build.
  - Routing, test runner and further libraries are chosen during implementation and documented in the PR that
    introduces them (fixed versions, licence check; FR-21).
  - The TODO "update guidelines after technologies have been defined" in the frontend documents is resolved.


## ADR-008: Authentication and Session Concept

- **Status:** Accepted
- **Decision:** The system uses a server-side session identified by a session cookie.
  - After login (a login operation defined in the OpenAPI specification) the backend creates a server-side session
    and sets a session cookie with the attributes `HttpOnly`, `Secure` and `SameSite=Strict`. The session ID is
    regenerated on login. Session identifiers are never handled by frontend code and never transmitted via URLs
    (FR-17, BR-10).
  - Sessions expire after 30 minutes of inactivity (configurable). Logout invalidates the session on the server
    (BR-11).
  - State-changing requests are protected by CSRF tokens (BR-09): the backend provides the token, the communication
    layer of the frontend sends it in a request header.
  - The method is defined in the OpenAPI specification as an `apiKey` security scheme located in a cookie, referenced
    by all protected operations; the required CSRF header is documented in the specification (BR-08, FR-18). An
    `apiKey` in query parameters is not allowed.
  - Spring Security's session management and CSRF protection are used; sessions are held in server memory (local
    operation).
- **Rationale:** An `HttpOnly` session cookie cannot be read by JavaScript, so the session identifier is not exposed to
  theft through XSS. A server-side session makes lifetime control and invalidation simple and needs no token issuing
  code. The approach matches the security documentation (secure cookies with suitable attributes, CSRF protection for
  cookie-based authentication) and keeps the concept simple and extensible.
- **Consequences:**
  - CSRF protection is mandatory and tested (BR-09).
  - The generated client sends the session cookie and the CSRF header; this is configured once in the communication
    layer (FR-03, FR-13).
  - If frontend and backend run on different origins in development, the dev-server proxy is used so both share one
    origin; otherwise CORS is configured explicitly with credentials and a fixed allowed origin, never a wildcard
    (BR-13).
  - An XSS during an active session can still send requests within that session, although it cannot read the cookie;
    this residual risk is reduced by FR-14 to FR-16, a restrictive CSP and Trusted Types.
  - The `Secure` attribute is required whenever the application is served over HTTPS; its handling for local
    development over plain HTTP is documented in the implementation.
  - Sessions in server memory end on backend restart; a shared session store is a later extension (FR-23).
  - Tests cover: unauthenticated access returns 401; expired and invalidated sessions are rejected; a state-changing
    request without a valid CSRF token is rejected; cookie attributes are set; the session ID changes on login.
  - User management is minimal (a configured user with a hashed password, no registration); a user database is a
    later extension (FR-23).
  - Token-based authentication (bearer token) was considered and not chosen; introducing it later requires an update
    of this ADR.

## ADR-009: Backend Language, Framework and Integration of `use-core`

- **Status:** Accepted
- **Decision:** The backend (`use-back`) is implemented in Java 21 with Spring Boot 4.1.x (Spring MVC) and built with
  Maven (Maven Wrapper). `use-core` is integrated in-process through a dedicated adapter package, which is the only
  place that imports `org.tzi.use.*` (BR-02).
- **Rationale:** `use-core` is a Java project built with Maven (Java 21), so the same language and build tool allow a
  direct in-process dependency (ADR-001, ADR-003). Spring Boot 4.1 is supported as open source until 2027-07-31.
  Spring MVC fits the synchronous nature of `use-core`; Spring Security and Bean Validation cover authentication
  (ADR-008), validation (BR-06) and error handling (BR-12).
- **Consequences:**
  - Before the first implementation PR it is verified and documented that the used `use-core` files carry a licence
    header compatible with GPLv3, how `use-core` is obtained (published artefact or build from source), and how its
    objects behave under concurrent requests (the adapter serialises access if required).
  - An architecture test enforces the adapter boundary (BR-02).
  - The generated server interfaces (ADR-010) must be compatible with Spring Boot 4.x; a deviation from the chosen
    Spring Boot line requires an update of this ADR.
  - Return values and errors of `use-core` are mapped to backend models and defined error codes.

## ADR-010: OpenAPI Code Generation – Scope and Generator

- **Status:** Accepted (amends ADR-006)
- **Decision:** OpenAPI Generator is used for both sides, spec-first, from one OpenAPI file under version control.
  - Backend: generator `spring` with option `interfaceOnly`; controllers implement the generated interfaces. The
    interfaces are generated at build time and not committed.
  - Frontend: TypeScript client generated with `typescript-fetch` (`typescript-axios` only if documented in the
    implementing PR). The generated client is committed.
  - The generator version is pinned exactly; updates are deliberate PRs.
  - CI regenerates the client and fails on any difference to the committed files (drift check, ADR-011).
- **Rationale:** One tool means one configuration, one pinned dependency and one drift check (FR-21, BR-15) without
  additional runtimes. OpenAPI Generator is Apache-2.0 licensed and provides the required server and client
  generators. Committing the client makes changes visible in review and allows lint rules for FR-11.
- **Consequences:**
  - A short spike (compile generated interfaces and client, inspect the TypeScript output) precedes the first
    implementation; if it fails, only the client generator may be replaced and this ADR is updated.
  - Contract changes always start in the specification; controllers must not bypass the generated interfaces.
  - Generated code is excluded from handwritten-code lint rules where appropriate, but not from dependency and
    secret scans.
  - The generated client must be able to send the session cookie and the CSRF header (ADR-008); this is verified in
    the spike and configured centrally in the communication layer.
  - FR-11 is satisfied by this ADR.

## ADR-011: CI Platform and Check Stage Model

- **Status:** Accepted
- **Decision:** GitHub Actions is the CI platform. Every check can be run locally with one command; workflows only
  call these commands. Stage 1 requires only JDK 21, Node.js (LTS) and the project's package managers (Maven Wrapper,
  npm): no Docker, no accounts or API keys, no Python.
  - **Stage 1 (mandatory):** OpenAPI linting (Spectral, including a rule that allows `apiKey` only in cookies, never
    in query parameters), drift check of the generated client, ESLint with TypeScript and React security rules,
    backend integration tests for security headers (BR-13) and for session and CSRF behaviour (BR-09, BR-11),
    architecture test (BR-02), plus the CI-only
    tools oasdiff (breaking changes against `main`), OSV-Scanner (dependency vulnerabilities in `pom.xml` and
    `package-lock.json`) and gitleaks (secrets), run as pinned GitHub Actions.
  - **Stage 2 light (only if capacity remains):** licence check, contract tests against the running backend (e.g.
    Schemathesis), OWASP Dependency-Check.
  - Branch protection requires the stage 1 checks before merge. Pull requests use a template that names affected
    ADRs and confirms security conformance.
- **Rationale:** The baseline provides automated checks without elaborate setup (FR-22, BR-14). Tools that need a local
  installation run in CI only and are optional locally. The selected tools are freely licensed (Apache-2.0: Spectral,
  oasdiff, OSV-Scanner; MIT: gitleaks) and need no API key.
- **Consequences:**
  - Actions are pinned to a commit SHA, workflow permissions are minimal, and tool versions are fixed and reviewed
    like any other dependency (BR-15, FR-21).
  - Replacing a single tool is a pipeline change, not an architecture change.
  - Pipeline runtime and maintenance effort are measured during the evaluation.



## Suggested additions to `references.md`

React versions (https://react.dev/versions), Spring Boot support periods (https://endoflife.date/spring-boot), Spring
Security JWT resource server, OWASP HTML5 Security and CSRF Prevention Cheat Sheets, OpenAPI Generator, Spectral,
oasdiff, OSV-Scanner, gitleaks (URLs as linked above; retrieval date 2026-10-07).

## Suggested PR description

**Title:** docs: close ADR-007/008, add ADR-009 to ADR-011, amend ADR-006

**Body:** Closes the open technology decisions (frontend framework, authentication, backend stack, code generation, CI
stage model) and amends ADR-006 to cover server interfaces. Affected ADRs: ADR-006 (amended), ADR-007, ADR-008 (closed),
ADR-009, ADR-010, ADR-011 (new). Follow-up (separate PRs): update `guidelines.md`, `frontend_guidelines.md`,
`backend_guidelines.md`, arc42 chapters 4 and 5, security documentation and README. Security conformance: no rule of the
solution strategy is violated; the CSRF filter exception in ADR-008 is documented and justified there.

## Quellen (abgerufen am 2026-10-07)

- USE-Repository `useocl/use` (Sprache, Module, Lizenzangabe GPL-2.0): https://github.com/useocl/use
- Root-POM von USE (Version 7.5.0, Java 21, Module): https://raw.githubusercontent.com/useocl/use/master/pom.xml
- Lizenz-Header `Session.java` (GPL v2 oder später): https://github.com/useocl/use/blob/master/use-core/src/main/java/org/tzi/use/main/Session.java
- Spring-Boot-Supportzeiträume und Java-Kompatibilität: https://endoflife.date/spring-boot
- Spring Boot aktuelle Version: https://spring.io/projects/spring-boot
- Spring Security JWT Resource Server (validiert, stellt nicht aus; HS256, JWK, Nimbus `JwtEncoder`, Spring Authorization Server): https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html
- OWASP HTML5 Security Cheat Sheet (Web Storage): https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html
- OWASP CSRF Prevention Cheat Sheet (Custom Request Headers): https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OpenAPI Generator (Apache-2.0, Release, Generatoren): https://github.com/OpenAPITools/openapi-generator und https://github.com/OpenAPITools/openapi-generator/blob/master/LICENSE
- OpenAPI-Generator-Optionen `spring`: https://openapi-generator.tech/docs/generators/spring/
- Hey API: https://github.com/hey-api/openapi-ts · Orval: https://github.com/orval-labs/orval
- oasdiff: https://github.com/oasdiff/oasdiff · Spectral: https://github.com/stoplightio/spectral
- gitleaks: https://github.com/gitleaks/gitleaks · OSV-Scanner: https://github.com/google/osv-scanner
- OWASP Dependency-Check: https://github.com/dependency-check/DependencyCheck · Schemathesis: https://github.com/schemathesis/schemathesis
- React-Versionen: https://react.dev/versions · React-Lizenz: https://github.com/facebook/react · Vite: https://vite.dev/releases
- Repo-Inhalte (Sync `main`): `documentation/architecture/2_constraints.md`, `9_architecture_decisions.md`, `backend_requirements.md`, `frontend_requirements.md`, `backend_guidelines.md`
