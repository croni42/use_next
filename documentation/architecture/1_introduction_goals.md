# 1. Introduction

Within the architecture documentation, particular emphasis is placed on the front‑end architecture and its
security relevance. The current project focus is the design of a modular architecture for **USE_NEXT**,
including a dedicated backend integration layer and the controlled reuse of `use-core`. Security considerations are
therefore not treated as an afterthought, but as part of the architectural design from the outset.

> [Architecture overview — USE_NEXT](0_architecture_overview.md)

## Overview USE

The system under consideration is based on the open‑source project **USE** (UML‑based Specification Environment). USE
serves as a support tool for the formal modelling and specification of software systems using UML concepts and OCL
expressions. [USE - GitHub](https://github.com/useocl/use)

> additional information: [README.md](../../README.md)

## Preventive Security Design

At the current stage of the project (07-2026), only local execution is planned. The frontend and its associated system
components are therefore not yet operated as a publicly accessible service over the Internet. As a result, the immediate
attack surface is reduced compared to a production-grade, externally accessible web application.

Nevertheless, the security measures considered in this work remain relevant and are deliberately taken into account in
both the architecture and the implementation guidelines. The reason is that frontend security issues do not arise solely
from public exposure, but are often rooted in design decisions, technology choices and implementation
details. [S21](/documentation/references.md#s21), [S15](/documentation/references.md#s15)

OWASP refers to this as an aspect of insecure design: missing or ineffective security mechanisms should be addressed as
early as possible. [S1](/documentation/references.md#s1),[S39](/documentation/references.md#s39) For this challenge, the
Fraunhofer Institute published a principle that still applies today: security by design.
[S27](/documentation/references.md#s27) This principle is now applied by numerous researchers and companies,
e.g. [S17](/documentation/references.md#s17), [S28](/documentation/references.md#s28)

In addition, even locally operated applications are not entirely free of risks. Insecure DOM manipulation, faulty
request generation, problematic dependencies or misconfigurations remain technical vulnerabilities, even if the system
is initially operated only in a development or demonstration environment. This is particularly relevant when the
architecture is intended to be extended later, transferred to other environments or gradually moved closer to production
conditions. [S1](/documentation/references.md#s1), [S9](/documentation/references.md#s9),
[S15](/documentation/references.md#s15), [S21](/documentation/references.md#s21)


> The security assessment therefore follows a preventive approach: it does not assume that a production-level Internet
> deployment is already in place, but rather that a robust and extensible architecture should incorporate
> fundamental security principles from the outset. This aligns with the defence-in-depth concept as well as the
> principle of “secure by default”, according to which protective mechanisms should be established early and as
> standard practice.