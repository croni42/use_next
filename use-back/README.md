# use-back

Backend of USE_NEXT: Java 21, Spring Boot 4.1.x (Spring MVC) and Maven.
It exposes the REST API defined in [`openapi/openapi.yaml`](../openapi/openapi.yaml) under `/api` and integrates
`use-core` in-process. The only package that may import `org.tzi.use.*` is `adapter` (enforced by `AdapterBoundaryTest`).

## Guidelines and requirements

- [Project guidelines](../documentation/guidelines.md)
- [Backend guidelines](../documentation/backend/backend_guidelines.md)
- [Backend requirements](../documentation/backend/backend_requirements.md)
- [Backend overview](../documentation/backend/BACKEND.md)

## Packages (`de.haw.usenext`)

| Package    | Content                                                        |
|------------|----------------------------------------------------------------|
| `api`      | Controllers implementing the generated server interfaces       |
| `service`  | Application logic, e.g. bounded OCL evaluation                 |
| `adapter`  | The only access to `use-core`                                  |
| `security` | Session, CSRF and security header configuration                |

## Prerequisites

JDK 21 and Maven (`mvn`, only for the one-time `use-core` installation). `use-core` is not on Maven Central; install
it once from the pinned upstream commit, from the repository root:

```bash
bash scripts/install-use-core.sh
```

## Commands

Run from this directory.

```bash
./mvnw verify                                                  # build and all tests
./mvnw spring-boot:run -Dspring-boot.run.profiles=dev          # dev profile, see below
./mvnw -Pwith-frontend package                                 # jar that also serves use-web (run "npm run build" in use-web first)
java -Xmx512m -jar target/use-back-0.0.1-SNAPSHOT.jar          # run the packaged jar (heap limit is required)
```

## Configuration

- The dev profile sets a dev-only password hash; the login is documented in [AGENTS.md](../AGENTS.md). Never use it
  outside local development.
- Outside the dev profile, set `USENEXT_AUTH_PASSWORD_HASH` (a Spring Security password hash) and optionally
  `USENEXT_AUTH_USERNAME`.
- Server interfaces are generated from the OpenAPI spec during the Maven build; do not edit generated code.
