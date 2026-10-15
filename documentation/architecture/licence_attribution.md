# Licence and Attribution

## USE_NEXT

Project-specific content (of "use_next" or "USE_NEXT") is licensed under the  [project license](../../LICENSE)

## arc42

This document is based on the arc42 documentation template (version 9.x or latest),  
licensed
under [Creative Commons Attribution-ShareAlike 4.0 International License](https://creativecommons.org/licenses/by-sa/4.0/).

[Arc42 Licence](https://arc42.org/license)

**arc42** was initially created by Dr. Gernot Starke and Dr. Peter Hruschka.  
See [https://arc42.org](https://arc42.org) for more information.

**Changes made to the original arc42 template:**

- Many sections of the original arc42 template have been completely omitted, as they are not relevant for the state
  of this project ("use_next" or "USE_NEXT").
- The remaining sections have been condensed to essentials with minor structural adjustments to optimally fit
  the project-specific requirements.
- The fundamental principles and core purpose of the selected sections remain unchanged.
- Parts of the arc42 template may be unfinished and WIP, those are especially marked as WIP

## C4 Diagrams
> Context and Container Diagrams are created with the C4 model, introduced by Simon Brown. (n.d.). C4 model for 
> visualising software architecture. C4 Model. Retrieved 05.06.2026, from https://c4model.com

## use-core

`use-back` depends on `use-core` (version 7.5.0), which is not published to Maven Central. It is built from
the pinned upstream commit `30d480dbcca2f404b1350039516a56f46c1efb1f` of
[useocl/use](https://github.com/useocl/use) by `scripts/install-use-core.sh` and installed into the local Maven
repository; CI rebuilds it on every run. The pinned commit lies on the `main` branch of `useocl/use`, and the `use-core`
source is not part of this repository. Raising the pin goes through the maintainer gate (check `use-core-pin`, see
[guidelines.md](../guidelines.md)). USE_NEXT is licensed under the GPLv3. The intended licence of the USE project is GPL
version 3 or later. As long as the upstream headers at the pinned commit are unchanged, they state GPL version 2 or (at
your option) any later version (source cited in [ADR-009](9_architecture_decisions.md#adr-009-backend-language-framework-and-integration-of-use-core)); `use-core` is used under the GPLv3, which the "or later"
wording permits.
`use-core` is not modified. The licence references for `use-core` (upstream repository, licence text and source headers at
the pinned commit) are collected in [use_core_licence.md](use_core_licence.md).

Besides its own source files, `use-core` brings the compile-scope dependencies declared in its `use-core/pom.xml` at the
pinned commit: guava 33.5.0-jre, `org.eclipse.jdt.annotation` 2.2.600, antlr-runtime 3.5.3, jline 2.14.6,
combinatoricslib 2.3, jruby-core 9.3.1.0 and vtd-xml 2.13.4. Their licences differ from the project's own, and their
compatibility with the GPLv3 has not been reviewed.

## Development dependencies

The npm lockfile of `use-web` contains, besides permissive licences (MIT, ISC, Apache-2.0, BSD), the following
transitive development dependencies of the lint tooling (ESLint, Spectral): `CC-BY-4.0` (caniuse-lite, data),
`Python-2.0` (argparse), `Unlicense` and `0BSD`. Stage 1 of the CI pipeline contains no licence check. The compatibility
of these licences with the GPLv3 has not been legally reviewed.
