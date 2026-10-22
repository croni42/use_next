# Frontend Requirements

The following frontend requirements are derived from the target architecture, the solution strategy, and the identified
frontend-related [risks](../architecture/11_risks_technical_debts.md). They define the minimum expectations for a
maintainable, secure, and well-structured frontend within the **USE_NEXT** architecture.

## Structural Requirements

| ID    | Requirement                                                                                                                                      | Rationale                                                                                                |
|-------|--------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| <a id="fr-01"></a>FR-01 | The frontend shall be structured into clearly separated layers for presentation, application logic, state handling, and technical communication. | This improves maintainability, testability, and traceability of responsibilities.                        |
| <a id="fr-02"></a>FR-02 | UI components shall not communicate directly with backend endpoints or `use-core` functions.                                                     | Technical communication must remain encapsulated and must not be mixed into the presentation layer.      |
| <a id="fr-03"></a>FR-03 | The frontend shall use a dedicated service or API layer for communication with the backend.                                                      | This creates a single and controlled communication path for requests, responses, and technical concerns. |
| <a id="fr-04"></a>FR-04 | The frontend shall treat the backend as the only integration point for domain-related operations.                                                | Access to `use-core` must remain encapsulated by the backend wrapper.                                    |
| <a id="fr-05"></a>FR-05 | The frontend shall keep domain-independent UI concerns separate from technical integration logic.                                                | This reduces coupling and supports reuse and easier change management.                                   |

## State and Interaction Requirements

| ID    | Requirement                                                                                                                           | Rationale                                                                                                           |
|-------|---------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------|
| <a id="fr-06"></a>FR-06 | The frontend shall manage application state in a traceable and consistent manner.                                                     | Scattered state handling across individual UI components increases complexity and error-proneness.                  |
| <a id="fr-07"></a>FR-07 | The frontend shall handle user interactions through application-level logic rather than embedding workflow control directly in views. | Use cases such as loading models, triggering checks, and showing results should remain understandable and testable. |
| <a id="fr-08"></a>FR-08 | The frontend shall provide consistent handling of loading, success, and error states.                                                 | Predictable UI behaviour improves usability and reduces ambiguity during failures or delayed responses.             |

## API and Integration Requirements

| ID    | Requirement                                                                                                                       | Rationale                                                                                     |
|-------|-----------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| <a id="fr-09"></a>FR-09 | The frontend shall communicate with the backend through the internal API defined for **USE_NEXT**.                                | This ensures a stable architectural boundary between frontend and backend.                    |
| <a id="fr-10"></a>FR-10 | The frontend shall use the OpenAPI specification as the authoritative contract for backend communication.                         | The API contract should be explicit, consistent, and shared across both sides.                |
| <a id="fr-11"></a>FR-11 | The frontend shall access the backend only through the API client generated from the OpenAPI specification ([ADR-006](../architecture/9_architecture_decisions.md#adr-006-openapi-based-code-generation-for-api-stability), [ADR-010](../architecture/9_architecture_decisions.md#adr-010-openapi-code-generation--scope-and-generator)), wrapped by a single communication layer; code outside that layer shall not make HTTP requests itself. | Generated clients reduce manual integration errors and improve consistency with the contract; lint rules and the drift check enforce it. |
| <a id="fr-12"></a>FR-12 | The frontend shall regenerate and adapt API-related code when the OpenAPI contract changes.                                       | Contract changes must be reflected systematically in the frontend implementation.             |
| <a id="fr-13"></a>FR-13 | The frontend shall standardise request handling, response mapping, and technical error processing within the communication layer. | These concerns should not be duplicated across UI components or feature modules.              |

## Security Requirements

| ID    | Requirement                                                                                                                                      | Rationale                                                                                      |
|-------|--------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| <a id="fr-14"></a>FR-14 | The frontend shall render untrusted data safely by default.                                                                                      | External or backend-provided data may otherwise lead to XSS-related issues.                    |
| <a id="fr-15"></a>FR-15 | The frontend shall avoid unsafe DOM manipulation such as unrestricted HTML injection.                                                            | Unsafe rendering paths increase the risk of introducing client-side vulnerabilities.           |
| <a id="fr-16"></a>FR-16 | The frontend shall use sanitisation only in clearly defined and controlled cases where HTML rendering is required.                               | Sanitisation should not be scattered across arbitrary components.                              |
| <a id="fr-17"></a>FR-17 | The frontend shall not transmit session information, tokens, or similarly sensitive data via URLs.                                               | URL-based transport increases the risk of leakage through logs, browser history, or referrers. |
| <a id="fr-18"></a>FR-18 | The frontend shall support the chosen authentication method consistently according to the OpenAPI-defined security scheme.                       | Authentication handling must match the agreed internal API contract.                           |
| <a id="fr-19"></a>FR-19 | The frontend may perform supporting client-side validation, but it shall not enforce security-critical or business-critical rules independently. | Authorisation, mandatory validation, and security decisions remain backend responsibilities.   |
| <a id="fr-20"></a>FR-20 | The frontend shall handle security-relevant error situations in a controlled and non-revealing manner.                                           | Error presentation should support usability without exposing unnecessary technical details.    |

## Quality Requirements

| ID    | Requirement                                                                                                                          | Rationale                                                                                     |
|-------|--------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| <a id="fr-21"></a>FR-21 | The frontend shall use a controlled set of dependencies and minimise unnecessary third-party libraries.                              | Each dependency increases maintenance effort and potential security exposure.                 |
| <a id="fr-22"></a>FR-22 | The frontend shall be integrated into automated checks such as linting, testing, and dependency scanning.                            | Early detection of implementation and security issues improves development quality.           |
| <a id="fr-23"></a>FR-23 | The frontend shall remain extensible for later additions such as authentication, remote execution, or extended backend capabilities. | The architecture should support future evolution without requiring fundamental restructuring. |

## Scope Note

These requirements describe the expected properties of the frontend within the planned **USE_NEXT** target architecture.
They assume a frontend that communicates with the system exclusively through the backend and its internal API. They do
not replace backend responsibilities for validation, authorisation, and security enforcement, but define how the
frontend should be structured to support these responsibilities in a consistent and maintainable way.

> see also: [backend requirements](../backend/backend_requirements.md)