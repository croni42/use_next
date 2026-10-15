# Backend Requirements

The following backend requirements are derived from the frontend-oriented solution strategy and the identified
[risks](../architecture/11_risks_technical_debts.md).
They define the minimum expectations that the backend must fulfil in order to support the intended architecture
of **USE_NEXT** in a reliable and secure manner.

## Functional and Integration Requirements

| ID    | Requirement                                                                                                           | Rationale                                                                                                |
|-------|-----------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| <a id="br-01"></a>BR-01 | The backend shall provide a stable internal API as the single integration point for the frontend.                     | The frontend is designed to communicate with `use-core` only through the backend wrapper.                |
| <a id="br-02"></a>BR-02 | The backend shall encapsulate access to `use-core` through a dedicated integration or adapter layer.                  | This keeps core-specific implementation details out of the frontend and supports separation of concerns. |
| <a id="br-03"></a>BR-03 | The backend shall provide an OpenAPI specification for its internal API.                                              | The architecture relies on OpenAPI as the central contract between frontend and backend.                 |
| <a id="br-04"></a>BR-04 | The backend shall keep the OpenAPI specification complete, consistent and aligned with the implemented API behaviour. | Generated client code is only reliable if the specification is accurate.                                 |
| <a id="br-05"></a>BR-05 | The backend shall apply versioning or another controlled evolution strategy for internal API changes.                 | This reduces contract drift and lowers the risk of breaking frontend integrations.                       |

## Security Requirements

| ID    | Requirement                                                                                                                  | Rationale                                                                                                        |
|-------|------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------|
| <a id="br-06"></a>BR-06 | The backend shall enforce server-side validation for all security-relevant and business-relevant input.                      | Client-side validation improves usability, but it cannot provide reliable enforcement.                           |
| <a id="br-07"></a>BR-07 | The backend shall enforce authorisation on the server side and shall not rely on frontend restrictions.                      | UI-based restrictions can be bypassed through direct API access.                                                 |
| <a id="br-08"></a>BR-08 | The backend shall define the authentication method centrally and document it in the OpenAPI security scheme.                 | The authentication mechanism must be consistent across frontend and backend, even for an internal API.           |
| <a id="br-09"></a>BR-09 | The backend shall protect state-changing requests against CSRF where cookie-based or comparable session mechanisms are used. | CSRF protection remains a backend responsibility even if the frontend supports the chosen approach.              |
| <a id="br-10"></a>BR-10 | The backend shall not transmit session identifiers or similarly sensitive security data via URLs.                            | URL-based transport increases the risk of leakage through logs, browser history or referrers.                    |
| <a id="br-11"></a>BR-11 | The backend shall enforce secure session and token handling, including appropriate lifetimes and invalidation behaviour.     | Secure handling of authentication data is necessary to reduce session and token misuse.                          |
| <a id="br-12"></a>BR-12 | The backend shall return structured, minimal and consistent error responses.                                                 | Overly detailed error messages may expose internal implementation details and reduce frontend consistency.       |
| <a id="br-13"></a>BR-13 | The backend shall provide compatible and restrictive security-related HTTP headers and policies where applicable.            | Frontend protections such as CSP and related browser controls depend partly on backend and server configuration. |

## Quality and Operational Requirements

| ID    | Requirement                                                                                                                                | Rationale                                                                                                  |
|-------|--------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------|
| <a id="br-14"></a>BR-14 | The backend shall be integrated into automated checks for API consistency, security-relevant configuration and dependency vulnerabilities. | Security and contract issues should be detected early in the development process.                          |
| <a id="br-15"></a>BR-15 | The backend shall follow a controlled dependency policy, including review, fixed versions and regular vulnerability checks.                | Dependency and supply-chain risks affect both backend and frontend stability.                              |
| <a id="br-16"></a>BR-16 | The backend shall provide predictable response behaviour for loading, failure and timeout situations.                                      | The frontend depends on consistent backend behaviour to implement robust user feedback and loading states. |
| <a id="br-17"></a>BR-17 | The backend shall bound the resources a single request can use (input size, result size, duration, parallelism and, where the runtime permits, memory) and shall reject requests beyond these bounds with a defined, minimal error. | In-process evaluation by `use-core` can otherwise be driven to unbounded CPU and memory use by one request (see [BR-06](#br-06), [BR-12](#br-12), [BR-16](#br-16)). |

## Scope Note

These requirements describe the backend expectations that are necessary to support the planned architecture and
its security goals. They assume an internal API between frontend and backend, not a public external service. They do not
imply a full production-grade security program, but they define the minimum backend obligations required for a robust
and well-structured frontend-backend integration.

> see also: [frontend requirements](../frontend/frontend_requirements.md)