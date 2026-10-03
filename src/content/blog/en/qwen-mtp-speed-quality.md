---
title: "MTP on an RTX 3090: Faster Tokens, but What About Coding Quality?"
seoTitle: "Qwen3.8 MTP on RTX 3090: Speed vs. Coding Quality"
description: "A controlled Qwen3.8-27B Q4_K_M and OpenCode comparison: MTP raised generation throughput by 56% and cut successful task time by 20–40%. Paired coding results explain why throughput alone is not enough."
pubDate: 2026-10-02
tags: ["ai", "agent", "opencode", "qwen", "llama-cpp", "local-llm", "benchmark", "mtp"]
draft: false
ogImage: "/og/qwen-mtp-speed-quality-en.png"
---

Enabling MTP on this RTX 3090 raised generation throughput from **36.0 to 56.2 tokens/s, about 56% faster**. The two cache tasks that succeeded in both modes also finished about 20% and 40% sooner.

One transfer-task pair produced a patch-quality difference, however. I am continuing to test MTP while keeping it off by default.

This experiment grew out of a reader's suggestion on the [previous local-deployment post](/en/blog/local-qwen-opencode-3090/): try MTP or a quantization that includes it. The RTX 3090 left over from Ethereum mining was already running Qwen3.8-27B through OpenCode. I wanted to see whether faster generation would deliver correct patches sooner.

We ran **eight paired comparisons, sixteen attempts**, using the same model file. Each pair shared its task, seed, and initial environment; only the MTP setting changed.

## MTP drafts tokens for the target model to verify

Ordinary generation typically produces one token per step. MTP (Multi-Token Prediction) uses an embedded prediction head to propose upcoming tokens, then asks the target model to verify them. Accepting several in sequence can reduce serial decoding steps. This is a [speculative-decoding path in llama.cpp](https://github.com/ggml-org/llama.cpp/blob/b11146/docs/speculative.md).

The target model still verifies the candidates. The [speculative-decoding paper](https://arxiv.org/abs/2211.17192) shows that a correct algorithm can preserve its output distribution. Speed need not inherently cost model quality.

Our existing **Qwen3.8-27B Q4_K_M GGUF contained an MTP prediction layer**, so we used it directly without switching to another Unsloth quantization. The server commands differed only in `--spec-type none` versus `--spec-type draft-mtp`.

## Generation was 56% faster; successful tasks saved 20–40%

![MTP off versus on: generation throughput rose from 36.0 to 56.2 tokens per second, while completed and passing tasks remained 2 out of 8 in each mode. Small controlled sample with a shared 8K response budget.](/og/qwen-mtp-results.png)

Generation throughput counts tokens produced per second, including the model's reasoning output. Task time also includes reading source, executing tools, and running tests. It is closer to how long you wait for a patch.

| Measure | MTP off | MTP on |
| --- | ---: | ---: |
| Aggregate coding-generation throughput | **36.0 tokens/s** | **56.2 tokens/s** |
| Predefined independent checks passed | 35/80 | 26/80 |
| Completed within deadline and passed predefined checks | **2/8** | **2/8** |

The two cache pairs that succeeded in both modes provide the clearest evidence of time saved:

| Paired run | MTP off | MTP on | Task time saved |
| --- | ---: | ---: | ---: |
| Pair one | 192.0 s | 153.5 s | **20.1%** |
| Pair two | 431.2 s | 259.0 s | **39.9%** |

Both delivered a patch passing the predefined checks sooner. A failed run ending earlier does not count as speeding up a successful task. Later prompts also diverge with the agent's actions, so aggregate throughput is not an identical-text speed comparison.

<details>
<summary>Short replies and generation-timing definitions</summary>

Short replies to matched first requests reached **38.9–39.8 tokens/s** with MTP off and **74.0–84.2 tokens/s** with it on. These were brief tool-selection responses; they do not show that whole coding tasks finish in half the time.

Aggregate throughput is total accepted target-output tokens divided by total corresponding server generation time across completed generations. It includes reasoning and tool calls, excludes prompt processing and rejected drafts, and omits interrupted generations without final timing records.

Task time includes prompt processing, tools, and the agent's own tests. Server startup and independent grading afterward are excluded.

</details>

## Nine differing checks came from one transfer repair

The entire 35/80 versus 26/80 gap came from **one transfer task at one seed**. Cache, ledger, and build-planner scores matched within every pair.

With MTP off, the agent produced a production-code patch that subsequently passed all ten independent checks. It reached the deadline at **480.1 seconds** without a final handoff.

With MTP on, the agent ended after **186.1 seconds** without editing production code. It passed only the one check the initial implementation already passed.

The off candidate performed better on those checks, and neither attempt met the full delivery standard. We therefore tracked **patch correctness** and **timely delivery** separately: completed tasks remained 2/8 in both modes. Nine related checks are not nine independent task regressions.

<details>
<summary>Task scores and an early difference that did not recur</summary>

| Task | MTP off, two scores | MTP on, two scores |
| --- | --- | --- |
| Expiring cache | 10/10, 10/10 | 10/10, 10/10 |
| CSV ledger | 1/10, 1/10 | 1/10, 1/10 |
| Incremental build planner | 1/10, 1/10 | 1/10, 1/10 |
| SQLite transfers | 1/10, **10/10** | 1/10, **1/10** |

Completed and passing requires no timeout, successful process exit, unchanged protected contracts/configuration, passing public and added tests, and all ten independent checks passing. It is not proof that every possible defect is covered.

An early exploratory comparison showed a build-planner score difference. It did not recur under these tighter controls; those scores are not pooled into this study.

</details>

The cache task also gave me a reason to inspect code after green tests. An MTP candidate's added TTL validation overflowed on a very large integer, while the paired off candidate passed the extra probe. This extreme API boundary is worth recording; it establishes neither everyday failure frequency nor MTP as the cause.

<details>
<summary>Extra review: cache overflow and shared omissions</summary>

All four cache attempts passed the ten predefined checks. One MTP candidate added `math.isfinite(ttl)`. The contract permits finite positive integer TTLs. With `10**400` and an injected integer clock increasing on every call, validation raised `OverflowError` while converting the integer to a float. The paired off candidate passed.

Ledger probes for large exact amounts, header names, and read-time errors failed in both modes at both seeds. A wallet destination-integer-overflow probe passed off and failed on in the second pair; it failed both modes in the first pair.

Extra review ran after grading, never reached the agent, and was not added retrospectively to the eighty checks. The [paired records](/experiments/qwen-mtp-speed-quality/controlled-summary.json) retain details.

</details>

## Faster output still exhausts the same allowance

Most unsuccessful attempts shared a problem: they spent the **8,192-token response allowance** on reasoning, ended with `length`, and never edited production code. Many 1/10 scores belong to unchanged starting code; they do not mean a tenth of the repair was completed.

Increasing context capacity would not resolve that limit. Context determines how much input and output can fit; the response allowance caps what one generation can produce. MTP can produce tokens faster without adding room to that allowance.

This also limits the quality comparison. Both modes frequently produced no patch, leaving few completed repairs to compare. There were only two seeds per task and four small Python projects. The eighty checks are correlated, not eighty independent samples.

The transfer difference deserves investigation, but its cause remains unresolved. Numerical behavior in batched verification, state handling, and sampling are possible avenues to investigate. An agent's different action can also change later inputs and patches. These are possible explanations, not findings confirmed by this experiment.

## Controls and the limits of this comparison

Each task ran at two seeds, with MTP off and on; the second seed reversed the order. Every attempt rebuilt the same initial code and fixed the working directory, prompts, tools, permissions, and generation settings. Ten independent test methods per task stayed outside the agent's workspace, with no results fed back to it.

A proxy checked the complete first request actually sent to the model: **all eight pairs matched**, as did initial file hashes. Each attempt restarted the server and disabled prefix-cache reuse in both modes. These results therefore cannot predict gains in ordinary cached conversations.

<details>
<summary>Full configuration, request audit, and scope</summary>

| Setting | Fixed configuration |
| --- | --- |
| Model and GPU | Same Qwen3.8-27B Q4_K_M GGUF; RTX 3090 24GB |
| Software | llama.cpp b11146 / CUDA 12.8; OpenCode 2.0.20 |
| Server | 131,072-token capacity; one slot; all model layers on GPU |
| Cache and compute | q8_0 K/V; flash attention; batch 512 / microbatch 256 |
| Generation | Medium thinking; temperature 1.0; top_p 0.95; top_k 20 |
| Budgets | 8,192 output tokens per generation; 480 seconds per task |
| Paired seeds | 4242 and 8675309 |
| Speculation | Off: `none`; on: `draft-mtp`; maximum draft length 3 |

Pairs one and two in the elapsed-time table correspond to seeds 4242 and 8675309.

Target and draft backend sampling were disabled in both modes; synthetic acceptance was not used. Each pair shared the initial commit, agent title, project configuration, and grader. Reported cached-prefix token counts were zero. The first seed ran off→on; the second ran on→off.

These were fresh-server attempts without prefix-cache reuse. Task timing excludes server startup but includes prompt processing, tools, and the agent's own tests. Independent grading afterward is excluded. Desktop and other background GPU activity were not fully controlled.

The largest actual input was **20,057 tokens**. The 128K setting is capacity; this experiment did not measure full-128K coding performance or acceleration in ordinary cached conversations.

</details>

## Keep the current default; test a larger output budget next

For this setup, I am keeping MTP off by default. Saving 20–40% on the successful cache tasks is useful; before expanding its use, I want to investigate the transfer-patch difference.

The next comparison should raise the output allowance equally in both modes, add paired seeds, and use tasks closer to everyday work. Cached conversations need a separate test. That should give a better basis for deciding whether faster generation consistently delivers correct patches sooner.

If you try MTP, record generation speed, task time, independent tests, and final delivery together, then decide using the tasks you actually do.

## Data and references

- [Paired experiment JSON](/experiments/qwen-mtp-speed-quality/controlled-summary.json): scores, elapsed times, generation timings, request checks, and extra probes for sixteen attempts.
- [Method and data notes](/experiments/qwen-mtp-speed-quality/README.txt): attachments omit experiment dates, locations, personal paths, session identifiers, and raw conversations. They are result records, not a complete reproduction kit.
- [Previous post: local Qwen3.8-27B + OpenCode deployment](/en/blog/local-qwen-opencode-3090/): installation and integration. Its first-attempt study is a separate batch; scores should not be pooled with these.
- [llama.cpp b11146 speculative-decoding documentation](https://github.com/ggml-org/llama.cpp/blob/b11146/docs/speculative.md) and the [speculative-decoding paper](https://arxiv.org/abs/2211.17192): mechanism background. Measurements on this card come from the paired records.
