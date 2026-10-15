# use-web

Web frontend of USE_NEXT: React, TypeScript (strict) and Vite.
It talks to [`use-back`](../use-back/README.md) only through the TypeScript client generated from
[`openapi/openapi.yaml`](../openapi/openapi.yaml).

## Guidelines and requirements

- [Project guidelines](../documentation/guidelines.md)
- [Frontend guidelines](../documentation/frontend/frontend_guidelines.md)
- [Frontend requirements](../documentation/frontend/frontend_requirements.md)
- [Frontend overview](../documentation/frontend/FRONTEND.md)

## Prerequisites

Node.js 24 or newer (see `engines` in `package.json`). The backend must be running on `localhost:8080`.

## Commands

Run from this directory.

| Command                | Purpose                                                             |
|------------------------|---------------------------------------------------------------------|
| `npm ci`               | Install the pinned dependencies                                     |
| `npm run dev`          | Vite dev server; proxies `/api` to `http://localhost:8080`          |
| `npm test`             | Unit tests (Vitest)                                                 |
| `npm run lint`         | ESLint                                                              |
| `npm run format:check` | Prettier check (`npm run format` writes)                            |
| `npm run lint:api`     | Spectral lint of `openapi/openapi.yaml`                             |
| `npm run build`        | Type check and production build to `dist/`                          |
| `npm run generate:api` | Regenerate the API client in `src/api/` from the OpenAPI spec       |

## Notes

- `src/api/` is generated and committed. Never edit it by hand: change the spec, regenerate, commit, and run
  `bash scripts/check-drift.sh` from the repository root.
- Backend access goes through the generated client only, encapsulated in `src/api-client.ts`.
- The production build is served by the backend with the Maven profile `with-frontend`
  (see [use-back](../use-back/README.md)).
