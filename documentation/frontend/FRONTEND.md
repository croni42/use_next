# Overview

## Guidelines
> Guidelines can be found here: [Frontend guidelines](frontend_guidelines.md)

## Requirements
> Requirements can be found here: [Frontend requirements](frontend_requirements.md)

## Target Architecture

> Detailed architecture documentation found
> here: [Architecture summary arc42 (0_architecture.md)](../architecture/0_architecture_overview.md)

The target architecture of **USE_NEXT** follows a clear separation between frontend, backend, and the reused
`use-core`. The frontend is responsible for presentation, user interaction, and client-side state handling, while the
backend acts as the single integration layer towards `use-core` and other technical services.

Within the frontend itself, presentation, application logic, and technical communication are separated in order to
improve maintainability, testability, and traceability. UI components must not communicate directly with backend
endpoints or core functions, but instead use clearly defined frontend services that encapsulate API access and related
technical concerns.

The frontend is implemented with React and TypeScript (strict mode) and built with Vite (ADR-007).

Communication between frontend and backend is based on an internal API. This API is described through an OpenAPI
specification, which serves as the central contract between both parts of the system. The TypeScript client is
generated from it (`typescript-fetch`), committed, and checked for drift in CI (ADR-006, ADR-010).

Security is treated as a cross-cutting concern throughout the architecture. Relevant measures include controlled
handling of untrusted data, standardised error processing, restricted communication paths, cookie-based session
handling with CSRF header (ADR-008), and a clear separation of responsibilities between frontend and backend.