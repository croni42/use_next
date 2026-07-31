# Backend Guidelines for USE_NEXT

[//]: # (TODO update guidelines after technologies have been defined)

These guidelines relate to the backend container `use-back` and are derived from
the [architecture](../architecture/0_architecture_overview.md)
and the [backend requirements](backend_requirements.md) for **USE_NEXT**. They define project-specific rules intended to
ensure that the backend supports the planned architecture in a stable, secure and maintainable way.

> Guidelines need to be updated after technologies have been defined for the backend. Framework/Tool specific details
> have to be considered.

***

## 1. Scope and technology assumptions

- The backend `use-back` is the sole integration gateway between `use-web` (frontend) and `use-core` (existing **USE**
  system).
- For communication with the frontend, the backend provides an internal HTTP API that is fully and bindingly described
  by an OpenAPI specification.
- Access to `use-core` takes place exclusively through a dedicated integration or adapter layer in the backend, so that
  core-specific details are not visible in the frontend.

***

## 2. Structural and layering guidelines

- The backend must clearly separate at least the following logical layers:
    - API layer (controllers/endpoints)
    - application/use-case layer
    - integration/adapter layer to `use-core`
    - technical infrastructure (persistence, messaging,
      configuration).
- The API layer must not contain business logic, but instead delegates to clearly defined use-case services. Integration
  details for `use-core` belong exclusively to the adapter layer.
- Structural changes must be documented in the [building blocks](../architecture/5_building_block.md) and
  the [ADRs](../architecture/9_architecture_decisions.md).

***

## 3. API and communication guidelines

- The backend must provide a stable internal API endpoint for the frontend. This API is the only permitted communication
  path between `use-web` and `use-core` (over `use-back`).
- The OpenAPI specification is the single source of truth for request/response structures, error codes and security
  schemes. Changes without coordinated versioning are not permitted.
- Every API change must follow a controlled evolution strategy (versioning, explicit deprecation,
  migration notes) to avoid contract drift with the frontend.
- Response behaviour for loading states, errors and timeouts must be consistent and predictable so that the frontend can
  implement robust loading and error states.

> The OpenAPI specification should be designed in such a way that server and client code can be generated from it
> automatically (e.g. API stubs, data models, type definitions). This reduces manual inconsistencies between the
> backend implementation and the frontend client, improves maintainability and supports a traceable evolution of the API
> contract.

***

## 4. Validation, authentication and authorisation

- Security-relevant and technically critical input must be validated server-side by the backend. Client-side validation
  serves usability only.
- Authorization must be enforced fully in the backend. UI-based restrictions must never be the sole protection
  mechanism.
- The backend centrally defines the authentication method (e.g. token-based or cookie-based) and documents it in the
  OpenAPI security scheme. Frontend and backend must implement this scheme consistently.
- Session and token handling (lifetime, invalidation, refresh mechanisms) must be clearly defined and implemented
  consistently to prevent misuse.

***

## 5. Security and data handling

- Session IDs, tokens and other sensitive data must not be transmitted via URLs (including query parameters or
  fragments) to avoid leakage through logs, browser history and referrers.
- The backend must provide suitable security-related HTTP headers (e.g. CSP, clickjacking protection, CORS, HSTS), so
  that the browser protection mechanisms intended in the frontend are effectively supported.
- Error responses, especially in security contexts (authentication errors, access denied), should provide sufficient
  information for the UI without disclosing internal details or implementation information.
- State-changing operations (e.g. start analysis, modify data) must be protected by suitable safeguards against
  CSRF/misuse, depending on the chosen authentication approach.

***

## 6. Integration guidelines for use-core

- Access to `use-core` takes place via a clearly defined adapter or integration layer that encapsulates interfaces,
  mapping and error handling.
- The API toward the frontend must remain stable even if internal details of `use-core` change. Necessary adjustments
  are implemented within the adapter layer.
- Return values and errors from `use-core` are transformed into backend domain models and clearly defined error codes
  before being passed to the frontend.

***

## 7. Dependency and build guidelines

- The backend must follow a controlled dependency policy (review of new dependencies, fixed versions,
  regular vulnerability checks), because supply-chain risks affect the stability and security of both frontend and
  backend.
- The build and CI setup must ensure that the OpenAPI specification and the API implementation remain consistent.
  Detected discrepancies must be resolved before merge.
- Security-relevant configurations (e.g. CORS, CSP, session settings) should be checked automatically or at least
  documented and validated regularly.

***

## 8. Quality and operations guidelines

- The backend must be integrated into automated quality and security checks (e.g. tests for API consistency, security
  checks, dependency scanning).
- Logging and monitoring should be designed so that security-relevant events are detectable without storing sensitive
  data in the logs.
- Standardized error and timeout handling is required to support a consistent UX in the frontend and to make technical
  issues visible at an early stage.

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
- Open backend-related risks and technical debts (e.g. technology choices, missing authentication, incomplete
  validation) must be tracked in the [risk documentation](../architecture/11_risks_technical_debts.md) and referenced
  from
  relevant PRs.
- Topics not fully covered here (e.g. security monitoring, incident response, in-depth threat modeling activities) are
  accepted as known limitations, but must remain visible
  in [risk and technical debt documentation](../architecture/11_risks_technical_debts.md).
