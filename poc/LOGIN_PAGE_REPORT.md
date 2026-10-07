# Login page report (AP-03, part 1)

Branch `feature/login-page` (from `WIP-feature-implementation-start`, which now contains the PoC). Layout option A: everything stays in `poc/`. Nothing pushed, no PR, `documentation/` untouched.

## Built
- **Spec first** (`openapi/openapi.yaml`): new `GET /auth/me` (`UserInfo`, 401 without session, `apiKey` in `cookie` only); `LoginRequest` limits `username` 1-64, `password` 1-128 chars; `login` documents 400/401/403, `logout` 403; shared responses `BadRequest`, `Forbidden`, `Unauthorized` all use `Problem`. Client regenerated and committed; `bash poc/scripts/check-drift.sh` -> `OK: generated client is up to date.`
- **Backend** (`use-back`): `AuthController.getCurrentUser()` through the generated `AuthApi`; `spring-boot-starter-validation` added so the generated `@Valid` constraints are enforced; `ApiExceptionHandler` maps `AuthenticationException` -> 401 `{"status":401,"title":"Login failed"}` (identical for unknown user and wrong password, no new cookie) and validation errors -> 400 `Invalid request`; `SecurityConfig` entry point / access-denied handler now return minimal `Problem` bodies for 401/403. Messages are constants, nothing from the request is echoed or logged. PoC findings unchanged (`/error` permitted, session ID and CSRF token rotate on login, cookie `HttpOnly; Secure; SameSite=Strict`, 30 min inactivity, startup fails without a password hash).
- **Frontend** (`use-web`): `App` (decides via `GET /auth/me`: loading / `LoginPage` / `StartPage`, no router), `LoginPage`, `StartPage`. `api-client.ts` is the only place with `fetch`, `credentials: 'include'`, CSRF header; it also does the single 403 retry with a fresh CSRF token and a central 401 hook (not for the login call itself), and exposes `getCurrentUser/login/logout/isUnauthorized`. Messages: 401 on login "Login failed", anything else "Something went wrong. Please try again."; rendered as text in an `aria-live` region.
- Dev login: profile `dev`, user `lasse`; the local-only password is documented in `use-back/src/main/resources/application-dev.properties` (bcrypt hash committed, no real password in the repo). The hard-coded password in the old `App.tsx` is gone.

## Dependencies
| Package | Version | Licence | Where |
|---|---|---|---|
| spring-boot-starter-validation | managed by Boot 4.1.1 (Hibernate Validator) | Apache-2.0 (not re-verified in the POM) | use-back |
| vitest | 5.0.3 | MIT | devDependency |
| jsdom | 30.1.2 | MIT | devDependency |
| @testing-library/react | 16.3.3 | MIT | devDependency |
| @testing-library/dom | 10.4.2 | MIT | devDependency |
| @testing-library/user-event | 14.6.7 | MIT | devDependency |

npm licences checked with `npm view <pkg> license`; transitive licences not audited. `jest-dom` deliberately not added.

## Tests
- `./mvnw verify`: 8 tests, 0 failures (2 concurrency, 1 ArchUnit, 5 session/CSRF). New: `/auth/me` 401 without and 200 with session; identical login failure body for unknown user and wrong password; empty / overlong username and password -> 400 `Problem`; 403 `Problem` without CSRF token. (Timing equality of unknown-user vs. wrong-password is not measured; it relies on Spring's `DaoAuthenticationProvider` dummy hash comparison.)
- `npm test`: 11 tests, 0 failures (UI flows, button disabled while pending, generic messages, logout, 401 hook, CSRF retry once and no loop, no 401 hook for failed login).
- `npm ci && npm run build` (TypeScript strict) green; `npm run lint` (oxlint) clean.
- `grep` for `localStorage|sessionStorage|dangerouslySetInnerHTML|innerHTML|fetch(` outside `src/api`: only `src/api-client.ts:62` (the CSRF retry).

## Manual check (in-app Chromium browser, backend `dev` profile + Vite proxy)
- Wrong password -> "Login failed"; correct password -> start page with user; reload -> still logged in; logout -> login page; navigating away and Back -> login page (no protected content).
- `document.cookie` is empty, `localStorage`/`sessionStorage` empty, URL stays `/`, no credentials in any request URL.
- Cookie flags: the DevTools cookie panel was not inspected; the raw `Set-Cookie` header through the Vite proxy (curl) is `JSESSIONID=...; Path=/api; Secure; HttpOnly; SameSite=Strict`, and `SessionCsrfIntegrationTest` asserts it.
- 30 min inactivity not tested manually.

## Open items
- Linting: oxlint already exists (`npm run lint`), not an ESLint config; no further lint changes made (AP-04).
- Safari (Secure cookie on `http://localhost`) untested; bfcache restore of a protected page after logout in another tab untested.
- Session-timeout behaviour (401 -> login page) only covered by the unit test of the hook, not end to end.
- No business endpoint added (`/models/health` placeholder remains, `modelsApi` still exported, unused by the UI).
- Not verified against requirement text: none cited in code; relevant requirements read: FR-03, FR-10/11, FR-14/15, FR-17, FR-19/20, BR-06, BR-08, BR-09, BR-11, BR-12.
- No contradiction with ADR-007/008/009/010 found (no router/state library, cookie session + CSRF, generated interfaces/client only). Note: `tsconfig` still lacks the PoC-removed lint flags (see `poc/REPORT.md`).
