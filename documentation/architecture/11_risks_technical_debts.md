# 11. Risks and Technical Debt

This section documents the remaining architectural risks and the resulting technical debt after the main solution
strategy and architectural decisions have been defined. The risks are deliberately reduced through the chosen
architecture, but they cannot be completely eliminated.

> [Architecture overview — USE_NEXT](0_architecture_overview.md)

## Risks: Frontend

| Risk                                                   | Relevance                                                                          | Measure                                                                                                                                         | Expectation for the backend                                                       |
|--------------------------------------------------------|------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| Contract drift                                         | API changes may not be reflected consistently across all consumers                 | Using an OpenAPI-based contract and generated client code reduces this risk, but version mismatches and incomplete regeneration can still occur | The backend must maintain a stable and versioned API contract                     |
| Incomplete or incorrect OpenAPI specification          | Generated client code is only as reliable as the specification behind it           | Careful review, testing and build-time validation are required                                                                                  | The backend must keep the OpenAPI definition complete and consistent              |
| XSS through unsafe rendering of external or model data | Data from models, imports or backend responses may still contain malicious content | Escaping by default and controlled sanitisation reduce the risk, but unsafe DOM usage can still introduce problems                              | The backend should avoid returning unnecessary untrusted content where possible   |
| CSRF or unintended state-changing requests             | Relevant if cookie-based sessions or similar authentication are introduced         | CSRF tokens, SameSite cookies, Origin/Referer checks and safe HTTP methods are required                                                         | The backend must enforce CSRF protection for relevant requests                    |
| Incorrect handling of authentication data              | Tokens or session identifiers may be stored or transmitted insecurely              | Secure storage, short lifetimes and avoiding URL-based transmission are necessary                                                               | The backend must define and enforce a secure authentication and session model     |
| Dependency and supply-chain vulnerabilities            | Frontend frameworks and libraries can introduce security or maintenance risks      | Fixed versions, dependency reviews and vulnerability scans reduce but do not remove the risk                                                    | The backend and surrounding toolchain should follow the same dependency policy    |
| Security misconfiguration in browser-related controls  | CSP, CORS and other browser-facing settings may be incomplete or inconsistent      | Baseline policies and automated checks help, but configuration errors remain possible                                                           | The backend must provide compatible and restrictive security headers and policies |
| Error handling exposing internal details               | Overly detailed error messages may reveal implementation details                   | Standardised error handling reduces leakage, but edge cases may still occur                                                                     | The backend must return structured, minimal and consistent error responses        |

The architecture is exposed to various security-related risks, which arise in particular from the processing of
external data, interaction with user inputs, dependence on backend interfaces, and the use of external libraries. A
significant portion of these risks can be mitigated in the frontend, but not fully controlled, as effective security
enforcement in many cases is only possible in conjunction with the backend. These risks remain relevant despite the
chosen architecture, because the frontend still depends on external data, backend interfaces, and third-party libraries.

> A more detailed view on the security risks and prevention strategies are found
> here: [security_risks.md](../security/security_risks_and_prevention.md).
>
> The resulting requirements for the backend are found
> here: [backend_requirements.md](../backend/backend_requirements.md)

## Risks: Backend

| Risk                                           | Relevance                                                              | Measure                                                                                       | Expectation for the frontend                                            |
|------------------------------------------------|------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|-------------------------------------------------------------------------|
| Backend-side validation gaps                   | The frontend can support validation, but it cannot enforce it reliably | Client-side checks improve usability, but the backend must remain authoritative               | The frontend must not rely on UI validation alone                       |
| Authorisation bypass through direct API access | Users may call backend endpoints without using the UI                  | UI restrictions are only advisory. Authorisation must be enforced on the server               | The frontend must treat backend authorisation as the source of truth    |
| Integration complexity around `use-core`       | The wrapper architecture introduces an additional integration layer    | An adapter reduces coupling, but technical integration issues may still occur                 | The frontend should not depend on internal core details                 |
| Performance or responsiveness limitations      | Backend orchestration around `use-core` may affect response times      | Caching, batching and optimised orchestration can help, but will not remove all constraints   | The frontend should tolerate latency and present loading states clearly |
| Inconsistent API evolution                     | Backend changes may affect generated clients and existing workflows    | Versioning and contract discipline reduce the risk, but coordination effort remains necessary | The frontend must be updated together with API contract changes         |

> At the current state of the project, no further discussion of the backend or plugin risks is provided.

### Risks: Plugins

| Risk                               | Relevance                                                               | Measure                                                                                         | Expectation for the backend                                                  |
|------------------------------------|-------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------|
| Third-party plugin security issues | Optional plugins may extend the attack surface or introduce instability | Restrictive plugin selection, version pinning and review are required                           | The backend should expose only controlled and well-defined plugin interfaces |
| Plugin compatibility problems      | Plugins may not fit the modular architecture or future API changes      | Clear extension contracts and architectural boundaries reduce the risk, but do not eliminate it | The backend must keep plugin integration technically isolated                |
| Data exchange with plugins         | Plugin inputs and outputs may contain untrusted or malformed data       | Sanitisation, validation and strict interface definitions are needed                            | The backend must validate and constrain plugin-related data                  |

Plugins remain optional extensions and are therefore treated as a separate risk area. They may extend functionality, but
they also introduce additional integration and security concerns.

## Technical Debt

The main technical debt lies in the deliberate balance between a robust target architecture and the limited scope of the
project. Not all security measures can be implemented to production standard, especially in areas such as monitoring,
incident response and advanced hardening.

A further source of technical debt is the dependency on generated API clients and a maintained OpenAPI contract. This
improves consistency, but it also requires disciplined specification management and reliable build integration.

The modular architecture also depends on clear component boundaries, service abstractions and documentation. If
these are not applied consistently during implementation, maintainability and security traceability will gradually
decline.