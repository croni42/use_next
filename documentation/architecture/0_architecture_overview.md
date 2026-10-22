# Architecture Overview

This architecture documentation describes the essential domain and technical foundations of the system **USE_NEXT**.
The system is structured as a modular web-based architecture with a dedicated backend integration layer and the
controlled reuse of `use-core`. Security is considered an integral part of the architectural design from the beginning.

The content is distributed across multiple sections that together provide an overview of objectives, constraints,
context, solution strategy, building blocks, and key architectural decisions.

<!-- TOC -->
* [Architecture Overview](#architecture-overview)
  * [1 Introduction & Goals](#1-introduction--goals)
  * [2 Constraints](#2-constraints)
  * [3 Context](#3-context)
  * [4 Solution Strategy](#4-solution-strategy)
  * [5 Building Block](#5-building-block)
  * [9 Architecture Decisions](#9-architecture-decisions)
  * [11 Risks & Technical Debts](#11-risks--technical-debts)
  * [Note on the Documentation](#note-on-the-documentation)
    * [Arc42](#arc42)
<!-- TOC -->

## 1 Introduction & Goals

The introduction in [1_introduction_goals.md](1_introduction_goals.md) describes the system, its objectives, and the
focus on architecture and security aspects. It also explains that the system will initially be operated
locally and that security measures are therefore considered preventively and in an architecture-related manner.

## 2 Constraints

The file [2_constraints.md](2_constraints.md) documents the relevant technical, organisational, and project-related
constraints. These include, in particular, assumptions about local execution, reuse of existing system parts,
maintainability, and documentation-related conventions.

## 3 Context

In [3_context.md](3_context.md), the system context is described. This section shows which actors and external or
connected systems interact with **USE_NEXT** and how the system is embedded domain-wise.

## 4 Solution Strategy

The file [4_solution_strategy.md](4_solution_strategy.md) contains the solution strategy. It describes the main
design directions for the system, including the reuse of `use-core`, the separation of frontend and backend, the
use of an internal API, and the key security-related decisions.

In addition, the chapter summarises the intended use of OpenAPI as a basis for interface definition and client
generation, as well as the role of central technical and security-related implementation rules.

## 5 Building Block

The file [5_building_block.md](5_building_block.md) summarises the most important building blocks or containers of
the system. It briefly describes the responsibilities of the frontend, backend, `use-core`, and optional plugins.

## 9 Architecture Decisions

In [9_architecture_decisions.md](9_architecture_decisions.md), the key architectural decisions are documented as ADRs.
These include, in particular, the reuse of `use-core`, the separation of frontend and backend, the backend as
a wrapper around the `use-core`, the modular architecture, OpenAPI-based code generation for client and server, and
the technology decisions: frontend framework (React, TypeScript, Vite), the cookie-based session concept, the backend
stack (Java 21, Spring Boot, in-process integration of `use-core`) and the staged CI model.

## 11 Risks & Technical Debts

The file [11_risks_technical_debts.md](11_risks_technical_debts.md) documents the currently known remaining risks and
technical debt. It focuses on residual frontend, backend, and plugin-related risks that remain relevant despite the
chosen architecture and solution strategy.

## Note on the Documentation

The documents presented here are to be understood as a living architecture documentation. With progress in technical
implementation, new insights, and further architectural decisions, the content should be continuously reviewed,
supplemented, and adapted as needed.

> For documentation handling follow the [guidelines for USE_NEXT](../guidelines.md)

### Arc42

This architecture documentation is based on the `arc42 Template`, which is used as a structuring template for
describing the system architecture. arc42 is conceived as a pragmatic and adaptable documentation model and can be
tailored to project-specific requirements.

Therefore, not all arc42 chapters are fully adopted in this documentation. Instead, only those parts are used that
are relevant for the system under consideration and the current state of architecture work.

> see [licence_attribution.md](licence_attribution.md) for the arc42 licence information