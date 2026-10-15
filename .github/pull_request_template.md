## Summary

## Affected ADRs and risks

<!-- IDs from documentation/architecture/9_architecture_decisions.md, or "none". Deviation from an ADR: describe it and propose the documentation change. -->

## Security

- [ ] No security rule from the solution strategy (Security Decisions) is violated, or the exception is described here.

## Manual review (not covered by CI)

- [ ] Reviewer looked at the hand-written code: no token, session information or other sensitive value in a URL query ([FR-17](../documentation/frontend/frontend_requirements.md#fr-17)).
- [ ] Any new evaluation path still limits expression length, result size and evaluation time ([BR-16](../documentation/backend/backend_requirements.md#br-16), [BR-17](../documentation/backend/backend_requirements.md#br-17)).
- [ ] `use-core` pin changed? If yes: old and new commit, licence headers re-read, tests green, approved by a maintainer.

## AI assistance

- [ ] No substantial AI assistance
- [ ] AI-assisted: tool and model, scope, self-check done (findings / confirmed findings) – see `documentation/ai_guidelines.md`
