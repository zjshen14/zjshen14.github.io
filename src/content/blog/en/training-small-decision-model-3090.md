---
title: "Post-Training a Jev-Inspired Decision Model on an RTX 3090"
seoTitle: "Jev-Inspired Decision Model Post-Training on RTX 3090"
description: "Post-training a Jev-inspired decision model on one RTX 3090 with Qwen3.5 Base, LoRA and a pointer head: architecture, data pitfalls, evaluation and model downloads."
ogImage: "/images/decision-model-post-training-en.png"
ogImageAlt: "Jev-inspired decision-model post-training on an RTX 3090: a frozen Qwen3.5 Base backbone, trainable LoRA and a pointer head produce candidate probabilities."
pubDate: 2026-10-18
tags: ["ai", "decision-model", "qwen", "lora", "training", "evaluation", "local-llm"]
draft: false
---

Some calls in an agent workflow only need a judgment: is the user adding context or changing an earlier decision? Does a passage support a claim? Which team should handle a ticket? The answer may be a single option, yet it determines what the program does next.

Reading about [TypeSafe's Jev and System One models](https://typesafe.ai/blog/introducing-system-one-models-and-jev) made me curious about one capability: reading context, a question and candidate answers, then returning probabilities over those candidates. It sounded complex. I wanted to understand whether the underlying structure and training process could be broken into steps an individual developer could understand and try firsthand.

I used the RTX 3090 from my earlier [local coding agent experiments](/en/blog/local-qwen-opencode-3090/), using Qwen3.5 Base as the pretrained backbone for post-training a decision model: first the 0.8B backbone, then 4B. The backbone weights stayed frozen; supervised post-training updated newly initialized LoRA parameters and a pointer decision head. The resulting model reads context, a question and candidate answers, and returns a probability for each candidate. Those sizes also reflected local memory and compute constraints. This was primarily a personal learning experiment: implement the basic candidate-scoring path with the resources available, understand how the model learns these judgments, and learn how to check the results. Matching the full results of enterprise-scale cluster training was outside the goal of this experiment.

Initially, I only wanted to establish that the training path worked. The model quickly learned a tiny set of training questions. On another set, something more interesting happened: **the number of correct answers increased while mean NLL got worse.** Later, inspecting the training data revealed labels derived from review stars, even though the question asked about the attitude expressed in the text.

This account follows the first two model versions: turning a language model into a candidate scorer, understanding why accuracy alone cannot establish training success, and making supervision and evaluation answer the same question. It also introduces the weaknesses revealed by public JevBench questions that motivated further quality optimization.

## Reading a question and scoring its candidates

Consider a review judgment. The text and probabilities below are fictional, illustrating the interface:

> Context: The food was excellent and the service attentive. I'll be back.  
> Question: Based only on this text, is the reviewer clearly positive overall?  
> Candidates: Yes—clearly favorable overall; No—clearly unfavorable, or substantively mixed without a clear overall favorable judgment.  
> Output shape: `{"yes": 0.8, "no": 0.2}`

The candidate answers and their descriptions are part of the input. A ticket-routing request could instead supply descriptions for billing, shipping and returns. The output would still be a probability for each candidate.

The structure used here has three parts:

1. **The Qwen3.5 Base backbone reads the input.** Context, question and candidate descriptions are encoded as tokens, and the pretrained model computes contextual representations at their positions.
2. **A pointer decision head scores the candidates.** This small readout takes the representations at the decision and candidate positions, projects and matches them to obtain candidate scores, then applies softmax to produce a probability distribution.
3. **LoRA adapts the model to the task.** The original backbone weights stay frozen. Training updates low-rank parameters inserted into it and the newly initialized readout, reducing the parameters and optimizer state that need to be optimized.

![Context, question and candidate descriptions enter Qwen3.5. A frozen backbone with trainable LoRA produces representations; a pointer head converts candidate scores into probabilities.](/diagrams/decision-model-training-en.svg)

For questions with a determinate label, the correct candidate supplies the supervision. Cross-entropy encourages the model to increase that candidate's probability, and gradients update LoRA and the readout. This connects reading the text, scoring the candidates and learning from labels.

Why choose this structure? A fixed-class classification head usually reserves an output position for each class. Scoring candidate descriptions supplied in each request better matches the interface I wanted to explore. Reading scores directly also removes the step of generating a natural-language answer and parsing its label. Prompting an existing language model to generate a label is another valid approach; this experiment explores direct scoring and does not provide a controlled speed, cost or reliability comparison between the two.

The starting point was [Jared Palmer's KEV training process and implementation](https://github.com/jaredpalmer/kev/tree/2ecafc49fe1e8945cd600443e6c04c1cf0b3a78f): a pretrained Base model with fresh LoRA parameters and a fresh readout. The architecture comes from that reference. Our changes at this stage focused on supervision, evaluation separation and training recovery.

## Why more correct answers were not enough

The training mixture covered classification, question answering and rule composition; Yelp review judgments were only one task. The first step was a tiny training check. I selected the two shortest records from each data source, giving **24 records and 30 questions**; one record can contain several questions. The 0.8B model repeatedly trained on them for 80 optimizer updates.

Before and after training, I checked both those training questions and a separate exploratory development set. The latter came from the same original datasets but used different data groups and was not directly used as training examples in this run.

| Questions and metric | Before training | After training |
| --- | ---: | ---: |
| Correct on 30 training questions | 7/30 | 29/30 |
| Mean NLL on 30 training questions | 2.1845 | 0.1030 |
| Correct on 28 development questions | 7/28 | 13/28 |
| Mean NLL on 28 development questions | 2.2153 | 3.9161 |

Accuracy checks whether the highest-probability option is correct. Negative log likelihood, or NLL, also checks how much probability goes to the correct answer. For a question with a determinate answer, it is `−ln(probability of the correct answer)`. Lower is better.

As a hypothetical illustration, suppose a binary classifier gives the correct answer a probability of 0.4 or 0.001. Both predictions count as wrong. The latter almost rules out the correct answer, so its NLL penalty is much larger. More questions can therefore be answered correctly while mean NLL deteriorates. The tiny experiment showed these metrics moving apart; the aggregate table alone does not identify which questions caused the change.

Moving from 7/30 to 29/30 on the repeated training questions showed that the model could learn that set. I also checked that backbone weights stayed unchanged, LoRA and readout weights changed, and saving and reloading preserved outputs. Together, these checks validated the training and saving path. The 28 development questions were too few and too limited in origin to establish broad generalization.

A program using probabilities to decide whether to act also needs **calibration** checks: among judgments made with roughly 80% confidence, are roughly 80% actually correct? Softmax only makes probabilities sum to one, and NLL does not replace a calibration assessment. This experiment led me to examine correct-answer counts alongside probability metrics, rather than watching training loss alone.

## Did the labels answer the question being asked

Before scaling up, I inspected the Yelp review task in the mixed training data. Its binary labels came from a star-rating threshold, while the question asked: "Based only on this review text, is the reviewer clearly positive overall?"

Those labels need not express the same judgment. Imagine a fictional review: "The food arrived quickly, but it was disappointing. Overall, I wouldn't recommend it." Suppose it carries four stars and the old rule maps that rating to Yes. That label follows the rating rule, but the text-based question calls for No. The model receives conflicting instructions and supervision.

We specified the criterion explicitly: use only the supplied text. Clearly favorable overall means Yes. Clearly unfavorable, or substantively mixed without a clear favorable overall judgment, means No. Insufficient information, truncation or unresolved material ambiguity means holding the question aside. "Still waiting for the food; I'll update this later," for example, cannot support an overall judgment.

Annotation packets hid the original stars and old labels. We used model-assisted annotation, with crosschecks of changed labels, uncertain cases and a subset of unchanged cases. **Uncertain was an annotation holding status, not a third output class for this binary task.** Ultimately, 38 relevant questions were withheld from supervision while their records and other questions could remain.

The useful lesson was that well-formed data can still teach a different task. Valid JSON, acceptable input length and in-range labels do not reveal this mismatch. The question, candidate descriptions and label have to be read together. Additional epochs cannot resolve a contradiction in the task definition for us.

Here, "repair" means aligning supervision with an explicit text criterion. Model-assisted labels can still share errors, and the subsequent comparison does not isolate the causal benefit of this change. This audit finding also cannot directly explain the earlier tiny experiment's NLL deterioration; that causal link was not tested.

## Aligning training and development criteria

Beyond the Yelp supervision issue, structural checks, overlap screening and sampled semantic review quarantined 56 whole records involving near-copy risks, unresolved ambiguity and label conflicts. After incorporating the Yelp repair, training used **12,520 records and 15,476 questions**. Versions were saved separately with checksums so an intermediate dataset would not be mistaken for the data a final model actually saw.

Evaluation also needed to follow the revised task definition. Historical star-derived labels could not evaluate the new text question, so we built a **development set** using the same text criterion. Starting with 200 Yelp candidates, we screened overlap with historical material and conducted two model-assisted review passes. We admitted 194 and held six because of ambiguity or disagreement.

Development data supports examining models and comparing approaches. Calibration data fits probability adjustments. A final test supports confirmation after the approach is fixed. These 194 records served only the first purpose. The training entry point used an explicit allowlist of sources to reject them as training data.

This separation makes comparison more meaningful, but screening cannot rule out all semantic overlap or pretraining exposure. Agreement between two model-assisted passes is not independent human ground truth. Holding difficult cases aside also leaves some difficult situations outside the reported scores. Those limits matter when interpreting the Yelp results below.

## What the two trained versions tell us

After the repair, I trained fresh from Base at 0.8B and 4B, naming them **B1 and B2**. Both used fresh LoRA parameters and readouts, the same repaired training data and two epochs. Their learning rates were 0.0001 and 0.00005 respectively. This compares two training recipes; it cannot isolate the effect of parameter count.

Before training 4B, I measured forward, backward and optimizer updates on representative and stress inputs on the 3090. LoRA reduces trainable parameters, but backbone weights, intermediate activations and input length still consume memory. Loading the model is only part of a training-capacity check.

Evaluation used two development sets: the 194 text-based review judgments described above, and historical multitask development data covering classification, question answering and rule composition. The second row below counts **1,184 original questions**; another 204 constructed variants, including reordered options, are excluded from this table.

| Development data | Correct, 0.8B (B1) | Correct, 4B (B2) | B1 mean NLL | B2 mean NLL |
| --- | ---: | ---: | ---: | ---: |
| Yelp text-based attitude judgments | 184/194 | 192/194 | 0.09620 | 0.04024 |
| Original historical multitask questions | 951/1,184 | 1,033/1,184 | 0.60133 | 0.46749 |

These are outputs without temperature calibration, at temperature 1. B2 did better on the correct-answer counts and mean NLL shown here. The table compares two trained versions. Without an untrained control on the same sets, it cannot quantify the gain from fine-tuning itself or establish that general capabilities were retained.

Another slice is closer to the risk of automated action. On the Yelp set, B1 made 181 predictions with confidence at least 0.9, including one error. B2 made 188, including two errors. The samples are small and cover different subsets, so this is not a significance claim. It does illustrate why better averages do not automatically mean fewer high-confidence errors, and why 0.9 is not a ready-made production threshold.

## Longer runs also need real recovery

Moving from tiny experiments to longer runs required another engineering change: training recovery. Loading LoRA and readout weights allows prediction to continue. Continuing the same training run also requires the optimizer, learning-rate progress, random state and data position.

We compared uninterrupted training against a run terminated mid-process and resumed. After adjusting determinism settings on the actual CUDA path, both completed eight optimizer updates with bit-identical trainable parameters and training state. Reloaded probabilities on 30 check questions were identical too.

This validated process-interruption recovery in that single-GPU environment. It provided a recoverable starting point for further iteration; the test did not cover retraining on different hardware or physical power loss. Saving and comparison details are in the notes below.

## JevBench exposed the next problems to solve

Training, saving and loading worked, and results on the existing development sets had improved. The next question was how well the model would handle a different set of practical decisions. We evaluated the unchanged 4B version locally on a [fixed public JevBench revision](https://github.com/fstandhartinger/jevbench/tree/609a664e81f46e03731600bd7bd9f1b7a61257c5).

That checkout contained **231 downloadable public questions**. Every request returned a valid probability vector without input truncation. Breaking the results down by the benchmark's groups revealed a clear gap:

| Public JevBench group | Correct |
| --- | ---: |
| Easy | 48/48 |
| Original | 69/72 |
| Hard | 53/111 |

The overall result was 170/231, but **58 of the 61 errors came from Hard**. A further breakdown by task family showed 0/15 on temporal and numeric questions and 4/19 on long-policy judgments. Handling simple decisions did not establish reliability on date calculations, combined conditions, exception clauses or evidence distributed across a long document. The overall score hid these weaknesses.

That gave the subsequent training a more specific direction. First, inspect task conversions, options and labels item by item to understand the failures. Then add independently checkable date calculations, rule combinations and exception cases, progressively increasing the context the model needs to process. Keep original-task training data and evaluations alongside them to check whether improving difficult questions costs performance on decisions the model could already handle.

Length was one factor to investigate: the original 4B training configuration limited context to 384 tokens, while these long-policy contexts contained roughly 2,203–3,666 tokens. However, the longer inputs also all belonged to Hard. Length and difficulty were entangled, so the results could not establish that length alone caused the failures. Labels and conversions in these small task-family groups also still needed item-level review.

These are local public-question diagnostics, not an official sealed evaluation or leaderboard rank. Differences between task groups also do not establish a regression caused by training. The inspected public questions can track known weaknesses, but independent reserved data is needed to confirm whether improvements generalize. Quality optimization is still underway. Future posts will examine which training changes help these weaknesses, which do not, and whether performance on other tasks is preserved.

## Model downloads and data reconstruction

The models and accompanying materials are available on Hugging Face:

- [Qwen3.5 0.8B decision model (experiment B1)](https://huggingface.co/zjshen/qwen3.5-0.8b-decision)
- [Qwen3.5 4B decision model (experiment B2)](https://huggingface.co/zjshen/qwen3.5-4b-decision)
- [Training-data indexes, label repairs and reproduction materials](https://huggingface.co/datasets/zjshen/qwen3.5-decision-data)

Each model repository includes the LoRA adapter, decision readout, native loader and training configuration. Loading retrieves the separately pinned Qwen Base. These are inference checkpoints, excluding optimizer, random-state and other training-resume snapshots. Follow the repository's loading instructions so the decision readout is included.

The data repository provides source indexes, label repairs, reconstruction scripts and a training reproduction kit, without redistributing original review or question-answer text. Reconstruction retrieves pinned upstream data and verifies the final file's SHA-256. Training and evaluation roles are recorded separately, alongside source attribution and component-specific terms.

<details>
<summary>Data versions and evaluation scope</summary>

One record can contain several questions. The data versions were:

| Data stage | Records | Questions |
| --- | ---: | ---: |
| Initial training data passing input checks | 12,576 | 15,576 |
| Interim data after record quarantine | 12,520 | 15,514 |
| B1/B2 training data incorporating Yelp repair | 12,520 | 15,476 |

Of the 56 quarantined records, six involved public cross-split near-copy risks, 39 unresolved ambiguity and 11 reviewed label conflicts. The move from 15,514 to 15,476 questions withheld 38 Yelp judgments from supervision without changing the retained record count. These checks reduced identified risks; they do not estimate the whole dataset's label-noise rate.

Training files had their own checksums and manifests. A copied manifest still describing old data was replaced before launch. Development data had an evaluation-only declaration, while training also checked an explicit source allowlist. A legacy entry point without that allowlist could not provide the required separation.

The historical multitask data was called the retention panel in the records. It contained 1,388 questions. The table uses 1,184 original questions, marked clean in the scoring records. The other 204 comprise 84 option-permutation variants, 60 none-option controls with the answer present among the candidates, and 60 with the answer absent. Here, none means "none of the above." These variants are excluded from the table's correct-answer counts and mean NLL. Historical labels and overlap remain limitations, so these results do not establish independent external-test performance.

</details>

<details>
<summary>Training configuration and recovery</summary>

| Configuration | 0.8B (B1) | 4B (B2) |
| --- | --- | --- |
| Pretrained model | Qwen3.5-0.8B-Base | Qwen3.5-4B-Base |
| Initialization | Fresh LoRA and readout | Fresh LoRA and readout |
| Training records | 12,520 | Identical file bytes |
| Epochs and optimizer updates | 2; 3,130 | 2; 3,130 |
| Physical batch and accumulation | 1; 8 | 1; 8 |
| LoRA rank | 16 | 16 |
| Learning rate | 0.0001 | 0.00005 |
| Backbone storage and autocast | FP32; BF16 | FP32; BF16 |
| Token budget per pass | 4,096 | 8,192 |
| Random seed | 3 | 3 |

The original comparison verified that all admitted 4B inputs already fitted the 4,096 budget; using 8,192 did not change actual pass packing. Each recipe had this one run, so it cannot estimate training-seed variation. The earlier tiny run used physical batch 1, accumulation 4 and 80 updates.

During training, a record can produce augmented variants with distractor candidates or none-of-the-above controls. The training objective averages question losses within each variant, then sums according to variant weights. The result tables average NLL over the selected original questions, so the aggregation units are not interchangeable. An earlier 0.8B full-mixture model was named B0. B1 was trained fresh from Base to avoid carrying forward B0's old supervision history.

Recovery saves trainable parameters, optimizer state, scheduler, random state, counters and the next data position. Saves occur after a complete optimizer update, excluding unfinished gradient accumulation. Several checksummed save generations allow fallback. The first CUDA recovery comparison showed small numerical drift. With determinism enabled on the actual path, uninterrupted and resumed runs matched in parameters, optimizer, scheduler, random state and data position.

</details>

<details>
<summary>Implementation and measurement sources</summary>

Local training started from [Jared Palmer's KEV](https://github.com/jaredpalmer/kev), pinned to [commit `2ecafc49fe1e8945cd600443e6c04c1cf0b3a78f`](https://github.com/jaredpalmer/kev/tree/2ecafc49fe1e8945cd600443e6c04c1cf0b3a78f), adding local training-recovery support without loading a trained KEV adapter. The pretrained models were [Qwen3.5-0.8B-Base](https://huggingface.co/Qwen/Qwen3.5-0.8B-Base) and [Qwen3.5-4B-Base](https://huggingface.co/Qwen/Qwen3.5-4B-Base). See [Hu et al.](https://arxiv.org/abs/2106.09685) for LoRA and [Guo et al.](https://arxiv.org/abs/1706.04599) for background on calibration and temperature scaling.

This implementation runs each question with its context as an independent causal sequence on the Qwen3.5 hybrid backbone, excluding other questions from its context. Batching does not reproduce Jev's architecture or latency. The tiny experiment used the reference PyTorch compute path actually verified in that run.

[Selected aggregate measurements](/experiments/decision-training-first-baselines/summary.json) support checking the counts and configurations here. That file contains summary values only; model downloads, data reconstruction and training reproduction materials are in the Hugging Face repositories above.

This article was prepared with AI assistance from local experiment records. It covers the initial B1/B2 versions, their corresponding development results, and the 4B public JevBench diagnostic that motivated further optimization.

</details>
