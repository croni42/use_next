# AGENTS.md

This file provides guidance to AI coding agents (Codex, Claude Code, etc.) when working with code in this repository.

## Project Status

**USE_NEXT is currently a documentation-only project.** No frontend or backend implementation code exists yet. Work is focused on arc42 architecture documentation and security design. No build, test, or lint commands are defined until implementation begins.

## What This Project Is

USE_NEXT modernizes the existing [USE (UML-based Specification Environment)](https://github.com/useocl/use) tool with a new web-based UI and backend integration layer, while reusing the existing Java domain core (`use-core`) unchanged.

## Planned System Architecture

Three containers (see [5_building_block.md](documentation/architecture/5_building_block.md) and [9_architecture_decisions.md](documentation/architecture/9_architecture_decisions.md)):

| Container | Role |
|-----------|------|
| `use-web` | Web frontend — UI, state management, backend communication |
| `use-back` | Backend integration layer — wraps `use-core`, exposes REST API |
| `use-core` | Existing USE domain core — model processing, OCL evaluation, validation (reused as-is, ADR-001) |

**API contract:** The OpenAPI specification is the single source of truth between `use-web` and `use-back`. Frontend API client code is generated from this spec — do not write manual API clients (ADR-006).

**Technology decisions (accepted):** React + TypeScript + Vite (ADR-007), cookie-based server-side session with CSRF token (ADR-008), Java 21 + Spring Boot 4.1.x + in-process `use-core` adapter (ADR-009), OpenAPI Generator for client and server (ADR-010), GitHub Actions staged CI (ADR-011).

## Documentation Structure

All documentation lives under `documentation/`. Key files:

- [guidelines.md](documentation/guidelines.md) — project-wide rules; start here
- [architecture/0_architecture_overview.md](documentation/architecture/0_architecture_overview.md) — arc42 index
- [architecture/1_introduction_goals.md](documentation/architecture/1_introduction_goals.md) — goals, security focus, system overview
- [architecture/2_constraints.md](documentation/architecture/2_constraints.md) — technical and organisational constraints
- [architecture/3_context.md](documentation/architecture/3_context.md) — system context
- [architecture/4_solution_strategy.md](documentation/architecture/4_solution_strategy.md) — strategic and security decisions (tables)
- [architecture/5_building_block.md](documentation/architecture/5_building_block.md) — building block view (containers, layers)
- [architecture/9_architecture_decisions.md](documentation/architecture/9_architecture_decisions.md) — all ADRs (ADR-001 through ADR-011)
- [architecture/11_risks_technical_debts.md](documentation/architecture/11_risks_technical_debts.md) — known residual risks
- [architecture/licence_attribution.md](documentation/architecture/licence_attribution.md) — licence and attribution notes
- [frontend/FRONTEND.md](documentation/frontend/FRONTEND.md) — frontend overview and entry point
- [frontend/frontend_guidelines.md](documentation/frontend/frontend_guidelines.md) — frontend-specific implementation rules
- [frontend/frontend_requirements.md](documentation/frontend/frontend_requirements.md) — frontend requirements (FR-xx)
- [backend/BACKEND.md](documentation/backend/BACKEND.md) — backend overview and entry point
- [backend/backend_guidelines.md](documentation/backend/backend_guidelines.md) — backend layering, validation, core integration rules
- [backend/backend_requirements.md](documentation/backend/backend_requirements.md) — backend requirements (BR-xx)
- [security/security.md](documentation/security/security.md) — security measures with reference backing
- [security/security_risks_and_prevention.md](documentation/security/security_risks_and_prevention.md) — risk catalog with mitigations
- [references.md](documentation/references.md) — external references
- `documentation/future/` ([arc_principles.md](documentation/future/arc_principles.md), [automation.md](documentation/future/automation.md)) — **future work (TODO)**; not binding yet, do not treat as accepted rules

## Architecture Decision Rules (ADRs)

A new ADR is required when:
- An existing accepted ADR is changed or revoked
- A new central technology, pattern, or security-relevant mechanism is introduced

Any implementation that **deliberately deviates** from an accepted ADR must describe the deviation in the PR and propose how the ADR documentation should be updated.

## PR Requirements

Every PR that touches architecture-relevant decisions must:
1. Reference the affected ADR IDs from [9_architecture_decisions.md](documentation/architecture/9_architecture_decisions.md)
2. Confirm no security rules from [4_solution_strategy.md](documentation/architecture/4_solution_strategy.md) (Security Decisions) are violated — or describe the justified exception

Structural changes (new containers, new layers) additionally require updating [5_building_block.md](documentation/architecture/5_building_block.md).

Implementation must also satisfy the requirements in [frontend_requirements.md](documentation/frontend/frontend_requirements.md) (FR-xx) and [backend_requirements.md](documentation/backend/backend_requirements.md) (BR-xx); reference affected IDs where relevant.

## Security-by-Design Principles

Security is a cross-cutting concern anchored centrally, not in scattered individual measures (ADR-005). Key rules that apply to all implementation work:

- **XSS:** Render untrusted data escaped by default; never use `innerHTML` directly; use a dedicated sanitization component for any required HTML rendering
- **API calls:** All backend calls go through central services or OpenAPI-generated clients — no ad hoc fetch calls
- **Session data:** Never transmitted via URLs; use secure cookie attributes and defined timeout policies when sessions are introduced
- **CSP/CORS:** Restrictive defaults; no unnecessary inline scripts; strict CORS configuration
- **Dependencies:** Only necessary libraries; pin versions; new dependencies require documented approval; run vulnerability scans in CI
- **Validation:** Frontend validation is for usability only; backend always enforces security-critical validation and authorization

See [security_risks_and_prevention.md](documentation/security/security_risks_and_prevention.md) for the full risk catalog.
