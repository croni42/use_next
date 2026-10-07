# Overview

## Guidelines
> Guidelines can be found here: [Backend guidelines](backend_guidelines.md)

## Requirements
> Requirements can be found here: [Backend requirements](backend_requirements.md) 

## Target Architecture 
> Detailed architecture documentation found
> here: [Architecture summary arc42 (0_architecture.md)](/documentation/architecture/0_architecture_overview.md)

The target architecture of **USE_NEXT** follows a clear separation between frontend, backend, and the reused
`use-core`. The frontend is responsible for presentation, user interaction, and client-side state handling, while the
backend acts as the single integration layer towards `use-core` and other technical services.

Within the frontend itself, presentation, application logic, and technical communication are separated in order to
improve maintainability, testability, and traceability. UI components must not communicate directly with backend
endpoints or core functions, but instead use clearly defined frontend services that encapsulate API access and related
technical concerns.

The backend is implemented in Java 21 with Spring Boot 4.1.x (Spring MVC) and built with Maven. `use-core` is
integrated in-process through one adapter package (ADR-009).

Communication between frontend and backend is based on an internal API. This API is described through an OpenAPI
specification, which serves as the central contract between both parts of the system. Controllers implement server
interfaces generated from it at build time (ADR-006, ADR-010).

Security is treated as a cross-cutting concern throughout the architecture. Relevant measures include controlled
handling of untrusted data, standardised error processing, restricted communication paths, server-side sessions with
CSRF protection (ADR-008), and a clear separation of responsibilities between frontend and backend.