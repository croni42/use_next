# USE_NEXT

**USE_NEXT** is a redesign and modernisation project based on **USE** (UML-based Specification Environment), an
open-source
system for the specification and validation of information systems using a subset of UML and OCL.

The purpose of **USE_NEXT** is not to replace the original domain idea of USE, but to re*use* the core and build a
clearer
and more maintainable architecture around it, with a particular focus on maintainability and security. While USE is the
existing reference system and technical foundation, **USE_NEXT** represents the new architectural vision derived
from its analysis.

## Relation to USE

**USE** is the original open-source project maintained in the `useocl/use` [repository](https://github.com/useocl/use).
It provides the established functional basis for modelling, checking, and validating UML/OCL-based specifications.

## Project Goal

The goal of **USE_NEXT** is to define and document a future-oriented architecture for the next evolution of USE. This
includes analysing the current system, identifying architectural and security-related weaknesses, and deriving a
structured target concept for a modern implementation.

## Project Status

[//]: # (TODO update README on status change)

**USE_NEXT** is currently in an analysis and design phase. At this stage, the repository primarily contains conceptual
work, architectural documentation, and project guidelines rather than a finished implementation. The central
technology decisions are made. Implementation steps will be based on these documented foundations.

## Technology Overview

| Area             | Decision                                                                         |
|------------------|----------------------------------------------------------------------------------|
| Frontend         | React, TypeScript (strict), Vite                                                 |
| Backend          | Java 21, Spring Boot 4.1.x (Spring MVC), Maven                                   |
| Core integration | `use-core` in-process through a dedicated adapter package                        |
| API contract     | OpenAPI (spec-first), OpenAPI Generator for TypeScript client and Spring server interfaces |
| Authentication   | Server-side session with `HttpOnly`, `Secure`, `SameSite=Strict` cookie and CSRF token |
| CI               | GitHub Actions, staged checks that can be run locally                            |

Required toolchain: JDK 21 and Node.js (LTS). Details and rationale:
[ADRs](documentation/architecture/9_architecture_decisions.md).

# Documentation

The documentation in this repository is organised by topic so that architectural decisions, security considerations, and
implementation-related guidance can be accessed quickly.

## Guidelines

For developers, the most relevant starting point is the set of project guidelines. These documents summarise the
architectural principles, security constraints, and implementation expectations that should be considered before making
changes or adding new components.
> - [Guidelines (guidelines.md)](documentation/guidelines.md)

## Architecture

The architecture documentation defines the technical foundation and target architecture of USE_NEXT. It captures the
main architectural goals, decisions, and building blocks and serves as the basis for the further development of the
system.
> - [Architecture summary arc42 (0_architecture.md)](documentation/architecture/0_architecture_overview.md)

### Frontend

> - [Overview (FRONTEND.md)](documentation/frontend/FRONTEND.md)

### Backend

> - [Overview (BACKEND.md)](documentation/backend/BACKEND.md)

## Security

Security was considered from the beginning as a foundation for the architecture of USE_NEXT. The relevant risks
and preventive measures are documented in detail
in [security_risks_and_prevention.md](documentation/security/security_risks_and_prevention.md) and used as a basis
for the architectural decisions.
> - [Overview (security.md)](documentation/security/security.md)

# TL;DR

- **USE** = existing UML/OCL-based specification and validation environment
- **USE_NEXT** = modernisation and redesign project based on USE

When working on the project, developers should review the [guidelines](documentation/guidelines.md)
first and then continue with the topic-specific documentation relevant to the task at hand.

