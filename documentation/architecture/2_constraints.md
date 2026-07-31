# 2. Constraints

The following boundary conditions significantly influence the system’s architecture and its technical implementation.

> [Architecture overview — USE_NEXT](0_architecture_overview.md)

## 2.1 Technical Boundary Constraints

- The system will initially be executed exclusively locally and will not be provided as a publicly accessible web
  service.
- Communication therefore currently takes place only within the local execution and development environment.
- The frontend is to remain platform‑independent and should be executable on common modern desktop browsers (firefox,
  chrome, edge).
- A mobile usage is not intended.
- No special hardware requirements beyond a standard PC or laptop are to be specified.
- The frontend technologies used should be freely available and maintainable in the long term.

## 2.2 Organisational Boundary Constraints

- The system is designed as an open‑source tool and should be well documented and structured to facilitate continued
  development by third parties.
- The underlying technological basis should be widely used and well documented, in order to reduce the entry barrier for
  new developers.
- The architecture should allow incremental expansion and modularisation without requiring major disruptive changes.

## 2.3 Conventions and Standards

- The architecture documentation follows the Arc42 template and uses a clear, structured outline.
- Coding and naming conventions are aligned with the usual best‑practice guidelines for the frontend technologies
  employed.
- The structuring of frontend components follows established patterns such as modularisation, component‑orientation, and
  well‑defined interfaces.

>These constraints intentionally support a documentation and architecture style that remains compact, modular, and easy
>to extend without requiring disruptive redesigns.
