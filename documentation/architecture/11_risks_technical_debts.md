# 11. Risks and Technical Debt

This section documents the remaining architectural risks and the resulting technical debt after the main solution
strategy and architectural decisions have been defined. The risks are deliberately reduced through the chosen
architecture, but they cannot be completely eliminated.

> [Architecture overview — USE_NEXT](0_architecture_overview.md)

## Risks: Frontend

| Risk                                                   | Relevance                                                                          | Measure                                                                                                                                         | Expectation for the backend                                                       |
|--------------------------------------------------------|------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| Contract drift                                         | API changes may not be reflected consistently across all consumers                 | Using an OpenAPI-based contract and generated client code reduces this risk, but version mismatches and incomplete regeneration can still occur | The backend must maintain a stable and versioned API contract                     |
| Incomplete or incorrect OpenAPI specification          | Generated client code is only as reliable as the specification behind it           | Careful review, testing and build-time validation are required                                                                                  | The backend must keep the OpenAPI definition complete and consistent              |
| XSS through unsafe rendering of external or model data | Data from models, imports or backend responses may still contain malicious content | Escaping by default and controlled sanitisation reduce the risk, but unsafe DOM usage can still introduce problems                              | The backend should avoid returning unnecessary untrusted content where possible   |
| CSRF or unintended state-changing requests             | Relevant because cookie-based sessions are used (ADR-008)                          | CSRF tokens in a request header and `SameSite=Strict` cookies are used; an XSS in an active session can still send requests, so XSS rules apply | The backend must enforce CSRF protection for relevant requests                    |
| Incorrect handling of authentication data              | Tokens or session identifiers may be stored or transmitted insecurely              | Secure storage, short lifetimes and avoiding URL-based transmission are necessary                                                               | The backend must define and enforce a secure authentication and session model     |
| Dependency and supply-chain vulnerabilities            | Frontend frameworks and libraries can introduce security or maintenance risks      | Fixed versions, dependency reviews and vulnerability scans reduce but do not remove the risk                                                    | The backend and surrounding toolchain should follow the same dependency policy    |
| Security misconfiguration in browser-related controls  | CSP, CORS and other browser-facing settings may be incomplete or inconsistent      | Baseline policies and automated checks help, but configuration errors remain possible                                                           | The backend must provide compatible and restrictive security headers and policies |
| Error handling exposing internal details               | Overly detailed error messages may reveal implementation details                   | Standardised error handling reduces leakage, but edge cases may still occur                                                                     | The backend must return structured, minimal and consistent error responses        |

The architecture is exposed to various security-related risks, which arise in particular from the processing of
external data, interaction with user inputs, dependence on backend interfaces, and the use of external libraries. A
significant portion of these risks can be mitigated in the frontend, but not fully controlled, as effective security
enforcement in many cases is only possible in conjunction with the backend. These risks remain relevant despite the
chosen architecture, because the frontend still depends on external data, backend interfaces, and third-party libraries.

> A more detailed view on the security risks and prevention strategies are found
> here: [security_risks.md](../security/security_risks_and_prevention.md).
>
> The resulting requirements for the backend are found
> here: [backend_requirements.md](../backend/backend_requirements.md)

## Risks: Backend

| Risk                                           | Relevance                                                              | Measure                                                                                       | Expectation for the frontend                                            |
|------------------------------------------------|------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------|-------------------------------------------------------------------------|
| Backend-side validation gaps                   | The frontend can support validation, but it cannot enforce it reliably | Client-side checks improve usability, but the backend must remain authoritative               | The frontend must not rely on UI validation alone                       |
| Authorisation bypass through direct API access | Users may call backend endpoints without using the UI                  | UI restrictions are only advisory. Authorisation must be enforced on the server               | The frontend must treat backend authorisation as the source of truth    |
| Integration complexity around `use-core`       | The wrapper architecture introduces an additional integration layer    | An adapter reduces coupling, but technical integration issues may still occur                 | The frontend should not depend on internal core details                 |
| `use-core` licence, sourcing and concurrency   | In-process use: licence header, how `use-core` is obtained and its behaviour under concurrent requests are not yet verified (ADR-009) | Verify and document before the first implementation PR; the adapter serialises access if required | The frontend should tolerate sequential or slower processing            |
| Session in server memory                       | Sessions end on backend restart; no shared session store (ADR-008)     | Accepted for local operation; a shared session store is a later extension (FR-23)             | The frontend must handle 401 by returning to login                      |
| Performance or responsiveness limitations      | Backend orchestration around `use-core` may affect response times      | Caching, batching and optimised orchestration can help, but will not remove all constraints   | The frontend should tolerate latency and present loading states clearly |
| Inconsistent API evolution                     | Backend changes may affect generated clients and existing workflows    | Versioning and contract discipline reduce the risk, but coordination effort remains necessary | The frontend must be updated together with API contract changes         |

> At the current state of the project, no further discussion of the backend or plugin risks is provided.

### Risks: Plugins

| Risk                               | Relevance                                                               | Measure                                                                                         | Expectation for the backend                                                  |
|------------------------------------|-------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------|
| Third-party plugin security issues | Optional plugins may extend the attack surface or introduce instability | Restrictive plugin selection, version pinning and review are required                           | The backend should expose only controlled and well-defined plugin interfaces |
| Plugin compatibility problems      | Plugins may not fit the modular architecture or future API changes      | Clear extension contracts and architectural boundaries reduce the risk, but do not eliminate it | The backend must keep plugin integration technically isolated                |
| Data exchange with plugins         | Plugin inputs and outputs may contain untrusted or malformed data       | Sanitisation, validation and strict interface definitions are needed                            | The backend must validate and constrain plugin-related data                  |

Plugins remain optional extensions and are therefore treated as a separate risk area. They may extend functionality, but
they also introduce additional integration and security concerns.

## Risks: AI-assisted development

AI tools (chat assistants, coding agents, code completion) are used in this project. The rules for their use are in the
[AI guidelines](../ai_guidelines.md); sources are listed in [references.md](../references.md).

| Risk                                                                                           | Relevance                                                                                                                                                                                                                                                   | Measure                                                                                                                                              | Remaining risk                                                                    |
|------------------------------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| KR-01 Insecure patterns in generated code (for example unsafe DOM sinks, missing validation)  | About 40 % of 1,689 programs generated by GitHub Copilot in 89 scenarios were vulnerable (2021 study, [S42](../references.md#s42)). A vendor report states security flaws in 45 % of its test cases and unsecured XSS in 86 % of the relevant cases ([S45](../references.md#s45); vendor statement, press release only) | The same checks as for human-written code (ESLint rules for FR-15, backend validation for BR-06, stage 1 jobs) and review (AI-01)                      | Checks find known classes only; semantic flaws remain                             |
| KR-02 Invented or unsuitable dependencies                                                      | Package hallucinations averaged at least 5.2 % for commercial and at least 21.7 % for open-source models, with 205,474 unique invented names ([S44](../references.md#s44)); category A03:2025 Software Supply Chain Failures ([S4](../references.md#s4))       | Dependency policy (FR-21, BR-15): reason, fixed versions, lockfile, OSV-Scanner; existence and identity checked in review (AI-02)                      | Existence and identity of a new package are checked manually                      |
| KR-03 Violation of ADRs and guidelines (the tool does not know the context)                    | AI tools do not know the decisions of the project unless they are given the context                                                                                                                                                                         | Context file `AGENTS.md` pointing to guidelines and ADRs; review (AI-05)                                                                             | Tools may ignore the context file                                                 |
| KR-04 Outdated or wrongly used APIs                                                            | Generated code may use deprecated or non-existent APIs                                                                                                                                                                                                      | Compiler, tests, linters and dependency scan in stage 1                                                                                              | Misuse that compiles and passes the tests                                         |
| KR-05 Licence and provenance questions (GPLv3 compatibility)                                   | Origin and licence of generated code and of suggested dependencies can be unclear; no legal assessment has been made                                                                                                                                        | Licence check of new dependencies (AI-02); marking of AI-assisted changes in the pull request (AI-03)                                                | No technical check of the provenance of generated code                            |
| KR-06 Secrets or internal data in prompts                                                      | Risk class LLM02:2025 Sensitive Information Disclosure ([S47](../references.md#s47))                                                                                                                                                                        | Rule on what may be sent to external services (AI-04); gitleaks for secrets in commits                                                               | The content of prompts cannot be checked technically                              |
| KR-07 Overreliance: AI code or an AI review result is adopted without checking                | In a user study with an AI assistant, participants wrote significantly less secure code and were more likely to believe it was secure ([S43](../references.md#s43))                                                                                         | Human review, mandatory stage 1 checks, marking in the pull request (AI-01, AI-03)                                                                   | Reviewers can be inattentive or short of time                                     |
| KR-08 Tests that fit the implementation instead of the requirement                             | Tests generated from the code under test confirm its behaviour, including its defects                                                                                                                                                                       | Derive tests from the specification and the requirements (AI-09); review                                                                             | No contract tests against the running backend                                     |
| KR-09 False security through an AI self-check ("the AI found nothing")                         | Overconfidence ([S43](../references.md#s43)) and LLM09:2025 Misinformation ([S47](../references.md#s47)); a missing finding proves nothing                                                                                                                  | Result is advisory only, deterministic checks remain authoritative, every finding is verified (AI-06)                                                | Suppressed findings are not visible                                               |
| KR-10 Manipulated context files for AI tools (`AGENTS.md`, rules files) steer code generation  | Invisible Unicode characters (zero-width, bidirectional) in the rules files of Cursor and GitHub Copilot were used to hide instructions; both vendors point to the responsibility of the users for review ([S46](../references.md#s46); press report of the finding) | Changes to `AGENTS.md` are reviewed like code (AI-05); automated check for hidden characters in stage 1 (AI-11, `scripts/check-context-files.mjs`)  | Visible malicious instructions and other files are not covered by the check       |

Prompt injection against AI tools cannot be fully prevented; the measures limit its impact and detect part of its
consequences. The residual risk is described in
[AI guidelines, section 4](../ai_guidelines.md#4-residual-risk-prompt-injection).

## Technical Debt

The main technical debt lies in the deliberate balance between a robust target architecture and the limited scope of the
project. Not all security measures can be implemented to production standard, especially in areas such as monitoring,
incident response and advanced hardening.

A further source of technical debt is the dependency on generated API clients and server interfaces and a maintained
OpenAPI contract. This improves consistency, but it also requires disciplined specification management and reliable
build integration. A single tool (OpenAPI Generator) is used for both sides (ADR-010); a spike must confirm that the
generated code compiles, is compatible with Spring Boot 4.x and can send the session cookie and CSRF header.

The CI pipeline (ADR-011) and its pinned tools are themselves a dependency set that needs maintenance; pipeline runtime
and effort are measured during the evaluation. Minimal user management and in-memory sessions are accepted debt for
local operation.

The modular architecture also depends on clear component boundaries, service abstractions and documentation. If
these are not applied consistently during implementation, maintainability and security traceability will gradually
decline.