# Guidelines for USE_NEXT

These guidelines apply to all parts of USE_NEXT (Frontend, Backend, integration with `use-core` and plugins).  
Detailed architecture and security aspects are described in the [Architecture](architecture/0_architecture_overview.md)
and only referenced here.

> Detailed guidelines for specific the frontend and backend are described in
> separate: [frontend guidelines](frontend/frontend_guidelines.md) / [backend guidelines](backend/backend_guidelines.md).

## 1. Architecture and Documentation Reference

- The architecture of USE_NEXT is described in the arc42 documentation:
  [Architecture Overview](architecture/0_architecture_overview.md).
- Goals, security focus, and system overview: [introduction_goals](architecture/1_introduction_goals.md).
- Technical and organisational constraints: [constraints](architecture/2_constraints.md).
- Solution concept, particularly reuse of `use-core`, separation of frontend/backend, OpenAPI, security decisions:
  [solution_strategy](architecture/4_solution_strategy.md).
- Central architecture decisions (ADRs) are bindingly documented
  in: [architecture_decisions](architecture/9_architecture_decisions.md).
- Known risks and technical debt are described in: [risks_technical_debts](architecture/11_risks_technical_debts.md).

## 2. Coding and Structure Conventions

- Programming language and framework-specific conventions (e.g., linting, formatting, naming schemas) follow respective
  community standards.
- The structuring of components and modules follows the principles described
  in [constraints](architecture/2_constraints.md) (modularisation, component-oriented, well-defined interfaces).
- For new modules/components, it must be checked into which existing building block they logically belong.

> Changes to the basic structure (e.g., new containers or layers) require an update
> of [building_block](architecture/5_building_block.md) and possibly new ADRs
> in [architecture_decisions](architecture/9_architecture_decisions.md).

## 3. Handling Architecture Decisions (ADRs)

- Central decisions are maintained as Architecture Decision Records
  in [architecture_decisions](architecture/9_architecture_decisions.md).
- New ADRs must be created when:
    - an existing decision is significantly changed or revoked, or
    - a new central technology, pattern, or security-relevant mechanism is introduced.

> Every implementation that deliberately deviates from an ADR must:
>  - describe the deviation in the PR and
>  - include a proposal for how the ADR documentation should be adapted.

## 4. Quality Assurance, PRs, and Pipelines

[//]: # (TODO create Piplines and PR rules)

- CI/build pipelines shall:
    - execute linters/formatters appropriate to the chosen technologies.
    - perform dependency and security checks (see dependency and risk considerations
      in [solution_strategy](architecture/4_solution_strategy.md)
      and [risks_technical_debts](architecture/11_risks_technical_debts.md)).
    - ensure consistency of OpenAPI specification and generated clients (see ADR-006
      in [architecture_decisions](architecture/9_architecture_decisions.md)).
- Every Pull Request references the relevant architecture and/or risk documents if decisions are affected:  
  [solution_strategy](architecture/4_solution_strategy.md), [architecture_decisions](architecture/9_architecture_decisions.md), [risks_technical_debts](architecture/11_risks_technical_debts.md).
- PR template includes at least:
    - Reference to affected ADRs (IDs from [architecture_decisions](architecture/9_architecture_decisions.md)), if
      applicable.
    - Confirmation that no security-relevant rules from the Solution Strategy (Chapter Security Decisions
      in [solution_strategy](architecture/4_solution_strategy.md)) are violated – or description of the justified
      exception.

## 5. Security-by-Design

- Security is treated as a cross-cutting concern. Fundamental principles are established
  in [solution_strategy](architecture/4_solution_strategy.md) (Security Decisions)
  and [architecture_decisions](architecture/9_architecture_decisions.md) (especially ADR-005, ADR-008).
- Both frontend and backend implementations consider:
    - secure processing and rendering of external data,
    - controlled communication between frontend and backend (OpenAPI-based),
    - conservative handling of sessions/tokens and error messages,
    - disciplined use of external dependencies.

> A detailed view on the prevention of those risk is found here:
> [security_risks_and_prevention.md](security/security_risks_and_prevention.md)

## 6. Maintenance and Evolution of Guidelines

- These project-wide guidelines are a living document and are adapted when relevant architecture, technology, or
  security changes occur.
- Changes to these guidelines should be made in a separate PR and ideally reference associated ADRs
  in [architecture_decisions](architecture/9_architecture_decisions.md).
- Before major architecture changes, it must be checked whether additional chapters in the arc42 documentation are
  needed or existing chapters must be extended:  
  [Architecture Overview](architecture/0_architecture_overview.md).