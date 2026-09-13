# Changelog

## 1.0.2 — 2026-09-13
First clean MCP MinPriv_BIC release, with no inherited Git history. BIC is the project name; no expansion is assigned.

Retains the 1.0.1 catalog intersection, separate outside-catalog reporting, opaque recognized call payloads, fail-closed traversal limits, report invalidation, and structural summaries.

Additional corrections from publication review:
- Empty supplied catalogs constrain the allowlist to empty.
- Catalog extraction uses explicit entries and excludes nested parameter-schema names.
- MCP params are opaque to additional call detection. Arguments, args, and result are never traversed as invocation records, including in unrecognized wrappers. Separate nested events under children/events remain countable.
- Invalid or loading inputs block analysis; read generations prevent stale asynchronous results.
- Input parsing errors do not display raw file fragments.
- Usage documentation now matches the shipped behavior.
- The original eight synthetic checks are retained, with additional boundary regressions.

The example command matches the documented test command. Public-facing names and license references use MCP MinPriv_BIC. License terms remain version 1.1.

## 1.0.1 behavior baseline
The earlier eight regression checks passed. Review established two unconditional failures (empty authoritative catalog and catalog load failure) plus a clarified nested-invocation regression case: separate nested events count; tool-shaped argument/result data does not. That result is limited baseline evidence, not closure for this release. See [VALIDATION.md](VALIDATION.md).
