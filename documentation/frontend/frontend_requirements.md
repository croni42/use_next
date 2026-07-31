# Frontend Requirements

The following frontend requirements are derived from the target architecture, the solution strategy, and the identified
frontend-related [risks](../architecture/11_risks_technical_debts.md). They define the minimum expectations for a
maintainable, secure, and well-structured frontend within the **USE_NEXT** architecture.

## Structural Requirements

| ID    | Requirement                                                                                                                                      | Rationale                                                                                                |
|-------|--------------------------------------------------------------------------------------------------------------------------------------------------|----------------------------------------------------------------------------------------------------------|
| FR-01 | The frontend shall be structured into clearly separated layers for presentation, application logic, state handling, and technical communication. | This improves maintainability, testability, and traceability of responsibilities.                        |
| FR-02 | UI components shall not communicate directly with backend endpoints or `use-core` functions.                                                     | Technical communication must remain encapsulated and must not be mixed into the presentation layer.      |
| FR-03 | The frontend shall use a dedicated service or API layer for communication with the backend.                                                      | This creates a single and controlled communication path for requests, responses, and technical concerns. |
| FR-04 | The frontend shall treat the backend as the only integration point for domain-related operations.                                                | Access to `use-core` must remain encapsulated by the backend wrapper.                                    |
| FR-05 | The frontend shall keep domain-independent UI concerns separate from technical integration logic.                                                | This reduces coupling and supports reuse and easier change management.                                   |

## State and Interaction Requirements

| ID    | Requirement                                                                                                                           | Rationale                                                                                                           |
|-------|---------------------------------------------------------------------------------------------------------------------------------------|---------------------------------------------------------------------------------------------------------------------|
| FR-06 | The frontend shall manage application state in a traceable and consistent manner.                                                     | Scattered state handling across individual UI components increases complexity and error-proneness.                  |
| FR-07 | The frontend shall handle user interactions through application-level logic rather than embedding workflow control directly in views. | Use cases such as loading models, triggering checks, and showing results should remain understandable and testable. |
| FR-08 | The frontend shall provide consistent handling of loading, success, and error states.                                                 | Predictable UI behaviour improves usability and reduces ambiguity during failures or delayed responses.             |

## API and Integration Requirements

| ID    | Requirement                                                                                                                       | Rationale                                                                                     |
|-------|-----------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| FR-09 | The frontend shall communicate with the backend through the internal API defined for **USE_NEXT**.                                | This ensures a stable architectural boundary between frontend and backend.                    |
| FR-10 | The frontend shall use the OpenAPI specification as the authoritative contract for backend communication.                         | The API contract should be explicit, consistent, and shared across both sides.                |
| FR-11 | The frontend shall use generated API client code where this is part of the chosen implementation approach.                        | Generated clients reduce manual integration errors and improve consistency with the contract. |
| FR-12 | The frontend shall regenerate and adapt API-related code when the OpenAPI contract changes.                                       | Contract changes must be reflected systematically in the frontend implementation.             |
| FR-13 | The frontend shall standardise request handling, response mapping, and technical error processing within the communication layer. | These concerns should not be duplicated across UI components or feature modules.              |

## Security Requirements

| ID    | Requirement                                                                                                                                      | Rationale                                                                                      |
|-------|--------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------|
| FR-14 | The frontend shall render untrusted data safely by default.                                                                                      | External or backend-provided data may otherwise lead to XSS-related issues.                    |
| FR-15 | The frontend shall avoid unsafe DOM manipulation such as unrestricted HTML injection.                                                            | Unsafe rendering paths increase the risk of introducing client-side vulnerabilities.           |
| FR-16 | The frontend shall use sanitisation only in clearly defined and controlled cases where HTML rendering is required.                               | Sanitisation should not be scattered across arbitrary components.                              |
| FR-17 | The frontend shall not transmit session information, tokens, or similarly sensitive data via URLs.                                               | URL-based transport increases the risk of leakage through logs, browser history, or referrers. |
| FR-18 | The frontend shall support the chosen authentication method consistently according to the OpenAPI-defined security scheme.                       | Authentication handling must match the agreed internal API contract.                           |
| FR-19 | The frontend may perform supporting client-side validation, but it shall not enforce security-critical or business-critical rules independently. | Authorisation, mandatory validation, and security decisions remain backend responsibilities.   |
| FR-20 | The frontend shall handle security-relevant error situations in a controlled and non-revealing manner.                                           | Error presentation should support usability without exposing unnecessary technical details.    |

## Quality Requirements

| ID    | Requirement                                                                                                                          | Rationale                                                                                     |
|-------|--------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|
| FR-21 | The frontend shall use a controlled set of dependencies and minimise unnecessary third-party libraries.                              | Each dependency increases maintenance effort and potential security exposure.                 |
| FR-22 | The frontend shall be integrated into automated checks such as linting, testing, and dependency scanning.                            | Early detection of implementation and security issues improves development quality.           |
| FR-23 | The frontend shall remain extensible for later additions such as authentication, remote execution, or extended backend capabilities. | The architecture should support future evolution without requiring fundamental restructuring. |

## Scope Note

These requirements describe the expected properties of the frontend within the planned **USE_NEXT** target architecture.
They assume a frontend that communicates with the system exclusively through the backend and its internal API. They do
not replace backend responsibilities for validation, authorisation, and security enforcement, but define how the
frontend should be structured to support these responsibilities in a consistent and maintainable way.

> see also: [backend requirements](../backend/backend_requirements.md)