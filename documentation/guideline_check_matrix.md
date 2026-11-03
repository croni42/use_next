# Guideline → Check Matrix

This document is the method behind the stage 1 pipeline: every requirement and rule of the guidelines gets a way to
check it, and the gaps are named. It covers the frontend requirements ([FR-01](frontend/frontend_requirements.md#fr-01)
to [FR-23](frontend/frontend_requirements.md#fr-23)), the backend requirements
([BR-01](backend/backend_requirements.md#br-01) to [BR-17](backend/backend_requirements.md#br-17)), the AI rules
([AI-01](ai_guidelines.md#ai-01) to [AI-11](ai_guidelines.md#ai-11)) and the project-wide PR and pipeline rules of the
[guidelines](guidelines.md). The wording of each requirement is in its source document; the short form here is a
paraphrase. The jobs are described in [guidelines.md, section 5](guidelines.md#5-quality-assurance-prs-and-pipelines),
the limits in [Known limitations](architecture/11_risks_technical_debts.md#known-limitations).

## How to use it

1. **Classify** each rule: **A** = automatically checkable, **A/H** = mostly automatic with a review part, **H** =
   tool support plus review or checklist, **M** = manual only.
2. **Assign a check** for A and A/H rules (CI job, lint rule, test, spec rule); assign the manual review checklist of the
   [pull request template](../.github/pull_request_template.md) to H and M rules.
3. **Prove the check** with a seeded violation: a check counts as *implemented* only if it runs in CI and at least one
   seeded violation turned it red. If it is proven only in one browser or environment, the matrix says so.
4. **Evaluate** with a set of seeded violations whose outcome is predicted before the run (see [Evaluation](#evaluation)).
   A green job for a known gap means *not checked*, not *passed*.
5. **Keep the matrix current** when a rule, a check or a limit changes, in the same pull request.

**Status values:** *tested* (implemented and caught a seeded violation in the evaluation) · *implemented* · *partly*
(part of the rule is checked, the rest is manual or missing) · *rule only* (the rule is written down, nothing checks
it) · *open* (no check yet).

## Summary

56 rules: A 19 · A/H 10 · H 19 · M 8. Status: tested 5 · implemented 13 · partly 27 · rule only 4 · open 7.

Branch Protection with the stage 1 jobs as required checks is a precondition for every *implemented* row: without it a
red job is visible but does not block a merge.

## Frontend requirements

| ID | Rule (short) | Type | Check | Status | Gap / note |
|---|---|---|---|---|---|
| [FR-01](frontend/frontend_requirements.md#fr-01) | Separated layers | A/H | ESLint restriction of HTTP globals and of the generated client outside `src/api-client.ts` | partly | other layer boundaries have no rule |
| [FR-02](frontend/frontend_requirements.md#fr-02) | UI does not call backend or `use-core` directly | A | ESLint: `fetch`, `XMLHttpRequest`, `WebSocket`, `EventSource` and imports of `src/api` only in `src/api-client.ts` | implemented | |
| [FR-03](frontend/frontend_requirements.md#fr-03) | Dedicated API layer | A | as FR-02 | implemented | |
| [FR-04](frontend/frontend_requirements.md#fr-04) | Backend is the only integration point | H | CSP `connect-src 'self'` (`FrontendHeadersIntegrationTest`); core access only through the backend adapter ([BR-02](backend/backend_requirements.md#br-02)) | partly | frontend side reviewed manually |
| [FR-05](frontend/frontend_requirements.md#fr-05) | UI concerns separate from integration logic | M | review | open | |
| [FR-06](frontend/frontend_requirements.md#fr-06) | Traceable application state | M | review | open | |
| [FR-07](frontend/frontend_requirements.md#fr-07) | Interactions through application logic | M | review | open | |
| [FR-08](frontend/frontend_requirements.md#fr-08) | Consistent loading, success and error states | H | Vitest tests of the login and evaluator behaviour | partly | no rule for consistent states |
| [FR-09](frontend/frontend_requirements.md#fr-09) | Only the internal API | A | ESLint as FR-02; CSP `connect-src 'self'` | implemented | |
| [FR-10](frontend/frontend_requirements.md#fr-10) | OpenAPI spec is the contract | A | `openapi-lint` (Spectral), `drift` | implemented | |
| [FR-11](frontend/frontend_requirements.md#fr-11) | Only the generated client | A | ESLint as FR-02, `drift` | tested (drift part) | one documented hand-written `fetch` for the CSRF retry in `api-client.ts` |
| [FR-12](frontend/frontend_requirements.md#fr-12) | Regenerate the client on contract changes | A | `drift`; `oasdiff` for breaking changes | implemented | `oasdiff` needs a spec on the base branch |
| [FR-13](frontend/frontend_requirements.md#fr-13) | Central request and error handling | H | tests of `api-client.ts` (central 401 handling) | partly | no lint rule against error mapping in components |
| [FR-14](frontend/frontend_requirements.md#fr-14) | Render untrusted data safely | A/H | ESLint against unsafe sinks; CSP with Trusted Types (`FrontendHeadersIntegrationTest`, `scripts/check-csp-build.mjs`) | tested (lint part) | CSP only in the production build, Trusted Types verified in Chromium only |
| [FR-15](frontend/frontend_requirements.md#fr-15) | No unsafe DOM manipulation | A | ESLint: `react/no-danger`, `no-eval`, `no-implied-eval`, `no-new-func`, `no-script-url`, `innerHTML`/`outerHTML` assignment, `document.write`, `insertAdjacentHTML` | tested | |
| [FR-16](frontend/frontend_requirements.md#fr-16) | Sanitisation only in controlled places | A/H | none yet (no HTML rendering, no sanitiser) | open | rule needed with the first HTML rendering case |
| [FR-17](frontend/frontend_requirements.md#fr-17) | No tokens or session data in URLs | A/H | Spectral `usenext-apikey-cookie-only` (contract part) | partly | **known gap:** hand-written code that puts a token in a URL query is not found; manual review item |
| [FR-18](frontend/frontend_requirements.md#fr-18) | Authentication as in the security scheme | H | `SessionCsrfIntegrationTest` | partly | no contract test against the spec |
| [FR-19](frontend/frontend_requirements.md#fr-19) | Client validation is only supportive | M | review | open | |
| [FR-20](frontend/frontend_requirements.md#fr-20) | Controlled, non-revealing error display | H | review | open | no automated rule |
| [FR-21](frontend/frontend_requirements.md#fr-21) | Controlled dependency set | A | `npm ci` with lockfile, fixed versions, `osv-scanner` | partly | licence check manual |
| [FR-22](frontend/frontend_requirements.md#fr-22) | Frontend in automated checks | A | jobs `frontend`, `osv-scanner` | implemented | blocking of a merge by a red required check was tested in a fork, not yet on a pull request in the target repository |
| [FR-23](frontend/frontend_requirements.md#fr-23) | Extensibility | M | ADR and architecture review | open | |

## Backend requirements

| ID | Rule (short) | Type | Check | Status | Gap / note |
|---|---|---|---|---|---|
| [BR-01](backend/backend_requirements.md#br-01) | Stable internal API as single integration point | H | spec-first rule in `AGENTS.md`, `drift`, `openapi-lint` | partly | no contract test against the running backend |
| [BR-02](backend/backend_requirements.md#br-02) | `use-core` only through the adapter | H | `AdapterBoundaryTest` (ArchUnit) in job `backend` | implemented | |
| [BR-03](backend/backend_requirements.md#br-03) | OpenAPI spec exists | A | `openapi-lint` (`spectral:oas`) | implemented | |
| [BR-04](backend/backend_requirements.md#br-04) | Spec complete and aligned with the implementation | A | server interfaces generated from the spec (compiler), Spectral | partly | no contract test; CSRF header not declared in the spec |
| [BR-05](backend/backend_requirements.md#br-05) | Controlled API evolution | A/H | `oasdiff --fail-on ERR` against the base | partly | no version rule in the PR; no comparison while the base has no spec |
| [BR-06](backend/backend_requirements.md#br-06) | Server-side validation | H | Spectral `usenext-request-string-limits`, `usenext-parameter-string-limits`; endpoint tests for 400/422 | partly | no systematic negative tests from the spec |
| [BR-07](backend/backend_requirements.md#br-07) | Server-side authorisation | H | session required (401) tested | partly | one user, no roles |
| [BR-08](backend/backend_requirements.md#br-08) | Authentication declared in the security scheme | A | Spectral `usenext-security-explicit` | implemented | |
| [BR-09](backend/backend_requirements.md#br-09) | CSRF protection | H | `SessionCsrfIntegrationTest` | implemented | |
| [BR-10](backend/backend_requirements.md#br-10) | No session IDs in URLs | A | Spectral `usenext-apikey-cookie-only`; cookie transport in `SessionCsrfIntegrationTest` | implemented | |
| [BR-11](backend/backend_requirements.md#br-11) | Secure session handling | H | `SessionCsrfIntegrationTest` (cookie flags, rotation on login, logout, 30-minute timeout setting) | partly | timeout not tested end to end |
| [BR-12](backend/backend_requirements.md#br-12) | Structured, minimal errors | A/H | Spectral `usenext-error-problem-schema`; `MessageSanitizerTest`, endpoint tests | partly | container errors via `/error` use the Spring Boot default body |
| [BR-13](backend/backend_requirements.md#br-13) | Restrictive security headers | A | `SessionCsrfIntegrationTest`, `FrontendHeadersIntegrationTest` | implemented | HSTS behind a TLS proxy and browsers other than Chromium not verified |
| [BR-14](backend/backend_requirements.md#br-14) | Backend in automated checks | A | seven jobs in `stage1.yml` | implemented | as FR-22; no seeded violation of the evaluation targeted the `backend` job; `oasdiff` reports "NOT CHECKED" while the base branch has no spec |
| [BR-15](backend/backend_requirements.md#br-15) | Controlled dependency policy | A/H | Actions pinned by SHA, binaries by SHA-256, `osv-scanner`, `gitleaks`, `use-core-pin`, code owners for `.github/` and the install script (`.github/CODEOWNERS`) | partly | Maven only direct dependencies (`--no-resolve`); licence check manual |
| [BR-16](backend/backend_requirements.md#br-16) | Predictable timeout and failure behaviour | H | `OclEndpointIntegrationTest` (timeout, 503 with `Retry-After`) | partly | **known gap:** a missing or too generous limit is not found; manual review item |
| [BR-17](backend/backend_requirements.md#br-17) | Bounded resources per request | H | tests for expression length, result size, time and slots | partly | **known gap** as BR-16; request body size not limited; memory per request not boundable; no rate limiting |

## AI rules

| ID | Rule (short) | Type | Check | Status | Gap / note |
|---|---|---|---|---|---|
| [AI-01](ai_guidelines.md#ai-01) | Same checks for AI-assisted changes | A/H | stage 1 jobs apply regardless of the author | partly | human review part manual |
| [AI-02](ai_guidelines.md#ai-02) | AI-suggested dependencies checked | A/H | as FR-21/BR-15 | partly | existence and licence checked manually |
| [AI-03](ai_guidelines.md#ai-03) | AI assistance marked in the PR | H | section "AI assistance" in the PR template | partly | filled in manually |
| [AI-04](ai_guidelines.md#ai-04) | No secrets in prompts | M | rule only; `gitleaks` sees committed secrets, not prompts | rule only | |
| [AI-05](ai_guidelines.md#ai-05) | Current context file `AGENTS.md` | A/H | file exists and links the guidelines; characters checked by AI-11 | partly | currency reviewed manually |
| [AI-06](ai_guidelines.md#ai-06) | Self-check run and noted | H | procedure in [ai_guidelines.md](ai_guidelines.md#2-self-check-with-an-ai-tool), PR template field | partly | advisory only; result depends on model and setting |
| [AI-07](ai_guidelines.md#ai-07) | Self-check tool without rights | M | rule only (tool set-up is not visible to the repository) | rule only | |
| [AI-08](ai_guidelines.md#ai-08) | Treat content as untrusted, verify AI output | M | rule only | rule only | prompt injection cannot be prevented ([section 4](ai_guidelines.md#4-residual-risk-prompt-injection)) |
| [AI-09](ai_guidelines.md#ai-09) | Tests from spec and requirements | H | review | rule only | contract tests missing |
| [AI-11](ai_guidelines.md#ai-11) | No hidden characters in context files | A | `scripts/check-context-files.mjs` in job `frontend` | tested | only `AGENTS.md` is checked |

## Project rules ([guidelines.md](guidelines.md))

| Rule (short) | Type | Check | Status | Gap / note |
|---|---|---|---|---|
| Deviation from an ADR is described in the PR ([section 4](guidelines.md#4-handling-architecture-decisions-adrs)) | H | PR template section on affected ADRs | partly | not enforced technically |
| Linter and formatter in CI ([section 5](guidelines.md#5-quality-assurance-prs-and-pipelines)) | A | job `frontend` (ESLint, Prettier) | partly | no formatter for the backend |
| Dependency and security checks in CI | A | `osv-scanner`, `gitleaks`, `openapi-lint` | partly | limits as FR-21/BR-15 |
| Spec and generated client consistent | A | `drift` | tested | |
| PR names affected ADRs and risk documents | H | PR template section | partly | not enforced technically |
| PR confirms the security rules or justifies an exception | H | PR template checkbox | partly | not enforced technically |

## Evaluation

Nine cases, each on its own branch in a fork, with the expected result written down before the run: a clean baseline
and eight seeded violations. All nine behaved as predicted.

| Case | Seeded violation | Result | Rows |
|---|---|---|---|
| E00 | none | all jobs green (no false alarm) | all |
| E01 | `dangerouslySetInnerHTML` and `innerHTML` | `frontend` red at lint | FR-14, FR-15 |
| E02 | CSRF token in a URL query in hand-written code | **not found** (known gap) | FR-17 |
| E03 | spec changed, client not regenerated | `drift` red | FR-11, spec/client consistency |
| E04 | request `maxLength` reduced | `oasdiff` red (`backend` red as a side effect) | BR-05 |
| E05 | vulnerable Maven and npm dependencies | `osv-scanner` red | FR-21, BR-15 |
| E06 | secret-shaped value in a resource file | `gitleaks` red | BR-15 |
| E07 | excessive expression limit and timeout | **not found** (known gap) | BR-16, BR-17 |
| E08 | hidden Unicode character in `AGENTS.md` | `frontend` red at the context file check | AI-11 |

The first run of the evaluation also found two defects in the pipeline itself (the vulnerability scan stayed green
despite findings, and the secret scan looked at other branches); both are fixed and the second run confirmed it.

Limits of the evaluation: the cases were designed by the author of the checks, there is one case per category, false
alarms were measured on the clean baseline only, and run times and maintenance effort were not measured.
