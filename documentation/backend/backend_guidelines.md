# Backend Guidelines for USE_NEXT

These guidelines relate to the backend container `use-back` and are derived from
the [architecture](../architecture/0_architecture_overview.md)
and the [backend requirements](backend_requirements.md) for **USE_NEXT**. They define project-specific rules intended to
ensure that the backend supports the planned architecture in a stable, secure and maintainable way. The technology
decisions are documented in ADR-008 to ADR-011 in the [ADRs](../architecture/9_architecture_decisions.md).

***

## 1. Scope and Technology Baseline

- The backend `use-back` is the sole integration gateway between `use-web` (frontend) and `use-core` (existing **USE**
  system).
- The backend is implemented in **Java 21** with **Spring Boot 4.1.x (Spring MVC)** and built with **Maven** (Maven
  Wrapper). Spring Security (sessions, CSRF) and Bean Validation are used. A deviation from the chosen Spring Boot line
  requires an update of ADR-009.
- For communication with the frontend, the backend provides an internal HTTP API that is fully and bindingly described
  by an OpenAPI specification.
- `use-core` is integrated **in-process** through one dedicated adapter package. This package is the only place that
  imports `org.tzi.use.*` (BR-02).

***

## 2. Structural and layering guidelines

- The backend must clearly separate at least the following logical layers:
    - API layer (controllers implementing the generated OpenAPI interfaces)
    - application/use-case layer
    - integration/adapter layer to `use-core` (dedicated adapter package)
    - technical infrastructure (configuration, security, error handling).
- The API layer must not contain business logic, but instead delegates to clearly defined use-case services. Integration
  details for `use-core` belong exclusively to the adapter layer.
- An architecture test enforces the adapter boundary: no class outside the adapter package imports `org.tzi.use.*`.
- Structural changes must be documented in the [building blocks](../architecture/5_building_block.md) and
  the [ADRs](../architecture/9_architecture_decisions.md).

***

## 3. API and communication guidelines

- The backend must provide a stable internal API endpoint for the frontend. This API is the only permitted communication
  path between `use-web` and `use-core` (over `use-back`).
- The OpenAPI specification is the single source of truth for request/response structures, error codes and security
  schemes. Changes without coordinated versioning are not permitted.
- Server interfaces are generated at build time with OpenAPI Generator (`spring` generator, option `interfaceOnly`) and
  are **not committed**. Controllers implement the generated interfaces and must not bypass them (ADR-010). The
  generator version is pinned exactly.
- Every API change must follow a controlled evolution strategy (versioning, explicit deprecation,
  migration notes) to avoid contract drift with the frontend. oasdiff checks for breaking changes against `main` in CI.
- Response behaviour for loading states, errors and timeouts must be consistent and predictable so that the frontend can
  implement robust loading and error states.
- The generated interfaces must be compatible with Spring Boot 4.x.

***

## 4. Validation, authentication and authorisation

- Security-relevant and technically critical input must be validated server-side by the backend (Bean Validation).
  Client-side validation serves usability only (BR-06).
- Authorization must be enforced fully in the backend. UI-based restrictions must never be the sole protection
  mechanism (BR-07).
- Authentication follows ADR-008: a login operation defined in the OpenAPI specification creates a server-side session
  and sets a session cookie with `HttpOnly`, `Secure` and `SameSite=Strict`. The session ID is regenerated on login.
- The method is documented in the OpenAPI specification as an `apiKey` security scheme located in a cookie and
  referenced by all protected operations. The required CSRF header is documented there as well. An `apiKey` in query
  parameters is not allowed (BR-08).
- Sessions expire after 30 minutes of inactivity (configurable). Logout invalidates the session on the server (BR-11).
  Sessions are held in server memory and end on backend restart.
- State-changing requests are protected by CSRF tokens using Spring Security's CSRF protection. The backend provides the
  token; the frontend sends it in a request header (BR-09).
- Unauthenticated access returns 401. User management is minimal (a configured user with a hashed password, no
  registration).
- Token-based authentication (bearer token) is not used. Introducing it requires an update of ADR-008.

***

## 5. Security and data handling

- Session IDs, tokens and other sensitive data must not be transmitted via URLs (including query parameters or
  fragments) to avoid leakage through logs, browser history and referrers (BR-10).
- The backend must provide suitable security-related HTTP headers (e.g. CSP, clickjacking protection, HSTS), so
  that the browser protection mechanisms intended in the frontend are effectively supported. Integration tests verify
  these headers (BR-13).
- CORS: if frontend and backend run on different origins, CORS is configured explicitly with credentials and a fixed
  allowed origin, never a wildcard. In development the dev-server proxy is preferred so both share one origin.
- The `Secure` cookie attribute is required whenever the application is served over HTTPS. Its handling for local
  development over plain HTTP is documented in the implementation.
- Error responses, especially in security contexts (authentication errors, access denied), should provide sufficient
  information for the UI without disclosing internal details or implementation information (BR-12).
- Tests cover at least: unauthenticated access returns 401; expired and invalidated sessions are rejected; a
  state-changing request without a valid CSRF token is rejected; cookie attributes are set; the session ID changes on
  login.

***

## 6. Integration guidelines for use-core

- Access to `use-core` takes place via the adapter package that encapsulates interfaces, mapping and error handling.
- The API toward the frontend must remain stable even if internal details of `use-core` change. Necessary adjustments
  are implemented within the adapter layer.
- Return values and errors from `use-core` are transformed into backend models and clearly defined error codes
  before being passed to the frontend.
- Before the first implementation PR the following is verified and documented (ADR-009): the used `use-core` files carry
  a licence header compatible with GPLv3, how `use-core` is obtained (published artefact or build from source), and how
  its objects behave under concurrent requests. If required, the adapter serialises access.

***

## 7. Dependency and build guidelines

- The backend must follow a controlled dependency policy (review of new dependencies, fixed versions,
  regular vulnerability checks), because supply-chain risks affect the stability and security of both frontend and
  backend (BR-15). OSV-Scanner covers `pom.xml` in CI; gitleaks scans for secrets.
- The build and CI setup must ensure that the OpenAPI specification and the API implementation remain consistent
  (generated interfaces at build time, Spectral linting, oasdiff). Detected discrepancies must be resolved before merge.
- Security-relevant configurations (e.g. CORS, CSP, session settings) are checked automatically by integration tests
  (stage 1 of ADR-011).
- The Maven Wrapper is used for all builds; no globally installed Maven is required.

***

## 8. Quality and operations guidelines

- The backend must be integrated into automated quality and security checks (stage 1 of ADR-011: security header,
  session and CSRF tests, architecture test, dependency scanning). All checks can be run locally with one command.
- Logging and monitoring should be designed so that security-relevant events are detectable without storing sensitive
  data (passwords, session IDs, CSRF tokens) in the logs.
- Standardized error and timeout handling is required to support a consistent UX in the frontend and to make technical
  issues visible at an early stage (BR-16).

***

## 9. Coding conventions and project organisation

- Backend-specific coding guidelines (e.g. naming conventions, package structure) should make the API, use-cases and
  integration layers clearly visible.
- New backend features should document which [ADRs](../architecture/9_architecture_decisions.md) and
  [building blocks](../architecture/5_building_block.md) they affect. PRs should reference relevant ADRs or propose new
  ones.
- Deviations from these guidelines must be explicitly justified in the PR and should lead either to an update of the
  guidelines or to new [ADRs](../architecture/9_architecture_decisions.md) if the deviation is intended to be permanent.

***

## 10. Evolution and open issues

- These backend guidelines are a living document and must be updated for major architectural changes, new security
  decisions or adjustments to the frontend target architecture.
- Before adding new containers, layers, or major modules in the backend, the impact on arc42 documentation (
  [building block view](../architecture/5_building_block.md), [solution strategy](../architecture/4_solution_strategy.md),
  [risks](../architecture/11_risks_technical_debts.md)) must be analysed and documented.
- Known later extensions: shared session store and user database (FR-23). These are not part of the current scope.
- Open backend-related risks and technical debts (e.g. technology choices, incomplete validation, `use-core` concurrency
  behaviour) must be tracked in the [risk documentation](../architecture/11_risks_technical_debts.md) and referenced
  from relevant PRs.
- Topics not fully covered here (e.g. security monitoring, incident response, in-depth threat modeling activities) are
  accepted as known limitations, but must remain visible
  in [risk and technical debt documentation](../architecture/11_risks_technical_debts.md).
