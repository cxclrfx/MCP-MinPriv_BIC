# Validation — application 1.0.2

## Reproduction
Run from the repository root:

```text
node --test tests/minpriv.test.cjs
```

The suite executes the actual inline application script in a Node.js VM with synthetic DOM adapters. Inputs are synthetic; no external services or real logs are used.

## Results and boundaries
Local synthetic suite: **PASS, 18/18 checks** on 2026-09-13. The original eight checks are retained; ten added checks exercise previously uncovered paths. These are implementation regressions, not independent security qualification or fresh scientific holdout evidence.

Actual browser file selection, rendering, downloads, and cross-browser behavior: **NOT_RUN**. The synthetic event handlers do exercise asynchronous state transitions, but do not establish browser end-to-end behavior.

## Baseline counterexamples
The earlier 1.0.1 suite passed 8/8. Additional review established two unconditional failures and one clarified regression case:

1. Empty authoritative catalog: `{"tools":[]}` incorrectly switched to unconstrained observed-only mode. Correct behavior is `allowedTools = observed ∩ ∅ = ∅`, with all observed names in `observedOutsideCatalog`.
2. Catalog load failure: an invalid new catalog left analysis enabled after valid logs were loaded. Correct behavior invalidates the previous report and blocks Analyze/Download until valid input is loaded.
3. Nested invocation semantics: tool-shaped data in MCP arguments was counted as an extra candidate. This is a data-versus-event distinction, not a prohibition on nested calls. Separate nested invocation/event records must count separately.

The named regressions `T_nested_payload_data_is_not_invocation` and `T_nested_real_mcp_invocation_counts_separately` both pass. Baseline PASS did not establish these paths. The tests are regressions, not fresh independent closure.

## Coverage
Original eight checks: sample catalog intersection, outside-catalog exclusion, observed-only mode, opaque input payload, safe summary, log depth overflow, catalog depth overflow, and stale report clearing.

Additional ten checks: empty catalogs; MCP/function opaque payloads with sibling calls; schema names excluded from catalogs; supported catalog forms and invalid names; catalog load errors and safe errors; pending log reads and out-of-order success; out-of-order catalog errors and cleared selections; actual synthetic example files and documented output counts; nested event records counted separately from identical argument data; an explicit outer/nested invocation example and opaque argument/result fields on unrecognized wrappers.

## Remaining limits
Detection is heuristic and supports specific shapes; candidate detection is not proof of successful execution. Unrecognized wrappers may contain tool-shaped data. Traversal limits apply to traversed structures, not opaque payloads, and are not total memory or processing-time limits. Rare workflows may be absent from the observation window. Name-based risk labels can be wrong. Names and argument keys may themselves be sensitive. Catalog provenance and freshness require external review.

## Publication content review
The publication tree contains only the eleven files listed in README. Static content review and targeted scans cover private research identifiers, personal data, credentials, absolute local paths, unrelated content, and external application requests. Included logs are synthetic. A scan is scoped evidence, not a universal guarantee.

Commit ancestry, author/committer metadata, repository privacy, description, topics, and remote file equality are verified separately during delivery.

## Execution-discovery invariant

```text
Traversal may recurse through structural event containers
(e.g. events / children / records / entries),
but MUST NOT recurse into arguments or result when discovering executions,
including inside unknown/unrecognized wrappers.
```

The explicit nested-event regression expects `outer_tool = 1`, `nested_tool = 1`, `total = 2`. Tool-shaped data in arguments or result does not add an invocation.
