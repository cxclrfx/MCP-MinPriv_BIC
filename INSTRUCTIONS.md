# MCP MinPriv_BIC — Usage guide

Application version 1.0.2. See [README.md](README.md), [SECURITY.md](SECURITY.md), [VALIDATION.md](VALIDATION.md), and [LICENSE](LICENSE).

## Start
Download this repository and open `index.html` in a modern browser. No server, account, installation, or external dependency is needed. Node.js is needed only to run the synthetic tests.

1. Select a JSON or JSONL tool-call log.
2. Optionally select a tool catalog.
3. Wait for both selected inputs to load successfully.
4. Click **Build least-privilege profile**.
5. Review the detected calls, catalog mismatches, and heuristic risk signals.
6. Click **Download policy.json** to save `mcp_minpriv_policy_<timestamp>.json` in your browser's download location.

Changing either input immediately clears the report and disables download. Loading or invalid inputs block analysis. Selecting a newer file supersedes an older pending read. To start over without a catalog, reload the page and select only the log.

## Supported log shapes
Examples of candidate calls:

```json
[
  {"type":"tool_use","name":"files.read","input":{"path":"README.md"}},
  {"method":"tools/call","params":{"name":"files.read","arguments":{"path":"README.md"}}},
  {"tool_name":"github.search_code","args":{"query":"example"}}
]
```

The parser also recognizes function-call and assistant-recipient shapes. Detection is heuristic and does not prove execution or success. Arguments, args, and result are always opaque to further call detection. For recognized calls, input and output are also opaque; MCP params and recognized function payloads are also opaque. Nested event records outside those payload fields (for example under `events` or `children`) remain traversable and count separately. A payload-shaped object inside arguments is not evidence of a separate invocation. Formats that embed execution records inside arguments need an explicit format adapter based on documented event provenance. Unrecognized wrappers are traversed. Traversed log depth over 40 fails the analysis.

## Supported catalogs
Use an array of names or tool descriptors, or explicit `tools`, `functions`, `catalog`, or `allowedTools` containers. JSONL descriptor records are accepted. Server arrays or maps under `servers` may contain those containers. Descriptors use `name`, `tool_name`, or `{"type":"function","function":{"name":"files.read"}}`.

```json
{"tools":[{"name":"files.read"},{"name":"files.write"}]}
```

Descriptions and nested parameter schemas do not contribute tool names. Catalog names are trimmed and deduplicated, then matched case-sensitively. Unsupported structures and traversed depth over 30 block analysis.

With a catalog:
- `allowedTools` is OBSERVED ∩ CATALOG;
- `deniedOrUnobservedTools` contains catalog names not observed;
- `observedOutsideCatalog` contains observed names absent from the catalog.

`{"tools":[]}` is a valid empty catalog: it allows nothing and reports all observed names outside the catalog. No catalog means observed-only mode. The application does not establish catalog provenance, completeness, or freshness.

## Reading the report
Counts describe detected candidates in this input. Unobserved does not mean permanently unnecessary. Risk categories (destructive, write, execution, secrets, money, admin) are name-based review signals with possible false positives and false negatives.

The event-summary column omits raw argument values and shows structural metadata and argument-key names. Names and keys can themselves be sensitive. The downloaded report includes tool names, counts, and risk labels; it does not include event snippets. Parsing errors use a generic message so invalid input fragments are not displayed.

## Synthetic example
Select `examples/sample-logs.jsonl` and `examples/tool-catalog.json`. Expected: 5 calls, 3 unique observed tools, 8 catalog tools, 5 unobserved catalog tools, and 0 observed-outside-catalog names. Example commands are inert log text.

## Troubleshooting and limitations
If analysis stays disabled, check both files for valid JSON/JSONL and supported structure. Zero detected calls can indicate an unsupported log format. Very large or broad inputs may exhaust browser memory or block the interface; traversal depth limits are not total resource limits.

Before enforcement, review real tool permissions, use representative workloads, test in a controlled environment, and retain a rollback path. The output is a candidate policy, not a production authorization decision or security qualification.

## Privacy and licensing
Processing occurs locally with no upload, analytics, or external application requests. Do not commit real logs or confidential reports. Report bugs with synthetic reproductions.

The [source-available license, version 1.1](LICENSE) permits the specified non-commercial uses. Commercial deployment, internal business use, resale, paid integration, managed services, or embedding requires separate written permission from the licensor. Contact cxclrfx through GitHub.
