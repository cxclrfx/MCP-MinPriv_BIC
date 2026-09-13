# MCP MinPriv_BIC

**Local least-privilege analysis for MCP and AI-agent tool logs.**

MCP MinPriv_BIC reads tool-call logs, determines which tools were actually observed, and produces a reviewable least-privilege candidate policy. It runs entirely in the browser: no server, no account, no upload.

When an authoritative tool catalog is supplied, version 1.0.2 enforces the intended relation:

```text
AVAILABLE ∧ OBSERVED → CATALOG-CONSTRAINED OBSERVED ALLOWLIST
```

Observed tool names that are not present in the supplied catalog are reported separately and are not added to `allowedTools`.

**Documentation:** [Usage and troubleshooting](INSTRUCTIONS.md) · [License](LICENSE) · [Security](SECURITY.md) · [Validation](VALIDATION.md)

---

## Why it exists

Modern AI agents can be connected to files, GitHub, shells, databases, cloud services, messaging, payments, and administrative systems. Development environments often expose more tools than a production workload actually uses.

MCP MinPriv_BIC asks:

> **Which tools did this observed workload actually use, and which of those were also present in the authoritative tool catalog?**

---

## What it does

- reads JSON or JSONL agent/MCP logs locally;
- detects common tool-call event shapes recursively;
- counts calls per observed tool;
- optionally reads an authoritative catalog of available tools;
- computes `observed ∩ catalog` when a catalog is supplied;
- reports observed names outside the catalog;
- reports catalog tools that were not observed;
- marks tool names with transparent heuristic risk categories;
- exports a machine-readable candidate policy;
- sends no log data to an external service.

## What it does not do

MCP MinPriv_BIC is not an automatic production authorization engine and is not a complete security audit. Absence from logs does not prove a tool will never be required. Risk labels are review signals, not a security verdict.

---

## Quick start

1. Download or clone this repository.
2. Open `index.html` in a modern browser.
3. Select a JSON/JSONL tool-call log.
4. Optionally select an authoritative JSON/JSONL tool catalog.
5. Click **Build least-privilege profile**.
6. Review observed tools, call counts, catalog mismatches, and risk signals.
7. Download the generated policy if useful.

No installation or local server is required.

---

## Policy semantics

With a catalog, suppose the observed names are:

```text
files.read
shell.exec
outside.catalog
```

and the catalog contains:

```text
files.read
shell.exec
github.search_code
```

Then the policy is conceptually:

```json
{
  "allowedTools": ["files.read", "shell.exec"],
  "deniedOrUnobservedTools": ["github.search_code"],
  "observedOutsideCatalog": ["outside.catalog"]
}
```

Without a catalog, the program can only produce an observed-use candidate list. A supplied empty catalog allows no tools. Invalid or unrecognized catalogs block analysis; they never switch silently to observed-only mode. Catalog names come from explicit entries, not nested parameter schemas.

---

## Parser boundaries hardened in 1.0.2

- Argument/result payloads of an already-recognized tool-call envelope are treated as opaque for additional tool detection, preventing tool-shaped argument data from being double-counted as a second call. Nested event records outside payload fields remain detectable and count separately; JSON shape alone cannot establish actual execution.
- Log traversal beyond depth 40 and catalog traversal beyond depth 30 fail closed instead of silently truncating coverage.
- Changing either input invalidates the previous report immediately and disables download until a new analysis is built.
- The on-screen event summary shows structural fields and argument-key names rather than raw argument values.

---

## Privacy

All processing happens locally in the browser. The application contains no backend, analytics, telemetry, external API call, or upload path.

Real logs may contain confidential information. Treat them as private unless verified otherwise, and do not commit real production logs or confidential reports to this repository.

---

## Included examples

The `examples/` directory contains synthetic data only:

```text
examples/sample-logs.jsonl
examples/tool-catalog.json
```

Expected result:

```text
5 observed calls
3 unique observed tools
8 catalog tools
5 unobserved catalog tools
0 observed-outside-catalog tools
```

---

## Validation status

**Application v1.0.2**

The original synthetic regression suite contains 8 checks. Additional regressions cover empty catalogs, catalog schema boundaries, MCP payloads, and asynchronous input changes. Run all checks with `node --test tests/minpriv.test.cjs`; see [VALIDATION.md](VALIDATION.md) for results.

It covers catalog intersection, observed-outside-catalog handling, no-catalog behavior, nested payload suppression, safe event summaries, fail-closed traversal limits, and stale-report invalidation.

Actual browser file selection, rendering, downloads, and cross-browser behavior remain **NOT_RUN** in this repository validation pass. See [VALIDATION.md](VALIDATION.md).

---

## Repository layout

```text
MCP-MinPriv_BIC/
├── index.html
├── README.md
├── INSTRUCTIONS.md
├── SECURITY.md
├── VALIDATION.md
├── CHANGELOG.md
├── LICENSE
├── .gitignore
├── examples/
│   ├── sample-logs.jsonl
│   └── tool-catalog.json
└── tests/
    └── minpriv.test.cjs
```

---

## License and commercial use

Copyright © 2026 **cxclrfx**.

The repository uses the [MCP MinPriv_BIC Source-Available License, version 1.1](LICENSE). Personal non-commercial use, non-commercial education, and non-commercial evaluation/testing are permitted under that license. A separate written commercial license is required before commercial deployment, internal business use, resale, paid integration, managed-service use, or embedding in another product or service.

This is source-available software with use restrictions, not open source.

For commercial licensing, contact the repository owner through GitHub.

---

## Responsible use

Use MCP MinPriv_BIC only with logs and systems you are authorized to inspect. Do not treat the generated policy as an automatic authorization decision without review, staged testing, and a rollback path.

## Disclaimer

This project is provided as-is, without warranty. MCP and product names mentioned in examples belong to their respective owners. This project is independent and unofficial.
