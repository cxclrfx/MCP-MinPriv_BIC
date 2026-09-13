# Security and Data Handling

MCP MinPriv_BIC is intentionally implemented as a local browser application.

## Data flow

The current release:

- reads files selected by the user;
- processes them in browser memory;
- does not require a backend;
- does not intentionally send log contents to external APIs;
- downloads the generated policy report locally.

## Sensitive logs

Agent logs can contain paths, internal URLs, customer data, prompts, or tool outputs. Treat source logs as sensitive unless verified otherwise.

Do not commit real production logs or confidential reports to this repository.

## Safer display behavior in 1.0.2

The event-summary column no longer displays raw argument values. It shows structural fields and argument-key names only.

Changing either selected input invalidates the previous report and disables download until a new analysis is built.

These changes reduce accidental disclosure and stale-report confusion, but tool names and structural metadata may still be confidential.

## Catalog boundary

When a catalog is supplied, `allowedTools` is restricted to observed tool names that are also present in the catalog.

Observed names outside the catalog are reported separately in `observedOutsideCatalog` and are not silently authorized.

An empty catalog allows no tools. Invalid input blocks analysis. Only declared catalog entries contribute names; parameter schemas and descriptions are not tool inventories. Overlapping file reads are guarded so an older read cannot replace a newer selection.

The application does not verify that a supplied catalog is complete, authentic, or current. Treat catalog provenance as part of your security review.

## Policy output

The generated allowlist is evidence from observed logs, not a complete authorization proof. Review real tool behavior and permissions before enforcing a policy in production.

A detected tool name does not prove that the underlying operation succeeded. A missing tool does not prove it will never be required.

## Reporting a security issue

Prefer a small synthetic reproduction containing only the minimum structure needed to demonstrate the problem. Contact the repository owner through GitHub for non-public coordination when sensitive details are unavoidable.
