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
OpenAPI specification as the central API contract. Based on this specification, client code can be generated
automatically and integrated into the frontend build and development workflow. This reduces manual inconsistencies
between frontend and backend, improves maintainability and supports a more stable and traceable integration.

> [Architecture overview — USE_NEXT](0_architecture_overview.md)

## Strategic Decisions

| Objective / Requirement             | Architectural Approach                           | Implementation                                                                                                                                                                       |
|-------------------------------------|--------------------------------------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Reuse of `use-core`                 | Using `use-core` as an existing external system  | The existing USE system provides the `use-core` module. This module is reused and connected to the newly designed **USE_NEXT** architecture through an adapter or integration layer. |
| Backend application as wrapper      | Defining the backend as a wrapper for `use-core` | `use-core` is accessed by the backend application through a dedicated integration layer. This keeps technical core access details out of the frontend.                               |
| Maintainable frontend               | Modular, component-oriented target architecture  | UI components, a central service layer and clearly separated responsibilities for rendering, interaction, state handling and backend communication are introduced.                   |
| Stable frontend-backend integration | Contract-first API definition with OpenAPI       | The API is described through an OpenAPI specification and used as the central contract between frontend and backend.                                                                 |
| Reduced integration errors          | Automated client generation from API contract    | Frontend API client code, request/response models and type definitions are generated from the OpenAPI specification and regenerated when the API changes.                            |

## Security Decisions

| Objective / Requirement                 | Architectural Approach                                                | Implementation                                                                                                                                                                           |
|-----------------------------------------|-----------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Protection against XSS                  | Secure default rendering rules instead of unrestricted HTML injection | Untrusted data is rendered escaped by default. Unsafe DOM sinks such as `innerHTML` are avoided or only used in a controlled manner with sanitization.                                   |
| Handling of HTML content                | Centralized sanitization instead of distributed ad hoc logic          | If HTML is required for functional reasons, sanitization is performed via a dedicated component, not directly within individual views.                                                   |
| Secure API integration                  | Unified API client and defined request pathways                       | Backend calls are routed through central services or generated API clients to ensure consistent headers, error handling and authentication handling.                                     |
| Protection of state-changing operations | CSRF-aware request strategy                                           | For cookie-based authentication, SameSite policies, token mechanisms, Origin/Referer validation and secure use of HTTP methods are considered.                                           |
| Secure session handling                 | Conservative handling of sessions and tokens                          | Session data is not transmitted via URLs. Sensitive session information is protected through secure browser mechanisms, HTTPS and clearly defined timeout policies.                      |
| Avoidance of misconfigurations          | Security by default for browser and server integration                | Restrictive CSP, controlled external sources, strict CORS configuration and avoidance of unnecessary inline scripts are applied.                                                         |
| Protection against UI-based attacks     | Safeguards against embedding and deceptive interaction                | Clickjacking protection and deliberate design of sensitive interactions are used as complementary safeguards.                                                                            |
| Control of external libraries           | Reduced and controlled dependency usage                               | Only necessary libraries, fixed versions, regular vulnerability checks and documented approval of new dependencies are required.                                                         |
| Early detection of security issues      | Automated checks in the development process                           | PR checks, linting, dependency scans and validation of security headers and relevant configuration are integrated into CI/CD pipelines.                                                  |
| Definition of authentication method     | OpenAPI security scheme as central API contract                       | The authentication method, such as bearer token or cookie-based session handling, is defined in the OpenAPI specification and used as the authoritative source for frontend and backend. |

## Scope

The objective of the current state of the project is not the full implementation of an industrial end-to-end security
program. In particular, topics such as comprehensive security monitoring, incident response, in-depth formal threat
modelling or highly specialised browser hardening measures are acknowledged but not fully implemented.

Likewise, the frontend does not replace server-side security enforcement. Validation, authorisation and
business-critical security decisions must continue to be enforced in the backend. The frontend can only provide
supporting measures, not guarantees.

> Additional information: [backend_guidelines.md](../backend/backend_guidelines.md)