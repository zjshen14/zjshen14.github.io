---
title: "Making Qwen Faster on an RTX 3090"
seoTitle: "Qwen3.8 27B on RTX 3090 IQ3 MTP4 and 220K Context Benchmarks"
description: "What worked on the way to roughly 60 tokens/s, why a coding test rejected valid answers, and what longer context and DFlash2 actually delivered."
pubDate: 2026-10-10
tags: ["ai", "agent", "opencode", "qwen", "llama-cpp", "local-llm", "benchmark", "mtp"]
draft: false
ogImage: "/og-default.png"
---

Over the past few days, I continued tuning Qwen3.8-27B on a single 24GB RTX 3090. Generation speed during coding tasks increased from roughly **33 tokens/s** with the original configuration to around **60 tokens/s**.

Two other findings deserve attention: a repeatedly failing task turned out to have a defective test, and one configuration generated tokens faster but took three extra minutes to deliver its code.

My current first choice is **IQ3_S quantized weights, Q8 KV cache, and MTP4**. I would use a 128K total context window for common repair tasks. A 220K window has processed a long input, but its full coding validation remains incomplete. Here is what led to those choices.

*Writing disclosure: this article was drafted with AI assistance from recorded local experiments and reviewed by the experimenter. The results and limits below refer to those saved runs.*

## What I actually tested

[The previous post](https://zjshen14.github.io/en/blog/qwen-agentic-tuning-3090/) focused on output budgets and reasoning settings, eventually reaching 23/24 delivered passes. **Those were eight tasks repeated three times, not 24 distinct problems.** Later eight-attempt parameter screens ran each task once.

The suite has six Python tasks and two TypeScript tasks covering caching, database transactions, incremental streams, paths, ledger processing, build dependencies, asynchronous concurrency, and pagination. Seven are authored repair tasks; one has an injected defect in a pinned version of boltons. The agent must inspect code, edit files, run checks, and hand over a result. Saying “tests pass” is insufficient.

I record a functional pass when the code passes independent checks. A delivered pass additionally requires normal completion, a self-check, and a final handoff. These small repair tasks help choose a configuration; they do not represent every kind of production repository work.

**Tokens/s below measures generation:** total generated tokens divided by total decode time. It includes reasoning and tool-call syntax but excludes prompt processing. Whole-task time also includes file access, tests, and tool waits. Generation speed and delivery speed are different measurements.

## Why I am keeping IQ3 for now

The original Q4_K_M file was about 15.66 GiB. The [ISTA-DASLab GSQ-RCO IQ3_S](https://huggingface.co/ISTA-DASLab/Qwen3.8-27B-GSQ-RCO-GGUF) file I selected includes an MTP prediction head and is about 11.29 GiB. Smaller weights leave more GPU memory for caches and runtime buffers.

Two compression settings are easy to confuse: **IQ3 compresses weights; Q8 KV uses an eight-bit format for the attention cache stored during inference.** They can be used together. The IQ3 filename also does not mean every weight has exactly three bits; this model assigns different precision to different tensors.

I tested [Bartowski's IQ4_XS](https://huggingface.co/bartowski/Qwen3.8-27B-GGUF) too, adding a Q4_0 MTP head locally. The comparison below used eight tasks repeated three times per configuration, a 128K total window, a 32K per-response output cap, and xhigh reasoning.

| Configuration | Generation rate | Delivered |
| --- | ---: | ---: |
| Original Q4_K_M, MTP off | 33.29 tokens/s | 23/24 |
| GSQ-RCO IQ3_S, MTP3, Q8 KV | 59.87 tokens/s | 21/24 |
| Bartowski IQ4_XS, local MTP2, Q8 KV | 62.36 tokens/s | 22/24 |

The IQ3 bundle generated approximately **80% faster** than the original Q4 bundle. Both weights and speculative decoding changed, so the improvement cannot be attributed entirely to IQ3. Q4 and IQ3 controls also came from earlier runs rather than a contemporaneous randomized comparison.

The table preserves older test scores, including the Ledger fixture defect discussed below. These historical cohorts have not all been regraded, so they cannot establish either a final quality ranking or complete quality preservation.

In confirmation on four different tasks repeated three times, IQ4 and Q4 both achieved 11/12 functional and delivered passes. However, the final IQ4-versus-IQ3 comparison using a new random seed gave me a reason to retain IQ3: IQ4 generated **7.8% faster**, but delivered 6/8 versus IQ3's 7/8, and total task time was approximately **2.1% longer**. IQ4's wallet answer had an actual overflow-handling defect.

That does not establish lower general IQ4 quality. It also does not give me a compelling reason to replace IQ3 immediately.

Other tuning produced similar tradeoffs. Fewer CPU threads, different CUDA wait behavior, and added ngram speculation gave no consistent speed benefit. F16 caches improved some short-input screens at the cost of memory. Smaller IQ3_XXS weights also had short-screen gains, but the partial coding follow-up results did not support immediate replacement. Short screens help select candidates; the agent still needs to solve tasks.

## MTP4 was fastest on these coding tasks

MTP proposes several upcoming tokens for the main model to verify. Accepting more drafts can reduce the main model's token-by-token generation work.

Drafting has its own cost. This local model has one MTP head, invoked repeatedly at greater depths; rejected later positions waste that work. **MTP4 means at most four proposed draft tokens, not four guaranteed acceptances per round.**

I fixed IQ3_S, Q8 KV, a 128K total window, and a 64K output cap, then ran each of the eight coding tasks at depths 2 through 6. One shared seed per task produced 40 completed attempts.

| Maximum draft tokens | Generation rate |
| --- | ---: |
| 2 | 57.98 tokens/s |
| 3 | 60.72 tokens/s |
| 4 | **61.31 tokens/s** |
| 5 | 58.08 tokens/s |
| 6 | 56.37 tokens/s |

MTP4 was approximately **5.7% faster** than MTP2; greater depth added no benefit. The short-input screen had favored MTP2, while actual coding favored MTP4. I prioritize the latter because it is closer to the work I want to run.

This was one attempt on each of eight familiar tasks, with imperfectly matched ordering and thermal conditions. It supports a choice on this machine, not a universal optimal depth for all models and GPUs.

## Why Ledger made me inspect the test

Ledger processes CSV records and money values. Its repeated failures made insufficient context seem plausible. Diagnosis found two different issues.

First, **a response really was truncated by its output cap**. I changed only the cap from 32K to 64K, retaining the 128K total window and other settings. The new attempt's longest response reached 40,612 tokens and passed functional and delivery checks. Its longest actual sequence was approximately 73K, comfortably inside 128K. The task also grew from approximately 628 to 1,140 seconds.

Later, all five Ledger answers in the MTP depth comparison failed without exhausting output or context. The test's file and output mocks lacked normal interfaces. Valid answers were rejected because of those interface defects, including some that never reached the intended read-error behavior.

After correcting those interfaces, **all five unchanged answers passed 13/13 acceptance checks instead of 12/13**. Code deliberately omitting read-error handling still failed, so the behavioral requirement had not been relaxed.

I created a new suite version and regraded MTP4's eight existing answers. Functional and delivered results changed from 7/8 to **8/8**, without generating new answers. This corrected a false rejection; it did not improve the model. Other historical cohorts do not automatically receive revised scores.

It changed how I approach failures: inspect truncation and code defects, and check whether the test actually exercises the behavior it claims to measure.

## 220K processes long input but still needs full coding validation

Input and output share the context window; K here means 1,024 tokens. A 170K input budget plus 50K output requires 220K total. A 192K input budget plus 64K output requires 256K. Raising the output cap does not remove that total-capacity constraint.

IQ3_S + Q8 KV + MTP4 processed **179,532 input tokens followed by short output** with a **220K total window**, peaking around 22.80 GiB of whole-GPU memory. At 256K, MTP4 failed allocation during startup. Disabling MTP and reducing batch sizes allowed the 256K configuration to complete the migration experiment below.

To test usefulness, I built a schema migration task for 12 services whose new specifications were scattered through long material containing stale specifications. All three arms disabled MTP and differed in how input was supplied.

| Input strategy | Actual input tokens | Independent checks passed |
| --- | ---: | ---: |
| 256K window, full material | 179,532 | 198/198 |
| 128K window, relevant files selected in advance | 6,383 | 198/198 |
| 128K window, simple head/tail crop | 54,755 | 138/198 |

The full material retained required information; cropping omitted specifications for nine services. Selecting relevant files in advance also passed, taking approximately 712 seconds for prompt processing and generation versus 1,583 seconds with the full material.

A larger window helped avoid information loss. Accurate selection let a smaller window solve the task faster. This was **one task, one seed, and 198 checks**, not 198 coding problems. It did not test whether the agent could retrieve every necessary file itself.

The real 220K coding comparison completed only 2/8 tasks. Cache and wallet passed; during the third task, CPU temperature reached a sampled 93.25°C and triggered the configured 92°C guard. Six tasks have no valid score. The full path of 170K input followed by 50K generated output also remains untested.

Wallet makes the tradeoff concrete. Generation at 220K was approximately **6.4% faster** than at 128K, but output increased from about 35,000 to 46,000 tokens. Task time increased from **654 to 835 seconds**. Generating more content slightly faster can still delay delivery by three minutes. One observation cannot establish that larger context caused verbosity, but completion time and correctness need to be part of the optimization target.

## DFlash2 has no generation-speed advantage here yet

[DFlash](https://z-lab.ai/projects/dflash/) also asks the main model to verify drafts, but a separate small model proposes an entire block in parallel. Local MTP drafts sequentially. [DFlash2](https://inco.ai/blog/dflash2/) improves drafting further. The mechanism deserves testing; its benefit still depends on hardware and workload.

I compared MTP4 and DFlash2 separately with the same IQ3_S target, Q8 main cache, and 220K total window. MTP was disabled when DFlash2 was active. Identical cold inputs of approximately 8K, 32K, and 179K tokens ran once per configuration, generating 512, 512, and 128 tokens respectively.

DFlash2's **generation rate was approximately 3–6% lower**. Its memory peak was about 23.33 GiB, approximately **540 MiB** above MTP4. For the longest input, its complete request was slightly faster, around 303 versus 307 seconds, because request time also includes prompt processing.

I will keep MTP4 for now. This short test did not cover long output or complete coding tasks and does not answer the coding-quality question. It shows no generation-speed advantage for this local configuration.

## What I would run now

For these common repair tasks, my first choice is **GSQ-RCO IQ3_S + Q8 KV + MTP4, a 128K total window, and a 64K per-response output cap**. Input and output still share the window. Temperature remains 1.0, with thinking enabled and xhigh reasoning effort.

The reference stack is llama.cpp b11146, CUDA 12.8, and OpenCode 2.0.20, with one concurrent slot, Flash Attention, and all model layers on GPU. For long input, I would consider 220K while completing its coding validation.

Power draw and cooling also matter for sustained use. Two nearly complete early coding segments averaged approximately **329W** of GPU board power. That excludes the CPU, other components, and PSU losses; whole-PC power needs measurement at the wall.

This round produced a roughly 60-tokens/s candidate and a clearer distinction between failures that need parameter changes and failures that need test repairs. Repeated runs and broader task coverage under the corrected suite are the next evidence needed for IQ3 + MTP4 coding quality, along with completion of the 220K cohort.


[Detailed methods and tables](/experiments/qwen-3090-quantization-context-followup/technical-notes.en.md) · [Benchmark aggregates](/experiments/qwen-3090-quantization-context-followup/benchmark-data.json) · [中文版本](/zh/blog/qwen-3090-quantization-context-followup/)
