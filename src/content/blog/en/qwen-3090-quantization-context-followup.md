---
title: "Making Qwen Faster on an RTX 3090"
seoTitle: "Qwen3.8 27B on RTX 3090 IQ3 MTP4 and 220K Context Benchmarks"
description: "Updated with b11429 probabilistic MTP: 24–30% faster decode in matched screens, 68.4 tokens/s across eight coding attempts, and 7/8 strict deliveries."
pubDate: 2026-10-10
updatedDate: 2026-10-10
tags: ["ai", "agent", "opencode", "qwen", "llama-cpp", "local-llm", "benchmark", "mtp"]
draft: false
ogImage: "/og-default.png"
---

Over the past few days, I continued tuning Qwen3.8-27B on a single 24GB RTX 3090. Generation speed during coding tasks increased from roughly **33 tokens/s** with the original configuration to around **60 tokens/s**. A subsequent runtime and draft-sampling update reached **68.4 tokens/s** across eight coding attempts; the matched speed screen below isolates its additional gain.

Two other findings deserve attention: a repeatedly failing task turned out to have a defective test, and one configuration generated tokens faster but took three extra minutes to deliver its code.

My current speed candidate is **IQ3_S, Q8 main KV, and MTP4 on llama.cpp b11429 with probabilistic draft sampling**. Its latest eight-task screen used a 220K total window and a 50K output cap, delivering 7/8. Long input has also run, though a full 170K-input-plus-50K-output sequence remains untested.

*Writing disclosure: this article was drafted with AI assistance from recorded local experiments and reviewed by the experimenter. The results and limits below refer to those saved runs.*

## What I actually tested

[The previous post](https://zjshen14.github.io/en/blog/qwen-agentic-tuning-3090/) focused on output budgets and reasoning settings, eventually reaching 23/24 delivered passes. **Those were eight tasks repeated three times, not 24 distinct problems.** Later eight-attempt parameter screens ran each task once.

The suite has six Python tasks and two TypeScript tasks covering caching, database transactions, incremental streams, paths, ledger processing, build dependencies, asynchronous concurrency, and pagination. Seven are authored repair tasks; one has an injected defect in a pinned version of boltons. The agent must inspect code, edit files, run checks, and hand over a result. Saying “tests pass” is insufficient.

I record a functional pass when the code passes independent acceptance, regression, public tests, and applicable syntax or type checks. A delivered pass additionally requires normal completion, a self-check, and a final handoff. These small repair tasks help choose a configuration; they do not represent every kind of production repository work.

**Tokens/s below measures generation:** total generated tokens divided by total decode time. It includes reasoning and tool-call syntax but excludes prompt processing. Whole-task time also includes file access, tests, and tool waits. Generation speed and delivery speed are different measurements.

## Update (October 10): a runtime change adds another speed gain

After the initial publication, I upgraded llama.cpp from b11146 to **b11429** and tested `--spec-draft-sampling probabilistic` for MTP. This changes how draft tokens are sampled; the target model's temperature and other sampling settings stayed fixed. The weights and maximum draft depth also stayed the same.

The speed screen used identical cold inputs of approximately 8K and 32K tokens, 1,024 output tokens, and three shared seeds per setting. All settings used IQ3_S, Q8 main KV, F16 draft KV, MTP4, and a 220K total window. The old runtime ran before and after the candidates, with less than 1% drift; its table entry averages those two controls.

| Runtime and draft sampling | 8K input generation rate | 32K input generation rate |
| --- | ---: | ---: |
| b11146, original behavior | 49.7 tokens/s | 44.2 tokens/s |
| b11429, greedy | 52.7 tokens/s | 46.1 tokens/s |
| b11429, probabilistic | **61.6 tokens/s** | **57.5 tokens/s** |

The runtime upgrade with greedy drafting gained approximately **6% / 4%** over the old controls. With probabilistic drafting, the combined gain was **24% / 30%**. Including input processing, the latter's output throughput gains were approximately **16% / 10%**. These percentages describe this fixed-length screen, not every coding task.

The candidate then completed **one attempt on each of the same eight coding tasks**, using a 220K total window and a 50K per-response output cap. Its pooled generation rate was **68.4 tokens/s**, with **7/8 strict functional and delivered passes**. All eight passed independent acceptance and regression checks, but Buildplan's submitted tests assumed an agent-specific temporary directory existed. Fifteen public tests errored during setup in the clean grading environment, so that attempt remains a failure. I did not repair its answer or rerun it to improve the score.

This is encouraging evidence for the speed candidate, but eight familiar development tasks run once cannot establish general coding-quality equivalence. Higher TPS also does not guarantee shorter tasks: in the already completed wallet pair, the candidate generated faster but took 549 seconds versus 543 seconds on the old runtime. No additional old-runtime coding runs were made after switching to the single-pass candidate screen.

**F16 draft KV was already the previous default**, and it was held fixed here. It is not a new source of the gain. Switching the *main* KV from Q8 to F16 failed GPU allocation at the unchanged 220K window, so that arm was excluded rather than measured at a smaller context.

The remaining sections retain the earlier experiments and their original settings. The current recommendation at the end includes this update.

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

## 220K fits long input; full-window generation is still untested

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

The earlier 128K-versus-220K coding comparison stopped after 2/8 tasks. Cache and wallet passed; during the third task, CPU temperature reached a sampled 93.25°C and triggered the configured 92°C guard. Six tasks in that historical comparison have no valid score. The newer b11429 screen above completed all eight at 220K, with 7/8 deliveries; it does not complete that older paired comparison or test a full 170K input followed by 50K output.

Wallet makes the tradeoff concrete. Generation at 220K was approximately **6.4% faster** than at 128K, but output increased from about 35,000 to 46,000 tokens. Task time increased from **654 to 835 seconds**. Generating more content slightly faster can still delay delivery by three minutes. One observation cannot establish that larger context caused verbosity, but completion time and correctness need to be part of the optimization target.

## DFlash2 has no generation-speed advantage here yet

[DFlash](https://z-lab.ai/projects/dflash/) also asks the main model to verify drafts, but a separate small model proposes an entire block in parallel. Local MTP drafts sequentially. [DFlash2](https://inco.ai/blog/dflash2/) improves drafting further. The mechanism deserves testing; its benefit still depends on hardware and workload.

Before the runtime update, I compared MTP4 and DFlash2 separately on b11146 with the same IQ3_S target, Q8 main cache, and 220K total window. MTP was disabled when DFlash2 was active. Identical cold inputs of approximately 8K, 32K, and 179K tokens ran once per configuration, generating 512, 512, and 128 tokens respectively.

DFlash2's **generation rate was approximately 3–6% lower**. Its memory peak was about 23.33 GiB, approximately **540 MiB** above MTP4. For the longest input, its complete request was slightly faster, around 303 versus 307 seconds, because request time also includes prompt processing.

I will keep MTP4 for now. This short test did not cover long output or complete coding tasks and does not answer the coding-quality question. It shows no generation-speed advantage for this local configuration.

## What I would run now

My current experimental speed candidate is **GSQ-RCO IQ3_S + Q8 main KV + F16 draft KV + MTP4**, with **probabilistic draft sampling on llama.cpp b11429**. The completed eight-task screen used a **220K total window and a 50K per-response output cap**. Input and output share that window. Temperature remains 1.0, with thinking enabled and xhigh reasoning effort.

The updated stack uses CUDA 12.8 and OpenCode 2.0.20, with one concurrent slot, Flash Attention, and all model layers on GPU. Earlier results used b11146 unless stated otherwise. The newer long-input capacity check processed 179,532 input tokens plus 128 output tokens without truncation, with sampled whole-GPU memory around 22.31 GiB. That is a separate b11429 check, not a replacement for the earlier 22.80 GiB measurement. These experiments did not rewrite the daily-service defaults.

Power draw and cooling also matter for sustained use. Two nearly complete early coding segments averaged approximately **329W** of GPU board power. That excludes the CPU, other components, and PSU losses; whole-PC power needs measurement at the wall.

The update gives me a faster runtime and draft-sampling candidate without changing the weights. The measured gain is useful; the 7/8 strict delivery result and its remaining failure stay visible. More distinct tasks and repeated comparisons are still needed to establish how well coding quality holds across broader work.


[Detailed methods and tables](/experiments/qwen-3090-quantization-context-followup/technical-notes.en.md) · [Benchmark aggregates](/experiments/qwen-3090-quantization-context-followup/benchmark-data.json) · [中文版本](/zh/blog/qwen-3090-quantization-context-followup/)
