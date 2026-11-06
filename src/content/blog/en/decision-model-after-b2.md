---
title: "I Gave My AI Extra Lessons. It Scored 96%. Now What?"
seoTitle: "I Gave My AI Extra Lessons. It Scored 96%. Now What?"
description: "On a home GPU, I trained an AI from roughly 64% to 96% on one task. Another test stayed flat. Three simple visuals explain what it learned, what failed, and what I want to try next."
ogImage: "/images/decision-model-after-b2-en.png"
ogImageAlt: "Dialogue classification improved from 64% to 96%, while another public test stayed at 177/231 correct: different evaluations, different outcomes."
pubDate: 2026-11-05
tags: ["ai", "decision-model", "qwen", "training", "evaluation", "local-llm"]
draft: false
---

In one training run, I taught a small AI model to classify what a person was doing in a conversation: asking, confirming, rejecting, selecting, and so on. Its score rose from roughly **64% to 96%**.

That looks like the moment when the lessons finally pay off.

But on a separate, fixed set of public questions, it got **177 correct before training—and 177 afterward**. These 231 questions cover different tasks, including dates and combinations of rules. They help us find weaknesses; they are not an exam of everything an AI can do.

I wanted to know whether conversation training would help with other decisions too. They all seemed to involve reading text and choosing the right answer. Eventually, I began to question how much that description really told me.

![Before and after the same training run: dialogue-act classification rises from 64.1% to 96.1%, while public JevBench answers stay at 177 out of 231. The two evaluations use different questions and scoring methods.](/diagrams/after-b2-scores-en.svg)

*One run, two evaluations. The 96% is a dialogue-classification score, not a score on the training examples. Neither evaluation set was used for this extra training. We had already inspected the public questions, so they were a development check, not a fresh blind test. Scoring details are at the end.*

## I wanted the AI to choose the next step

I was using one RTX 3090, a consumer graphics card, to train a model that makes choices.

Suppose a customer says, “I entered the wrong address. The package hasn't shipped—please change it.” A program needs to choose between changing the address, tracking the delivery, and canceling the order.

The model doesn't need to write a long reply. It acts like a switch inside the program: **understand the message and select the next step.** A short answer can still send the rest of the program in the wrong direction.

I started with a model that could already process language. I gave it examples and correct answers so it could adjust its decisions, then checked it on separate questions.

![A simplified training process: provide examples and correct answers, let the model adjust its decisions, then check separate questions. Practice performance alone does not show whether the learning transfers.](/diagrams/after-b2-learning-en.svg)

*A simplified illustration. In the actual implementation, we adapted part of a pretrained Qwen model.*

The [previous post](/en/blog/training-small-decision-model-3090/) described our first working version, B2—a saved model checkpoint. Of everything we investigated afterward, the distinction below most changed how I thought about the task.

## “This is a request” doesn't tell you what to do

Consider this invented example:

> Earlier: “Please cancel my reservation.”\
> Now: “Actually, keep it. Just change the arrival time.”

Recognizing a request does not identify the requested action. The program should change the arrival time, rather than carry out the earlier cancellation.

![An invented conversation illustrates two different tasks. Identifying the speech act yields “a request”; identifying the current action yields “change the arrival time” and requires ruling out the withdrawn cancellation.](/diagrams/after-b2-intent-en.svg)

*An explanatory example, not an actual test item or recorded model output.*

The opening 96% measured the classification of dialogue acts, such as asking, confirming and rejecting. Choosing the current action can also require understanding earlier context and a change of mind.

**Two tasks can both sound like “understanding intent” while teaching different judgments.**

That gave us a testable hypothesis; it did not establish why the public score stayed flat. The model, the examples, and the way we trained it could all matter.

We noticed this distinction when we went back to the task definitions. Before that, we had tried several more obvious approaches.

## More practice, a larger model, a calculator: we tried them all

If date questions are the problem, practice more date questions. In one debugging run, we repeatedly trained a small collection of calendar examples. Eventually, the model answered **all 64 practiced questions correctly**.

On another 192 questions, the old model got 81 right and the newly trained model got 79. Its probability scoring of the correct answers also became much worse.

It looked like a student memorizing a workbook without improving on another set of problems. In machine learning, this pattern is called *overfitting*. It made me ask: **would the learning still help away from those examples?**

We also trained a larger base model. Its public score rose from 170 to 177 correct answers, but it still got only one of the 15 temporal and numeric questions right. Other training differences prevent us from attributing the gain to size alone.

The larger model’s 177 correct answers became the baseline for the opening experiment. After extra dialogue training, its specialist score rose from 64% to 96%, while its public score remained at 177.

Another appealing idea was to have the model turn a question into a small program in a prescribed format, then let an executor do the calculation.

Writing the program proved difficult: **more than half of the generated programs did not meet the execution requirements.** The approach performed worse than direct decisions and added processing time. Training and compute also differed between the two approaches, so this result applies to the recipes we tested.

A calculator can calculate accurately. Someone still has to give it the right expression.

## Some skills improved. Their reach still needed testing

There were improvements worth keeping.

We created pairs of examples where changing a decisive fact should change the answer. A policy might permit an action until an exception is added, for instance.

Models receiving these examples outperformed models that simply kept reviewing old material. We repeated the training and checked new generated situations; the benefit remained. But those situations still came from the same kinds of question generators. That does not establish better judgment across real-world problems.

Finally, we tried to keep two improvements in one model: better judgments on specialist hard tasks, alongside better dialogue classification. The model learned new material while reviewing old examples.

Higher accuracy on both tasks could coexist, but neither version passed the full acceptance checks. On the public questions, some old mistakes were repaired while some previously correct answers became wrong, with no net improvement.

I kept those versions as research checkpoints, but did not make them the new deployed model.

## What will I ask next time I see “96% accuracy”?

Before more training, I want to check the lesson plan: do our examples teach the decision the application actually needs?

The next planned step is to examine whether the data can reliably teach the user's current requested action, including changes of mind, negation, and earlier requests. Then we would check complete conversations and service domains kept outside training. That work is not complete, and I don't yet know whether it will help.

If you are choosing or using an AI system, a promising score is a reason to ask:

> **What kinds of questions did it get right? How close are they to the job I need it to do?**

Recognizing a request and doing the right thing after someone changes their mind can be two different achievements. The gap between them still needs testing.

<details>
<summary>Want the exact numbers, methods and sources?</summary>

This account covers local experiments through October 30, 2026, checked with the original research session. The [aggregate evidence and source hashes](/experiments/decision-model-after-b2/summary.json) preserve the detailed results. The [previous post](/en/blog/training-small-decision-model-3090/) explains the architecture and links B1/B2 downloads. This follow-up does not release a new model.

- **The opening 96%:** SGD dialogue-act classification rose from 64.10% to 96.11% macro accuracy, giving each of ten labels equal weight. It is not a general AI capability score. Public JevBench stayed at 177/231 in the same comparison. The chart rounds percentages to one decimal place.
- **The public questions:** the same 231 questions from a [fixed JevBench revision](https://github.com/fstandhartinger/jevbench/tree/609a664e81f46e03731600bd7bd9f1b7a61257c5). We had already inspected them, so they are diagnostic development evidence, not a fresh blind test or a current official rank. Their text, answers and recognizable rewrites were excluded from new training. They do not represent all real-world use.
- **B2 and B3:** Qwen3.5 4B Base and 9B Base, trained on the same 12,520 repaired source records. B3 started afresh from Base. One seed and recipe differences do not isolate the effect of model size; the exploratory interval for its public accuracy gain included zero.
- **Calendar debugging:** practiced questions rose from 30/64 to 64/64; other questions fell from 81/192 to 79/192. On the latter, NLL—a score of probability assigned to the correct answer, where lower is better—worsened from 1.0451 to 15.2518.
- **Structured execution:** on 1,024 synthetic development views, pooled end-to-end accuracy was 28.61% for the program model and 34.38% for direct decisions; 56.15% of predicted programs were invalid. Supervision and compute differed, limiting the comparison to the tested recipes.
- **Confirmed specialist gains:** three training seeds and 512 fresh generated situations, each with four related views. Targeted models averaged 94.70% macro accuracy against 90.54% for old-data controls. The paired 95% interval for the difference was 3.23–5.19 percentage points. Scope is limited to these generated tasks; the targeted models scored 175/231, 176/231 and 176/231 publicly.
- **Cumulative training:** starting from coverage checkpoint A (176/231), ordinary continuation scored 174/231 and continuation with replay-only KL scored 175/231. Both failed overall acceptance, including probability-quality checks. These later pilots used one training seed; small differences are not stable estimates of method quality.

The [official SGD annotation definitions](https://github.com/google-research-datasets/dstc8-schema-guided-dialogue/blob/e852981ae34990f4358979625854259302feaa78/dstc8.md) support examining the difference between speech acts and current requests. They do not establish that this difference caused the entire transfer gap.

Prepared with AI assistance. Illustrated conversations are explanatory examples; the score chart uses saved experimental results. No original results were changed and no new training was run.

</details>
