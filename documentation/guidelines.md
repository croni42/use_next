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
- Rules for AI-assisted development (AI-nn) and the self-check with an AI tool: [ai_guidelines](ai_guidelines.md).

## 2. Technology Baseline

The technology stack is fixed by ADRs. Deviations require a new or amended ADR (see section 3).

| Area                | Decision                                                                                  | ADR                                                                          |
|---------------------|-------------------------------------------------------------------------------------------|------------------------------------------------------------------------------|
| Frontend            | React and TypeScript (strict mode), Vite as build tool                                    | [ADR-007](architecture/9_architecture_decisions.md#adr-007-frontend-framework) |
| Backend             | Java 21, Spring Boot 4.1.x (Spring MVC), Maven (Maven Wrapper)                            | ADR-009                                                                      |
| Core integration    | `use-core` in-process through one adapter package; only this package imports `org.tzi.use.*` | ADR-009, ADR-003                                                          |
| API contract        | One OpenAPI file, spec-first; OpenAPI Generator for server interfaces and TypeScript client | ADR-006, ADR-010                                                           |
| Authentication      | Server-side session with session cookie, CSRF token for state-changing requests           | ADR-008                                                                      |
| CI                  | GitHub Actions; every check is runnable locally with one command                          | ADR-011                                                                      |

Required local toolchain: JDK 21, Node.js (LTS), Maven Wrapper and npm. No Docker, accounts or API keys are needed for
the mandatory checks.

## 3. Coding and Structure Conventions

- Programming language and framework-specific conventions (e.g., linting, formatting, naming schemas) follow respective
  community standards.
- The structuring of components and modules follows the principles described
  in [constraints](architecture/2_constraints.md) (modularisation, component-oriented, well-defined interfaces).
- For new modules/components, it must be checked into which existing building block they logically belong.
- Contract changes always start in the OpenAPI specification. Controllers implement the generated interfaces; the
  frontend uses the generated client (ADR-006, ADR-010).
- Routing, test runner and further libraries are chosen during implementation and documented in the PR that introduces
  them (fixed version, licence check).

> Changes to the basic structure (e.g., new containers or layers) require an update
> of [building_block](architecture/5_building_block.md) and possibly new ADRs
> in [architecture_decisions](architecture/9_architecture_decisions.md).

## 4. Handling Architecture Decisions (ADRs)

- Central decisions are maintained as Architecture Decision Records
  in [architecture_decisions](architecture/9_architecture_decisions.md).
- New ADRs must be created when:
    - an existing decision is significantly changed or revoked, or
    - a new central technology, pattern, or security-relevant mechanism is introduced.
- Examples that require an ADR update: replacing the OpenAPI generator, switching to token-based authentication,
  introducing a state-management library as a central pattern, changing the Spring Boot line.

> Every implementation that deliberately deviates from an ADR must:
>  - describe the deviation in the PR and
>  - include a proposal for how the ADR documentation should be adapted.

## 5. Quality Assurance, PRs, and Pipelines

CI runs on GitHub Actions (ADR-011). Workflows only call commands that can be executed locally. Branch protection
requires the stage 1 checks before merge.

**Stage 1 (mandatory):** the workflow `.github/workflows/stage1.yml` runs seven jobs on pushes (`main`, `WIP-**`,
`feature/**`), pull requests and manual dispatch:

| Job            | Checks                                                                                                              |
|----------------|---------------------------------------------------------------------------------------------------------------------|
| `backend`      | Builds `use-core` from the pinned commit, then `./mvnw verify`: all backend tests, including security header (BR-13), session and CSRF (BR-09, BR-11) integration tests and the architecture test for the adapter boundary (BR-02). |
| `frontend`     | `npm ci`, unit tests, ESLint with TypeScript and React security rules (unsafe DOM sinks are flagged), Prettier check, production build, the CSP build check (`scripts/check-csp-build.mjs`) and the context file check (`scripts/check-context-files.mjs`, with its tests): it fails when `AGENTS.md` contains invisible or bidirectional Unicode characters. |
| `drift`        | `scripts/check-drift.sh`: the generated TypeScript client is regenerated and the job fails on any difference to the committed files. |
| `openapi-lint` | Spectral with `openapi/.spectral.yaml`, including the rule that `apiKey` is only allowed in cookies, never in query parameters. |
| `oasdiff`      | Breaking API changes against the previous tip of the branch (push), the base branch (pull request) or `origin/main` (manual run). |
| `osv-scanner`  | Known vulnerabilities in `use-back/pom.xml` (directly declared packages only, `--no-resolve`) and `use-web/package-lock.json`. |
| `gitleaks`     | Secrets in the full git history.                                                                                    |

All jobs except `oasdiff`, `osv-scanner` and `gitleaks` are covered by `bash scripts/check-stage1.sh`, which runs the
checks in sequence and stops at the first failure.

AI-assisted changes follow the [AI guidelines](ai_guidelines.md) in addition to these rules. They pass the same checks
and the same review as all other changes.

**Stage 2 light (only if capacity remains):** licence check, contract tests against the running backend (e.g.
Schemathesis), OWASP Dependency-Check.

**Pipeline rules:**

- GitHub Actions are pinned to a commit SHA, workflow permissions are minimal, tool versions are fixed and reviewed like
  any other dependency.
- Replacing a single tool is a pipeline change, not an architecture change.
- Every Pull Request references the relevant architecture and/or risk documents if decisions are affected:  
  [solution_strategy](architecture/4_solution_strategy.md), [architecture_decisions](architecture/9_architecture_decisions.md), [risks_technical_debts](architecture/11_risks_technical_debts.md).
- The PR template includes at least:
    - Reference to affected ADRs (IDs from [architecture_decisions](architecture/9_architecture_decisions.md)), if
      applicable.
    - Confirmation that no security-relevant rules from the Solution Strategy (Chapter Security Decisions
      in [solution_strategy](architecture/4_solution_strategy.md)) are violated – or description of the justified
      exception.

## 6. Security-by-Design

- Security is treated as a cross-cutting concern. Fundamental principles are established
  in [solution_strategy](architecture/4_solution_strategy.md) (Security Decisions)
  and [architecture_decisions](architecture/9_architecture_decisions.md) (especially ADR-005, ADR-008, ADR-011).
- Both frontend and backend implementations consider:
    - secure processing and rendering of external data,
    - controlled communication between frontend and backend (OpenAPI-based, generated client),
    - the session model of ADR-008: `HttpOnly`, `Secure`, `SameSite=Strict` session cookie, 30 minutes inactivity
      timeout, CSRF token for state-changing requests, no session data in URLs,
    - conservative handling of error messages,
    - disciplined use of external dependencies (fixed versions, lockfiles, OSV-Scanner, gitleaks).

> A detailed view on the prevention of those risk is found here:
> [security_risks_and_prevention.md](security/security_risks_and_prevention.md)

## 7. Maintenance and Evolution of Guidelines

- These project-wide guidelines are a living document and are adapted when relevant architecture, technology, or
  security changes occur.
- Changes to these guidelines should be made in a separate PR and ideally reference associated ADRs
  in [architecture_decisions](architecture/9_architecture_decisions.md).
- Before major architecture changes, it must be checked whether additional chapters in the arc42 documentation are
  needed or existing chapters must be extended:  
  [Architecture Overview](architecture/0_architecture_overview.md).
