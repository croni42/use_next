<!--
Pull request template for USE_NEXT. Rules: documentation/guidelines.md, chapter 5 and documentation/ai_guidelines.md.
Delete a section only if it is really not applicable and write "n/a" instead. Comments like this one are not shown.
-->

# Summary

<!-- What does this PR change and why, in a few sentences or a short list. -->

# Motivation

<!-- Problem or goal. Scope decisions: what is deliberately not part of this PR. -->

# What changed

<!-- Group by area so the review can follow it, for example: documentation and ADRs, check pipeline, backend, frontend, OpenAPI. -->

# Architecture & Security compliance

- **Affected ADRs and risks:** <!-- IDs from documentation/architecture/9_architecture_decisions.md and risks from 11_risks_technical_debts.md, or "none". A deviation from an ADR: describe it and propose the documentation change. -->
- **Security rules:** <!-- Confirm that no rule from the Solution Strategy (Security Decisions in documentation/architecture/4_solution_strategy.md) is violated, or describe the justified exception. -->
- **Structural changes:** <!-- New containers, components or boundaries, and the arc42 chapters you updated; or "none". -->

# Behavior & backward compatibility

<!-- Changes to the API (openapi/openapi.yaml), configuration, or behaviour that existing users depend on; or "none". -->

# Known limitations

<!-- What this PR does not cover or cannot check. Update documentation/architecture/11_risks_technical_debts.md (Known limitations) if a limit is new. -->

# AI assistance

- [ ] No substantial AI assistance
- [ ] AI-assisted ([AI-03](../documentation/ai_guidelines.md#ai-03), [AI-06](../documentation/ai_guidelines.md#ai-06)):
  - **Tool and model, date:**
  - **Scope (which files or diff):**
  - **Self-check done** (findings / confirmed findings; the result is advisory, the CI checks are authoritative) – see `documentation/ai_guidelines.md`:

# Manual review (not covered by CI)

- [ ] Reviewer looked at the hand-written code: no token, session information or other sensitive value in a URL query ([FR-17](../documentation/frontend/frontend_requirements.md#fr-17)).
- [ ] Any new evaluation path still limits expression length, result size and evaluation time ([BR-16](../documentation/backend/backend_requirements.md#br-16), [BR-17](../documentation/backend/backend_requirements.md#br-17)).
- [ ] `use-core` pin changed? If yes: old and new commit, licence headers re-read, tests green, approved by a maintainer who is not the author.


# Acceptance checklist for merge

- [ ] All seven stage 1 jobs are green, or a job shown as "NOT CHECKED" is explained above.
- [ ] Affected ADRs are named, the documentation matches the implementation, and the links to `FR-`, `BR-`, `ADR-` and `AI-` definitions resolve.
- [ ] No planning data, AI context outside `AGENTS.md`, or secrets are part of the diff.
- [ ] The sections above (ADRs, security, manual review, AI assistance) are filled in.

# Risks & mitigation

<!-- Risks of merging this change and how they are limited; or "none". -->

# Suggested reviewers & labels

- **Reviewers:** <!-- maintainers for architecture, security, frontend/backend design -->
- **Labels:** <!-- documentation, architecture, security, ci, ... -->
