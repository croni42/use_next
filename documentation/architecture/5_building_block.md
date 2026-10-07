# 5. Building Block View
> [Architecture overview — USE_NEXT](0_architecture_overview.md)

```plantuml
!include <C4/C4_Container>

LAYOUT_WITH_LEGEND()
title Container diagram for USE_NEXT

Person(modeler, "Modeler / Analyst", "Specifies, analyses and validates UML/OCL models")

System_Boundary(useNext, "USE_NEXT") {
    Container(useWeb, "use-web", "React, TypeScript, Vite", "Web UI for model visualization, interaction and analysis control (ADR-007)")
    Container(useBack, "use-back", "Java 21, Spring Boot 4.1.x", "REST API, server-side sessions, CSRF protection, validation, error mapping. Adapter package wraps use-core (ADR-008, ADR-009)")
}

System_Ext(useCore, "use-core", "Existing USE domain core: model processing, OCL evaluation, validation (ADR-001)")
System_Ext(usePlugins, "USE Plugin(s)", "Optional extensions providing additional USE functionality")

Rel(modeler, useWeb, "Uses", "Browser, HTTPS")
Rel_R(useWeb, useBack, "Makes API calls to", "JSON/HTTPS, OpenAPI-generated client (ADR-006, ADR-010)")
Rel_D(useBack, useCore, "Calls", "in-process Java, adapter package")
Rel_U(usePlugins, useCore, "Registers with", "PluginRuntime")
```
`use-core` runs in-process inside `use-back` (ADR-009). It is shown as an external system because it is an existing,
separately maintained project and not a separately deployable container of USE_NEXT.

[//]: # (Previous version: c4/container.drawio.png, kept until the code-based diagram is accepted)

| Container          | Technology                                              | Short Description                                                                                                                                                                                                                   |
|--------------------|---------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Frontend `use-web` | React, TypeScript (strict), Vite (ADR-007)              | Modern Web-Frontend for model visualization, interaction and analysis control. Provides responsive UI, state management and orchestrated communication with the Backend through the committed, generated TypeScript client (ADR-010). |
| Backend `use-back` | Java 21, Spring Boot 4.1.x (Spring MVC), Maven (ADR-009) | Integration layer for API access and connectivity to `use-core`. Controllers implement the generated OpenAPI interfaces. Handles server-side sessions, CSRF protection, validation and error mapping (ADR-008).                    |
| `use-core`         | Java, Maven (existing USE project)                      | Domain core for model processing, OCL evaluation, and validation. Integrated in-process through the adapter package of `use-back`.                                                                                                |
| USE Plugin(s)      | —                                                       | Optional extensions for additional functionality.                                                                                                                                                                                   |

## Internal Structure

### `use-web`

| Layer / Part                | Responsibility                                                                                        |
|-----------------------------|-------------------------------------------------------------------------------------------------------|
| Presentation                | React components for rendering and interaction.                                                       |
| Application / feature logic | Use cases and custom hooks. Chains API calls and derives state.                                       |
| State handling              | React built-in mechanisms (state, context, reducers) first (ADR-007).                                 |
| Communication layer         | Wraps the generated API client. Sends session cookie and CSRF header, maps results and errors (FR-13). |
| Generated API client        | `typescript-fetch` client generated from the OpenAPI specification and committed (ADR-010).           |

### `use-back`

| Layer / Part                | Responsibility                                                                                                       |
|-----------------------------|----------------------------------------------------------------------------------------------------------------------|
| API layer                   | Controllers implementing the interfaces generated from the OpenAPI specification at build time (not committed).       |
| Application / use cases     | Orchestration of use cases. No `use-core` details.                                                                   |
| Adapter package             | The only place that imports `org.tzi.use.*`. Maps `use-core` results and errors to backend models and error codes (BR-02). |
| Technical infrastructure    | Spring Security (session, CSRF, headers), Bean Validation, central error handling, configuration.                    |

## Cross-cutting Parts

| Part                  | Description                                                                                                                                               |
|-----------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------|
| OpenAPI specification | One file under version control. Single source of truth for both generators, including the cookie `apiKey` security scheme and the CSRF header (ADR-006). |
| CI pipeline           | GitHub Actions with a staged check model. Every check is runnable locally (ADR-011).                                                                      |

The structure is enforced by an architecture test for the adapter boundary (BR-02) and by the CI drift check for the
generated client.
