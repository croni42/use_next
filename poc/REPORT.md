# PoC report: use-core (R-18b) + generator + cookie/CSRF

Branch `poc/generator-usecore` (from `WIP-feature-implementation-start`). Nothing pushed, no PR, `documentation/` untouched.
Note: the folder and branch are called `poc` (not `spike`) at Lasse's request; the task file still says `spike`.

## 1. Bezugsweg (R-18b a)
- `org.tzi.use:use-core` is **not on Maven Central** (`https://repo.maven.apache.org/maven2/org/tzi/` returns 404; `mvn dependency:get` failed).
- Tried: shallow clone of `https://github.com/useocl/use` (commit `30d480dbcca2f404b1350039516a56f46c1efb1f`, version 7.5.0, Java 21) and `mvn -pl use-core -am install -DskipTests`: **works, ~25 s**, installs into `~/.m2`. The PoC backend depends on `org.tzi.use:use-core:7.5.0` from there.
- Not tried: Git submodule (evaluated on paper only).
- Licence: use is GPL v2 or later (`COPYING`, header of `Session.java`), so it is combinable with this GPLv3 project; attribution must name USE and the upstream commit.
- Comparison for a fresh checkout / CI stage 1 (JDK + Node only):

| Option | Fresh checkout | CI stage 1 | Remark |
|---|---|---|---|
| `mvn install` from a clone, then build use-back | clone + one command, ~25 s plus clone | needs Git + clone step, no extra tools | pin the commit hash in a script |
| Submodule + Maven multi-module | `git submodule update --init`, then one build | reactor builds use-core every time, slower | couples repos, use-gui comes along unless `-pl use-core` |
- Recommendation (not a decision): script "install use-core at a pinned commit into the local Maven repo" (`-pl use-core -am`), cached in CI. Revisit if upstream publishes to a registry.

## 2. Thread safety (R-18b b)
Findings (upstream commit above, `use-core/src/main/java/org/tzi/use/`):
- `uml/ocl/expr/ExpStdOp.java:50-56`: `public static ListMultimap opmap` (`ArrayListMultimap`, not thread-safe), filled in a static initialiser (safe); mutated at runtime by `addOperation` / `removeAllOperations` (`:62-73`, plugin hooks). Read-only use is fine, runtime mutation is not.
- `config/Options.java:64-291`: ~30 mutable `public static` fields (`disableCollectShorthand`, `explicitVariableDeclarations`, `testMode`, ...), plain non-volatile. Read during parsing (`parser/ocl/ASTOperationExpression.java:401,408`, `ExpStdOp.java:135`). Safe as long as nothing writes them after start-up.
- `uml/ocl/type/TypeFactory.java:36,50`: `static HashMap buildInTypesMap`, filled in a static initialiser, only read afterwards.
- `main/Session.java:36-39`: `fSystem` and listener lists are plain mutable fields, no synchronisation. `uml/sys/MSystem.java:242-261` and `MSystemState.java:119,155` synchronise only small parts. A shared `MSystem` / `MSystemState` that is *changed* is not safe.
- Parser/compiler (`USECompiler`, `OCLCompiler`) create fresh ANTLR lexer/parser objects per call; no shared state found in this path.

Test (`UseCoreConcurrencyTest`, 8 threads x 100 iterations, same load + OCL operation, expected result `14`):
- separate object graph per call: **800/800 correct, 0 failures** (asserted).
- one shared `MModel`/`MSystem`, compile + eval per iteration: **800/800 correct, 0 failures** (reported, not asserted). This only covers *read-only* use; it is no proof for concurrent state changes. Races are non-deterministic, so absence of failures is weak evidence.

Adapter recommendation: **per-request object graph** (what `DefaultUseCoreAdapter` does now: compile model, new `MSystem`, evaluate). If sessions later hold a model/system between requests, serialise access **per `MSystem`** (lock or single-thread executor per session); never mutate `Options` or `ExpStdOp.opmap` after start-up.
Sketch (implemented): `UseCoreAdapter { String evaluate(String modelSource, String oclExpression); }` plus `UseCoreException`, in package `adapter`, the only place importing `org.tzi.use.*`. `AdapterBoundaryTest` (ArchUnit) enforces this. ArchUnit 1.5.1 is Apache-2.0 (verified in the `archunit` POM; `archunit-junit5` licence not checked separately).

## 3. Generator
Versions: Spring Boot **4.1.1** (Tomcat 11.0.24, Spring Security 7.1.1), OpenAPI Generator **7.26.0** (Maven plugin and CLI), Maven wrapper 3.9.16, JDK 21.0.8, Node **24.21.0** (portable zip, SHA256 verified; `@openapitools/openapi-generator-cli` 2.41.0), React 19.3.0, Vite 8.3.3, TypeScript 6.0.3, oxlint 1.87.0. All pinned exactly.
Commands: `cd poc/use-back && ./mvnw verify`; `cd poc/use-web && npm ci && npm run build`; `npm run generate:api`.
- `useSpringBoot4` **exists** in 7.26.0 and was accepted (generated interfaces compile and are implemented by the controllers). Server code is generated at build time into `target/` and not committed.
- Workarounds: `swagger-annotations` (2.2.30) and `jakarta.validation-api` dependencies added for the generated interfaces; `docs/` excluded via `.openapi-generator-ignore`; `poc/use-web/.gitattributes` forces LF in `src/api` (Windows `autocrlf` otherwise showed false `M` entries).
- Vite template ships `tsconfig` without `strict`: added `"strict": true`. Generated code violates `noUnusedLocals`, `noUnusedParameters` and `erasableSyntaxOnly` (parameter properties in `runtime.ts`); these three template flags were removed (they are lint-style, not part of `strict`). Alternative: separate tsconfig for `src/api`.

## 4. Cookie / CSRF
- Session cookie `JSESSIONID`: `server.servlet.session.cookie.{http-only,secure,same-site=strict}`, timeout 30 m, cookie tracking only. Test shows the real header: `JSESSIONID=...; Path=/api; Secure; HttpOnly; SameSite=Strict`.
- Session ID rotated on login (`ChangeSessionIdAuthenticationStrategy` + `CsrfAuthenticationStrategy`, which also rotates the CSRF token); login is a controller operation from the OpenAPI spec; logout invalidates the session server-side.
- CSRF: `HttpSessionCsrfTokenRepository` + plain `CsrfTokenRequestAttributeHandler`; the token comes from `GET /auth/csrf` and goes back in `X-CSRF-TOKEN`. Plain handler means no BREACH masking (fine for JSON-only API with TLS compression off; a conscious trade-off).
- `SessionCsrfIntegrationTest` (real Tomcat, `RANDOM_PORT`, because MockMvc does not apply container cookie attributes): pre-login session != post-login session; old ID gets 401; POST without token = 403 (login and logout); wrong credentials = 401; with token = success; after logout the same ID gets 401. **Passes.**
- Found on the way: a 403 produced `sendError` and the container error dispatch to `/error` was turned into 401 because `/error` was protected. Fix: `permitAll` on `/error`.
- `Secure` on `http://localhost`: the server always sends the flag (test profile unchanged). Chromium-based browsers accept Secure cookies from `http://localhost`; verified manually in the in-app browser through the Vite proxy (login, health, logout, health = 401). Safari behaviour not tested (unverified). `document.cookie` is empty, i.e. HttpOnly works.
- Vite dev proxy: `/api` -> `http://localhost:8080` (`vite.config.ts`); spec server URL is `/api`, backend context path is `/api`.
- Dev login: profile `dev` (`application-dev.properties`) contains a bcrypt hash of the documented dev password; without the property (or `POC_AUTH_PASSWORD_HASH`) the app does not start.

## 5. Drift check
`bash poc/scripts/check-drift.sh` (Git Bash on Windows; needs JDK 21 and Node on PATH): `npm ci`, regenerate, `git diff --exit-code -- poc/use-web/src/api`, plus check for untracked generated files.
- Green on clean tree: `OK: generated client is up to date.` (exit 0).
- Red after adding `displayName` to `UserInfo` in the spec: diff of `UserInfo.ts` printed, exit 1. Reverted, green again.
- Limit: compares against the committed/index state, so uncommitted client changes count as drift.

## 6. Client quality
- `npm run build` passes with `strict`. 35 explicit `any` in generated code (`queryParameters: any`, `FromJSON(json: any)`), contained in `src/api`.
- Errors: non-2xx throws `ResponseError` with the message "Response returned an error code"; status and body only via `error.response` (not typed per status; the `Problem` schema is not mapped to the thrown error). Non-JSON/204 handled (`logout` returns `void`).
- Cookie handling: generator ignores the `apiKey in cookie` scheme (the browser handles it). `credentials: 'include'` and the CSRF header work centrally from `src/api-client.ts` (middleware `pre` + cached token, reset after login/logout). Verified end to end in the browser.
- Not needed: client replacement (Hey API / Orval), ADR-010 fallback not triggered.

## 7. Open problems / unverified
- No Bean Validation provider on the classpath (log: `NoProviderFoundException`); generated `@Valid` constraints are not enforced until `spring-boot-starter-validation` is added. Not done in this PoC.
- Concurrency evidence limited to read-only shared use; no test with state-changing commands.
- Safari behaviour for Secure on localhost; production TLS setup; session timeout not tested (30 m configured only).
- `mvnw` needs network on first run; Node was a portable download outside the repo.
- Git submodule option not tried; 12 npm packages are MPL-2.0 (combinable with GPLv3, not examined further).
- Per-part time was not measured; wall time was well within the 4 h box.

## 8. Recommendation
- ADR-009 consistent: Spring Boot 4.1.1 + `use-core` in-process works; add the install-at-pinned-commit step to the ADR/CI description, because use-core is not in a registry (this is a gap in ADR-001/009 wording, not a contradiction).
- ADR-010 consistent: `spring` generator with `useSpringBoot4` and `typescript-fetch` both work; drift check works. Consider noting the tsconfig flag conflict and the `ResponseError` limitation.
- ADR-008 consistent: option D is implemented as written. Consider recording the decisions "plain CSRF handler", "CSRF token rotates on login" and "`/error` must be permitted".
- Consider a per-session lock in the adapter design (ADR-009) and an ArchUnit rule as part of CI.
