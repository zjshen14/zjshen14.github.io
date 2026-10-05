---
title: "Tuning a Local Qwen Coding Agent: What Changed, What Still Fails"
seoTitle: "Qwen on RTX 3090: Output Limits and Medium vs Xhigh"
description: "Two tuning stages on eight repeated development cases: raise the response cap from 8K to 32K, then compare medium with xhigh. More repairs finished, waiting increased, and confirmation remains unrun."
pubDate: 2026-10-04
updatedDate: 2026-10-05
tags: ["ai", "agent", "opencode", "qwen", "llama-cpp", "local-llm", "benchmark"]
draft: false
ogImage: "/og-default.png"
---

Giving this local Qwen coding agent more room to respond coincided with **5 → 14 → 20 successful deliveries out of 24** as the output cap rose from 8K to 16K to 32K. Changing the reasoning setting from **medium to `xhigh` at the same 32K cap** brought the observed result to **23/24**. The cost was longer waits: median attempt time rose from **245.5 to 775.8 seconds** across the sequence.

Those counts come from **eight repair tasks attempted three times per configuration—24 attempts, not 24 different tasks**.

Those are promising **development results**, not proof of a generally better coding agent. The rounds reused earlier controls and the same eight cases. A later temperature test lost one delivery overall, and **zero held-out confirmation attempts ran**.

This follow-up to the [deployment guide](/en/blog/local-qwen-opencode-3090/) and [MTP comparison](/en/blog/qwen-mtp-speed-quality/) explains the two tuning decisions separately: first make room for a response to finish, then compare reasoning settings within that room. The earlier studies used different protocols; their scores are not pooled here.

*Writing disclosure: this article was drafted with AI assistance from recorded experiment reports and the reviewed development export. The public checker verifies aggregation, not patch semantics or generalization.*

## What do the 24 attempts actually test?

This tuning study uses **agentic-v2.0.1**, a newly assembled development suite of **eight small code-repair tasks: six in Python and two in TypeScript**. The agent works on code, runs tools and tests, and returns a final handoff. The suite tests whether it can finish a bounded repair, rather than answer a coding question in text. It is separate from the four-task deployment and MTP studies above.

Seven tasks are authored test projects. The eighth, nested paths, starts from a pinned version of the upstream **boltons** library with a deliberately inserted fault. These are development exercises, not official SWE-bench results or eight independent production projects. The [public protocol](/experiments/qwen-agentic-tuning-3090/development/protocol.json) describes their scope:

<div class="overflow-x-auto [&_th:first-child]:whitespace-nowrap [&_td:first-child]:whitespace-nowrap" tabindex="0" role="region" aria-label="Coding tasks in the development suite">

| Task | What the repair must handle |
| --- | --- |
| Cache | Expiration and least-recently-used eviction, while preserving the existing API. |
| Wallet | Atomic, concurrent transfers and overflow checks. |
| Event stream | Incremental UTF-8 parsing when incoming chunks split at arbitrary boundaries. |
| Nested paths | A nested-lookup regression in an upstream library. |
| Ledger | Exact monetary arithmetic, CSV input and failure-safe command-line behavior. |
| Build planner | Deterministic dependency-graph planning and compatibility. |
| Async pool | A limit on concurrent asynchronous work and recovery from failures. |
| Pagination | Pagination across multiple files, duplicate removal and cancellation. |

</div>

The last two tasks are TypeScript; the other six are Python. **Each configuration gets the same eight tasks, with three separate attempts per task: 24 attempts in total.** Each attempt contributes either one delivered success or none, regardless of how many assertions its tests contain. So **5/24 means five successful deliveries among 24 attempts**, not five distinct tasks or five passing unit tests. The later 14/24, 20/24 and 23/24 use the same denominator.

A success requires more than the agent saying it is done. **Functional success** means the candidate passes both grading stages, including predefined acceptance and regression checks kept outside the agent workspace, while preserving protected files, starter files and configuration. **Delivered success** also requires the agent to finish the required turn normally, pass its recognized self-checks, and produce final text after using tools. TypeScript additionally requires type checks. The detailed scoring rules are below. Passing the fixed checks does not prove that every defect is absent.

For a concrete example, ledger's **0/3 → 2/3** from medium/32K to xhigh/32K means the same ledger repair failed all three medium attempts, then succeeded in two of the three xhigh attempts. It does not mean two new ledger tasks were added. The final **23/24** consists of three successes on each of the other seven tasks and two on ledger. These repeats show variability on familiar development cases; they do not establish success rates on fresh tasks.

## Four settings that sound similar but do different jobs

OpenCode reads files, runs tools, edits code, and tests the changes. The local llama.cpp server generates reasoning, tool requests, and text. A single repair can involve many model responses before the agent produces its final handoff.

That makes four limits worth separating:

- **Output cap:** how many tokens one model response may generate. Reasoning, tool requests, and final text share this allowance. An 8,192-token cap is not 8,192 tokens reserved for the answer after thinking.
- **Reasoning setting:** the configured effort label, `medium` or `xhigh`, passed through the model's chat-template options. Both modes keep thinking enabled. The label is not a measured quantity of internal computation or a guaranteed number of thinking tokens.
- **Context capacity:** the server can accommodate up to **131,072 tokens** of context, shared by input and output. It does not grant every response that much output or demonstrate coding quality at full capacity.
- **Whole-attempt budget:** each repair has **1,800 seconds, 65,536 generated tokens, and 120 tool calls**. These limits cover the attempt across responses; increasing one response's cap does not increase them.

## Stage 1: raise the output cap, keep medium reasoning

The reason to try a larger cap was concrete. In the earlier deployment and MTP studies, some attempts used the entire 8,192-token response allowance on reasoning and ended before editing production code. More context could not solve that particular limit. The question for this development suite was whether a larger response allowance would let more repairs reach a working patch and final delivery.

This stage kept thinking enabled and reasoning at **`medium`**, while increasing the configured output cap from **8,192 → 16,384 → 32,768 tokens**. Context stayed at 131,072, temperature at 1.0, and the whole-attempt budget stayed fixed.

Each row below uses the same eight development cases, repeated three times. The fourth row belongs to the next stage, where the cap stops changing.

<div class="overflow-x-auto" tabindex="0" role="region" aria-label="Scrollable tuning results">

| Stage and profile | Functional | Delivered | Median attempt time |
| --- | ---: | ---: | ---: |
| 1 · Medium, 8,192 output tokens | 5/24 | 5/24 | 245.5 s |
| 1 · Medium, 16,384 output tokens | 14/24 | 14/24 | 527.5 s |
| 1 · Medium, 32,768 output tokens | 20/24 | 20/24 | 586.6 s |
| 2 · Xhigh, 32,768 output tokens | 23/24 | 23/24 | 775.8 s |

</div>

Source: [cohort aggregates](/experiments/qwen-agentic-tuning-3090/development/aggregates.json). Medians include failures and exclude server startup, rests, and independent grading. These are observed waiting times, not speedups for identical successful work.

The gains appeared across several kinds of repair. The **async pool**, which tests bounded concurrent scheduling and failure recovery, went from **0/3 at 8K to 3/3 at 16K**. The **build planner**, which tests deterministic dependency planning and compatibility, went from **0/3 to 1/3 to 3/3** as the cap increased. These examples show why counting completed repairs is more informative than counting generated tokens.

More room did not solve everything. **Pagination** reached **2/3 at 32K**, while the **CSV ledger**, testing exact money and failure-safe handling, remained **0/3 at every medium cap**. That remaining gap motivated the next comparison: would a different reasoning setting help while keeping response space fixed?

The waiting cost matters. Median time more than doubled between 8K and 16K, then increased again at 32K. A short unsuccessful attempt is not a fast successful repair; a larger allowance can keep an unproductive attempt running longer too.

## Stage 2: compare medium with xhigh at a fixed 32K cap

This stage changed the configured **`reasoning_effort` from `medium` to `xhigh`**. The conversational phrase “extreme high” refers here to that recorded `xhigh` value. **The output cap remained 32,768, and thinking stayed enabled in both modes.** This was not a thinking-on versus thinking-off comparison.

In the recorded OpenCode profiles, the cap is `limit.output`; the effort label is `reasoning_effort` inside `body.chat_template_kwargs`, alongside `enable_thinking: true`. These are different controls. Setting `xhigh` requests a different reasoning mode through the template; it does not establish that every response used more computation, or that the server assigned a known extra reasoning budget. The records support the configured comparison, not a measurement of internal thinking depth.

The observed result rose from **20/24 to 23/24** for both success metrics. All three matched improvements came from two cases: **ledger went from 0/3 to 2/3**, and **pagination from 2/3 to 3/3**. The other six cases remained at 3/3. The ledger still failed one repeat, so even this development result was not uniformly successful.

Median attempt time rose from **586.6 to 775.8 seconds**. That is the tradeoff to assess for a coding workflow: more of these repairs finished, but the typical recorded attempt took longer. It is not evidence that `xhigh` will improve every task or every local model.

### Why the improvement is still provisional

The case and repeat labels match across cohorts, but the controls were collected earlier. The output rounds and reasoning round were sequential extensions selected after previous feedback, rather than fresh randomized, interleaved comparisons. Rest policies and recovery history also changed. Matching labels therefore describes observed transitions; it cannot isolate an `xhigh`-only causal effect.

The main cohorts contain **eight distinct small cases**, not 24 independent production repositories. Repeats share tasks and checks, and later tool trajectories can diverge. The selected **xhigh / 32K / temperature 1.0** profile is worth investigating as a complete configuration; these results do not establish a universal optimum or a new adoption decision.

<details>
<summary>All eight cases and matched transitions</summary>

Each cell is successes out of three attempts. Functional and delivered counts agree in this table.

<div class="overflow-x-auto" tabindex="0" role="region" aria-label="Scrollable per-case results">

| Case | Medium 8K | Medium 16K | Medium 32K | Xhigh 32K |
| --- | ---: | ---: | ---: | ---: |
| Cache | 1 | 3 | 3 | 3 |
| Wallet | 1 | 2 | 3 | 3 |
| Event stream | 0 | 2 | 3 | 3 |
| Nested paths | 3 | 3 | 3 | 3 |
| Async pool | 0 | 3 | 3 | 3 |
| Ledger | 0 | 0 | 0 | 2 |
| Pagination | 0 | 0 | 2 | 3 |
| Build planner | 0 | 1 | 3 | 3 |

</div>

The cases cover expiration/LRU, atomic transfers, incremental UTF-8 parsing, nested lookup, bounded async scheduling, exact-money CSV handling, pagination, and graph planning. Seven are authored fixtures; nested paths uses a pinned upstream seeded fault. They belong to **agentic-v2.0.1**, separate from the deployment and MTP studies.

Matched transitions show nine improvements and zero regressions from 8K to 16K, six and zero from 16K to 32K, and three and zero from medium to xhigh at 32K, for both metrics. These are descriptive counts from [aggregates.json](/experiments/qwen-agentic-tuning-3090/development/aggregates.json), not randomized effect estimates.

The later 16K continuation and medium/32K round used 300-second rests; the reasoning round used 180-second rests. Earlier recovery and pauses further limit attribution. The [data notes](/experiments/qwen-agentic-tuning-3090/development/README.md) retain that history and the cohort inclusion rules.

</details>

## Lower temperature exposed the gap between a patch and a delivery

After the reasoning comparison, temperature **0.8** was tested on ledger and pagination, three repeats each, at xhigh/32K. These cases were selected after earlier failures. Their temperature-1.0 controls are six reused attempts from the existing xhigh cohort, not six new concurrent controls.

<div class="overflow-x-auto" tabindex="0" role="region" aria-label="Scrollable temperature results">

| Targeted profile | Functional | Delivered |
| --- | ---: | ---: |
| Temperature 1.0, reused controls | 5/6 | 5/6 |
| Temperature 0.8, new attempts | 5/6 | 4/6 |

</div>

One ledger attempt, **`a0100`**, passed both independent grades but hit the wall-time limit at **1,800.017 seconds**, exiting with code -15 and no final text. It counted as a functional patch, but not a completed delivery. Another, **`a0101`**, exited normally with passing agent tests and final text, yet failed independent acceptance checks. Neither metric counted it as successful.

Together these explain why green agent tests, a correct patch, and a finished handoff must be tracked separately. At matched case/repeat level, temperature 0.8 produced one functional improvement and one regression; delivery had one improvement and two regressions. This targeted result does not support making 0.8 the better default.

<details>
<summary>Exact scoring and sampling limits</summary>

Functional success requires solved phase-one and final grades plus unchanged agent configuration. A solved grade requires no protected-file changes, no missing starter files, and every required check group passing. Python requires acceptance, regression, public-test, and syntax groups. TypeScript requires acceptance, regression, public-test, project-typecheck, and consumer-typecheck groups, with no separate syntax group. Predefined acceptance and regression checks stay outside the agent workspace.

Delivered success also requires the expected turn count, completed termination with exit code zero, nonempty final text after tools, and the last recognized agent test validation passing. TypeScript also requires the last recognized typecheck to pass. Every development case requires one turn. The medium/32K ledger timeout **`a0060`** remains a scored failure, not an infrastructure exclusion.

Final-text presence does not prove that the handoff accurately describes the patch. Passing frozen checks does not prove every defect is absent. The [attempt records](/experiments/qwen-agentic-tuning-3090/development/attempts.json) expose outcome fields, not patches or raw conversations.

Historical sampling observations covered all six 0.8 attempts and matched the requested temperature within floating-point tolerance, but did not capture every request. Profile metadata and configured request bodies are evidence of configuration; they are not independent capture of every effective field throughout every run.

</details>

## Confirmation never launched

A frozen held-out protocol planned **four fresh cases, three paired repeats, and two profiles**: medium/8K versus xhigh/32K, both at temperature 1.0 and 131,072 context capacity. That would be 24 attempts and 12 pairs.

Preflight stopped launch because hardware readiness remained unresolved after historical CPU machine-check reports. Their cause is unexplained: they do not diagnose a defective component or establish a confirmation-induced fault. An absence of new matching events in retained observations would not, by itself, clear the hardware. A separate **OpenCode resource-ownership prerequisite** also remained unresolved. Neither guard was bypassed.

**Zero confirmation attempts ran, zero pairs completed, and there are no confirmation quality measurements.** Missing observations are not 0/12 success rates or model failures. There was no confirmation inference, runtime-identity measurement, or fresh weight hash. Further testing depends on independently resolved readiness and software ownership; the development result cannot answer whether the gains transfer to fresh cases.

<details>
<summary>Confirmation registration</summary>

The frozen protocol's registration SHA-256 is:

```text
6760f39c13e67f0814edbdaf314b3572d985c30c8ef94752631e551482e423cd
```

Even a completed four-case, three-repeat test would contain four distinct cases with correlated repeats. No such test completed here, and this article provides no hardware clearance or promise of a completed held-out comparison.

</details>

## Trying the comparison in your own workflow

The useful order is to identify the failure first. If one response ends at its output cap before useful edits, compare a larger allowance while keeping the reasoning setting fixed. Once that comparison is understood, test reasoning settings at a fixed cap. Keep independent acceptance checks, failed attempts, and elapsed time in the same record; inspect the actual diff and final handoff too.

Before changing a working deployment, save its configuration and record the actual request allowance, thinking options, sampling fields, and model digest. Restore the saved configuration when reverting. The [deployment guide](/en/blog/local-qwen-opencode-3090/) covers integration; this article supplies historical profile values, not a full launch command or ready-to-run benchmark harness.

<details>
<summary>Selected development configuration and model identity</summary>

| Setting | Recorded value |
| --- | --- |
| Reasoning / thinking | xhigh / enabled |
| Output per response | 32,768 tokens |
| Context capacity | 131,072 tokens |
| Temperature | 1.0 |
| Sampling | top-p 0.95; top-k 20; min-p 0; repetition penalty 1 |
| Speculation | Off |

Within the model entry of the recorded OpenCode configuration, the two tuning fields look like this:

```json
{
  "limit": { "context": 131072, "output": 32768 },
  "body": {
    "chat_template_kwargs": {
      "enable_thinking": true,
      "reasoning_effort": "xhigh"
    }
  }
}
```

This is a field excerpt, not a complete provider configuration. Stage 1 changes `limit.output` with effort at `medium`; stage 2 changes the effort label with output fixed at 32768.

The recorded model is **Qwen3.8-27B Q4_K_M**, a 16,810,714,464-byte weight file with SHA-256:

```text
f5f1dd8920d417aac2718b0bda3403da274301efdd6760b4f0f4b864ff2ad57d
```

The [protocol export](/experiments/qwen-agentic-tuning-3090/development/protocol.json) pins llama.cpp **b11146-7fe450e19**, CUDA **12.8**, OpenCode **2.0.20**, tool versions, and serving settings. Completed records agree on recorded model/runtime identity. This is historical identity, not fresh attestation of loaded GPU tensors or independent upstream-branding verification. A client alias alone cannot identify the weights.

</details>

## Download and recompute the results

The public export lets you recompute these aggregates without a model. Download all eight files into one directory:

- [README.md](/experiments/qwen-agentic-tuning-3090/development/README.md)
- [protocol.json](/experiments/qwen-agentic-tuning-3090/development/protocol.json)
- [attempts.json](/experiments/qwen-agentic-tuning-3090/development/attempts.json) and [attempts.csv](/experiments/qwen-agentic-tuning-3090/development/attempts.csv)
- [aggregates.json](/experiments/qwen-agentic-tuning-3090/development/aggregates.json) and [aggregates.csv](/experiments/qwen-agentic-tuning-3090/development/aggregates.csv)
- [check.py](/experiments/qwen-agentic-tuning-3090/development/check.py) and [SHA256SUMS](/experiments/qwen-agentic-tuning-3090/development/SHA256SUMS)

With Python 3.10 or later, run:

```sh
python3 check.py
```

It needs no network or model and writes nothing. Missing, changed, or unexpected files fail validation. This is **aggregation reproduction only**: it does not rerun inference or grading, validate patches, or prove the source records true.

<details>
<summary>Inventory, exclusions, and reproduction boundaries</summary>

There are **102 unique primary attempts**: four 24-attempt cohorts plus six new temperature-0.8 attempts. Reused temperature-1.0 controls add none. The broader inventory has **159 records**, including 119 completed results and 40 unscored records or planned slots.

Extra 8K trials, pilots, the cancelled thinking-off direction, infrastructure predecessors, and configuration preflights remain separate. A registered replacement completes the 16K cohort at 24 attempts. Cancelled or unstarted slots have null outcomes; they are not fabricated failures.

The checker verifies checksums, JSON/CSV parity, cohort membership, inventory, grade and outcome formulas, totals, medians, and matched transitions. Fixtures, prompts, candidate patches, raw sessions, private tests, numeric seeds, and the inference/grading harness are omitted. Public repeat labels preserve matching, but cannot substitute for inference seeds. Checksums cannot establish authenticity if both data and checksums are changed together.

</details>
