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

# 11 – ADR-Entwürfe (AP-01, Gate G1)

*Stand: 2026-10-07. Erstellt auf ausdrückliche Ansage von Lasse. **Nichts davon ist beschlossen.** Empfehlungen sind unverbindlich; die Entscheidung trifft Lasse (Liste am Ende). Die ADR-Abschnitte sind englisch, damit sie unverändert ins Repo (`9_architecture_decisions.md`) übernommen werden können. Nummern 009 bis 011 sind **provisorisch** und werden erst beim Einbringen ins Repo vergeben.*

**Kennzeichnung:** **[belegt]** = Quelle mit Abrufdatum 2026-10-07 (Liste unten) · **[Lasse]** = Entscheidung/Angabe von Lasse · **[Vorschlag]** · **[Annahme]** = nicht belegt, vor Einsatz prüfen.

## Wichtige Befunde vorab

1. **`use-core` ist Java [belegt]** (Repo `useocl/use`: Java 62.8 %, Maven, Module `use-core`, `use-gui`, `use-assembly`; Root-POM `org.tzi.use:use:7.5.0`, Java 21). Die Annahme in D-09 ist damit bestätigt. Folge: JDK 21 ist die natürliche Baseline für das Backend.
2. **Lizenz: `use-core` GPL, `use_next` GPLv3 – kein Konflikt in der Stichprobe [belegt, nur Stichprobe].** GitHub zeigt für `useocl/use` „GPL-2.0". Der Header der geprüften Datei `Session.java` lautet „version 2 of the License, or (at your option) any later version" (GPL-2.0-or-later, damit mit GPLv3 kombinierbar). **Nicht geprüft:** die Root-`LICENSE` (Abruf 404) und alle anderen Dateien. Eine GPL-2.0-*only*-Datei wäre mit GPLv3 nicht kombinierbar. → Prüfauftrag **R-18**: vor AP-02 per `grep` im geklonten Repo alle Lizenz-Header auf „any later version" prüfen.
3. **Spring Boot 3.5 hat bereits kein OSS-Support mehr [belegt]**; 4.0 läuft am 2026-12-31 aus, 4.1 (Release 2026-06-30) bis 2027-07-31. Daher keine Empfehlung für 3.x.
4. **OWASP rät ab, Session-Identifier in `localStorage` abzulegen [belegt]** – wichtig für ADR-008, weil Lasse token-basierte Auth gewählt hat (D-08).
---

## ADR-007: Frontend Framework (decision OPEN)

- **Status:** Proposed (draft, replaces Open once accepted)
- **Context:** arc42 chapter 2 requires freely available, long-term maintainable frontend technologies (2.1), a widely used and well-documented technology base (2.2), desktop browsers only (Firefox, Chrome, Edge) and local execution. ADR-004 already fixes a modular, component-oriented architecture. FR-14/FR-15 require safe-by-default rendering and no unsafe DOM injection.
- **Options considered:**
  - **A – React + TypeScript** (direction chosen by Lasse, D-07). MIT-licensed [belegt]; current docs cover React 19.3 (2026-09-09) [belegt]. Very widely used and well documented [Annahme, not sourced]; large ecosystem for the generated-client and lint tooling in ADR-010/011. Cons: React is a library, not a full framework – routing, state and build tooling must be chosen explicitly (more decisions, more dependencies; see FR-21).
  - **B – Vue 3 + TypeScript**, **C – Angular**, **D – Svelte.** Not examined in depth (license, version and ecosystem not verified); listed only for completeness. Angular would bring more built-in structure (and fewer dependency choices) at the cost of a steeper learning curve [Annahme].
- **Recommendation (non-binding):** Option A, as already directed by Lasse. Keep the dependency set minimal (FR-21): Vite as build tool (current major line 8.x, supported per vite.dev [belegt]), React built-in state first (no additional state library until needed), TypeScript in strict mode, ESLint with a React/security rule set (ADR-011). Test runner (e.g. Vitest + Testing Library) [Annahme, to verify in AP-04].
- **Decision:** _to be filled by Lasse_
- **Rationale:** _(on acceptance)_ React provides safe-by-default rendering of untrusted text (escaping) [Annahme, to be confirmed in the React docs], which supports FR-14; `dangerouslySetInnerHTML` is the single explicit unsafe sink that FR-15/FR-16 can ban or centralise via lint (rule candidate `react/no-danger` [Annahme, verify]).
- **Consequences:**
  - The dev server differs from the production build (e.g. HMR/inline scripts) – **BR-13 header and CSP checks must run against the production build**, not the dev server [Annahme].
  - Frontend needs Node.js (LTS) in the toolchain; with ADR-009 the project has two toolchains (JDK + Node).
  - Closes the TODO "update guidelines after technologies have been defined" in `frontend_guidelines.md`.
- **Affected documents:** `9_architecture_decisions.md`, arc42 ch. 4 (solution strategy) and ch. 5, `frontend_guidelines.md`, `FRONTEND.md`, README (status/tech stack), `05-guideline-check-matrix` (FR-01 to FR-04, FR-14 to FR-16).
---

## ADR-008: Authentication and Session Concept (decision OPEN)

- **Status:** Proposed (draft)
- **Context:** The existing ADR-008 text is deliberately simple and extensible; the method must be defined centrally in the OpenAPI security scheme (BR-08, FR-18), session data must not be sent via URLs (BR-10, FR-17), and token handling needs defined lifetime and invalidation (BR-11). The system runs locally first (arc42 2.1). **Lasse decided (D-08): token-based authentication, implemented directly in the main project.** Earlier, Claude had recommended cookie sessions; that recommendation is **not followed** – this draft works out the token-based design and its consequences.
- **Options considered (all token-based unless stated):**
  - **A – Short-lived bearer token (JWT), kept only in JavaScript memory, sent in the `Authorization` header; no refresh in the prototype (re-login after page reload).** OWASP advises against putting session identifiers in `localStorage` because any XSS can read them [belegt]; memory-only storage avoids persistence but is not XSS-proof either (an XSS can still use the token while the page is open). Bearer-header authentication is not subject to classic CSRF because browsers do not attach the header automatically [belegt, OWASP CSRF Cheat Sheet: custom request headers]. Pros: simplest, no cookies, no CSRF machinery, fits "local first". Cons: reload logs the user out; XSS during a session still compromises the token.
  - **B – Option A plus refresh token in an `HttpOnly`, `Secure`, `SameSite=Strict` cookie** (silent re-login after reload). Pros: better UX, token never in persistent JS storage. Cons: reintroduces cookies, so **BR-09 (CSRF) applies to the refresh/logout endpoints** and cookie attributes/lifetimes must be specified; more code and tests (largest time risk in AP-03).
  - **C – Access token in `sessionStorage`/`localStorage`.** Simplest persistence, but contradicts the OWASP storage advice above [belegt] and the XSS-focused risk posture of FR-14/FR-15. **Not recommended.**
  - **D – Cookie-only session (server-side session, no tokens).** Claude's earlier recommendation; **outside Lasse's decision D-08**, listed only so the deviation is explicit. CSRF protection (BR-09) mandatory.
  - **E – Full OAuth 2.0/OIDC with Spring Authorization Server.** Documented by Spring as the recommended way to *issue* tokens [belegt]; far more setup than the local-first scope needs. Possible later extension (FR-23).
- **Token format and issuing (applies to A/B):**
  - Spring Security's JWT resource server **validates** tokens (signature, `exp`, `nbf`, issuer) but **does not issue** them [belegt]. Issuing needs Spring Authorization Server (option E) or the lower-level Nimbus `JwtEncoder` [belegt].
  - For a single application that issues and validates its own tokens, an HS256 shared secret is supported [belegt]; the secret must come from environment/config and **never** be committed (secrets scan, ADR-011). Asymmetric keys (RS256) are possible but add key handling [Annahme: unnecessary for local use].
  - **Opaque random tokens with a server-side store** are an alternative to JWT that makes invalidation (BR-11) trivial, but Spring Security would need custom filter code or an introspection endpoint [Annahme]; not recommended for the time box.
  - JWTs cannot be revoked by themselves. BR-11 requires "appropriate lifetimes and invalidation behaviour" → short lifetime (e.g. 10–15 minutes [Vorschlag]) plus an in-memory deny-list of token IDs (`jti`) on logout [Vorschlag].
- **CSRF decision (BR-09):** BR-09 only applies "where cookie-based or comparable session mechanisms are used". With option A the backend may disable Spring's CSRF filter for the stateless API; this **must be documented as a conscious exception with this ADR as justification** (guidelines chapter 3: deviations are described in the PR). With option B CSRF protection stays on for cookie-authenticated endpoints.
- **Passwords/users:** For the prototype one configured user with a hashed password (Spring `PasswordEncoder`) is sufficient [Vorschlag]; no registration, no user database (see open question R-17).
- **Cross-origin development:** If the Vite dev server and the backend run on different origins, CORS must be configured explicitly (BR-13); alternatively use the dev server proxy [Annahme]. CORS is no frontend protection measure (security.md).
- **Recommendation (non-binding):** **Option A for the prototype** (memory-only access token, short lifetime, `jti` deny-list on logout, JWT issued with Nimbus `JwtEncoder`, validated by Spring's resource server), with **option B documented as the planned extension** if re-login after reload turns out to be unacceptable in the demo. Rationale: smallest attack surface and least code within the 6-hour-block capacity (AP-03 is the main time risk), and it satisfies BR-08/BR-10/BR-11.
- **Decision:** _to be filled by Lasse_
- **Rationale:** _(on acceptance)_
- **Consequences:**
  - The OpenAPI spec defines `securitySchemes` with HTTP bearer (JWT) and references it from protected operations; **no `apiKey` in query** (BR-10, FR-17).
  - Frontend: one place in the communication layer attaches the header (FR-03, FR-18); token never logged, never in URLs.
  - Backend: security headers (CSP, frame protection, HSTS where applicable) are mandatory (BR-13); error responses stay minimal (BR-12).
  - Tests: unauthenticated access → 401, expired token rejected, logged-out token rejected, token in query ignored (BR-07/BR-10/BR-11).
  - Residual risk: XSS during an active session can still use the in-memory token – mitigated by FR-14 to FR-16, CSP and Trusted Types, not eliminated.
- **Affected documents:** `9_architecture_decisions.md` (ADR-008), `security.md` (auth/session/token section), `backend_guidelines.md` §4/§5, `frontend_guidelines.md`, arc42 ch. 4 and ch. 11 (risks), `05` (BR-08 to BR-11, FR-17/FR-18).
---

## ADR-009 (provisional): Backend Language, Framework and Integration of `use-core` (decision OPEN)

- **Status:** Proposed (draft)
- **Context:** ADR-001 to ADR-003 fix reuse of `use-core` behind a backend wrapper; BR-02 requires a dedicated adapter layer. **Lasse decided (D-09): Java + Spring Boot, in-process integration.** `use-core` is Java, built with Maven, targets Java 21 [belegt].
- **Options considered:**
  - **A – Java 21 + Spring Boot 4.1.x (Spring MVC), Maven.** Spring Boot 4.1 released 2026-06-30, OSS support until 2027-07-31, supports Java 17–26 [belegt]. Same language/build tool as `use-core` (Maven) → straightforward in-process dependency. Cons: Boot 4 is a new major line (2025-11) – third-party libraries and generators may lag [Annahme]; the OpenAPI Generator offers a `useSpringBoot4` option (default `false`) [belegt], but real compatibility of the generated code must be proven in a short spike (AP-02).
  - **B – Spring Boot 4.0.x.** OSS support ends 2026-12-31 [belegt] – too short-lived for a project meant to be continued by third parties. Not recommended.
  - **C – Spring Boot 3.5.x.** OSS support already ended [belegt]; only commercial support. Not recommended; the generator default (`useSpringBoot3: true`) [belegt] would be the only advantage.
  - **D – Other JVM frameworks (e.g. Quarkus, Micronaut).** Not examined; no stated reason to leave Spring (D-09).
- **Recommendation (non-binding):** Option A; JDK 21 as baseline (matches `use-core`), Maven (with wrapper) as build tool, Spring MVC (blocking) rather than WebFlux because `use-core` is a synchronous library [Annahme]. Fall back to B only if the generator spike fails.
- **Decision:** _to be filled by Lasse_
- **Rationale:** _(on acceptance)_
- **Consequences:**
  - `use-back` contains an **adapter package** that is the only place importing `org.tzi.use.*` (BR-02). An architecture test (e.g. ArchUnit [Annahme, verify license]) can enforce this automatically (matrix row BR-02).
  - **Open technical questions (R-18), to answer before AP-02:** (1) how `use-core` is obtained – Maven Central/other registry, or built from source (`mvn install` of the `use` repo, Git submodule) [not verified]; (2) license headers of all used `use-core` files (see findings above); (3) thread-safety/state handling of `use-core` objects when used by concurrent HTTP requests [not verified] – the adapter may have to serialize access.
  - Security headers, validation (BR-06), authorization (BR-07) and error handling (BR-12) are implemented with Spring Security / Bean Validation.
- **Affected documents:** `9_architecture_decisions.md`, arc42 ch. 4/5, `backend_guidelines.md` (TODO technologies), `BACKEND.md`, README, `05` (BR-01, BR-02, BR-06, BR-12, BR-13).
---

## ADR-010 (provisional): OpenAPI Code Generation – Scope and Generator (extends ADR-006) (decision OPEN)

- **Status:** Proposed (draft). **Amends ADR-006**, which so far only generates the *client* (see V-04); with D-11 the scope becomes spec-first generation of **client and server interfaces**.
- **Context:** The OpenAPI spec is the single source of truth (ADR-006, FR-10, BR-03, BR-04); contract changes must be reflected systematically (FR-12) and a CI consistency check is required (guidelines ch. 4). Constraints: freely available, GPLv3-compatible, locally runnable, maintainable.
- **Options considered:**
  - **A – OpenAPI Generator for both sides:** generator `spring` with `interfaceOnly` for server interfaces (options `interfaceOnly`, `delegatePattern`, `useBeanValidation`, `useSpringBoot4` exist [belegt]) and `typescript-fetch` or `typescript-axios` for the client [belegt]. Apache-2.0 [belegt]; current release 7.25.0 per GitHub [belegt – the two fetches disagreed on the year (2024 vs. 2026); **verify version and date before pinning**]. One tool, one config style, no extra runtime for server code. Cons: TypeScript output quality and style compared with TS-native generators [Annahme, to be judged in the spike]; Java-based tool is run for the client too (JDK is present anyway).
  - **B – OpenAPI Generator (server interfaces) + Hey API `@hey-api/openapi-ts` (TypeScript client).** MIT, generates TS SDK/types (also Zod schemas), fetch and axios clients, runs on Node.js 22+ [belegt]. Pros: TS-native, typically cleaner output [Annahme]. Cons: second tool and second pinned dependency; two generation steps to keep in the drift check; Node 22+ requirement.
  - **C – OpenAPI Generator (server) + Orval (TypeScript client).** MIT [belegt]; generates clients incl. React Query hooks, SWR, Zod [belegt]. Pros: ready-made React hooks. Cons: pulls in additional libraries (e.g. a query library), conflicting with the minimal-dependency rule (FR-21).
  - **D – Code-first (e.g. springdoc generates the spec from controllers).** Contradicts ADR-006/D-11 (spec as single source of truth, spec-first). **Rejected.**
- **Recommendation (non-binding):** **Option A as default, decided by a time-boxed spike (≈1 h, AP-02):** generate server interfaces and the TS client from the same example spec, compile both, and look at the TS output. Switch the *client only* to B if A's TypeScript output is clearly unsuitable. Reasons: one tool = fewest dependencies and one drift check (FR-21, BR-15), no extra setup for Stufe 1.
- **Sub-decision – generated code in Git [Vorschlag]:** generate **server interfaces at build time** (not committed, `target/`), but **commit the generated TS client** (e.g. `use-web/src/api/generated/`). A CI job regenerates it and fails on any diff (`git diff --exit-code`) – this is the visible drift check (FR-12, matrix G-4c) and makes lint rules for FR-11 (no handwritten HTTP calls outside the generated client) checkable.
- **Decision:** _to be filled by Lasse_
- **Rationale:** _(on acceptance)_
- **Consequences:**
  - New build-time dependency, pinned to an exact version (BR-15/FR-21); generator version updates become deliberate PRs.
  - Controllers implement generated interfaces; handwritten controller signatures that bypass the interface are a drift risk → architecture test/convention [Vorschlag].
  - **FR-11 vs. ADR-006:** FR-11 is still formulated conditionally; with this ADR it becomes de facto mandatory (open question R-14, decided after the pipeline is built).
  - Generated code is excluded from handwritten-code lint rules where appropriate, but **not** from dependency/secret scans.
  - License of generated output: generators typically do not impose their license on the output [Annahme – confirm once in the generator docs before the licence check in ADR-011].
- **Affected documents:** `9_architecture_decisions.md` (amend ADR-006), arc42 ch. 4, `guidelines.md` ch. 4 (CI), `frontend_guidelines.md`, `backend_guidelines.md`, `05` (FR-10 to FR-12, BR-03 to BR-05, G-4c).
---

## ADR-011 (provisional): CI Platform and Check Stage Model (decision OPEN)

- **Status:** Proposed (draft)
- **Context:** **Lasse decided (D-13): GitHub Actions** (admin rights in the repo). The brief asks for tiered checks: **Stufe 1** without elaborate setup, directly in the project; secondary checks ("Stufe 2 light") only if capacity remains; SonarQube and AI checks in the pipeline are dropped (D-19, D-20). Open question R-08: what "no setup" means on a developer machine.
- **Principle [Vorschlag]:** *CI is a thin wrapper.* Every check is runnable locally with one command; the workflow only calls these commands. This keeps Stufe 1 reproducible and makes the method portable to the master thesis (existing project).
- **Options for the Stufe 1 baseline (R-08):**
  - **A – Only JDK 21 + Node.js LTS + the project's package managers (Maven wrapper, npm). No Docker, no accounts, no API keys, no Python.** Recommended.
  - **B – A plus Docker** (for tools distributed as images). More tools usable, but violates "no elaborate setup".
  - **C – strictly one command** via a single wrapper script that downloads missing tools. Convenient, but adds an unreviewed download step (supply-chain risk).
- **Candidate checks and tool facts [belegt unless marked]:**
  | Check | Tool candidate | Facts | Runs with baseline A? | Proposed stage |
  |---|---|---|---|---|
  | OpenAPI lint (BR-03, BR-08, BR-10) | Spectral | Apache-2.0, custom rulesets, npm CLI, GitHub Action | yes (npx) | 1 |
  | Breaking changes vs. `main` (FR-12, BR-05) | oasdiff | Apache-2.0, binary/Docker/brew/go, GitHub Action | **CI yes; local only if installed** | 1 (CI) |
  | Drift check (FR-10 to FR-12, G-4c) | regenerate + `git diff --exit-code` | see ADR-010 | yes | 1 |
  | Frontend lint incl. unsafe sinks (FR-14 to FR-17) | ESLint + React/security rules | rule names to be verified in AP-04 | yes (npm) | 1 |
  | Secrets (BR-15) | gitleaks | MIT; project notes "feature complete, security patches only" | **binary; CI action** | 1 (CI) |
  | Dependency vulnerabilities (BR-14, BR-15, FR-22) | **OSV-Scanner** | Apache-2.0, scans `pom.xml` and `package-lock.json`, GitHub Action, no API key mentioned (needs network) | binary; CI action | 1 (CI) |
  | (alternative) | OWASP Dependency-Check | Apache-2.0, Maven plugin; **NVD API key effectively required** (slow without) | needs account/key | 2 light |
  | Header test (BR-13) | JUnit/MockMvc integration test | no extra tool | yes (Maven) | 1 |
  | Contract tests against running backend (BR-04) | Schemathesis | MIT, pip install, GitHub Action | **needs Python** | 2 light (or spec-based MockMvc tests in Stufe 1 [Vorschlag]) |
  | Architecture rule (BR-02) | ArchUnit-style test | license not verified | yes (Maven) | 1 |
  | Licence check | not selected | – | – | 2 light |

- **Recommendation (non-binding):** Baseline **A**; Stufe 1 = spectral lint, drift check, ESLint, header test, plus **CI-only** oasdiff, OSV-Scanner and gitleaks (tools that would need local installs run as pinned GitHub Actions; local use optional). Stufe 2 light (only if G4 says yes): licence check, Schemathesis, Dependency-Check. Branch protection with required checks (FR-22, BR-14, matrix row "Meta-Check").
- **Decision:** _to be filled by Lasse_
- **Rationale:** _(on acceptance)_
- **Consequences:**
  - Actions are pinned to versions (commit SHA) and workflow permissions are minimal, in line with the supply-chain/CI-CD references already used in `guidelines.md` [Vorschlag].
  - Check list and stage definition replace the old "Stufe 2 = e.g. SonarQube" wording in `05`.
  - Pipeline time and maintenance effort are measured in AP-10 (evaluation).
- **Affected documents:** `guidelines.md` ch. 4, arc42 ch. 4/9, README, `05`, `04` (AP-04).
---

## Entscheidungsliste für Gate G1 (Lasse)

| # | Entscheidung | Empfehlung (unverbindlich) |
|---|---|---|
| 1 | ADR-007: React + TS bestätigen; Vite als Build-Tool | ja; keine zusätzliche State-Bibliothek zu Beginn |
| 2 | ADR-008: Variante A (Token im Speicher, kein Refresh) oder B (Refresh-Cookie) | A für den Prototyp, B als dokumentierte Erweiterung |
| 3 | ADR-008: Token-Format und Ausstellung | JWT (Nimbus `JwtEncoder`, Spring Resource Server), kurze Laufzeit, `jti`-Denylist beim Logout |
| 4 | ADR-009: Spring Boot 4.1.x, JDK 21, Maven | ja (3.5 ohne OSS-Support, 4.0 endet 31.12.2026) |
| 5 | ADR-010: Generator A (OpenAPI Generator für beide Seiten) mit Spike, Fallback B nur für den Client | A + Spike in AP-02 |
| 6 | ADR-010: Generierten TS-Client einchecken, Server-Interfaces beim Build erzeugen | ja |
| 7 | ADR-011 / R-08: Baseline nur JDK + Node; CI-only-Tools erlaubt | ja |
| 8 | R-17 (neu): Benutzer im Prototyp – ein konfigurierter Nutzer? | ja |
| 9 | R-18 (neu): Lizenz-Header und Einbindung von `use-core` prüfen (vor AP-02) | Prüfauftrag |

## Quellen (abgerufen am 2026-10-07)

- USE-Repository `useocl/use` (Sprache, Module, Lizenzangabe GPL-2.0): https://github.com/useocl/use
- Root-POM von USE (Version 7.5.0, Java 21, Module): https://raw.githubusercontent.com/useocl/use/master/pom.xml
- Lizenz-Header `Session.java` (GPL v2 oder später): https://github.com/useocl/use/blob/master/use-core/src/main/java/org/tzi/use/main/Session.java
- Spring-Boot-Supportzeiträume und Java-Kompatibilität: https://endoflife.date/spring-boot
- Spring Boot aktuelle Version: https://spring.io/projects/spring-boot
- Spring Security JWT Resource Server (validiert, stellt nicht aus; HS256, JWK, Nimbus `JwtEncoder`, Spring Authorization Server): https://docs.spring.io/spring-security/reference/servlet/oauth2/resource-server/jwt.html
- OWASP HTML5 Security Cheat Sheet (Web Storage): https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html
- OWASP CSRF Prevention Cheat Sheet (Custom Request Headers): https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html
- OpenAPI Generator (Apache-2.0, Release, Generatoren): https://github.com/OpenAPITools/openapi-generator und https://github.com/OpenAPITools/openapi-generator/blob/master/LICENSE
- OpenAPI-Generator-Optionen `spring`: https://openapi-generator.tech/docs/generators/spring/
- Hey API: https://github.com/hey-api/openapi-ts · Orval: https://github.com/orval-labs/orval
- oasdiff: https://github.com/oasdiff/oasdiff · Spectral: https://github.com/stoplightio/spectral
- gitleaks: https://github.com/gitleaks/gitleaks · OSV-Scanner: https://github.com/google/osv-scanner
- OWASP Dependency-Check: https://github.com/dependency-check/DependencyCheck · Schemathesis: https://github.com/schemathesis/schemathesis
- React-Versionen: https://react.dev/versions · React-Lizenz: https://github.com/facebook/react · Vite: https://vite.dev/releases
- Repo-Inhalte (Sync `main`): `documentation/architecture/2_constraints.md`, `9_architecture_decisions.md`, `backend_requirements.md`, `frontend_requirements.md`, `backend_guidelines.md`
