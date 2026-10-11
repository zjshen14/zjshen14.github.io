
## Continuing from the previous configuration

[The previous post](https://zjshen14.github.io/en/blog/qwen-agentic-tuning-3090/) used Qwen3.8-27B Q4_K_M with MTP disabled and a 128K total context window. Raising the per-response output cap from 8K to 16K and then 32K, followed by changing reasoning effort from medium to xhigh, produced delivery counts of 5, 14, 20, and 23 out of 24.

**Those 24 attempts were eight tasks repeated three times, not 24 distinct problems.** Later eight-attempt screens ran the same eight tasks once each. Fewer repeats make screening cheaper but leave more room for generation variability.

The suite contains six Python tasks and two TypeScript tasks covering caching, money handling, event streams, paths, ledger processing, build plans, asynchronous pools, and pagination. Seven are small authored repair tasks; one uses an injected defect in a pinned version of boltons. The agent reads files, edits code, runs checks, and hands over its result. This is not official SWE-bench and does not represent every kind of work in a large production repository.

| Task | Main independent acceptance coverage |
| --- | --- |
| cache | TTL boundaries, falsey values, LRU eviction, state after failed operations |
| wallet | SQLite transactions, concurrent writers, idempotent retries, integer overflow |
| eventstream | Incremental UTF-8/JSON, arbitrary chunk boundaries, error and closed states |
| boltons_paths | Upstream path API, falsey results, compatible error diagnostics |
| ledger | CSV/CLI integration, exact large money values, atomic error output |
| buildplan | Whole-graph validation, deterministic ordering, reverse dependencies, deep chains |
| async_pool | Bounded concurrency, ordering, exception identity, draining in-flight work |
| pagination | Multi-file interfaces, cursors, duplicates, cancellation, malformed pages |

Each task attempt has equal weight; its internal check count does not determine that weight. A coding attempt has a budget of 1,800 seconds, 65,536 generated tokens, and 120 tool calls. The per-response output cap is a separate setting. The agent can see contracts and public tests, while independent acceptance tests are excluded from its workspace.

I track two outcomes:

- **Functional pass:** the code passes independent acceptance, regression, public checks, and the applicable syntax or type checks, with protected files intact. Tasks with a follow-up change request must pass their phase-one and final contracts separately.
- **Delivered pass:** a functional pass plus normal completion, a final handoff, and a recognized self-check; TypeScript tasks also require the agent's type check.

Generation rates below use **total generated tokens divided by total native decode seconds**, rather than an unweighted average of per-task rates. Generated tokens include reasoning and tool-call syntax. Prompt processing is excluded. Whole-task time also includes file access, tests, and tool waits, so tokens/s is neither delivery speed nor QPS.

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

### New runtime coding screen: one attempt per task

| Task | Strict functional / delivered | Native decode TPS | Task seconds |
| --- | --- | ---: | ---: |
| ledger | Pass | 64.59 | 835.566 |
| eventstream | Pass | 69.66 | 396.151 |
| buildplan | Fail | 73.43 | 280.107 |
| pagination | Pass | 66.62 | 486.835 |
| wallet | Pass | 68.91 | 548.900 |
| boltons_paths | Pass | 72.41 | 174.396 |
| cache | Pass | 76.11 | 242.303 |
| async_pool | Pass | 67.06 | 532.351 |

Pooled rate: 217,789 generated tokens / 3,185.234 decode seconds = 68.3746 tokens/s. Rates and the 3,496.609 seconds of task time include the failed Buildplan attempt; its shorter time is not a productive delivery speedup. Five scored candidate attempts were retained and three remaining cases ran once, all at seed 20261014 with identical settings. The public aggregate contains no private traces or local paths.

## IQ3 and IQ4 are faster than the original bundle

The IQ3_S weights come from [ISTA-DASLab's GSQ-RCO repository](https://huggingface.co/ISTA-DASLab/Qwen3.8-27B-GSQ-RCO-GGUF). Precision is allocated across tensors according to sensitivity; the IQ3 filename does not mean every tensor uses exactly three bits. My file includes an MTP head and is about 11.29 GiB, versus about 15.66 GiB for the previous Q4_K_M file.

**Q8 KV is a separate setting.** IQ3 describes weight compression; Q8 KV describes the eight-bit format used for the attention cache during inference. Smaller weights leave more memory available for that cache and runtime buffers.

I also tested [Bartowski's IQ4_XS weights](https://huggingface.co/bartowski/Qwen3.8-27B-GGUF), with a locally assembled Q4_0 MTP head. This completed development comparison used eight tasks with three attempts each, a 128K total window, a 32K per-response output cap, and xhigh reasoning.

| Configuration | Functional | Delivered | Pooled generation rate |
| --- | ---: | ---: | ---: |
| Original Q4_K_M, MTP off | 23/24 | 23/24 | 33.29 tokens/s |
| GSQ-RCO IQ3_S, MTP3, Q8 KV | 22/24 | 21/24 | 59.87 tokens/s |
| Bartowski IQ4_XS, local MTP2, Q8 KV | 22/24 | 22/24 | 62.36 tokens/s |

The IQ3 bundle generated tokens approximately **80% faster** than the original Q4 bundle. Both quantization and speculative decoding changed, so this is not the isolated effect of IQ3. The Q4 and IQ3 controls were also collected earlier, rather than in a contemporaneous randomized comparison.

These pass counts preserve the original **v2.0.1** grading. The Ledger correction described below has not been applied to these entire historical cohorts, so the table should not be treated as a final quality ranking free of measurement defects.

IQ4 also underwent an independent confirmation: four different tasks, three seeds each, and 12 attempts per configuration. IQ4 and Q4 both achieved **11/12 functional and delivered passes**, with pooled generation rates of 64.72 and 34.47 tokens/s. This adds evidence from different tasks, but four tasks cannot establish general quality equivalence. This was a new IQ4 confirmation experiment, distinct from the unstarted confirmation plan described in the previous post.

The final fresh-seed comparison was more relevant to choosing between IQ4 and IQ3. Each configuration ran eight attempts, with interleaved ordering.

| Configuration | Functional and delivered | Pooled generation rate | Total time across eight attempts |
| --- | ---: | ---: | ---: |
| IQ3_S + MTP3 | 7/8 | 58.17 tokens/s | 3,801.9 s |
| IQ4_XS + MTP2 | 6/8 | 62.73 tokens/s | 3,880.1 s |

IQ4 generated tokens **7.8% faster**, yet passed one fewer task and took approximately **2.1% longer** overall. Its wallet answer had a real overflow-handling defect. I retained IQ4 as an alternative rather than treating it as a clear upgrade. Eight attempts are also insufficient to conclude that its general coding quality is lower.

Keeping Q4_K_M also leaves room for acceleration. With the same Q4 file, Q8 KV, and 128K total window, enabling MTP3 increased generation rates from **37.94 to 51.06 tokens/s** for the 8K target input and from **32.52 to 43.68 tokens/s** for the 32K target input, both approximately 34% gains. This short test used three seeds per input and mode and generated exactly 1,024 tokens. MTP-on ran before MTP-off, without randomized ordering or execution of generated code. It isolates a speed benefit on Q4, not full coding-delivery quality.

## Why other tuning changes did not immediately become the recommendation

I screened CPU thread counts, CUDA wait behavior, batch sizes, MTP-head precision, KV precision, and an ngram speculative combination. Short-input screens generally used cold 8K and 32K prompts, generated 1,024 tokens, repeated three seeds per prompt, and retained baseline measurements at the beginning and end.

| Change | Observation |
| --- | --- |
| Reduce CPU threads from 8 to 4, 2, or 1 | No generation-speed improvement |
| CUDA blocking wait | Slightly slower at both input lengths |
| Combine ngram speculation with MTP4 | Did not beat that screen's baseline |
| Larger batch sizes | Different effects at 8K and 32K; no consistent improvement |
| F16 main KV cache | Faster in some short-input configurations, with higher memory requirements |
| Smaller IQ3_XXS, different weight layouts, and MTP-head precision | Some short-input gains that still needed coding validation |

Some candidates did not complete their planned 24-attempt coding follow-ups. The GSQ IQ3_XXS follow-up completed eight attempts, with 5/8 functional and delivered passes versus 6/8 for the matched IQ3 control. Another Bartowski IQ3_XXS follow-up completed 12 attempts, with 9/12 versus 10/12. These partial samples did not support immediately replacing the current choice; uncompleted attempts were not counted as failures.

The screens were useful for deciding which configurations deserved more expensive coding tests. A gain in continuous text generation can disappear once response lengths, retries, and code checks enter the workload.

## MTP4 was fastest in the coding depth comparison

MTP uses the model's prediction head to propose draft tokens that the main model verifies. This local model has one MTP head, which is invoked repeatedly at greater depths. MTP4 means a maximum of four proposed draft tokens; it does not guarantee four accepted tokens per round.

A deeper draft requires more prediction and verification work. If later draft positions are frequently rejected, increasing depth can reduce speed.

The short-input screen had favored MTP2. I then fixed IQ3_S, Q8 KV, a 128K total window, and a 64K per-response output cap, and ran the eight coding tasks at depths 2, 3, 4, 5, and 6. Each task used one shared seed, giving 40 completed attempts.

| Maximum MTP draft tokens | Pooled generation rate |
| --- | ---: |
| 2 | 57.98 tokens/s |
| 3 | 60.72 tokens/s |
| 4 | **61.31 tokens/s** |
| 5 | 58.08 tokens/s |
| 6 | 56.37 tokens/s |

MTP4 was approximately **5.7% faster** than MTP2 in this workload. Depths 5 and 6 added no benefit. This makes MTP4 my current choice for these tasks and this machine, rather than a universal sweet spot across models, contexts, and GPUs.

Even here, faster generation did not automatically mean faster delivery. On the seven tasks delivered successfully by both MTP2 and MTP4 under the original grading, total times were 2,727.4 and 2,741.3 seconds respectively. MTP4 was approximately 0.5% slower. Generated content and tool use also affect task duration.

## Ledger needed more output in one case and a corrected test in another

Repeated Ledger failures initially made insufficient context seem plausible. Diagnosis uncovered two different issues.

The first was **a truncated response**. In one paired IQ3_S + MTP3 diagnostic, I changed only the output cap from 32K to 64K, retaining the 128K total window and other settings. The original attempt ended its long response at 32,768 tokens without completing production edits. The new attempt's longest response reached **40,612 tokens**, and it passed functional and delivery checks. Its maximum actual sequence was **73,472 tokens**, well below 128K.

For that failure, more output budget helped; a larger total context was unnecessary. It also cost time: the task increased from 628 to 1,140 seconds. This is evidence for one failure mode, not a setting that fixes every failure.

The second issue appeared in the MTP depth comparison. All five Ledger answers failed the same read-error test without exhausting context or output budgets. Its fake file lacked normal context-manager and read interfaces, and its output capture lacked the standard `.buffer` interface. Four answers failed before reaching the intended injected read error; the fifth failed while writing the expected diagnostic to standard error.

I corrected only those mock interfaces, retaining the injected exception and acceptance requirements. **All five unchanged answers improved from 12/13 to 13/13 acceptance checks.** A negative control that deliberately omitted read-error handling still failed, while the reference and a previously passing answer continued to pass.

I then created and validated **v2.0.2** of the suite and regraded MTP4's eight existing answers, including phase-one and final code. Its result changed from 7/8 to **8/8 functional and delivered passes**, without calling the model again or modifying its answers.

The original records remain intact, and this correction does not automatically replace the scores of every historical quantization cohort. Output truncation, code defects, test defects, and machine protection stops need separate diagnoses.

## 220K fits with MTP4; 256K depends on the configuration

K here means 1,024 tokens. **Input and generated output share the total window.** A 192K input budget plus 64K output requires a 256K total window. A 170K input budget plus 50K output requires 220K.

An output cap is a limit, not an obligation to generate that many tokens. Changing only the client output cap while leaving the server's total context fixed does not necessarily allocate that much additional memory. Preserving the same maximum input while adding output room, however, requires a larger total window and its associated runtime memory.

Capacity tests on this 3090 used IQ3_S and Q8 main KV:

| Total window and speculation | Result |
| --- | --- |
| 192K + MTP4 | Passed a 179,532-token input with short generation |
| 220K + MTP4 | Passed the same long input; whole-GPU memory peaked around 22.80 GiB |
| 256K + MTP4 | Failed memory allocation during startup |
| 256K, MTP off, reduced batch sizes | Passed the long-context migration experiment |

Running 256K and running 256K with MTP4 are therefore different configurations. MTP adds cache or runtime-buffer requirements as well as weights. A failed 1 GiB buffer allocation in the 256K MTP4 log does not establish that the exact memory shortfall was only 1 GiB.

The 220K capacity test used approximately 179K input tokens and short output. It did not exercise 170K input followed by a full 50K generated output. Starting the server, processing a long input, and delivering a correct long coding task are separate conditions to verify.

## Longer context helps when it preserves required information

To test usefulness, I constructed a cross-service schema migration task. Authoritative new specifications were distributed through a large corpus containing stale specifications, and the answer had to migrate 12 selected services. There were **198 independent acceptance checks, but only one task and one seed**.

All three arms used IQ3_S, Q8 KV, MTP off, and the same generation settings. They differed in how the input was supplied.

| Input strategy | Actual input tokens | Acceptance checks | Prompt processing + decode time |
| --- | ---: | ---: | ---: |
| 256K window, full corpus | 179,532 | 198/198 | 1,583 s |
| 128K window, relevant files selected in advance | 6,383 | 198/198 | 712 s |
| 128K window, simple head/tail crop | 54,755 | 138/198 | 1,851 s |

The full corpus preserved all required specifications. The simple crop omitted specifications for nine services and failed. Selecting the known relevant files in advance also passed and was faster. This did not test whether a real agent could autonomously retrieve every necessary file.

The pilot shows that a larger window can help avoid information loss, while effective input selection can reduce cost. It does not establish a general coding-quality advantage for 256K or show that head/tail cropping is the best use of 128K.

The earlier b11146 128K-versus-220K coding comparison remains incomplete. The newer b11429 single-pass screen above is a separate cohort that completed all eight tasks with 7/8 strict deliveries. In the earlier comparison, cache and wallet both passed functional and delivery checks. During the third task, eventstream, a CPU temperature sample reached **93.25°C**, triggering the configured 92°C stop guard. Only 2/8 tasks completed; six have no valid score.

Wallet illustrates why the speed definitions matter. Moving from 128K to 220K increased generation speed from about 56.18 to 59.77 tokens/s. Generated tokens also increased from 35,165 to 46,162, and task time increased from 654 to 835 seconds. **Generation was approximately 6.4% faster, while the task took approximately 27.7% longer.** One observation cannot establish that the larger window caused greater verbosity, but it is enough to show why tokens/s alone is insufficient.

## DFlash2 did not beat MTP4 on this 3090

[DFlash](https://z-lab.ai/projects/dflash/) and MTP both propose drafts for target-model verification, but generate drafts differently. Local MTP drafts sequentially. DFlash uses a separate lightweight block diffusion model to propose an entire block in parallel. [DFlash2](https://inco.ai/blog/dflash2/) improves draft selection and information exchange within the block.

The earlier b11146 comparison held the IQ3_S target, Q8 main KV, and 220K total window fixed. DFlash2 used Q4_K_M draft weights and a maximum of seven draft tokens. Both paths used F16 draft KV. MTP was disabled when DFlash2 was active, and each path ran separately.

| Actual input | Output length | MTP4 | DFlash2 | DFlash2 relative change |
| --- | ---: | ---: | ---: | ---: |
| 8,207 tokens | 512 tokens | 54.82 tokens/s | 53.01 tokens/s | −3.3% |
| 32,783 tokens | 512 tokens | 49.11 tokens/s | 46.24 tokens/s | −5.8% |
| 179,532 tokens | 128 tokens | 30.01 tokens/s | 28.84 tokens/s | −3.9% |

These are short-generation measurements with one run per input per configuration, using identical cold inputs and excluding prompt processing. For the longest input, DFlash2's complete request was slightly faster, approximately 303 versus 307 seconds, because request time also includes prompt processing. Its generation phase was slower; not every complete request was slower.

Whole-GPU memory sampled every 200 ms peaked around **23.33 GiB** with DFlash2 and **22.80 GiB** with MTP4, a difference of approximately **540 MiB**. DFlash2 left about 690 MiB free at its peak. The comparison completed without an OOM, and CPU temperature peaked at 82.75°C.

This comparison did not include full coding tasks or long outputs, so it cannot establish equal or worse DFlash2 coding quality. For generation speed on this configuration, I currently have no measured reason to replace MTP4.

Correct target verification and sampling are prerequisites for speculative decoding to preserve the target distribution. That does not mean different execution paths produce identical answers, or that the IQ3 target has exactly the same quality as the original Q4 weights. Weight quantization and draft verification are separate effects.

## Throughput and GPU power

Two nearly complete early coding segments gave a time-weighted mean GPU board power of approximately **329W**. That excludes CPU power, other components, and PSU losses. Whole-PC power needs measurement at the wall.

At 61.31 tokens/s, continuous decoding for 168 hours extrapolates to approximately **37.08 million generated tokens per week**. This includes reasoning and tool syntax. An agent also processes inputs, waits for tools, and takes cooling breaks, so this is neither delivered-code volume nor an equivalent cloud subscription quota.

## The experimental configuration I would choose now

For these common repair tasks, I would start with:

| Setting | Current choice |
| --- | --- |
| Weights | Qwen3.8-27B GSQ-RCO IQ3_S with MTP head |
| Main KV cache | Q8_0 for both K and V |
| Runtime | llama.cpp b11429 |
| Draft KV cache | F16 for both K and V, unchanged from the earlier default |
| Speculative decoding | MTP, maximum four draft tokens, probabilistic draft sampling |
| Total context | 225,280 tokens (220K) |
| Per-response output cap | 51,200 tokens (50K), sharing that total window |
| Sampling | temperature 1.0, top_p 0.95, top_k 20, min_p 0, repeat penalty 1 |
| Reasoning | Enabled, xhigh effort |
| Execution | One concurrent slot, Flash Attention, all model layers on GPU |
| Batch / microbatch / CPU threads | 512 / 256 / 8 |

All model layers on GPU does not mean the coding workflow avoids the CPU. File operations, tests, type checks, and inference scheduling still use it. GPU inference does not remove temperature issues in test subprocesses.

The updated candidate uses llama.cpp b11429, CUDA 12.8, and OpenCode 2.0.20. Earlier experiments used b11146 unless stated otherwise. This is my preferred experimental profile; these experiments did not automatically rewrite the global daily-service defaults. Ordering and thermal conditions were not identical across experiments. For example, the five cache attempts in the MTP depth comparison used a 90°C guard, subsequent attempts used 92°C, and the run included human-requested pauses.

The completed b11429 eight-task screen used the 220K total window and 50K output cap. A separate cold capacity check processed 179,532 input tokens and 128 output tokens without truncation; five-second sampling observed 22,843 MiB (about 22.31 GiB) of whole-GPU memory. This does not test a full 170K input followed by 50K generated output or replace the older 22.80 GiB peak measured at 200 ms intervals. Memory at 256K with MTP4, and DFlash2's long-output behavior and coding quality, need their own evidence.

I also researched the community [Coder390 model and its associated quantizations](https://huggingface.co/nerkyor/Qwen3.8-27B-Coder390-EfficientThink-Opus5.5-GPT6Astra-Grok4.7-DSV4Pro-K3-SFT-RLOO-MTP-DFlash2). It includes additional training, so it is not simply another quantization of the same checkpoint. I have not run it on this 3090 and have not included its advertised results in the local speed or quality ranking.

The next useful work is repeated quality comparison under the corrected suite with more distinct tasks. The older paired 128K-versus-220K cohort remains incomplete; its missing scores were not filled with the new runtime results. The evidence already supports prioritizing IQ3_S + Q8 KV + MTP4 here. Establishing how much quality it retains across broader coding work requires more distinct tasks and repeated attempts.
