# 3. Context View

The system is operated by a modeller or analyst via a web frontend. The frontend communicates with a backend
integration layer, which in turn accesses the existing `use-core`. Optional plugins may extend the system with
additional functionality where required.

> [Architecture overview — USE_NEXT](0_architecture_overview.md)

```plantuml
!include <C4/C4_Context>

LAYOUT_WITH_LEGEND()
title System Context diagram for USE_NEXT

Person(modeler, "Modeler / Analyst", "Specifies, analyses and validates UML/OCL models")
System(useNext, "USE_NEXT", "Web-based tool for UML/OCL model specification, analysis and validation")
System_Ext(useCore, "use-core", "Existing USE domain core: model processing, OCL evaluation, validation. Reused unchanged (ADR-001)")
System_Ext(usePlugins, "USE Plugin(s)", "Optional extensions providing additional USE functionality")

Rel(modeler, useNext, "Uses", "Browser, HTTPS")
Rel(useNext, useCore, "Delegates model processing to", "in-process Java adapter")
Rel_U(usePlugins, useCore, "Registers with", "PluginRuntime")
```
[//]: # (Previous version: c4/context_new.drawio.png, kept until the code-based diagram is accepted)

## 3.1 Domain Context

| Element           | Description                                                                                         |
|-------------------|-----------------------------------------------------------------------------------------------------|
| Modeler / Analyst | Person who operates the system locally via the web frontend.                                        |
| **USE_NEXT**      | New frontend and integration system for UML/OCL modeling, analysis and validation with GUI and CLI. |
| `use‑core`        | Existing core system for model processing, validation, OCL evaluation and domain logic.             |
| **USE** Plugin(s) | Optional extensions that provide additional functions for USE.                                      |
