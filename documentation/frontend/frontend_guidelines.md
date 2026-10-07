# Frontend Guidelines for USE_NEXT

These guidelines apply specifically to the frontend container `use-web` and are derived from the frontend
requirements, the overall [USE_NEXT guidelines](../guidelines.md), and the architecture and security decisions
documented in the [arc42 artefacts](../architecture/0_architecture_overview.md). The technology decisions are
documented in [ADR-007](../architecture/9_architecture_decisions.md#adr-007-frontend-framework) and ADR-010.

***

## 1. Scope and Technology Baseline

- The frontend `use-web` is a browser-based UI that communicates exclusively with the backend `use-back` via the
  internal API (generated from the OpenAPI contract).
- The frontend is implemented with **React and TypeScript** (strict mode). **Vite** is the build tool.
- Node.js (LTS) is required in addition to the JDK. Package manager is npm; `package-lock.json` is committed.
- Application state is handled with React's built-in mechanisms first (state, context, reducers). Additional
  state-management or UI libraries are introduced only with a documented reason in the introducing PR (FR-21).
- Routing, test runner and further libraries are chosen during implementation and documented in the PR that introduces
  them (fixed version, licence check).
- The dev server differs from the production build. Header and CSP checks (BR-13) run against the production build.
- Framework-specific details follow the React community conventions. This document defines project-specific rules on
  top.

***

## 2. Structural and Layering Guidelines

- The frontend must be structured into the following logical layers:
    - **Presentation/UI components** (React components)
    - **Application/feature logic** (e.g. use cases, custom hooks)
    - **State handling** (e.g. context, reducers)
    - **Technical communication layer** (API services wrapping the generated client)
- Every HTTP/API access is encapsulated in the communication layer. The communication layer communicates only via the
  generated client of the internal OpenAPI contract.
- Feature modules must keep domain-independent UI (layouts, basic widgets) separate from domain-specific logic and
  technical integration code.
- New components and modules must be assigned to an existing building block (e.g. frontend, backend, integration) before
  implementation. Structural changes require updates to the [building block view](../architecture/5_building_block.md)
  and, if necessary, new [ADRs](../architecture/9_architecture_decisions.md).

***

## 3. API and Communication Guidelines

- All communication with the backend must use the internal API contract defined via OpenAPI for **USE_NEXT**.
- The OpenAPI specification is the single source of truth for request/response structures and security schemes.
  Deviations are not allowed without an accepted [ADR](../architecture/9_architecture_decisions.md).
- The API client is generated with OpenAPI Generator (`typescript-fetch`; `typescript-axios` only if documented in the
  implementing PR, ADR-010). The generated client is **committed** and is the only access path to the API. Handwritten
  HTTP calls (e.g. ad hoc `fetch`) are not allowed.
- Generated code is never edited by hand. Contract changes start in the OpenAPI specification; the client is
  regenerated in the same change set. CI regenerates the client and fails on any difference to the committed files
  (drift check).
- Request handling, response mapping, and technical error processing must be centralised in the communication layer (
  e.g. API service module) and must not be duplicated across UI components.
- The communication layer is configured once to send the session cookie (credentials) and the CSRF header on
  state-changing requests (ADR-008, FR-13).
- The communication layer must provide uniform types for result states (e.g. “success”, “error”, “loading” or result
  objects) in order to enable a consistent error and loading view throughout the frontend.
- For security-relevant endpoints (e.g. auth-related requests), the communication layer must provide standardised error
  paths so that UI components can clearly distinguish between “Not authenticated” (401) and “Forbidden” (403), for
  example, without having to evaluate HTTP status codes manually.
- In development, the Vite dev-server proxy is used so that frontend and backend share one origin (ADR-008).

***

## 4. State Management and Interaction

- Application state must be managed in a traceable and consistent way (React state, clearly defined contexts and
  reducers).
- UI components should be as stateless as possible. Complex workflows (load model, analyse, display results) belong into
  application-level logic or dedicated custom hooks/services.
- User interactions must be implemented via application logic rather than embedding workflow rules directly into
  components. This includes chaining API calls and handling derived state.
- Loading, success, and error states must be handled consistently across the application (e.g. standardised loading
  indicators, error banners, and success notifications).
- State transitions affecting backend data (e.g. re-running an analysis) must always go through the defined API and
  follow the relevant use case definitions in the architecture.
- A central state-management library is a new central pattern and requires a documented reason and, where it changes the
  architecture, an ADR update.

***

## 5. Security and Data Handling

- Untrusted data from backend responses or external sources must be rendered safely by default. JSX escapes values
  rendered through it; this default must not be circumvented (FR-14).
- `dangerouslySetInnerHTML` and other direct DOM sinks (`innerHTML`, `outerHTML`, `document.write`) are prohibited
  unless explicitly justified and handled via the single central sanitisation component (FR-15, FR-16). ESLint rules
  flag unsafe sinks and are part of the mandatory CI checks.
- Sanitisation logic must be centralised.
- Trusted Types are enabled together with a restrictive CSP where the browser supports them.
- Authentication uses the server-side session of ADR-008. The session cookie is `HttpOnly` and therefore never read,
  stored or set by frontend code. Session identifiers and tokens are not stored in `localStorage`/`sessionStorage` and
  are never transmitted via URLs (including query parameters or fragments) (FR-17).
- State-changing requests carry the CSRF token in the request header defined in the OpenAPI specification. The token is
  handled only in the communication layer.
- The frontend implements authentication exactly as defined by the OpenAPI security scheme (`apiKey` in a cookie)
  (FR-18).
- An XSS during an active session can still send requests within that session. Therefore the XSS rules above are
  mandatory even though the cookie cannot be read by JavaScript.
- Security-relevant and business-critical validation (e.g. authorisation checks, mandatory constraints) remains a
  backend responsibility. Client-side validation is only supportive and must not be relied upon for
  enforcement (FR-19).
- Error messages for security-relevant situations (authentication failures, access denied, technical errors) must be
  presented in a controlled way that avoids leaking internal details while still being understandable for
  users (FR-20).

> See [security_risks_and_prevention.md](../security/security_risks_and_prevention.md) for more Information about
> possible Security Risks and Prevention Techniques

***

## 6. Dependency and Build Guidelines

- The frontend must use a controlled set of dependencies. New third-party libraries require justification with respect
  to maintenance effort and security footprint, a fixed version and a licence check (FR-21).
- Dependencies are pinned and installed from the lockfile. OSV-Scanner covers `package-lock.json` in CI; gitleaks scans
  for secrets.
- Mandatory checks (ADR-011, stage 1) include ESLint with TypeScript and React security rules, the drift check of the
  generated client and Spectral linting of the OpenAPI specification. Source maps are not published to production.
- The OpenAPI Generator version is pinned exactly; updates are deliberate PRs (ADR-010).
- Generated code is excluded from handwritten-code lint rules where appropriate, but not from dependency and secret
  scans.
- Discrepancies between OpenAPI specification and generated client detected in CI must be fixed before merge.

***

## 7. Coding Conventions and Project Organisation

- TypeScript strict mode is mandatory. Coding style (linting, formatting, naming) follows the standard React/TypeScript
  toolchain and is enforced via automated checks.
- Folder structure should reflect the layers and feature modules (e.g. `components/`, `features/`, `state/`, `api/`).
  The generated client lives in a dedicated, clearly marked directory. Cross-cutting technical utilities are separated
  from domain/UI logic.
- New features must document which architecture [building blocks](../architecture/5_building_block.md)
  and [ADRs](../architecture/9_architecture_decisions.md) they rely on. PRs must reference
  affected [ADRs](../architecture/9_architecture_decisions.md)
  or propose new ones if introducing new patterns or security mechanisms.
- Deviations from these guidelines must be documented in the PR and include a proposal for adapting the guideline or
  associated [ADRs](../architecture/9_architecture_decisions.md) if the deviation is intended to be permanent.

***

## 8. Evolution and Open Points

- These frontend-specific guidelines are a living document and must be updated when introducing new frontend
  technologies, major architectural changes, or new security decisions.
- Before adding new containers, layers, or major modules in the frontend, the impact on arc42 documentation (
  [building block view](../architecture/5_building_block.md), [solution strategy](../architecture/4_solution_strategy.md),
  [risks](../architecture/11_risks_technical_debts.md)) must be analysed and documented.
- Open points: choice of routing and test libraries; verification (spike) that the generated TypeScript client can send
  the session cookie and the CSRF header (ADR-010).
- Open frontend-related risks and technical debts (e.g. technology choices, incomplete validation) must be tracked in
  the [risk documentation](../architecture/11_risks_technical_debts.md) and referenced from relevant PRs.
