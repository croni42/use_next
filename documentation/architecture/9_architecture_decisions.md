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
  source of truth for REST API definitions, and client code will be automatically generated from this specification.
- **Rationale:** OpenAPI provides a standardised, language-neutral representation of REST APIs. Automatic code
  generation ensures that frontend API clients stay synchronised with backend changes, reduces manual implementation
  errors, and increases overall system stability.
- **Consequences:**
    - The OpenAPI specification must be maintained as the authoritative API contract.
    - Generated client code (models, API methods, types) is used in the frontend instead of manually written API
      clients.
    - Changes to the API require updating the OpenAPI spec and regenerating the client, not rewriting frontend API
      logic.
    - Tooling dependency (e.g., OpenAPI Generator) is introduced and must be integrated into the build pipeline.

## ADR-007: Frontend Framework (decision OPEN)

- **Status:** Open
- **Decision:** A modern, component-oriented web framework will be used for the frontend.
- **Rationale:** The user interface should be modular, maintainable, and easy to extend. An established framework
  supports clear component structures, centralised state management, and a clean separation of presentation and logic.
- **Consequences:** The specific technology choice affects maintainability, learning effort, build process, and the
  frontend’s security model.

## ADR-008: Authentication and Session Concept (decision OPEN)

- **Status:** Open
- **Decision:** The system uses a deliberately simple yet extensible authentication and session concept. The
  authentication method is defined centrally via OpenAPI security schemes and documented as part of the API contract.
- **Rationale:** The system will initially be operated locally, so complex identity management is not a primary concern.
  At the same time, the architecture should remain extensible for later additions such as login, roles, secure sessions,
  or token-based authentication. Defining the authentication method in the OpenAPI specification creates a consistent
  contract between frontend and backend and improves traceability of security-related interface decisions.
- **Consequences:** Session data will not be transmitted via URLs. If cookie-based sessions are introduced later, secure
  cookie attributes, clear lifetimes, and appropriate protective measures must be taken into account. Any authentication
  or session concept must be defined in the OpenAPI security scheme during implementation.
