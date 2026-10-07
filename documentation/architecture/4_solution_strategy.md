# 4. Solution Strategy

A pragmatic solution strategy is pursued: the new target architecture for **USE_NEXT** is intended to be modern,
modular and well-documented, while achieving a robust level of security with reasonable effort. The strategy therefore
combines a component-oriented architecture with clearly defined security rules that are embedded directly in
implementation, build processes and quality assurance.

The focus is not on fully covering all conceivable web risks, but on the targeted implementation of measures that
provide high practical value for a frontend project. The priorities lie in the secure rendering of untrusted data,
controlled communication with backend APIs, robust handling of state-changing operations, restrictive configuration
and the deliberate management of dependencies.

To strengthen interface stability between frontend and backend, the solution strategy also includes the use of an
OpenAPI specification as the central API contract (spec-first). Based on this specification, the TypeScript client
and the Spring server interfaces are generated automatically with one tool (OpenAPI Generator) and integrated into the
build and development workflow. This reduces manual inconsistencies between frontend and backend, improves
maintainability and supports a more stable and traceable integration.

> [Architecture overview — USE_NEXT](0_architecture_overview.md)

## Strategic Decisions

| Objective / Requirement             | Architectural Approach                           | Implementation                                                                                                                                                                       |
|-------------------------------------|--------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Reuse of `use-core`                 | Using `use-core` as an existing external system  | The existing USE system provides the `use-core` module. This module is reused and connected to the newly designed **USE_NEXT** architecture through an adapter or integration layer. |
| Backend application as wrapper      | Defining the backend as a wrapper for `use-core` | `use-core` is accessed by the backend application through a dedicated integration layer. This keeps technical core access details out of the frontend.                               |
| Maintainable frontend               | Modular, component-oriented target architecture  | UI components, a central service layer and clearly separated responsibilities for rendering, interaction, state handling and backend communication are introduced.                   |
| Stable frontend-backend integration | Contract-first API definition with OpenAPI       | The API is described through an OpenAPI specification and used as the central contract between frontend and backend.                                                                 |
| Reduced integration errors          | Automated code generation from API contract      | The TypeScript client is generated from the OpenAPI specification and committed. Server interfaces are generated at build time. Both are regenerated when the API changes (ADR-006, ADR-010). |
| Frontend technology                 | React and TypeScript (strict), Vite as build tool | Application state uses React's built-in mechanisms first. Additional state or UI libraries require a documented reason. Unsafe DOM sinks are flagged by ESLint (ADR-007).          |
| Backend technology                  | Java 21, Spring Boot 4.1.x (Spring MVC), Maven   | `use-core` is integrated in-process through one adapter package, the only place that imports `org.tzi.use.*`. An architecture test enforces this boundary (ADR-009).               |
| Early and repeatable quality checks | Staged CI on GitHub Actions                      | Stage 1 checks are mandatory before merge and runnable locally with one command (JDK 21, Node.js LTS, Maven Wrapper, npm; no Docker, accounts or API keys). Stage 2 is optional (ADR-011). |

## Security Decisions

| Objective / Requirement                 | Architectural Approach                                                | Implementation                                                                                                                                                                           |
|-----------------------------------------|-----------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Protection against XSS                  | Secure default rendering rules instead of unrestricted HTML injection | Untrusted data is rendered escaped by default. Unsafe DOM sinks such as `innerHTML` are avoided or only used in a controlled manner with sanitization.                                   |
| Handling of HTML content                | Centralized sanitization instead of distributed ad hoc logic          | If HTML is required for functional reasons, sanitization is performed via a dedicated component, not directly within individual views.                                                   |
| Secure API integration                  | Unified API client and defined request pathways                       | Backend calls are routed through central services or generated API clients to ensure consistent headers, error handling and authentication handling.                                     |
| Protection of state-changing operations | CSRF tokens plus SameSite cookie                                      | State-changing requests require a CSRF token provided by the backend (Spring Security) and sent by the communication layer in a request header. The session cookie uses `SameSite=Strict` (ADR-008). |
| Secure session handling                 | Server-side session with session cookie                               | The session cookie is `HttpOnly`, `Secure` and `SameSite=Strict`. The session ID is regenerated on login, sessions expire after 30 minutes of inactivity and logout invalidates the session on the server. Session data is never transmitted via URLs and never handled by frontend code (ADR-008). |
| Avoidance of misconfigurations          | Security by default for browser and server integration                | Restrictive CSP, controlled external sources, strict CORS configuration and avoidance of unnecessary inline scripts are applied.                                                         |
| Protection against UI-based attacks     | Safeguards against embedding and deceptive interaction                | Clickjacking protection and deliberate design of sensitive interactions are used as complementary safeguards.                                                                            |
| Control of external libraries           | Reduced and controlled dependency usage                               | Only necessary libraries, fixed versions and lockfiles, OSV-Scanner on `pom.xml` and `package-lock.json`, gitleaks for secrets and documented approval of new dependencies are required. CI actions are pinned to a commit SHA. |
| Early detection of security issues      | Automated checks in the development process                           | Stage 1 of the CI model (ADR-011): Spectral (OpenAPI, `apiKey` only in cookies), client drift check, ESLint security rules, integration tests for security headers, session and CSRF behaviour, architecture test, oasdiff, OSV-Scanner and gitleaks. |
| Definition of authentication method     | OpenAPI security scheme as central API contract                       | The cookie-based session is defined in the OpenAPI specification as an `apiKey` security scheme located in a cookie and referenced by all protected operations. The CSRF header is documented there. An `apiKey` in query parameters is not allowed (ADR-008). |

## Scope

The objective of the current state of the project is not the full implementation of an industrial end-to-end security
program. In particular, topics such as comprehensive security monitoring, incident response, in-depth formal threat
modelling or highly specialised browser hardening measures are acknowledged but not fully implemented.

Likewise, the frontend does not replace server-side security enforcement. Validation, authorisation and
business-critical security decisions must continue to be enforced in the backend. The frontend can only provide
supporting measures, not guarantees.

> Additional information: [backend_guidelines.md](../backend/backend_guidelines.md)