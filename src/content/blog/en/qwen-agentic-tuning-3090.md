---
title: "Tuning a Local Qwen Coding Agent: What Changed, What Still Fails"
seoTitle: "Qwen Coding Agent Tuning on RTX 3090: Development Results"
description: "A local Qwen development study reached 23/24 delivered attempts after output and reasoning tuning. A targeted temperature test regressed delivery, and held-out confirmation never launched."
pubDate: 2026-10-04
tags: ["ai", "agent", "opencode", "qwen", "llama-cpp", "local-llm", "benchmark"]
draft: false
---

On eight development cases repeated three times, my local Qwen coding agent went from **5/24 to 23/24 functional and delivered successes** across sequential output-budget and reasoning rounds. That is a useful development result. It does **not** establish that the final profile generalizes, that `xhigh` alone caused the difference, or that these settings are a universal optimum.

The next sampling experiment was less encouraging: temperature 0.8 produced **5/6 functional successes but only 4/6 delivered successes**, versus **5/6 for both** in reused temperature-1.0 controls. Held-out confirmation then stopped at safety preflight. **Zero confirmation attempts ran.**

For developers, the useful lesson is a measurement process: track whether the patch passes independent checks, whether the agent finishes its delivery, and which evidence remains development-only. The [public data notes](/experiments/qwen-agentic-tuning-3090/development/README.md) and [standalone checker](/experiments/qwen-agentic-tuning-3090/development/check.py) let you inspect and recompute the reported aggregates without running a model.

*Writing disclosure: this article was drafted with AI assistance from the recorded experiment reports and reviewed development export. The public checker verifies aggregation; it does not validate patch semantics or establish generalization.*

## From deployment to completing a repair

My [deployment article](/en/blog/local-qwen-opencode-3090/) covers connecting OpenCode to a local llama.cpp server on an RTX 3090. The [MTP comparison](/en/blog/qwen-mtp-speed-quality/) asks whether faster generation translates into better coding delivery. This follow-up asks what happens when I give the agent more response space, change its reasoning profile, and then try lower-temperature sampling on difficult cases.

OpenCode runs the coding workflow: reading files, choosing tools, editing code, testing, and producing a final response. The model server generates the reasoning, tool requests, and text. A server returning normally is only one part of success; the resulting patch still needs to satisfy the task, and the agent still needs to finish.

These results belong to the **agentic-v2.0.1 development suite**. They are not pooled with the earlier deployment or MTP batches, which used different protocols and budgets.

## More response space coincided with more delivered attempts

Each principal cohort contains the same eight cases and three paired repeat labels, for 24 attempts. Functional and delivered outcomes happened to coincide in all four principal cohorts.

<div class="overflow-x-auto" tabindex="0" role="region" aria-label="Scrollable experiment table">

| Recorded profile | Functional | Delivered | Median attempt time |
| --- | ---: | ---: | ---: |
| Medium, 8,192 output tokens | 5/24 | 5/24 | 245.5 s |
| Medium, 16,384 output tokens | 14/24 | 14/24 | 527.5 s |
| Medium, 32,768 output tokens | 20/24 | 20/24 | 586.6 s |
| Xhigh, 32,768 output tokens | 23/24 | 23/24 | 775.8 s |

</div>

Source: [cohort aggregates](/experiments/qwen-agentic-tuning-3090/development/aggregates.json). Medians include unsuccessful attempts and exclude server startup, rests, and independent grading. They describe the observed agent runs; they do not measure successful-task speedups on identical work.

The response allowance is **per model response**, including reasoning and tool/final output. It differs from the server's **131,072-token context capacity**, and from the whole-attempt budget of **1,800 seconds, 65,536 generated tokens, and 120 tool calls**. A large context does not automatically give one generation a large output allowance.

Matching case and repeat labels yields nine improvements and zero regressions from 8K to 16K, six and zero from 16K to 32K, and three and zero from medium to xhigh at 32K, for both metrics. These are descriptive transitions across reused controls. Later rounds were selected after earlier feedback and ran sequentially, with changes in rests and recovery history. They are not randomized estimates of the effect of one setting.

<details>
<summary>Where the development gains appeared</summary>

Each cell below is successes out of three attempts; both metrics agree here.

<div class="overflow-x-auto" tabindex="0" role="region" aria-label="Scrollable experiment table">

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

The suite covers Python and TypeScript repairs: expiration/LRU, atomic transfers, incremental UTF-8 parsing, nested lookup, bounded async scheduling, exact-money CSV handling, pagination, and deterministic graph planning. Seven cases are authored fixtures; nested paths uses a pinned upstream seeded fault. These small cases are not eight independent production-repository deployments.

The ledger remained the hardest case: even the xhigh cohort failed one of its three repeats. The [per-attempt records](/experiments/qwen-agentic-tuning-3090/development/attempts.json) retain failures alongside successes.

</details>

## A correct patch and a completed delivery are different outcomes

**Functional success** requires solved phase-one and final grades plus unchanged agent configuration. Solved grading means no protected-file changes, no missing starter files, and success in every required check group. Python requires acceptance, regression, public-test, and syntax groups. TypeScript requires acceptance, regression, public-test, project-typecheck, and consumer-typecheck groups; it has no separate syntax group. The predefined acceptance and regression checks stay outside the agent workspace.

**Delivered success** also requires the expected turn count, completed termination with exit code zero, nonempty final text after tools, and the last recognized agent test validation passing. TypeScript requires the last recognized typecheck to pass too. Every development case requires one turn.

This distinction catches two different failure modes in the targeted sampling round:

- **`a0100`, ledger, repeat-2:** both grades solved, but the run stopped at the wall-time limit after 1,800.017 seconds, with exit code -15 and no final text. The patch counted as functional; delivery failed.
- **`a0101`, ledger, repeat-3:** the process exited normally, recorded passing agent tests, and supplied final text. Independent acceptance checks still failed. Both success metrics were false.

A green agent test run cannot override failed independent checks. Conversely, a patch passing those checks does not turn a timeout into completed delivery. The medium/32K ledger timeout `a0060` also remains a scored failure rather than disappearing as an infrastructure exclusion.

These examples establish what the records show, not why the model failed. The public package contains outcome flags and counts, not patches or raw conversations. Final text presence is a delivery requirement, **not verification that the handoff accurately describes the patch**. Passing the frozen checks also does not prove absence of every possible defect.

## Lower temperature did not improve delivery in the targeted round

After the reasoning round, I tested temperature **0.8** on ledger and pagination, with three repeats each. These were selected development cases following earlier failures, not a fresh representative sample.

<div class="overflow-x-auto" tabindex="0" role="region" aria-label="Scrollable experiment table">

| Targeted profile | Functional | Delivered |
| --- | ---: | ---: |
| Temperature 1.0, reused xhigh/32K controls | 5/6 | 5/6 |
| Temperature 0.8, new xhigh/32K attempts | 5/6 | 4/6 |

</div>

The 1.0 row reuses six attempts from the existing xhigh cohort. No fresh temperature-1.0 controls ran alongside the 0.8 attempts, so those six records must not be counted twice in a pooled total.

At the case/repeat level, lowering temperature yielded one functional improvement and one regression. For delivery, it yielded one improvement and two regressions. It recovered the earlier ledger failure in one repeat while losing outcomes elsewhere. The result supplies no basis for calling 0.8 a better default.

Historical sampling observations covered all six 0.8 attempts and matched the requested temperature within floating-point tolerance. They did not capture every request. The export distinguishes this observation layer from profile metadata and configured request bodies; I do not claim independent capture of every effective setting throughout every run.

## The selected profile is provisional; confirmation is unrun

The selected profile—**xhigh reasoning, 32,768 output tokens, temperature 1.0**—was fixed before the held-out experiment. The development results support investigating that complete configuration. They do not isolate the causal effect of xhigh, and this article makes no new adoption decision.

A frozen confirmation protocol planned **four fresh cases, three paired repeats, and two profiles**: medium/8K versus xhigh/32K, both at temperature 1.0 and 131,072 context capacity. That is 24 planned attempts and 12 planned pairs. The protocol registration SHA-256 is:

```text
6760f39c13e67f0814edbdaf314b3572d985c30c8ef94752631e551482e423cd
```

Safety preflight stopped launch because hardware readiness remained unresolved after a CPU machine-check report. That report does not establish a hardware cause or identify a defective component. A separate resource-ownership prerequisite also remained unresolved. Neither guard was bypassed.

**There were zero observed confirmation attempts, zero complete pairs, and no confirmation quality measurements.** These are missing observations, not 0/12 success rates for each profile and not model failures. No confirmation inference, runtime-identity measurement, or fresh weight hash came from that blocked execution. The hardware has not been cleared by this article.

Four cases repeated three times would still be four distinct cases with correlated repeats. Since none ran, there is no new evidence for or against generalization. Further testing depends on independently resolved readiness and ownership prerequisites; this report promises no completed held-out test.

## What to record when trying a similar profile

For an already working local deployment, the recorded development settings are a concrete starting point for your own controlled comparison:

<div class="overflow-x-auto" tabindex="0" role="region" aria-label="Scrollable experiment table">

| Setting | Selected development profile |
| --- | --- |
| Reasoning / thinking | xhigh / enabled |
| Output per response | 32,768 tokens |
| Context capacity | 131,072 tokens |
| Temperature | 1.0 |
| Sampling | top-p 0.95; top-k 20; min-p 0; repetition penalty 1 |
| Speculation | Off |

</div>

The recorded model is **Qwen3.8-27B Q4_K_M**, with weight SHA-256:

```text
f5f1dd8920d417aac2718b0bda3403da274301efdd6760b4f0f4b864ff2ad57d
```

The [protocol export](/experiments/qwen-agentic-tuning-3090/development/protocol.json) pins the 16,810,714,464-byte file, llama.cpp **b11146-7fe450e19**, CUDA **12.8**, OpenCode **2.0.20**, tool versions, and serving settings. Completed records agree on their recorded model/runtime identity. This is historical recorded identity, not a fresh attestation of loaded GPU tensors or independent verification of upstream branding. A client alias alone cannot identify the weights.

Use the [deployment guide](/en/blog/local-qwen-opencode-3090/) for integration details. Before changing a working setup, save its configuration and record the actual request allowance, reasoning/thinking settings, sampling fields, and model digest. Compare on representative work with independent acceptance checks, keep failed attempts, and restore the saved configuration when reverting. This article provides profile values rather than a full launch command or ready-to-run benchmark harness.

The longer runs also impose a waiting cost. Keep time, generated tokens, tools, grading, and delivery in the same record. An early unsuccessful exit is not a successful-task speedup, and a larger allowance can spend more time without guaranteeing a better patch.

## Download and recompute the public results

The export contains **102 unique primary attempts**: four 24-attempt cohorts plus six targeted 0.8 attempts. The reused 1.0 subset adds no new attempts. Its broader inventory has **159 records**, including 119 completed results and 40 unscored records or planned slots.

The separate records preserve extra 8K trials, pilots, the cancelled thinking-off direction, infrastructure predecessors, and configuration preflights. A registered replacement resolves the 16K cohort to 24 attempts. Cancelled or unstarted slots have null outcomes rather than fabricated model failures. The [README](/experiments/qwen-agentic-tuning-3090/development/README.md) explains inclusion and replacement rules.

Download these eight files into one directory:

- [README.md](/experiments/qwen-agentic-tuning-3090/development/README.md)
- [protocol.json](/experiments/qwen-agentic-tuning-3090/development/protocol.json)
- [attempts.json](/experiments/qwen-agentic-tuning-3090/development/attempts.json) and [attempts.csv](/experiments/qwen-agentic-tuning-3090/development/attempts.csv)
- [aggregates.json](/experiments/qwen-agentic-tuning-3090/development/aggregates.json) and [aggregates.csv](/experiments/qwen-agentic-tuning-3090/development/aggregates.csv)
- [check.py](/experiments/qwen-agentic-tuning-3090/development/check.py) and [SHA256SUMS](/experiments/qwen-agentic-tuning-3090/development/SHA256SUMS)

With Python 3.10 or later, run:

```sh
python3 check.py
```

It needs no network or model and writes nothing. It checks checksums, JSON/CSV parity, cohort membership, inventory, grade formulas, outcome formulas, totals, medians, and paired transitions. Missing, changed, or unexpected files fail validation.

This is **aggregation reproduction only**. Fixtures, raw prompts, candidate patches, sessions, private tests, numeric seeds, and the inference/grading harness are omitted. Public repeat labels preserve matching, but cannot substitute for inference seeds. The checker does not rerun grading or prove that the source records are true; checksums cannot establish authenticity if someone changes both data and checksums.

The practical result is a promising development profile with retained failures and an unfulfilled confirmation step. Keep that boundary visible when deciding what to test on your own work.
